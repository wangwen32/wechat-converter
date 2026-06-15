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

COPY backend/start.sh ./
RUN chmod +x start.sh

COPY backend/ .

RUN mkdir -p /app/temp/uploads /app/temp/output

EXPOSE 8000

CMD ["bash", "start.sh"]
