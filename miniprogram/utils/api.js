/**
 * API 工具模块 — 基于 getApp().callApi / uploadFileToCloud
 */
const CLOUD_HOST = 'https://converter-api-264078-8-1438485063.sh.run.tcloudbase.com';

function isDebug() {
  try {
    return getApp().globalData.isDebug === true;
  } catch (e) {
    return true;
  }
}

function getBaseUrl() {
  return isDebug() ? CLOUD_HOST : '';
}

/**
 * 上传文件并转换（自动适配调试/上线模式）
 */
function uploadAndConvert(convertType, filePath, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: getBaseUrl() + `/api/convert/${convertType}`,
      filePath,
      name: 'file',
      formData: {},
      success(res) {
        if (res.statusCode !== 200) {
          reject(new Error(`服务器错误 (${res.statusCode})`));
          return;
        }
        try {
          const body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
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
      const task = wx.getFileSystemManager ? null : null;
    }
  });
}

// 重写：使用 app.uploadFileToCloud
function uploadWithApp(convertType, filePath, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    getApp().uploadFileToCloud({
      url: `/api/convert/${convertType}`,
      filePath,
      name: 'file',
      success(res) {
        const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        if (data.code !== 0) {
          reject(new Error(data.message || '转换失败'));
          return;
        }
        resolve({
          downloadUrl: data.data.download_url,
          filename: data.data.filename,
          size: data.data.size,
          downloadKey: data.data.download_key,
        });
      },
      fail(err) {
        reject(new Error(err.errMsg || '上传失败'));
      },
    });
  });
}

// 自动选择上传方式
function uploadAndConvertAuto(convertType, filePath, fileName, onProgress) {
  if (isDebug()) {
    return uploadAndConvert(convertType, filePath, fileName, onProgress);
  }
  return uploadWithApp(convertType, filePath, fileName, onProgress);
}

/**
 * 下载文件
 */
function downloadFile(url, filename, downloadKey) {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl();
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const downloadUrl = fullUrl;
    wx.downloadFile({
      url: downloadUrl,
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
  return new Promise((resolve, reject) => {
    getApp().callApi({
      url: '/api/generate/barcode',
      method: 'POST',
      data: { data, barcode_type: barcodeType },
      success(res) {
        const body = res.data;
        resolve({
          downloadUrl: body.data.download_url,
          filename: body.data.filename,
          size: body.data.size,
          downloadKey: body.data.download_key,
        });
      },
      fail(err) {
        reject(new Error(err.errMsg || '生成失败'));
      },
    });
  });
}

/**
 * 生成二维码
 */
function generateQRCode(data) {
  return new Promise((resolve, reject) => {
    getApp().callApi({
      url: '/api/generate/qrcode',
      method: 'POST',
      data: { data },
      success(res) {
        const body = res.data;
        resolve({
          downloadUrl: body.data.download_url,
          filename: body.data.filename,
          size: body.data.size,
          downloadKey: body.data.download_key,
        });
      },
      fail(err) {
        reject(new Error(err.errMsg || '生成失败'));
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
                title: '提示', content: '需要相册权限才能保存图片',
                success(m) { if (m.confirm) wx.openSetting(); },
              });
            }
            reject(new Error('保存失败'));
          },
        });
      },
      fail(err) {
        reject(new Error('下载失败'));
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
  uploadAndConvert: uploadAndConvertAuto,
  downloadFile,
  openFile,
  formatSize,
  generateBarcode,
  generateQRCode,
  saveImageToAlbum,
};
