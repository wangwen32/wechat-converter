"""OCR 文字识别服务

支持 Tesseract（系统安装，轻量）和 PaddleOCR（可选，需手动安装）。
按优先级: Tesseract → PaddleOCR → PyMuPDF（仅PDF文本提取）
"""

import os
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=1)

# 尝试导入 pytesseract
try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

# 尝试导入 PaddleOCR
try:
    from paddleocr import PaddleOCR
    PADDLE_AVAILABLE = True
    _paddle = None
except ImportError:
    PADDLE_AVAILABLE = False


async def ocr_image(input_path: str, lang: str = "chi_sim+eng") -> dict:
    """识别图片中的文字

    按优先级尝试：
      1. Tesseract（系统安装，轻量快速）
      2. PaddleOCR（如已安装）
      3. PyMuPDF（仅限 PDF 文件）

    Returns:
        {"text": "识别结果", "confidence": 0.95, "method": "tesseract|paddleocr|pymupdf"}
    """
    return await asyncio.get_event_loop().run_in_executor(
        _executor, _do_ocr, input_path, lang,
    )


def _do_ocr(input_path: str, lang: str) -> dict:
    ext = os.path.splitext(input_path)[1].lower()
    is_image = ext in ('.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff', '.tif')

    # 1. Tesseract（图片专用，轻量快速）
    if TESSERACT_AVAILABLE and is_image:
        try:
            img = Image.open(input_path)
            text = pytesseract.image_to_string(img, lang=lang)
            if text.strip():
                return {
                    "text": text.strip(),
                    "confidence": 0.8,
                    "method": "tesseract",
                }
        except Exception as e:
            logger.warning("Tesseract 识别失败: %s", str(e)[:100])

    # 2. PaddleOCR（如已安装）
    if PADDLE_AVAILABLE and is_image:
        try:
            global _paddle
            if _paddle is None:
                _paddle = PaddleOCR(use_angle_cls=True, lang='ch', show_log=False)
            result = _paddle.ocr(input_path, cls=True)
            texts = []
            confidences = []
            if result and result[0]:
                for line in result[0]:
                    texts.append(line[1][0])
                    confidences.append(line[1][1])
            avg_conf = sum(confidences) / len(confidences) if confidences else 0
            if texts:
                return {
                    "text": "\n".join(texts),
                    "confidence": round(avg_conf, 4),
                    "method": "paddleocr",
                }
        except Exception as e:
            logger.warning("PaddleOCR 识别失败: %s", str(e)[:100])

    # 3. PyMuPDF 提取 PDF 文本（仅 PDF 文件）
    if not is_image:
        try:
            import fitz
            doc = fitz.open(input_path)
            text = "\n".join(page.get_text("text") for page in doc)
            doc.close()
            if text.strip():
                return {"text": text.strip(), "confidence": 1.0, "method": "pymupdf"}
        except Exception as e:
            logger.warning("PyMuPDF 提取失败: %s", str(e)[:100])

    # 全部失败
    if is_image:
        hint = "未识别到文字，建议上传清晰、文字较大的图片"
        if not TESSERACT_AVAILABLE:
            hint += "\n提示: 服务器未安装 OCR 引擎"
    else:
        hint = "该 PDF 没有可提取的文本层（可能是扫描件）"
    return {"text": hint, "confidence": 0, "method": "none"}
