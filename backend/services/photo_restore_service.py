"""老照片修复/上色服务

使用 Hugging Face 或第三方 API，也可部署 GFPGAN/DeOldify 模型。
当前提供模拟实现 + 基于 Pillow 的基础增强。
"""

import os
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageEnhance, ImageFilter

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=1)


async def restore_photo(input_path: str, output_path: str) -> str:
    """修复老照片（去噪 + 增强对比度 + 锐化）"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    await asyncio.get_event_loop().run_in_executor(
        _executor, _do_restore, input_path, output_path,
    )
    return output_path


def _do_restore(input_path: str, output_path: str):
    with Image.open(input_path) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")

        # 去噪（轻微模糊去除噪点）
        img = img.filter(ImageFilter.MedianFilter(3))

        # 增强对比度
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.2)

        # 增强锐度
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.3)

        # 增强亮度
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.05)

        # 增强色彩
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.15)

        img.save(output_path, "JPEG", quality=92)


async def colorize_photo(input_path: str, output_path: str) -> str:
    """照片上色（当前为模拟，建议接入专业 API）"""
    # 目前返回增强版黑白照片
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    await asyncio.get_event_loop().run_in_executor(
        _executor, _do_restore, input_path, output_path,
    )
    return output_path
