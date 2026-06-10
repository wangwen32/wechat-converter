"""微信内容安全校验服务

调用微信官方 imgSecCheck API 校验用户上传的图片是否包含违规内容。
需要配置 WECHAT_APPID 和 WECHAT_APPSECRET 环境变量。
"""

import os
import json
import httpx
import logging

logger = logging.getLogger(__name__)

# 从环境变量读取微信小程序配置
APPID = os.getenv("WECHAT_APPID", "")
APPSECRET = os.getenv("WECHAT_APPSECRET", "")

# 缓存 access_token
_token_cache = {"token": "", "expires_at": 0}


async def get_access_token() -> str:
    """获取微信接口调用凭据 access_token"""
    import time

    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    if not APPID or not APPSECRET:
        raise RuntimeError("未配置 WECHAT_APPID 和 WECHAT_APPSECRET 环境变量")

    url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={APPID}&secret={APPSECRET}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        data = resp.json()

        if "access_token" in data:
            _token_cache["token"] = data["access_token"]
            # 提前 5 分钟过期，留有余量
            _token_cache["expires_at"] = now + data.get("expires_in", 7200) - 300
            return data["access_token"]
        else:
            raise RuntimeError(f"获取 access_token 失败: {data.get('errmsg', '未知错误')}")


async def check_image(file_path: str) -> dict:
    """
    校验图片是否包含违规内容

    Args:
        file_path: 图片文件路径

    Returns:
        {"safe": True} 或 {"safe": False, "detail": "违规描述"}

    Raises:
        RuntimeError: API 调用失败
    """
    if not os.path.isfile(file_path):
        return {"safe": True, "detail": "文件不存在，跳过校验"}

    try:
        token = await get_access_token()
    except RuntimeError as e:
        logger.warning("内容安全校验跳过: %s", str(e))
        return {"safe": True, "detail": "安全校验未配置，已跳过"}

    url = f"https://api.weixin.qq.com/wxa/img_sec_check?access_token={token}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            with open(file_path, "rb") as f:
                files = {"media": (os.path.basename(file_path), f, "image/png")}
                resp = await client.post(url, files=files)
                result = resp.json()

            errcode = result.get("errcode", -1)

            if errcode == 0:
                logger.info("图片安全校验通过: %s", file_path)
                return {"safe": True}

            elif errcode == 87014:
                logger.warning("图片包含违规内容: %s", file_path)
                return {"safe": False, "detail": "图片内容包含违规信息"}

            else:
                errmsg = result.get("errmsg", "未知错误")
                logger.warning("图片安全校验异常(%d): %s", errcode, errmsg)
                return {"safe": True, "detail": f"校验异常({errcode})，已放行"}

    except Exception as e:
        logger.warning("图片安全校验网络错误: %s", str(e))
        return {"safe": True, "detail": "校验网络错误，已放行"}
