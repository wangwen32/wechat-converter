"""图片处理服务：压缩、证件照等 — 基于 Pillow"""

import os
import asyncio
import io
import logging
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageEnhance

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=2)


async def compress_image(input_path: str, output_path: str, quality: int = 70, max_width: int = 1920) -> str:
    """压缩图片（降低质量 + 限制尺寸）"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    await asyncio.get_event_loop().run_in_executor(
        _executor, _do_compress, input_path, output_path, quality, max_width,
    )
    return output_path


def _do_compress(input_path: str, output_path: str, quality: int, max_width: int):
    with Image.open(input_path) as img:
        # 转为 RGB（移除透明通道以减小体积）
        if img.mode in ("RGBA", "P"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = bg

        # 限制宽度
        if img.width > max_width:
            ratio = max_width / img.width
            img = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)

        # 输出
        ext = os.path.splitext(output_path)[1].lower()
        if ext in (".jpg", ".jpeg"):
            img.save(output_path, "JPEG", quality=quality, optimize=True)
        else:
            img.save(output_path, "PNG", optimize=True)


async def make_id_photo(input_path: str, output_path: str,
                        bg_color: str = "#FFFFFF", size_mm: tuple = (35, 53)) -> str:
    """证件照制作：换背景 + 裁剪为标准尺寸

    优先使用百度AI人像分割（需配置 BAIDU_API_KEY），
    回退到简单居中放置。
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # 尝试百度AI人像分割
    try:
        from services.baidu_ai_service import segment_body
        seg = await segment_body(input_path)
        if seg.get("foreground"):
            import base64
            fore_bytes = base64.b64decode(seg["foreground"])
        fore_path = input_path + "_fore.png"
        with open(fore_path, "wb") as f:
            f.write(fore_bytes)
        # 用前景图做证件照
        await asyncio.get_event_loop().run_in_executor(
            _executor, _do_id_photo, fore_path, output_path, bg_color, size_mm,
        )
        if os.path.isfile(fore_path):
            os.remove(fore_path)
        return output_path
    except ImportError:
        logger.info("baidu_ai_service 未找到")
    except Exception as e:
        logger.warning("百度AI人像分割失败，回退到简单放置: %s", str(e)[:100])

    # 回退：直接居中放置
    await asyncio.get_event_loop().run_in_executor(
        _executor, _do_id_photo, input_path, output_path, bg_color, size_mm,
    )
    return output_path


def _do_id_photo(input_path: str, output_path: str, bg_color: str, size_mm: tuple):
    from PIL import ImageColor

    with Image.open(input_path) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")

        dpi = 300
        target_w = int(size_mm[0] / 25.4 * dpi)
        target_h = int(size_mm[1] / 25.4 * dpi)

        ratio = min(target_w / img.width, target_h / img.height) * 0.85
        new_w = int(img.width * ratio)
        new_h = int(img.height * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)

        bg_rgb = ImageColor.getrgb(bg_color)
        canvas = Image.new("RGB", (target_w, target_h), bg_rgb)

        x = (target_w - new_w) // 2
        y = (target_h - new_h) // 2
        canvas.paste(img, (x, y))

        canvas.save(output_path, "JPEG", quality=95)
