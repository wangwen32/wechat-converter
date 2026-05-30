/**
 * API 工具模块 — 支持云托管 callContainer 和本地调试
 */
const app = getApp();

function isCloudMode() {
  return app.globalData.useCloud;
}

function getCloudConfig() {
  return {
    env: app.globalData.cloudEnv,
  };
}

function getServiceHeader() {
  return { 'X-WX-SERVICE': app.globalData.cloudService };
}

function getBaseUrl() {
  return app.globalData.baseUrl;
}

/**
 * 调用云托管 API
 */
function callContainer(path, method, data, options = {}) {
  return new Promise((resolve, reject) => {
    const header = {
      ...getServiceHeader(),
      'content-type': 'application/json',
      ...(options.header || {}),
    };

    wx.cloud.callContainer({
      config: getCloudConfig(),
      path,
      method,
      header,
      data,
      success(res) {
        if (res.statusCode !== 200) {
          const detail = (res.data && (res.data.detail || res.data.message)) || '';
          reject(new Error(detail || `服务器错误 (${res.statusCode})`));
          return;
        }
        resolve(res.data);
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
}

/**
 * 文件转为 base64
 */
function fileToBase64(filePath) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    try {
      // 对于 chooseImage 得到的路径，有时 readFile 会失败，用 encodeURI 处理
      const data = fs.readFileSync(filePath);
      const base64 = wx.arrayBufferToBase64(data);
      resolve(base64);
    } catch (e) {
      reject(new Error('读取文件失败: ' + e.message));
    }
  });
}

/**
 * base64 转 ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binaryStr = wx.base64ToArrayBuffer(base64);
  return binaryStr;
}

/**
 * 上传文件并转换（云托管模式）
 */
async function uploadAndCloudConvert(convertType, filePath, fileName) {
  const fileBase64 = await fileToBase64(filePath);
  const data = await callContainer('/api/convert/upload-base64', 'POST', {
    endpoint: convertType,
    fileBase64,
    filename: fileName || 'file',
  });

  return {
    downloadUrl: data.data.download_url,
    filename: data.data.filename,
    size: data.data.size,
    downloadKey: data.data.download_key,
  };
}

/**
 * 上传文件并转换（本地调试模式 - 用 wx.uploadFile）
 */
function uploadAndConvertLegacy(convertType, filePath, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    const url = `${getBaseUrl()}/api/convert/${convertType}`;
    const uploadTask = wx.uploadFile({
      url,
      filePath,
      name: 'file',
      formData: {},
      success(res) {
        if (res.statusCode !== 200) {
          reject(new Error(`服务器错误 (${res.statusCode})`));
          return;
        }
        try {
          const body = JSON.parse(res.data);
          if (body.code !== 0) {
            reject(new Error(body.message || '转换失败'));
            return;
          }
          resolve({
            downloadUrl: getBaseUrl() + body.data.download_url,
            filename: body.data.filename,
            size: body.data.size,
          });
        } catch (e) {
          reject(new Error('解析响应失败: ' + e.message));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
    if (onProgress) {
      uploadTask.onProgressUpdate((res) => onProgress(res.progress));
    }
  });
}

/**
 * 上传文件并转换（自动选择模式）
 */
function uploadAndConvert(convertType, filePath, fileName, onProgress) {
  if (isCloudMode()) {
    return uploadAndCloudConvert(convertType, filePath, fileName);
  }
  return uploadAndConvertLegacy(convertType, filePath, fileName, onProgress);
}

/**
 * 下载文件（云托管模式）
 */
async function downloadFromCloud(downloadUrl, filename, downloadKey) {
  // 通过 callContainer 获取文件数据
  const key = downloadKey || filename || 'file';
  const data = await callContainer('/api/download/json', 'POST', {
    download_key: key,
  });

  // 保存文件到本地
  const fs = wx.getFileSystemManager();
  const tempDir = `${wx.env.USER_DATA_PATH}/downloads`;
  try { fs.mkdirSync(tempDir); } catch(e) {}

  // 用 downloadKey 做文件名（避免中文路径问题）
  const safeName = key.replace(/[^a-zA-Z0-9._-]/g, '_');
  const tempPath = `${tempDir}/${safeName}`;
  const arrayBuffer = base64ToArrayBuffer(data.data.file_base64);
  fs.writeFileSync(tempPath, arrayBuffer);

  return tempPath;
}

/**
 * 下载文件（本地模式）
 */
function downloadFileLegacy(url, filename) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath);
        } else {
          reject(new Error(`下载失败 (${res.statusCode})`));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '下载失败'));
      },
    });
  });
}

/**
 * 下载文件（自动选择）
 */
function downloadFile(url, filename, downloadKey) {
  if (isCloudMode()) {
    return downloadFromCloud(url, filename, downloadKey);
  }
  return downloadFileLegacy(url, filename);
}

/**
 * 打开/预览文件
 */
function openFile(filePath, ext) {
  wx.openDocument({
    filePath,
    fileType: ext === '.pdf' ? 'pdf' : 'docx',
    showMenu: true,
    success() { console.log('文件打开成功'); },
    fail(err) {
      wx.showToast({ title: '打开文件失败', icon: 'none' });
      console.error(err);
    },
  });
}

/**
 * 生成条形码
 */
async function generateBarcode(data, barcodeType = 'code128') {
  if (isCloudMode()) {
    const body = await callContainer('/api/generate/barcode', 'POST', {
      data,
      barcode_type: barcodeType,
    });
    return {
      downloadUrl: body.data.download_url,
      filename: body.data.filename,
      size: body.data.size,
      downloadKey: body.data.download_key || body.data.download_url.split('/').pop(),
    };
  }

  // 本地模式
  return new Promise((resolve, reject) => {
    const url = `${getBaseUrl()}/api/generate/barcode`;
    wx.request({
      url, method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { data, barcode_type: barcodeType },
      success(res) {
        if (res.statusCode !== 200) {
          const detail = (res.data && (res.data.detail || res.data.message)) || '';
          reject(new Error(detail || `服务器错误 (${res.statusCode})`));
          return;
        }
        const body = res.data;
        if (body.code !== 0) {
          reject(new Error(body.message || '生成失败'));
          return;
        }
        resolve({
          downloadUrl: getBaseUrl() + body.data.download_url,
          filename: body.data.filename,
          size: body.data.size,
        });
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
}

/**
 * 生成二维码
 */
async function generateQRCode(data) {
  if (isCloudMode()) {
    const body = await callContainer('/api/generate/qrcode', 'POST', { data });
    return {
      downloadUrl: body.data.download_url,
      filename: body.data.filename,
      size: body.data.size,
      downloadKey: body.data.download_key || body.data.download_url.split('/').pop(),
    };
  }

  return new Promise((resolve, reject) => {
    const url = `${getBaseUrl()}/api/generate/qrcode`;
    wx.request({
      url, method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { data },
      success(res) {
        if (res.statusCode !== 200) {
          const detail = (res.data && (res.data.detail || res.data.message)) || '';
          reject(new Error(detail || `服务器错误 (${res.statusCode})`));
          return;
        }
        const body = res.data;
        if (body.code !== 0) {
          reject(new Error(body.message || '生成失败'));
          return;
        }
        resolve({
          downloadUrl: getBaseUrl() + body.data.download_url,
          filename: body.data.filename,
          size: body.data.size,
        });
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
}

/**
 * 保存图片到相册
 */
function saveImageToAlbum(imageUrl) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: imageUrl,
      success(res) {
        if (res.statusCode !== 200) {
          reject(new Error('图片下载失败'));
          return;
        }
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success() { resolve(res.tempFilePath); },
          fail(err) {
            if (err.errMsg && err.errMsg.includes('auth deny')) {
              wx.showModal({
                title: '提示',
                content: '需要相册权限才能保存图片',
                success(m) { if (m.confirm) wx.openSetting(); },
              });
            }
            reject(new Error('保存失败: ' + (err.errMsg || '未知错误')));
          },
        });
      },
      fail(err) {
        reject(new Error('下载失败: ' + (err.errMsg || '')));
      },
    });
  });
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

module.exports = {
  getBaseUrl,
  uploadAndConvert,
  downloadFile,
  openFile,
  formatSize,
  generateBarcode,
  generateQRCode,
  saveImageToAlbum,
};
