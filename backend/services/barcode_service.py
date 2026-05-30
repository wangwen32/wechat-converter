"""条形码生成服务"""

import os
import io
import asyncio
import barcode
from barcode.writer import ImageWriter
from concurrent.futures import ThreadPoolExecutor
from config import BARCODE_TYPES

_executor = ThreadPoolExecutor(max_workers=2)

# 注册所有支持的条形码类型
barcode.PROVIDED_BARCODES  # 触发模块初始化


async def generate_barcode(data: str, barcode_type: str = "code128") -> dict:
    """
    生成条形码图片

    Args:
        data:         要编码的数据
        barcode_type: 条形码类型 (code39, code128, ean13 等)

    Returns:
        {
            "output_path": 生成的图片文件路径,
            "filename":    文件名,
            "size":        文件大小
        }

    Raises:
        ValueError:      不支持的条形码类型或无效数据
        RuntimeError:    生成失败
    """
    if barcode_type not in BARCODE_TYPES:
        raise ValueError(f"不支持的条形码类型: {barcode_type}，支持: {', '.join(BARCODE_TYPES.keys())}")

    if not data or not data.strip():
        raise ValueError("请输入要编码的数据")

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            _executor,
            _do_generate,
            data.strip(),
            barcode_type,
        )
        return result
    except ValueError:
        raise
    except Exception as e:
        raise RuntimeError(f"条形码生成失败: {str(e)}")


def _do_generate(data: str, barcode_type: str) -> dict:
    """同步生成条形码"""
    from barcode import get_barcode_class

    barcode_cls = get_barcode_class(barcode_type)
    if barcode_cls is None:
        raise ValueError(f"不支持的条形码类型: {barcode_type}")

    # 对于 EAN/UPC/ISBN 等数字类条形码，只保留数字
    if barcode_type in ("ean13", "ean8", "upca", "isbn13", "issn"):
        data = "".join(c for c in data if c.isdigit())

    # 生成条形码
    writer = ImageWriter()
    writer.set_options({
        "module_width": 0.3,
        "module_height": 15.0,
        "font_size": 12,
        "text_distance": 5,
        "quiet_zone": 6.0,
        "background": "white",
        "foreground": "black",
        "format": "PNG",
    })

    try:
        barcode_obj = barcode_cls(data, writer=writer)
    except Exception as e:
        raise ValueError(f"条形码数据无效，请检查输入内容。{str(e)}")

    # 输出到字节流
    stream = io.BytesIO()
    barcode_obj.write(stream)
    stream.seek(0)

    return {
        "image_data": stream.getvalue(),
        "filename": f"barcode_{barcode_type}.png",
    }
