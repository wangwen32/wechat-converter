# PDF 文档转换助手 — 微信小程序

> 基于 **Gotenberg (MIT)** + **pdf2docx (MIT)** 的 PDF↔Word 双向转换微信小程序。  
> 支持 **PDF→Word** 和 **Word→PDF** 两种转换方向。

## 🏗 架构

```
用户
 ↓ 上传/下载
微信小程序 (miniprogram/)
 ↓ HTTP API
FastAPI 后端 (backend/)
 ↓              ↓
Gotenberg     pdf2docx
(Word→PDF)    (PDF→Word)
```

## 📁 项目结构

```
wechat-converter/
├── backend/                    # 后端服务 (Python FastAPI)
│   ├── main.py                 # API 入口
│   ├── config.py               # 配置
│   ├── requirements.txt        # Python 依赖
│   ├── Dockerfile              # 后端镜像
│   ├── docker-compose.yml      # 服务编排
│   └── services/
│       ├── gotenberg_service.py # Word→PDF
│       └── pdf2docx_service.py  # PDF→Word
├── miniprogram/                # 微信小程序
│   ├── app.js / json / wxss
│   ├── pages/
│   │   ├── index/              # 首页
│   │   ├── convert/            # 转换页
│   │   └── result/             # 结果页
│   └── utils/api.js            # API 封装
└── README.md
```

## 🚀 快速开始

### 前置条件

- Docker & Docker Compose
- 微信开发者工具
- Python 3.11+（本地开发时）

### 1. 启动后端服务

```bash
cd backend
docker-compose up -d
```

验证服务状态：

```bash
curl http://localhost:8000/api/convert/status
# → {"status":"ok","service":"微信文档转换助手"}
```

### 2. 测试 API

```bash
# Word → PDF
curl -X POST -F "file=@test.docx" http://localhost:8000/api/convert/word2pdf

# PDF → Word
curl -X POST -F "file=@test.pdf" http://localhost:8000/api/convert/pdf2word
```

### 3. 运行小程序

1. 打开微信开发者工具
2. 导入 `miniprogram/` 目录
3. 修改 `utils/api.js` 中的 `baseUrl` 为你的本地 IP
4. 勾选「不校验合法域名、web-view、TLS 版本」
5. 编译运行

## 📡 API 文档

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/convert/status` | 健康检查 |
| POST | `/api/convert/word2pdf` | 上传 .docx → 返回 .pdf 下载链接 |
| POST | `/api/convert/pdf2word` | 上传 .pdf → 返回 .docx 下载链接 |
| POST | `/api/convert/img2pdf` | 上传图片 → 返回 .pdf 下载链接 |
| POST | `/api/convert/remove-watermark` | 上传 PDF → 移除水印后返回下载链接 |
| POST | `/api/generate/barcode` | 生成条形码图片 (支持 Code128/Code39/EAN-13 等) |
| POST | `/api/generate/qrcode` | 生成二维码图片 |
| GET | `/api/download/{filename}` | 下载转换/生成后的文件 |

### 响应格式

```json
{
  "code": 0,
  "message": "转换成功",
  "data": {
    "download_url": "/api/download/abc123.pdf",
    "filename": "输出文件.pdf",
    "size": 1024000
  }
}
```

## ⚙️ 配置

通过环境变量配置（见 `config.py`）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `GOTENBERG_URL` | `http://gotenberg:3000` | Gotenberg 地址 |
| `MAX_FILE_SIZE` | 50MB | 文件大小限制 |
| `FILE_EXPIRE_SECONDS` | 1800 (30min) | 临时文件过期时间 |

## 🛠 技术栈

| 组件 | 技术 | 协议 |
|------|------|------|
| 后端框架 | Python FastAPI | MIT |
| Word→PDF | Gotenberg (Go) | **MIT** |
| PDF→Word | pdf2docx (Python) | **MIT** |
| 前端 | 微信原生小程序 | - |
| 部署 | Docker Compose | - |

## 🔄 防查重改造建议

使用 Claude Code + DeepSeek 修改以下部分：

1. **后端**：改 API 路径、字段名、响应结构、加额外处理逻辑
2. **前端**：改 UI 主题色、页面布局、交互动效、图标风格
3. **Docker**：改镜像名、端口映射、环境变量命名

## 📄 License

本项目采用 **MIT** 协议。  
底层依赖：Gotenberg (MIT)、pdf2docx (MIT)、FastAPI (MIT)。
