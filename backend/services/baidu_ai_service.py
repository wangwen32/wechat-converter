"""百度AI API 服务 — 图片修复/上色/人像分割"""

import os
import base64
import logging
import time
import httpx

logger = logging.getLogger(__name__)

BAIDU_API_KEY = os.getenv("BAIDU_API_KEY", "")
BAIDU_SECRET_KEY = os.getenv("BAIDU_SECRET_KEY", "")
_token_cache = {"token": "", "expires_at": 0}

URL_TOKEN = "https://aip.baidubce.com/oauth/2.0/token"
URL_ENHANCE = "https://aip.baidubce.com/rest/2.0/image-process/v1/image_quality_enhance"
URL_COLORIZE = "https://aip.baidubce.com/rest/2.0/image-process/v1/colourize"
URL_BODY_SEG = "https://aip.baidubce.com/rest/2.0/image-classify/v1/body_seg"


async def get_access_token() -> str:
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]
    if not BAIDU_API_KEY or not BAIDU_SECRET_KEY:
        raise RuntimeError("未配置 BAIDU_API_KEY 和 BAIDU_SECRET_KEY")
    logger.info("正在获取百度AI access_token...")
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
            logger.info("百度AI access_token 获取成功")
            return data["access_token"]
        err = data.get("error_description", data.get("error", "未知错误"))
        logger.error("百度AI access_token 获取失败: %s", err)
        raise RuntimeError(f"获取 access_token 失败: {err}")


async def enhance_image(image_path: str) -> bytes:
    """图片修复 — 调用百度AI图像增强"""
    logger.info("百度AI图片修复开始: %s (%d bytes)", image_path, os.path.getsize(image_path))
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read()).decode("utf-8")
    token = await get_access_token()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{URL_ENHANCE}?access_token={token}", data={"image": img_base64})
        result = resp.json()
    if "image" in result:
        logger.info("百度AI图片修复成功")
        return base64.b64decode(result["image"])
    logger.error("百度AI图片修复失败, API返回: %s", str(result)[:300])
    raise RuntimeError(result.get("error_msg", "百度AI修复失败"))


async def colorize_image(image_path: str) -> bytes:
    """图片上色 — 调用百度AI图像上色"""
    logger.info("百度AI图片上色开始: %s (%d bytes)", image_path, os.path.getsize(image_path))
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read()).decode("utf-8")
    token = await get_access_token()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{URL_COLORIZE}?access_token={token}", data={"image": img_base64})
        result = resp.json()
    if "image" in result:
        logger.info("百度AI图片上色成功")
        return base64.b64decode(result["image"])
    logger.error("百度AI图片上色失败, API返回: %s", str(result)[:300])
    raise RuntimeError(result.get("error_msg", "百度AI上色失败"))


async def segment_body(image_path: str) -> dict:
    """人像分割 — 调用百度AI人像分割"""
    logger.info("百度AI人像分割开始: %s (%d bytes)", image_path, os.path.getsize(image_path))
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read()).decode("utf-8")
    token = await get_access_token()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{URL_BODY_SEG}?access_token={token}",
                                 data={"image": img_base64, "type": "foreground"})
        result = resp.json()
    if "foreground" in result:
        logger.info("百度AI人像分割成功")
        return {"foreground": result["foreground"],
                "scoremap": result.get("scoremap", ""),
                "labelmap": result.get("labelmap", "")}
    logger.error("百度AI人像分割失败, API返回: %s", str(result)[:300])
    raise RuntimeError(result.get("error_msg", "百度AI人像分割失败"))
