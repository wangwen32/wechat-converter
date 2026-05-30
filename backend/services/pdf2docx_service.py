"""pdf2docx 服务：PDF → Word 转换"""

import os
import asyncio
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=2)


async def pdf_to_word(input_path: str, output_path: str) -> str:
    """
    使用 pdf2docx 将 PDF 转换为 Word 文档

    Args:
        input_path:   .pdf 文件路径
        output_path:  输出 .docx 文件路径

    Returns:
        转换后的 Word 文件路径

    Raises:
        FileNotFoundError: 输入文件不存在
        RuntimeError:      转换失败
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"文件不存在: {input_path}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

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


def _do_convert(input_path: str, output_path: str):
    """同步转换逻辑"""
    from pdf2docx import Converter

    cv = Converter(input_path)
    try:
        cv.convert(output_path, start=0, end=None)
    finally:
        cv.close()
