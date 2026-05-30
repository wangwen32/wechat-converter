"""img2pdf 服务：图片 → PDF 转换"""

import os
import img2pdf
import asyncio
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

_executor = ThreadPoolExecutor(max_workers=2)


async def images_to_pdf(input_path: str, output_path: str) -> str:
    """
    将图片转换为 PDF

    Args:
        input_path:   图片文件路径
        output_path:  输出 .pdf 文件路径

    Returns:
        转换后的 PDF 文件路径

    Raises:
        FileNotFoundError: 输入文件不存在
        RuntimeError:      转换失败
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"文件不存在: {input_path}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        await asyncio.get_event_loop().run_in_executor(
            _executor,
            _do_convert,
            input_path,
            output_path,
        )
        return output_path
    except Exception as e:
        raise RuntimeError(f"图片→PDF 转换失败: {str(e)}")


def _do_convert(input_path: str, output_path: str):
    """同步转换逻辑"""
    # 先尝试用 img2pdf（保留图像原始质量）
    with open(input_path, "rb") as f:
        img_data = f.read()

    # img2pdf 需要知道图片尺寸，用 Pillow 读取
    with Image.open(input_path) as img:
        # 转为 RGB（RGBA 需要处理透明通道）
        if img.mode in ("RGBA", "P"):
            # 创建白色背景
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            rgb_path = input_path + "_rgb.png"
            background.save(rgb_path, "PNG")
            with open(rgb_path, "rb") as f:
                rgb_data = f.read()
            os.remove(rgb_path)
            img_data = rgb_data

    # 使用 img2pdf 转换
    pdf_bytes = img2pdf.convert(img_data)
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)
