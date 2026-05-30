"""PDF 水印移除服务

使用 PyMuPDF (fitz) 检测并移除 PDF 中的水印内容。

策略：
  1. 检测每页重复出现的文本块（相同位置 + 相同内容 → 很可能是水印）
  2. 检测旋转的文本（常见水印特征）
  3. 使用 PDF 红批功能移除水印内容
"""

import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict

import fitz  # PyMuPDF

_executor = ThreadPoolExecutor(max_workers=2)

# 常见水印关键词（中英文）
WATERMARK_KEYWORDS = [
    "watermark", "draft", "confidential", "sample", "demo", "preview",
    "copy", "proprietary", "internal use", "do not copy",
    "水印", "草稿", "样本", "样例", "示范", "预览", "测试",
    "内部", "机密", "禁止转载", "仅供参考", "未经授权",
]


async def remove_watermark(input_path: str, output_path: str) -> str:
    """
    移除 PDF 中的水印

    Args:
        input_path:  输入 .pdf 文件路径
        output_path: 输出 .pdf 文件路径

    Returns:
        处理后的 PDF 文件路径

    Raises:
        FileNotFoundError: 输入文件不存在
        RuntimeError:      处理失败
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"文件不存在: {input_path}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        await asyncio.get_event_loop().run_in_executor(
            _executor,
            _do_remove_watermark,
            input_path,
            output_path,
        )
        return output_path
    except Exception as e:
        raise RuntimeError(f"水印移除失败: {str(e)}")


def _do_remove_watermark(input_path: str, output_path: str):
    """同步执行水印移除"""
    doc = fitz.open(input_path)

    if doc.page_count == 0:
        doc.close()
        raise ValueError("PDF 文件为空")

    modified = False

    # ── Strategy 1: 移除重复出现在各页相同位置的文本 ──
    modified |= _remove_repeated_text_watermarks(doc)

    # ── Strategy 2: 移除包含水印关键词的文本块 ──
    modified |= _remove_keyword_watermarks(doc)

    # ── Strategy 3: 移除所有页面的注释/图章类型的水印 ──
    modified |= _remove_annotation_watermarks(doc)

    if modified:
        # 增量保存（只保存修改部分，速度快）
        doc.save(output_path, incremental=False, deflate=True, garbage=3)
    else:
        # 没有修改，直接复制原文件
        doc.save(output_path, incremental=False, deflate=True)

    doc.close()
    return output_path


def _remove_repeated_text_watermarks(doc: fitz.Document) -> bool:
    """Strategy 1: 移除重复出现在各页相同位置的文本

    原理：水印通常在每个页面的相同位置出现相同的文本内容。
    """
    if doc.page_count < 2:
        return False

    # 收集每页的文本块
    page_blocks = []
    for page_num in range(doc.page_count):
        page = doc[page_num]
        blocks = page.get_text("blocks")
        # block 结构: (x0, y0, x1, y1, text, block_no, block_type)
        # block_type: 0=text, 1=image
        texts = []
        for b in blocks:
            if b[6] == 0:  # text block
                text = b[4].strip()
                if text and len(text) < 100:  # 过长的文本不太可能是水印
                    texts.append({
                        "x0": b[0], "y0": b[1], "x1": b[2], "y1": b[3],
                        "text": text,
                        "page": page_num,
                        "center_x": (b[0] + b[2]) / 2,
                        "center_y": (b[1] + b[3]) / 2,
                    })
        page_blocks.append(texts)

    # 跨页面统计：相同或非常接近的位置出现相同文本 → 水印
    # 使用 (舍入后的位置, 文本) 作为键
    position_text_count = defaultdict(int)
    position_text_info = {}

    for page_num, blocks in enumerate(page_blocks):
        seen_on_page = set()  # 避免同一页内重复计数
        for b in blocks:
            # 舍入位置容差 20 像素
            key = (round(b["x0"] / 20), round(b["y0"] / 20),
                   round(b["x1"] / 20), round(b["y1"] / 20), b["text"])
            if key not in seen_on_page:
                position_text_count[key] += 1
                seen_on_page.add(key)
                if key not in position_text_info:
                    position_text_info[key] = b

    # 出现在超过一半页面上的 → 判定为水印
    threshold = max(2, doc.page_count // 2)
    watermark_keys = {
        k for k, v in position_text_count.items()
        if v >= threshold
    }

    if not watermark_keys:
        return False

    modified = False
    for page_num in range(doc.page_count):
        page = doc[page_num]
        page_rect = page.rect
        for key in watermark_keys:
            info = position_text_info[key]
            # 在水印位置创建覆盖矩形
            rect = fitz.Rect(info["x0"], info["y0"], info["x1"], info["y1"])
            # 覆盖（用白色矩形遮盖）
            page.add_redact_annot(rect, fill=fitz.utils.getColor("white"))
            modified = True

        if modified:
            page.apply_redactions()

    return modified


def _remove_keyword_watermarks(doc: fitz.Document) -> bool:
    """Strategy 2: 移除包含水印关键词的文本块"""
    modified = False

    for page_num in range(doc.page_count):
        page = doc[page_num]
        blocks = page.get_text("blocks")

        for b in blocks:
            if b[6] != 0:  # 只处理文本块
                continue
            text = b[4].strip().lower()
            if not text:
                continue

            # 检查是否包含水印关键词
            is_watermark = any(kw in text for kw in WATERMARK_KEYWORDS)

            if is_watermark:
                rect = fitz.Rect(b[0], b[1], b[2], b[3])
                # 检查是否在页面边缘区域（水印常见位置）
                page_rect = page.rect
                # 如果文本块在页面中央区域，更可能是水印
                page_center_x = page_rect.width / 2
                block_center_x = (b[0] + b[2]) / 2
                in_center = abs(block_center_x - page_center_x) < page_rect.width * 0.3

                # 如果在中央区域或是斜的水印，覆盖它
                if in_center or _is_diagonal_text(page, rect):
                    page.add_redact_annot(rect, fill=fitz.utils.getColor("white"))
                    modified = True

        if modified:
            page.apply_redactions()

    return modified


def _is_diagonal_text(page: fitz.Page, rect: fitz.Rect) -> bool:
    """检测文本块是否倾斜（水印常见于 45 度角）"""
    try:
        blocks = page.get_text("dict")["blocks"]
        for b in blocks:
            if b["type"] != 0:  # text
                continue
            for line in b.get("lines", []):
                for span in line.get("spans", []):
                    # 检查字体变换矩阵是否有旋转
                    if "transform" in span:
                        matrix = span["transform"]
                        # 简单的旋转检测
                        if abs(matrix[1]) > 0.1 or abs(matrix[2]) > 0.1:
                            return True
    except Exception:
        pass
    return False


def _remove_annotation_watermarks(doc: fitz.Document) -> bool:
    """Strategy 3: 移除所有页面的注释/图章类型的水印"""
    modified = False

    for page_num in range(doc.page_count):
        page = doc[page_num]
        annots = list(page.annots()) if page.first_annot else []

        for annot in annots:
            try:
                # 某些注释类型可能是水印
                annot_type = annot.type[0] if hasattr(annot, 'type') and annot.type else None
                # Watermark 注释类型
                if annot_type in (fitz.PDF_ANNOT_WIDGET,):
                    page.delete_annot(annot)
                    modified = True
            except Exception:
                pass

    return modified
