"""应用配置"""

import os

# LibreOffice 路径（Word→PDF 转换使用）
LIBREOFFICE_PATH = os.getenv("LIBREOFFICE_PATH", r"F:\LibreOffice\program\soffice.exe")

# Gotenberg 服务地址（备用方案，使用 Docker 时启用）
GOTENBERG_URL = os.getenv("GOTENBERG_URL", "http://gotenberg:3000")

# 上传文件大小限制（默认 50MB）
MAX_FILE_SIZE = 50 * 1024 * 1024

# 临时目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "temp", "uploads"))
OUTPUT_DIR = os.getenv("OUTPUT_DIR", os.path.join(BASE_DIR, "temp", "output"))

# 文件过期时间（秒），默认 60 分钟后清理
FILE_EXPIRE_SECONDS = 60 * 60

# 清理间隔（秒）
CLEANUP_INTERVAL_SECONDS = 15 * 60

# 允许的文件类型
ALLOWED_EXTENSIONS = {
    "pdf2word": [".pdf"],
    "word2pdf": [".docx"],
    "img2pdf": [".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff", ".tif"],
    "remove_watermark": [".pdf"],
    "ocr": [".jpg", ".jpeg", ".png", ".bmp", ".webp", ".pdf"],
    "compress_image": [".jpg", ".jpeg", ".png", ".bmp", ".webp"],
    "id_photo": [".jpg", ".jpeg", ".png"],
    "restore_photo": [".jpg", ".jpeg", ".png", ".bmp"],
}

# 条形码类型
BARCODE_TYPES = {
    "code39": "Code 39",
    "code128": "Code 128",
    "ean13": "EAN-13",
    "ean8": "EAN-8",
    "upca": "UPC-A",
    "isbn13": "ISBN-13",
    "issn": "ISSN",
}
