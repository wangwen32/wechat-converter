"""OCR 文字识别服务

使用 PaddleOCR（如已安装）或回退到 PyMuPDF 文本提取。
生产环境建议安装 PaddleOCR: pip install paddlepaddle paddleocr
"""

import os
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=1)

# 尝试导入 PaddleOCR
try:
    from paddleocr import PaddleOCR
    PADDLE_AVAILABLE = True
except ImportError:
    PADDLE_AVAILABLE = False
    logger.warning("PaddleOCR 未安装，OCR 将使用 PyMuPDF 文本提取")

_ocr = None  # 延迟初始化，放在 try 外面确保变量始终存在


def get_ocr():
    global _ocr
    if PADDLE_AVAILABLE and _ocr is None:
        _ocr = PaddleOCR(use_angle_cls=True, lang='ch', show_log=False)
    return _ocr


async def ocr_image(input_path: str, lang: str = "ch") -> dict:
    """识别图片中的文字

    Returns:
        {"text": "识别结果", "confidence": 0.95, "method": "paddleocr|pymupdf"}
    """
    return await asyncio.get_event_loop().run_in_executor(
        _executor, _do_ocr, input_path, lang,
    )


def _do_ocr(input_path: str, lang: str) -> dict:
    # 优先使用 PaddleOCR
    ocr_engine = get_ocr()
    if ocr_engine:
        try:
            result = ocr_engine.ocr(input_path, cls=True)
            texts = []
            confidences = []
            if result and result[0]:
                for line in result[0]:
                    texts.append(line[1][0])
                    confidences.append(line[1][1])
            avg_conf = sum(confidences) / len(confidences) if confidences else 0
            return {
                "text": "\n".join(texts),
                "confidence": round(avg_conf, 4),
                "method": "paddleocr",
            }
        except Exception as e:
            logger.warning("PaddleOCR 识别失败, 回退到 PyMuPDF: %s", str(e)[:100])

    # 回退: 使用 PyMuPDF 提取 PDF 中的文本
    try:
        import fitz
        doc = fitz.open(input_path)
        text = ""
        for page in doc:
            text += page.get_text("text") + "\n"
        doc.close()
        if text.strip():
            return {"text": text.strip(), "confidence": 1.0, "method": "pymupdf"}
        return {"text": "未识别到文字", "confidence": 0, "method": "none"}
    except Exception as e:
        return {"text": f"识别失败: {str(e)}", "confidence": 0, "method": "error"}
