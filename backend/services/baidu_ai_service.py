"""百度AI API 服务 — 图片修复/上色/人像分割

使用方式：
  1. 到 https://console.bce.baidu.com/ai 注册账号
  2. 创建应用，获取 API Key 和 Secret Key
  3. 设置环境变量 BAIDU_API_KEY 和 BAIDU_SECRET_KEY
"""

import os
import base64
import logging
import time
import httpx

logger = logging.getLogger(__name__)

BAIDU_API_KEY = os.getenv("BAIDU_API_KEY", "")
BAIDU_SECRET_KEY = os.getenv("BAIDU_SECRET_KEY", "")
_token_cache = {"token": "", "expires_at": 0}

# API 端点
URL_TOKEN = "https://aip.baidubce.com/oauth/2.0/token"
URL_ENHANCE = "https://aip.baidubce.com/rest/2.0/image-process/v1/image_quality_enhance"
URL_COLORIZE = "https://aip.baidubce.com/rest/2.0/image-process/v1/colourize"
URL_BODY_SEG = "https://aip.baidubce.com/rest/2.0/image-classify/v1/body_seg"


async def get_access_token() -> str:
    """获取百度 AI access_token（自动缓存刷新）"""
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]
    if not BAIDU_API_KEY or not BAIDU_SECRET_KEY:
        raise RuntimeError("未配置 BAIDU_API_KEY 和 BAIDU_SECRET_KEY")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(URL_TOKEN, params={
            "grant_type": "client_credentials",
            "client_id": BAIDU_API_KEY,
            "client_secret": BAIDU_SECRET_KEY,
        })
        data = resp.json()
        if "access_token" in data:
            _token_cache["token"] = data["access_token"]
            _token_cache["expires_at"] = now + data.get("expires_in", 2592000) - 300
            return data["access_token"]
        raise RuntimeError(f"获取 access_token 失败: {data.get('error_description', '未知错误')}")


async def enhance_image(image_path: str) -> bytes:
    """图片修复（去噪/增强/去模糊）"""
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read()).decode("utf-8")
    token = await get_access_token()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{URL_ENHANCE}?access_token={token}", data={"image": img_base64})
        result = resp.json()
        if "image" in result:
            return base64.b64decode(result["image"])
        logger.warning("图片修复失败: %s", result.get("error_msg", ""))
        raise RuntimeError(result.get("error_msg", "修复失败"))


async def colorize_image(image_path: str) -> bytes:
    """图片上色（黑白照片转为彩色）"""
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read()).decode("utf-8")
    token = await get_access_token()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{URL_COLORIZE}?access_token={token}", data={"image": img_base64})
        result = resp.json()
        if "image" in result:
            return base64.b64decode(result["image"])
        logger.warning("图片上色失败: %s", result.get("error_msg", ""))
        raise RuntimeError(result.get("error_msg", "上色失败"))


async def segment_body(image_path: str) -> dict:
    """人像分割（返回前景蒙版和前景图）"""
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read()).decode("utf-8")
    token = await get_access_token()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{URL_BODY_SEG}?access_token={token}",
                                 data={"image": img_base64, "type": "foreground"})
        result = resp.json()
        if "foreground" in result:
            return {
                "foreground": result["foreground"],  # 前景图 base64
                "scoremap": result.get("scoremap", ""),
                "labelmap": result.get("labelmap", ""),
            }
        logger.warning("人像分割失败: %s", result.get("error_msg", ""))
        raise RuntimeError(result.get("error_msg", "人像分割失败"))
