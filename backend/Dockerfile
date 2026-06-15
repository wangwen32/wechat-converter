# 基于 Python 3.11 轻量镜像
FROM python:3.11-slim

# 安装系统依赖
#   - libreoffice-writer: Word→PDF 转换
#   - libffi-dev / pkg-config: pdf2docx 内部依赖
#   - fonts-wqy-zenhei: 中文字体（防止转换后中文乱码）
#   - libgl1-mesa-glx / libglib2.0-0: PaddleOCR 依赖
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libreoffice-writer \
        libffi-dev \
        pkg-config \
        fonts-wqy-zenhei \
        fonts-wqy-microhei \
        fonts-noto-cjk \
        libgl1 \
        libglib2.0-0 \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 设置 LibreOffice 路径环境变量
ENV LIBREOFFICE_PATH=/usr/bin/libreoffice

# 安装 Python 依赖
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# PaddleOCR（安装失败不影响主服务，OCR功能会提示手动安装）
RUN pip install --default-timeout=600 --no-cache-dir paddlepaddle==2.5.2 paddleocr==2.7.3 || echo "PaddleOCR 安装跳过"

# 复制源码
COPY . .

# 创建临时目录
RUN mkdir -p /app/temp/uploads /app/temp/output

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
