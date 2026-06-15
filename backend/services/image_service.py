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
    ai_ok = False
    try:
        from services.baidu_ai_service import segment_body
        import base64
        seg = await segment_body(input_path)
        fore_b64 = seg.get("foreground", "")
        if fore_b64:
            fore_bytes = base64.b64decode(fore_b64)
            # 保存为 PNG（保留透明通道）
            fore_path = os.path.join(os.path.dirname(output_path), "_fore.png")
            with open(fore_path, "wb") as f:
                f.write(fore_bytes)
            # 用前景图做证件照
            await asyncio.get_event_loop().run_in_executor(
                _executor, _do_id_photo, fore_path, output_path, bg_color, size_mm,
            )
            if os.path.isfile(fore_path):
                os.remove(fore_path)
            logger.info("百度AI人像分割 + 证件照制作完成")
            return output_path
        else:
            logger.warning("百度AI人像分割返回空前景")
    except ImportError:
        logger.info("baidu_ai_service 未找到")
    except Exception as e:
        logger.error("百度AI人像分割失败: %s", str(e)[:200])

    # 回退：直接居中放置
    logger.info("使用普通方式制作证件照（无AI抠图）")
    await asyncio.get_event_loop().run_in_executor(
        _executor, _do_id_photo_plain, input_path, output_path, bg_color, size_mm,
    )
    return output_path


def _has_alpha(img) -> bool:
    """检测图片是否有透明通道"""
    return img.mode in ("RGBA", "LA", "PA", "P") or "transparency" in img.info


def _get_alpha_mask(img):
    """获取图片的透明通道mask"""
    if img.mode == "RGBA":
        return img.split()[-1]
    if img.mode == "P":
        return img.convert("RGBA").split()[-1]
    return None


def _do_id_photo(fore_path: str, output_path: str, bg_color: str, size_mm: tuple):
    """用百度AI前景图（带透明通道）合成证件照"""
    from PIL import ImageColor
    img = Image.open(fore_path)

    dpi = 300
    target_w = int(size_mm[0] / 25.4 * dpi)
    target_h = int(size_mm[1] / 25.4 * dpi)

    # 缩放到合适大小
    ratio = min(target_w / img.width, target_h / img.height) * 0.85
    new_w = int(img.width * ratio)
    new_h = int(img.height * ratio)
    img = img.resize((new_w, new_h), Image.LANCZOS)

    # 确保有 alpha 通道
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    bg_rgb = ImageColor.getrgb(bg_color)
    canvas = Image.new("RGBA", (target_w, target_h), (*bg_rgb, 255))

    x = (target_w - new_w) // 2
    y = (target_h - new_h) // 2
    canvas.paste(img, (x, y), img)  # 用自身 alpha 做 mask 合成

    canvas.convert("RGB").save(output_path, "JPEG", quality=95)
    img.close()


def _do_id_photo_plain(input_path: str, output_path: str, bg_color: str, size_mm: tuple):
    """无AI时：直接缩放+居中放置（无法去掉原背景）"""
    from PIL import ImageColor
    img = Image.open(input_path)

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

    # 原图可能有透明通道（如 PNG 透明背景）
    mask = _get_alpha_mask(img)
    if mask:
        canvas.paste(img.convert("RGB"), (x, y), mask)
    else:
        canvas.paste(img.convert("RGB"), (x, y))

    canvas.save(output_path, "JPEG", quality=95)
    img.close()
