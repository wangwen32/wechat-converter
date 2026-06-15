"""老照片修复/上色服务

优先使用百度AI API（需配置 BAIDU_API_KEY / BAIDU_SECRET_KEY），
回退到 Pillow 基础增强。
"""

import os
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageEnhance, ImageFilter

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=1)


async def restore_photo(input_path: str, output_path: str) -> str:
    """修复老照片（优先百度AI，回退Pillow基础增强）"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        from services.baidu_ai_service import enhance_image
        result_bytes = await enhance_image(input_path)
        with open(output_path, "wb") as f:
            f.write(result_bytes)
        logger.info("百度AI图片修复成功")
        return output_path
    except ImportError:
        logger.info("baidu_ai_service 未找到")
    except Exception as e:
        logger.warning("百度AI修复失败，回退到基础增强: %s", str(e)[:100])

    # 回退：Pillow 基础增强
    await asyncio.get_event_loop().run_in_executor(
        _executor, _do_enhance, input_path, output_path,
    )
    return output_path


async def colorize_photo(input_path: str, output_path: str) -> str:
    """照片上色（优先百度AI，回退基础增强）"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        from services.baidu_ai_service import colorize_image
        result_bytes = await colorize_image(input_path)
        with open(output_path, "wb") as f:
            f.write(result_bytes)
        logger.info("百度AI图片上色成功")
        return output_path
    except ImportError:
        logger.info("baidu_ai_service 未找到")
    except Exception as e:
        logger.warning("百度AI上色失败，回退到基础增强: %s", str(e)[:100])

    await asyncio.get_event_loop().run_in_executor(
        _executor, _do_enhance, input_path, output_path,
    )
    return output_path


def _do_enhance(input_path: str, output_path: str):
    """Pillow 基础图像增强（回退方案）"""
    with Image.open(input_path) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")
        img = img.filter(ImageFilter.MedianFilter(3))
        img = ImageEnhance.Contrast(img).enhance(1.2)
        img = ImageEnhance.Sharpness(img).enhance(1.3)
        img = ImageEnhance.Brightness(img).enhance(1.05)
        img = ImageEnhance.Color(img).enhance(1.15)
        img.save(output_path, "JPEG", quality=92)
