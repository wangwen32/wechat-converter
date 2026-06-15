#!/bin/bash
# 启动脚本：启动时尝试安装 PaddleOCR（不阻塞服务）
set -e

# 后台安装 PaddleOCR（安装失败不影响服务启动）
echo "检查 PaddleOCR..."
python3 -c "import paddleocr" 2>/dev/null && echo "PaddleOCR 已安装" || {
    echo "PaddleOCR 未安装，尝试后台安装..."
    pip install --default-timeout=600 --no-cache-dir paddlepaddle==2.5.2 paddleocr==2.7.3 &
}

# 启动主服务
exec uvicorn main:app --host 0.0.0.0 --port 8000
