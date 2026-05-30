"""二维码生成服务"""

import os
import io
import asyncio
import qrcode
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=2)


async def generate_qrcode(data: str) -> dict:
    """
    生成二维码图片

    Args:
        data: 要编码的数据（文本、URL 等）

    Returns:
        {
            "image_data": 图片二进制数据,
            "filename":   文件名
        }

    Raises:
        ValueError:   数据为空
        RuntimeError: 生成失败
    """
    if not data or not data.strip():
        raise ValueError("请输入要编码的数据")

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            _executor,
            _do_generate,
            data.strip(),
        )
        return result
    except ValueError:
        raise
    except Exception as e:
        raise RuntimeError(f"二维码生成失败: {str(e)}")


def _do_generate(data: str) -> dict:
    """同步生成二维码"""
    qr = qrcode.QRCode(
        version=None,  # 自动确定版本
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # 高容错
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # 生成图片
    img = qr.make_image(fill_color="black", back_color="white")

    # 输出到字节流
    stream = io.BytesIO()
    img.save(stream, format="PNG")
    stream.seek(0)

    # 同时生成带 logo 的版本（居中放一个小图标？暂不实现）

    return {
        "image_data": stream.getvalue(),
        "filename": "qrcode.png",
    }
