/**
 * API 工具模块 — 云托管域名直连模式
 */
const app = getApp();
const CLOUD_HOST = 'https://converter-api-264078-8-1438485063.sh.run.tcloudbase.com';

function getBaseUrl() {
  return app.globalData.baseUrl;
}

/**
 * 通用请求（云托管用域名，本地用局域网）
 */
function request(path, method, data, options = {}) {
  return new Promise((resolve, reject) => {
    const baseUrl = app.globalData.useCloud ? CLOUD_HOST : getBaseUrl();
    const url = `${baseUrl}${path}`;
    wx.request({
      url, method,
      header: { 'content-type': 'application/json', ...(options.header || {}) },
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
 * 上传文件并转换
 */
function uploadAndConvert(convertType, filePath, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    const baseUrl = app.globalData.useCloud ? CLOUD_HOST : getBaseUrl();
    const url = `${baseUrl}/api/convert/${convertType}`;
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
            downloadUrl: body.data.download_url,
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
 * 下载文件
 */
function downloadFile(url, filename, downloadKey) {
  return new Promise((resolve, reject) => {
    const baseUrl = app.globalData.useCloud ? CLOUD_HOST : getBaseUrl();
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    wx.downloadFile({
      url: fullUrl,
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
function generateBarcode(data, barcodeType = 'code128') {
  return request('/api/generate/barcode', 'POST', { data, barcode_type: barcodeType })
    .then(body => ({
      downloadUrl: body.data.download_url,
      filename: body.data.filename,
      size: body.data.size,
      downloadKey: body.data.download_key,
    }));
}

/**
 * 生成二维码
 */
function generateQRCode(data) {
  return request('/api/generate/qrcode', 'POST', { data })
    .then(body => ({
      downloadUrl: body.data.download_url,
      filename: body.data.filename,
      size: body.data.size,
      downloadKey: body.data.download_key,
    }));
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
                title: '提示', content: '需要相册权限才能保存图片',
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

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

module.exports = {
  getBaseUrl, uploadAndConvert, downloadFile, openFile, formatSize,
  generateBarcode, generateQRCode, saveImageToAlbum,
};
