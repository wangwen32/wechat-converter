/**
 * API 工具模块 — 纯云托管 callContainer 模式
 */
const app = getApp();

function getCloudConfig() {
  return { env: app.globalData.cloudEnv };
}

function getServiceHeader() {
  return { 'X-WX-SERVICE': app.globalData.cloudService };
}

function getBaseUrl() {
  return app.globalData.baseUrl;
}

/**
 * 调用云托管 API（JSON 请求）
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
 * 二进制流上传 — 通过 callContainer 发送 ArrayBuffer
 */
function uploadBinary(endpoint, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    try {
      const arrayBuffer = fs.readFileSync(filePath);
      const header = {
        ...getServiceHeader(),
        'Content-Type': 'application/octet-stream',
        'X-Filename': encodeURIComponent(fileName || 'file'),
      };
      wx.cloud.callContainer({
        config: getCloudConfig(),
        path: `/api/convert/upload-binary/${endpoint}`,
        method: 'POST',
        header,
        data: arrayBuffer,
        success(res) {
          if (res.statusCode !== 200) {
            const detail = (res.data && (res.data.detail || res.data.message)) || '';
            reject(new Error(detail || `服务器错误 (${res.statusCode})`));
            return;
          }
          resolve(res.data);
        },
        fail(err) {
          reject(new Error(err.errMsg || '上传失败'));
        },
      });
    } catch (e) {
      reject(new Error('读取文件失败: ' + e.message));
    }
  });
}

/**
 * 上传文件并转换（云托管模式 - 二进制上传）
 */
async function uploadAndCloudConvert(convertType, filePath, fileName) {
  const body = await uploadBinary(convertType, filePath, fileName);
  return {
    downloadUrl: body.data.download_url,
    filename: body.data.filename,
    size: body.data.size,
    downloadKey: body.data.download_key,
  };
}

/**
 * 上传文件并转换（本地调试模式）
 */
function uploadAndConvertLegacy(convertType, filePath, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    const url = `${getBaseUrl()}/api/convert/${convertType}`;
    const uploadTask = wx.uploadFile({
      url, filePath, name: 'file', formData: {},
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
            downloadKey: body.data.download_key,
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
 * 上传文件并转换（自动选择）
 */
function uploadAndConvert(convertType, filePath, fileName, onProgress) {
  if (app.globalData.useCloud) {
    return uploadAndCloudConvert(convertType, filePath, fileName);
  }
  return uploadAndConvertLegacy(convertType, filePath, fileName, onProgress);
}

/**
 * 下载文件（云托管模式 - 通过 callContainer 下载）
 */
async function downloadFromCloud(downloadUrl, filename, downloadKey) {
  const key = downloadKey || filename || 'file';
  const data = await callContainer('/api/download/json', 'POST', {
    download_key: key,
  });

  const fs = wx.getFileSystemManager();
  const tempDir = `${wx.env.USER_DATA_PATH}/downloads`;
  try { fs.mkdirSync(tempDir); } catch(e) {}

  const safeName = key.replace(/[^a-zA-Z0-9._-]/g, '_');
  const tempPath = `${tempDir}/${safeName}`;
  const arrayBuffer = wx.base64ToArrayBuffer(data.data.file_base64);
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
  if (app.globalData.useCloud) {
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
  if (app.globalData.useCloud) {
    const body = await callContainer('/api/generate/barcode', 'POST', {
      data, barcode_type: barcodeType,
    });
    return {
      downloadUrl: body.data.download_url,
      filename: body.data.filename,
      size: body.data.size,
      downloadKey: body.data.download_key,
    };
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}/api/generate/barcode`,
      method: 'POST',
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
          downloadKey: body.data.download_key,
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
  if (app.globalData.useCloud) {
    const body = await callContainer('/api/generate/qrcode', 'POST', { data });
    return {
      downloadUrl: body.data.download_url,
      filename: body.data.filename,
      size: body.data.size,
      downloadKey: body.data.download_key,
    };
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}/api/generate/qrcode`,
      method: 'POST',
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
