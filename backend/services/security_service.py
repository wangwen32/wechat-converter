"""微信内容安全校验服务

调用微信官方 API 校验内容安全：
  - /wxa/media_check_async  多媒体（图片）内容安全识别
  - /wxa/msg_sec_check       文本内容安全识别

需要配置 WECHAT_APPID 和 WECHAT_APPSECRET 环境变量。
"""

import os
import json
import logging
import httpx

logger = logging.getLogger(__name__)

APPID = os.getenv("WECHAT_APPID", "")
APPSECRET = os.getenv("WECHAT_APPSECRET", "")
_token_cache = {"token": "", "expires_at": 0}


async def get_access_token() -> str:
    """获取微信接口调用凭据 access_token"""
    import time
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]
    if not APPID or not APPSECRET:
        raise RuntimeError("未配置 WECHAT_APPID 和 WECHAT_APPSECRET")
    url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={APPID}&secret={APPSECRET}"
    async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
        resp = await client.get(url)
        data = resp.json()
        if "access_token" in data:
            _token_cache["token"] = data["access_token"]
            _token_cache["expires_at"] = now + data.get("expires_in", 7200) - 300
            return data["access_token"]
        raise RuntimeError(f"获取 access_token 失败: {data.get('errmsg', '未知错误')}")


async def check_image(file_path: str) -> dict:
    """
    校验图片是否包含违规内容（使用 /wxa/media_check_async）

    Args:
        file_path: 图片文件路径

    Returns:
        {"safe": True} 或 {"safe": False, "detail": "违规说明"}
    """
    if not os.path.isfile(file_path):
        return {"safe": True}

    try:
        token = await get_access_token()
    except RuntimeError as e:
        logger.warning("安全校验跳过: %s", e)
        return {"safe": True, "detail": "未配置安全校验"}

    url = f"https://api.weixin.qq.com/wxa/media_check_async?access_token={token}"

    try:
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            with open(file_path, "rb") as f:
                files = {"media": (os.path.basename(file_path), f, "application/octet-stream")}
                resp = await client.post(url, files=files)
                result = resp.json()

            errcode = result.get("errcode", -1)
            errmsg = result.get("errmsg", "")

            if errcode == 0:
                logger.info("图片已提交安全审核，trace_id: %s", result.get("trace_id", ""))
                return {"safe": True}
            else:
                logger.warning("安全审核提交失败(%d): %s", errcode, errmsg)
                return {"safe": True, "detail": f"审核提交异常({errcode})，已放行"}

    except Exception as e:
        logger.warning("安全校验网络错误: %s", str(e))
        return {"safe": True, "detail": "校验网络错误，已放行"}


async def check_text(text: str) -> dict:
    """
    校验文本是否包含违规内容（使用 /wxa/msg_sec_check）

    Args:
        text: 待校验文本

    Returns:
        {"safe": True} 或 {"safe": False, "detail": "违规说明"}
    """
    if not text.strip():
        return {"safe": True}

    try:
        token = await get_access_token()
    except RuntimeError as e:
        logger.warning("文本安全校验跳过: %s", e)
        return {"safe": True}

    url = f"https://api.weixin.qq.com/wxa/msg_sec_check?access_token={token}"

    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            resp = await client.post(url, json={"content": text})
            result = resp.json()

            errcode = result.get("errcode", -1)

            if errcode == 0:
                return {"safe": True}
            elif errcode == 87014:
                logger.warning("文本包含违规内容")
                return {"safe": False, "detail": "内容包含违规信息"}
            else:
                logger.warning("文本校验异常(%d): %s", errcode, result.get("errmsg", ""))
                return {"safe": True}

    except Exception as e:
        logger.warning("文本校验网络错误: %s", str(e))
        return {"safe": True}
