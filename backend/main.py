"""
微信文档转换助手 — FastAPI 后端

提供文档转换与生成功能：
  POST /api/convert/word2pdf   — 上传 .docx 返回 .pdf 下载链接
  POST /api/convert/pdf2word   — 上传 .pdf 返回 .docx 下载链接
  POST /api/convert/img2pdf    — 上传图片返回 .pdf 下载链接
  POST /api/convert/pdf/remove-watermark — 上传 PDF 移除水印
  POST /api/generate/barcode   — 生成条形码图片
  POST /api/generate/qrcode    — 生成二维码图片
  GET  /api/convert/status     — 健康检查
"""

import os
import time
import uuid
import base64
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from config import (
    UPLOAD_DIR, OUTPUT_DIR,
    ALLOWED_EXTENSIONS, BARCODE_TYPES,
    FILE_EXPIRE_SECONDS, CLEANUP_INTERVAL_SECONDS,
)
from services.gotenberg_service import word_to_pdf
from services.pdf2docx_service import pdf_to_word
from services.img2pdf_service import images_to_pdf
from services.barcode_service import generate_barcode
from services.qrcode_service import generate_qrcode
from services.watermark_service import remove_watermark
from services.security_service import check_image
from services.pdf_service import merge_pdfs, split_pdf
from services.ocr_service import ocr_image
from services.image_service import compress_image, make_id_photo
from services.photo_restore_service import restore_photo

# ── 日志 ──
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── 生命周期 ──


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    cleanup_task = asyncio.create_task(_cleanup_loop())
    yield
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="微信文档转换助手",
    description="PDF ↔ Word 双向转换 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 辅助函数 ──


def _check_extension(filename: str, allowed: list[str]) -> bool:
    """检查文件扩展名是否在允许列表中"""
    ext = os.path.splitext(filename)[1].lower()
    return ext in allowed


async def _cleanup_loop():
    """后台线程：定期清理过期临时文件"""
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
        now = time.time()
        for directory in (UPLOAD_DIR, OUTPUT_DIR):
            if not os.path.isdir(directory):
                continue
            for fname in os.listdir(directory):
                fpath = os.path.join(directory, fname)
                try:
                    if os.path.isfile(fpath) and now - os.path.getmtime(fpath) > FILE_EXPIRE_SECONDS:
                        os.remove(fpath)
                        logger.info("清理过期文件: %s", fpath)
                except Exception as e:
                    logger.warning("清理文件失败 %s: %s", fpath, e)


# ── 路由 ──


@app.get("/api/convert/status")
async def status():
    """健康检查"""
    return {"status": "ok", "service": "微信文档转换助手"}


@app.post("/api/convert/word2pdf")
async def convert_word_to_pdf(file: UploadFile = File(...)):
    """Word → PDF 转换"""
    if not file.filename:
        raise HTTPException(400, detail="未选择文件")

    if not _check_extension(file.filename, ALLOWED_EXTENSIONS["word2pdf"]):
        raise HTTPException(400, detail=f"不支持的文件格式，仅支持: {', '.join(ALLOWED_EXTENSIONS['word2pdf'])}")

    return await _handle_conversion(file, "word2pdf", word_to_pdf, ".pdf")


@app.post("/api/convert/pdf2word")
async def convert_pdf_to_word(file: UploadFile = File(...)):
    """PDF → Word 转换"""
    if not file.filename:
        raise HTTPException(400, detail="未选择文件")

    if not _check_extension(file.filename, ALLOWED_EXTENSIONS["pdf2word"]):
        raise HTTPException(400, detail=f"不支持的文件格式，仅支持: {', '.join(ALLOWED_EXTENSIONS['pdf2word'])}")

    return await _handle_conversion(file, "pdf2word", pdf_to_word, ".docx")


@app.post("/api/convert/img2pdf")
async def convert_img_to_pdf(file: UploadFile = File(...)):
    """图片 → PDF 转换"""
    if not file.filename:
        raise HTTPException(400, detail="未选择文件")

    if not _check_extension(file.filename, ALLOWED_EXTENSIONS["img2pdf"]):
        raise HTTPException(400, detail=f"不支持的文件格式，仅支持: {', '.join(ALLOWED_EXTENSIONS['img2pdf'])}")

    return await _handle_conversion(file, "img2pdf", images_to_pdf, ".pdf")


@app.post("/api/convert/remove-watermark")
async def convert_remove_watermark(file: UploadFile = File(...)):
    """PDF 水印移除"""
    if not file.filename:
        raise HTTPException(400, detail="未选择文件")

    if not _check_extension(file.filename, ALLOWED_EXTENSIONS["remove_watermark"]):
        raise HTTPException(400, detail=f"不支持的文件格式，仅支持: {', '.join(ALLOWED_EXTENSIONS['remove_watermark'])}")

    return await _handle_conversion(file, "remove_watermark", remove_watermark, "_cleaned.pdf")


# ══════════════════════════════════════════
# 新增 API 路由
# ══════════════════════════════════════════


@app.post("/api/convert/merge-pdf")
async def convert_merge_pdf(files: list[UploadFile] = File(...)):
    """合并多个 PDF 文件"""
    if not files or len(files) < 2:
        raise HTTPException(400, detail="请至少上传 2 个 PDF 文件")

    task_id = uuid.uuid4().hex[:12]
    input_paths = []
    for f in files:
        if not f.filename or not f.filename.lower().endswith('.pdf'):
            raise HTTPException(400, detail=f"仅支持 PDF 文件: {f.filename}")
        path = os.path.join(UPLOAD_DIR, f"{task_id}_{f.filename}")
        content = await f.read()
        with open(path, "wb") as out:
            out.write(content)
        input_paths.append(path)

    output_filename = f"merged_{task_id}.pdf"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    try:
        await merge_pdfs(input_paths, output_path)
        return _file_response(output_filename, output_path)
    except Exception as e:
        raise HTTPException(500, detail=f"合并失败: {str(e)}")


@app.post("/api/convert/split-pdf")
async def convert_split_pdf(file: UploadFile = File(...), mode: str = Form("all"), page_ranges: str = Form("")):
    """拆分 PDF 文件"""
    task_id = uuid.uuid4().hex[:12]
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}.pdf")
    content = await file.read()
    with open(input_path, "wb") as f:
        f.write(content)

    output_dir = os.path.join(OUTPUT_DIR, f"split_{task_id}")
    try:
        files = await split_pdf(input_path, output_dir, mode, page_ranges)
        if files:
            return _file_response(os.path.basename(files[0]), files[0])
        raise HTTPException(400, detail="拆分失败")
    except Exception as e:
        raise HTTPException(500, detail=f"拆分失败: {str(e)}")


@app.post("/api/convert/ocr")
async def convert_ocr(file: UploadFile = File(...)):
    """图片/PDF 文字识别"""
    task_id = uuid.uuid4().hex[:12]
    input_ext = os.path.splitext(file.filename)[1].lower()
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}{input_ext}")
    content = await file.read()
    with open(input_path, "wb") as f:
        f.write(content)
    try:
        result = await ocr_image(input_path)
        return {"code": 0, "message": "识别成功", "data": result}
    except Exception as e:
        raise HTTPException(500, detail=f"识别失败: {str(e)}")


@app.post("/api/convert/compress-image")
async def convert_compress_image(file: UploadFile = File(...), quality: int = Form(70)):
    """压缩图片"""
    task_id = uuid.uuid4().hex[:12]
    input_ext = os.path.splitext(file.filename)[1].lower()
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}{input_ext}")
    content = await file.read()
    with open(input_path, "wb") as f:
        f.write(content)
    output_filename = f"compressed_{task_id}{input_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    try:
        await compress_image(input_path, output_path, quality=quality)
        return _file_response(output_filename, output_path)
    except Exception as e:
        raise HTTPException(500, detail=f"压缩失败: {str(e)}")


@app.post("/api/convert/id-photo")
async def convert_id_photo(file: UploadFile = File(...), bg_color: str = Form("#FFFFFF")):
    """证件照制作"""
    task_id = uuid.uuid4().hex[:12]
    input_ext = os.path.splitext(file.filename)[1].lower()
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}{input_ext}")
    content = await file.read()
    with open(input_path, "wb") as f:
        f.write(content)
    output_filename = f"idphoto_{task_id}.jpg"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    try:
        await make_id_photo(input_path, output_path, bg_color=bg_color)
        return _file_response(output_filename, output_path)
    except Exception as e:
        raise HTTPException(500, detail=f"制作失败: {str(e)}")


@app.post("/api/convert/restore-photo")
async def convert_restore_photo(file: UploadFile = File(...)):
    """老照片修复"""
    task_id = uuid.uuid4().hex[:12]
    input_ext = os.path.splitext(file.filename)[1].lower()
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}{input_ext}")
    content = await file.read()
    with open(input_path, "wb") as f:
        f.write(content)
    output_filename = f"restored_{task_id}.jpg"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    try:
        await restore_photo(input_path, output_path)
        return _file_response(output_filename, output_path)
    except Exception as e:
        raise HTTPException(500, detail=f"修复失败: {str(e)}")


def _file_response(filename: str, filepath: str) -> dict:
    """统一文件响应格式"""
    with open(filepath, "rb") as f:
        file_base64 = base64.b64encode(f.read()).decode("utf-8")
    return {
        "code": 0,
        "message": "处理成功",
        "data": {
            "download_url": f"/api/download/{filename}",
            "filename": filename,
            "size": os.path.getsize(filepath),
            "download_key": filename,
            "file_base64": file_base64,
        },
    }


@app.post("/api/convert/upload-binary/{endpoint}")
async def convert_upload_binary(endpoint: str, request: Request):
    """云托管模式：通过二进制流上传文件并转换"""
    from urllib.parse import unquote

    file_bytes = await request.body()
    filename = request.headers.get("X-Filename", "file")
    if filename:
        filename = unquote(filename)

    if not file_bytes:
        raise HTTPException(400, detail="上传文件为空")

    # 确定转换配置
    convert_map = {
        "word2pdf": (ALLOWED_EXTENSIONS["word2pdf"], word_to_pdf, ".pdf"),
        "pdf2word": (ALLOWED_EXTENSIONS["pdf2word"], pdf_to_word, ".docx"),
        "img2pdf": (ALLOWED_EXTENSIONS["img2pdf"], images_to_pdf, ".pdf"),
        "remove-watermark": (ALLOWED_EXTENSIONS["remove_watermark"], remove_watermark, "_cleaned.pdf"),
    }

    if endpoint not in convert_map:
        raise HTTPException(400, detail=f"不支持的转换类型: {endpoint}")

    allowed_exts, convert_fn, output_ext = convert_map[endpoint]
    input_ext = os.path.splitext(filename)[1].lower()

    if input_ext not in allowed_exts:
        raise HTTPException(400, detail=f"不支持的文件格式，仅支持: {', '.join(allowed_exts)}")

    # 保存临时文件
    task_id = uuid.uuid4().hex[:12]
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}{input_ext}")
    output_filename = f"{task_id}{output_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    try:
        with open(input_path, "wb") as f:
            f.write(file_bytes)

        logger.info("开始转换 [%s] %s (%d bytes)", endpoint, filename, len(file_bytes))
        await convert_fn(input_path, output_path)

        if not os.path.isfile(output_path):
            raise RuntimeError("转换后未生成输出文件")

        file_size = os.path.getsize(output_path)
        logger.info("转换完成 [%s] %s (%d bytes)", endpoint, output_filename, file_size)

        # 读取文件内容，返回 base64（避免云托管多实例文件不同步问题）
        with open(output_path, "rb") as f:
            file_base64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "code": 0,
            "message": "转换成功",
            "data": {
                "download_url": f"/api/download/{output_filename}",
                "filename": os.path.splitext(filename)[0] + (output_ext if output_ext.endswith('.pdf') else output_ext),
                "size": file_size,
                "download_key": output_filename,
                "file_base64": file_base64,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("转换失败 [%s] %s: %s", endpoint, filename, str(e))
        raise HTTPException(500, detail=f"转换失败: {str(e)}")
    finally:
        try:
            if os.path.isfile(input_path):
                os.remove(input_path)
        except Exception as e:
            logger.warning("清理上传文件失败: %s", e)


@app.post("/api/convert/upload-base64")
async def convert_upload_json(body: dict = Body(...)):
    """云托管模式：通过 base64 JSON 上传文件并转换"""
    import base64

    endpoint = body.get("endpoint", "")
    file_base64 = body.get("fileBase64", "")
    filename = body.get("filename", "file")

    if not endpoint or not file_base64:
        raise HTTPException(400, detail="缺少参数: endpoint 或 fileBase64")

    # 解码 base64
    try:
        file_bytes = base64.b64decode(file_base64)
    except Exception:
        raise HTTPException(400, detail="文件数据解码失败")

    if not file_bytes:
        raise HTTPException(400, detail="上传文件为空")

    # 确定转换配置
    convert_map = {
        "word2pdf": (ALLOWED_EXTENSIONS["word2pdf"], word_to_pdf, ".pdf"),
        "pdf2word": (ALLOWED_EXTENSIONS["pdf2word"], pdf_to_word, ".docx"),
        "img2pdf": (ALLOWED_EXTENSIONS["img2pdf"], images_to_pdf, ".pdf"),
        "remove-watermark": (ALLOWED_EXTENSIONS["remove_watermark"], remove_watermark, "_cleaned.pdf"),
    }

    if endpoint not in convert_map:
        raise HTTPException(400, detail=f"不支持的转换类型: {endpoint}")

    allowed_exts, convert_fn, output_ext = convert_map[endpoint]
    input_ext = os.path.splitext(filename)[1].lower()

    if input_ext not in allowed_exts:
        raise HTTPException(400, detail=f"不支持的文件格式，仅支持: {', '.join(allowed_exts)}")

    # 保存临时文件
    task_id = uuid.uuid4().hex[:12]
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}{input_ext}")
    output_filename = f"{task_id}{output_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    try:
        with open(input_path, "wb") as f:
            f.write(file_bytes)

        logger.info("开始转换 [%s] %s (%d bytes)", endpoint, filename, len(file_bytes))

        await convert_fn(input_path, output_path)

        if not os.path.isfile(output_path):
            raise RuntimeError("转换后未生成输出文件")

        file_size = os.path.getsize(output_path)
        logger.info("转换完成 [%s] %s (%d bytes)", endpoint, output_filename, file_size)

        return {
            "code": 0,
            "message": "转换成功",
            "data": {
                "download_url": f"/api/download/{output_filename}",
                "filename": os.path.splitext(filename)[0] + (output_ext if output_ext.endswith('.pdf') else output_ext),
                "size": file_size,
                "download_key": output_filename,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("转换失败 [%s] %s: %s", endpoint, filename, str(e))
        raise HTTPException(500, detail=f"转换失败: {str(e)}")
    finally:
        try:
            if os.path.isfile(input_path):
                os.remove(input_path)
        except Exception as e:
            logger.warning("清理上传文件失败: %s", e)


@app.post("/api/download/json")
async def download_json(body: dict = Body(...)):
    """云托管模式：通过 JSON 下载文件（返回 base64）"""
    import base64

    download_key = body.get("download_key", "")
    if not download_key:
        raise HTTPException(400, detail="缺少参数: download_key")

    filepath = os.path.join(OUTPUT_DIR, download_key)
    if not os.path.isfile(filepath):
        raise HTTPException(404, detail="文件不存在或已过期")

    with open(filepath, "rb") as f:
        file_bytes = f.read()

    file_base64 = base64.b64encode(file_bytes).decode("utf-8")

    ext = os.path.splitext(download_key)[1].lower()
    return {
        "code": 0,
        "message": "下载成功",
        "data": {
            "file_base64": file_base64,
            "filename": download_key,
            "size": len(file_bytes),
            "content_type": {
                ".pdf": "application/pdf",
                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".png": "image/png",
                ".jpg": "image/jpeg",
            }.get(ext, "application/octet-stream"),
        },
    }


@app.post("/api/generate/barcode")
async def generate_barcode_api(
    body: dict = Body(...),
):
    """生成条形码图片"""
    data = body.get("data", "")
    barcode_type = body.get("barcode_type", "code128")

    if not data or not data.strip():
        raise HTTPException(400, detail="请输入要编码的数据")

    if barcode_type not in BARCODE_TYPES:
        raise HTTPException(400, detail=f"不支持的条形码类型: {barcode_type}")

    try:
        result = await generate_barcode(data, barcode_type)

        # 保存到输出目录
        task_id = uuid.uuid4().hex[:12]
        filename = f"barcode_{task_id}.png"
        output_path = os.path.join(OUTPUT_DIR, filename)

        with open(output_path, "wb") as f:
            f.write(result["image_data"])

        file_size = os.path.getsize(output_path)

        return {
            "code": 0,
            "message": "条形码生成成功",
            "data": {
                "download_url": f"/api/download/{filename}",
                "filename": f"条形码_{barcode_type}.png",
                "size": file_size,
                "barcode_type": barcode_type,
                "download_key": filename,
            },
        }
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        logger.error("条形码生成失败: %s", str(e))
        raise HTTPException(500, detail=f"条形码生成失败: {str(e)}")


@app.post("/api/generate/qrcode")
async def generate_qrcode_api(
    body: dict = Body(...),
):
    """生成二维码图片"""
    data = body.get("data", "")

    if not data or not data.strip():
        raise HTTPException(400, detail="请输入要编码的数据")

    try:
        result = await generate_qrcode(data)

        # 保存到输出目录
        task_id = uuid.uuid4().hex[:12]
        filename = f"qrcode_{task_id}.png"
        output_path = os.path.join(OUTPUT_DIR, filename)

        with open(output_path, "wb") as f:
            f.write(result["image_data"])

        file_size = os.path.getsize(output_path)

        return {
            "code": 0,
            "message": "二维码生成成功",
            "data": {
                "download_url": f"/api/download/{filename}",
                "filename": "二维码.png",
                "size": file_size,
                "download_key": filename,
            },
        }
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        logger.error("二维码生成失败: %s", str(e))
        raise HTTPException(500, detail=f"二维码生成失败: {str(e)}")


async def _handle_conversion(file: UploadFile, convert_type: str, convert_fn, output_ext: str):
    """
    通用转换处理流程：
      1. 保存上传文件
      2. 调用转换函数
      3. 返回下载信息
    """
    task_id = uuid.uuid4().hex[:12]
    input_ext = os.path.splitext(file.filename)[1]
    input_path = os.path.join(UPLOAD_DIR, f"{task_id}{input_ext}")
    output_filename = f"{task_id}{output_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    try:
        # 保存上传文件
        content = await file.read()
        if not content:
            raise HTTPException(400, detail="上传文件为空")

        with open(input_path, "wb") as f:
            f.write(content)

        logger.info("开始转换 [%s] %s (%d bytes)", convert_type, file.filename, len(content))

        # 图片类（img2pdf）需要进行内容安全校验
        if convert_type == "img2pdf":
            check = await check_image(input_path)
            if not check.get("safe", True):
                logger.warning("图片安全校验未通过: %s", file.filename)
                raise HTTPException(400, detail="图片内容包含违规信息，请更换图片")

        # 执行转换
        await convert_fn(input_path, output_path)

        if not os.path.isfile(output_path):
            raise RuntimeError("转换后未生成输出文件")

        file_size = os.path.getsize(output_path)
        logger.info("转换完成 [%s] %s → %s (%d bytes)", convert_type, file.filename, output_filename, file_size)

        # 读取文件内容，返回 base64（避免云托管多实例文件不同步问题）
        with open(output_path, "rb") as f:
            file_base64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "code": 0,
            "message": "转换成功",
            "data": {
                "download_url": f"/api/download/{output_filename}",
                "filename": os.path.splitext(file.filename)[0] + output_ext,
                "size": file_size,
                "download_key": output_filename,
                "file_base64": file_base64,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("转换失败 [%s] %s: %s", convert_type, file.filename, str(e))
        raise HTTPException(500, detail=f"转换失败: {str(e)}")
    finally:
        # 清理上传的临时文件
        try:
            if os.path.isfile(input_path):
                os.remove(input_path)
        except Exception as e:
            logger.warning("清理上传文件失败: %s", e)


@app.get("/api/download/{filename:path}")
async def download_file(filename: str):
    """提供转换后文件的下载"""
    filepath = os.path.join(OUTPUT_DIR, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(404, detail="文件不存在或已过期")

    # 根据扩展名设置 content-type
    ext = os.path.splitext(filename)[1].lower()
    media_type = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }.get(ext, "application/octet-stream")

    return FileResponse(filepath, media_type=media_type, filename=filename)


# ── 启动 ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
