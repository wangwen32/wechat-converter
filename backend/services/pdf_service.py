"""PDF 合并/拆分服务 — 基于 PyMuPDF"""

import os
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

import fitz

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=2)


async def merge_pdfs(input_paths: list, output_path: str) -> str:
    """合并多个 PDF 为一个"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    await asyncio.get_event_loop().run_in_executor(
        _executor, _do_merge, input_paths, output_path,
    )
    return output_path


def _do_merge(input_paths: list, output_path: str):
    merger = fitz.open()
    for path in input_paths:
        if os.path.isfile(path):
            merger.insert_pdf(fitz.open(path))
    merger.save(output_path)
    merger.close()


async def split_pdf(input_path: str, output_dir: str, mode: str = "all", page_ranges: str = "") -> list:
    """拆分 PDF

    mode: all-每页一文件, range-指定页码范围
    page_ranges: mode=range 时使用, 如 "1-3,5-7"
    """
    os.makedirs(output_dir, exist_ok=True)
    return await asyncio.get_event_loop().run_in_executor(
        _executor, _do_split, input_path, output_dir, mode, page_ranges,
    )


def _do_split(input_path: str, output_dir: str, mode: str, page_ranges: str) -> list:
    doc = fitz.open(input_path)
    total = doc.page_count
    output_files = []

    if mode == "all":
        for i in range(total):
            out = fitz.open()
            out.insert_pdf(doc, from_page=i, to_page=i)
            fname = f"page_{i+1}.pdf"
            fpath = os.path.join(output_dir, fname)
            out.save(fpath)
            out.close()
            output_files.append(fpath)
    elif mode == "range":
        ranges = [r.strip() for r in page_ranges.split(",")]
        for idx, r in enumerate(ranges):
            if "-" in r:
                start, end = r.split("-")
                start, end = int(start)-1, int(end)-1
            else:
                start = end = int(r)-1
            out = fitz.open()
            out.insert_pdf(doc, from_page=start, to_page=end)
            fname = f"part_{idx+1}.pdf"
            fpath = os.path.join(output_dir, fname)
            out.save(fpath)
            out.close()
            output_files.append(fpath)

    doc.close()
    return output_files
