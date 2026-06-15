FROM python:3.11-slim

# 安装依赖：LibreOffice + SSL 证书 + PaddleOCR 系统库
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libreoffice-writer \
        libffi-dev \
        pkg-config \
        fonts-wqy-zenhei \
        fonts-wqy-microhei \
        fonts-noto-cjk \
        ca-certificates \
        libgl1 \
        libglib2.0-0 \
        && \
    update-ca-certificates --fresh && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV LIBREOFFICE_PATH=/usr/bin/libreoffice

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# PaddleOCR（安装失败不影响主服务，OCR功能会提示手动安装）
RUN pip install --default-timeout=600 --no-cache-dir paddlepaddle==2.5.2 paddleocr==2.7.3 || echo "PaddleOCR 安装跳过"

COPY backend/ .

RUN mkdir -p /app/temp/uploads /app/temp/output

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
