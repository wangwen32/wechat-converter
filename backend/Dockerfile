# 基于 Python 3.11 轻量镜像
FROM python:3.11-slim

# 安装系统依赖
#   - libreoffice-writer: Word→PDF 转换
#   - tesseract-ocr: 轻量级 OCR 中文识别
#   - fonts-wqy-zenhei: 中文字体
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libreoffice-writer \
        libffi-dev \
        pkg-config \
        fonts-wqy-zenhei \
        fonts-wqy-microhei \
        fonts-noto-cjk \
        tesseract-ocr \
        tesseract-ocr-chi-sim \
        tesseract-ocr-chi-tra \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 设置 LibreOffice 路径环境变量
ENV LIBREOFFICE_PATH=/usr/bin/libreoffice

# 安装 Python 依赖
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY . .

# 创建临时目录
RUN mkdir -p /app/temp/uploads /app/temp/output

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
