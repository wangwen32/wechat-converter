"""Word → PDF 转换服务

使用 LibreOffice 命令行实现 Word→PDF 转换（替代 Gotenberg）。
支持 .docx, .doc, .ppt, .pptx 等格式转换为 PDF。
"""

import os
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from config import LIBREOFFICE_PATH

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=2)


async def word_to_pdf(input_path: str, output_path: str) -> str:
    """
    使用 LibreOffice 将 Word 文档转换为 PDF

    Args:
        input_path:   .docx 文件路径
        output_path:  输出 .pdf 文件路径

    Returns:
        转换后的 PDF 文件路径

    Raises:
        FileNotFoundError: 输入文件不存在 或 LibreOffice 未找到
        RuntimeError:      转换失败
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"文件不存在: {input_path}")

    if not os.path.isfile(LIBREOFFICE_PATH):
        raise RuntimeError(
            f"未找到 LibreOffice，路径不存在: {LIBREOFFICE_PATH}\n"
            f"请修改 config.py 中的 LIBREOFFICE_PATH 为你实际的安装路径"
        )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                _executor,
                _do_convert,
                input_path,
                output_path,
            ),
            timeout=50,
        )
        return output_path
    except asyncio.TimeoutError:
        raise RuntimeError("转换超时（超过 50 秒），文件可能过大，建议缩小文件后再试")
    except Exception as e:
        raise RuntimeError(f"Word→PDF 转换失败: {str(e)}")


def _do_convert(input_path: str, output_path: str):
    """使用 LibreOffice 命令行执行转换"""
    import subprocess

    # Windows 下将路径转换为绝对路径，避免路径格式问题
    input_path = os.path.abspath(input_path)
    output_path = os.path.abspath(output_path)

    # 输入文件所在目录（LibreOffice 的输出目录参数）
    input_dir = os.path.dirname(input_path)
    output_dir = os.path.dirname(output_path)

    # LibreOffice 命令：
    # soffice.exe --headless --convert-to pdf --outdir <输出目录> <输入文件>
    cmd = [
        LIBREOFFICE_PATH,
        "--headless",
        "--convert-to", "pdf",
        "--outdir", output_dir,
        input_path,
    ]

    logger.info("执行命令: %s", " ".join(cmd))

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,  # 2 分钟超时
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip() or result.stdout.strip() or "未知错误"
            raise RuntimeError(f"LibreOffice 返回错误码 {result.returncode}: {error_msg}")

        logger.info("LibreOffice 转换成功")

        # LibreOffice 会把输出文件放在 --outdir 目录下，文件名相同但扩展名改为 .pdf
        # 所以需要找到生成的 PDF 文件并移动到目标路径
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        generated_pdf = os.path.join(output_dir, f"{base_name}.pdf")

        if os.path.isfile(generated_pdf):
            # 如果生成的文件名与目标路径不同，则移动
            if os.path.abspath(generated_pdf) != os.path.abspath(output_path):
                os.rename(generated_pdf, output_path)
        elif not os.path.isfile(output_path):
            raise RuntimeError(f"转换后未找到输出文件")

    except subprocess.TimeoutExpired:
        raise RuntimeError("LibreOffice 转换超时（120秒），文件可能过大")
    except FileNotFoundError:
        raise RuntimeError(
            f"无法执行 LibreOffice，路径不存在: {LIBREOFFICE_PATH}\n"
            f"请检查安装路径或在 config.py 中修改 LIBREOFFICE_PATH"
        )
