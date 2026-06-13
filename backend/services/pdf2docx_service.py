"""pdf2docx 服务：PDF → Word 转换

转换前用 PyMuPDF 检测 PDF 是否包含文本层，
对扫描件（纯图片）提前给出明确提示。
"""

import os
import re
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=2)

# 每页最少文本字符数，低于此值判定为扫描件
MIN_TEXT_CHARS_PER_PAGE = 30


async def pdf_to_word(input_path: str, output_path: str) -> str:
    """
    使用 pdf2docx 将 PDF 转换为 Word 文档

    步骤：
      1. 用 PyMuPDF 检测 PDF 是否有文本层
      2. 有文本 → pdf2docx 转换
      3. 无文本 → 提示扫描件无法转换

    Args:
        input_path:   .pdf 文件路径
        output_path:  输出 .docx 文件路径

    Returns:
        转换后的 Word 文件路径

    Raises:
        FileNotFoundError: 输入文件不存在
        RuntimeError:      转换失败（含扫描件提示）
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"文件不存在: {input_path}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # 先用 PyMuPDF 检测文本层
    text_ok = await asyncio.get_event_loop().run_in_executor(
        _executor, _check_text_layer, input_path
    )

    if not text_ok:
        raise RuntimeError(
            "该 PDF 没有可提取的文本层，可能是扫描件。\n"
            "请先使用 OCR 工具（如 Adobe Acrobat、ABBYY）识别文字后再上传。"
        )

    try:
        # pdf2docx 是同步库，扔到线程池跑以免阻塞事件循环
        await asyncio.get_event_loop().run_in_executor(
            _executor,
            _do_convert,
            input_path,
            output_path,
        )
        return output_path
    except Exception as e:
        raise RuntimeError(f"PDF→Word 转换失败: {str(e)}")


def _check_text_layer(input_path: str) -> bool:
    """检测 PDF 是否包含足量的文本层

    用 PyMuPDF 遍历所有页面，统计纯文本长度。
    如果平均每页文本少于 MIN_TEXT_CHARS_PER_PAGE 个字符，
    判定为扫描件（纯图片 PDF）。

    Returns:
        True  — 有文本层，可以继续转换
        False — 无文本层，疑似扫描件
    """
    try:
        doc = fitz.open(input_path)
        page_count = doc.page_count

        if page_count == 0:
            doc.close()
            return False

        total_chars = 0
        for page_num in range(page_count):
            page = doc[page_num]
            text = page.get_text("text")
            # 去除空白和分隔符后统计有效字符
            clean = re.sub(r'\s+', '', text)
            total_chars += len(clean)

        doc.close()

        avg_chars = total_chars / page_count
        logger.info(
            "PDF 文本检测: %d 页, 共 %d 有效字符, 平均 %.1f 字符/页 (阈值 %d)",
            page_count, total_chars, avg_chars, MIN_TEXT_CHARS_PER_PAGE,
        )

        return avg_chars >= MIN_TEXT_CHARS_PER_PAGE

    except Exception as e:
        logger.warning("文本层检测异常，默认继续转换: %s", str(e)[:120])
        return True  # 检测失败时保守处理，让 pdf2docx 尝试


def _do_convert(input_path: str, output_path: str):
    """同步转换逻辑"""
    from pdf2docx import Converter

    cv = Converter(input_path)
    try:
        cv.convert(output_path, start=0, end=None)
    finally:
        cv.close()
