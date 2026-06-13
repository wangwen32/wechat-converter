FROM python:3.11-slim

# 安装依赖：LibreOffice + SSL 证书
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libreoffice-writer \
        libffi-dev \
        pkg-config \
        fonts-wqy-zenhei \
        fonts-wqy-microhei \
        fonts-noto-cjk \
        ca-certificates \
        && \
    update-ca-certificates --fresh && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV LIBREOFFICE_PATH=/usr/bin/libreoffice

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN mkdir -p /app/temp/uploads /app/temp/output

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
