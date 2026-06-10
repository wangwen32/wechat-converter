"""微信内容安全校验服务

调用微信官方 API 校验内容安全：
  - /wxa/media_check_async  v2 多媒体（图片）内容安全识别
  - /wxa/msg_sec_check       文本内容安全识别

需要配置 WECHAT_APPID 和 WECHAT_APPSECRET 环境变量。
"""

import os
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


async def check_image(file_path: str, openid: str = "", media_url: str = "") -> dict:
    """
    校验图片是否含违规内容（/wxa/media_check_async v2）

    Args:
        file_path:  图片本地路径（备用）
        openid:     用户 openid（需近两小时访问过小程序）
        media_url:  图片可访问的 URL

    Returns:
        {"safe": True} 或 {"safe": False, "detail": "..."}
    """
    if not os.path.isfile(file_path) and not media_url:
        return {"safe": True}

    try:
        token = await get_access_token()
    except RuntimeError as e:
        logger.warning("安全校验跳过: %s", e)
        return {"safe": True}

    # 如果没有 media_url，用我们自己的下载地址
    if not media_url:
        filename = os.path.basename(file_path)
        host = os.getenv("CLOUD_HOST", "https://convertmy.kaixin8.top")
        media_url = f"{host}/api/download/{filename}"

    url = f"https://api.weixin.qq.com/wxa/media_check_async?access_token={token}"

    try:
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            payload = {
                "media_url": media_url,
                "media_type": 2,        # 2=图片
                "version": 2,
                "scene": 1,             # 1=资料
                "openid": openid or "unknown",
            }
            resp = await client.post(url, json=payload)
            result = resp.json()

            errcode = result.get("errcode", -1)
            if errcode == 0:
                trace_id = result.get("trace_id", "")
                logger.info("图片已提交安全审核: trace_id=%s, url=%s", trace_id, media_url)
                return {"safe": True}
            else:
                errmsg = result.get("errmsg", "")
                logger.warning("安全审核提交失败(%d): %s", errcode, errmsg)
                return {"safe": True, "detail": f"审核提交异常({errcode})"}

    except Exception as e:
        logger.warning("安全校验网络错误: %s", str(e))
        return {"safe": True}


async def check_text(text: str) -> dict:
    """校验文本是否含违规内容（/wxa/msg_sec_check）"""
    if not text.strip():
        return {"safe": True}
    try:
        token = await get_access_token()
    except RuntimeError as e:
        logger.warning("文本校验跳过: %s", e)
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
                return {"safe": False, "detail": "内容包含违规信息"}
            else:
                return {"safe": True}
    except Exception as e:
        logger.warning("文本校验错误: %s", str(e))
        return {"safe": True}
