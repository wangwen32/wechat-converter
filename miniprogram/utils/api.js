/**
 * API 工具模块 — 基于 getApp().callApi / uploadFileToCloud
 */
const CLOUD_HOST = 'https://convertmy.kaixin8.top';

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
 * 上传文件并转换（通过 app.uploadFileToCloud）
 */
function uploadAndConvert(convertType, filePath, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    const uploadTask = getApp().uploadFileToCloud({
      url: `/api/convert/${convertType}`,
      filePath,
      name: 'file',
      success(res) {
        const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        if (data.code !== 0) {
          reject(new Error(data.message || '转换失败'));
          return;
        }
        // 如果返回了 file_base64，直接保存到本地
        let localPath = '';
        if (data.data.file_base64) {
          try {
            const fs = wx.getFileSystemManager();
            const tempDir = `${wx.env.USER_DATA_PATH}/downloads`;
            try { fs.mkdirSync(tempDir); } catch (e) {}
            const safeName = (data.data.download_key || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
            localPath = `${tempDir}/${safeName}`;
            const arrayBuffer = wx.base64ToArrayBuffer(data.data.file_base64);
            fs.writeFileSync(localPath, arrayBuffer);
          } catch (e) {
            console.warn('保存文件失败', e);
          }
        }
        resolve({
          downloadUrl: data.data.download_url,
          filename: data.data.filename,
          size: data.data.size,
          downloadKey: data.data.download_key,
          localPath: localPath,
        });
      },
      fail(err) {
        reject(new Error(err.errMsg || '上传失败'));
      },
    });
    // 进度回调
    if (onProgress && uploadTask && uploadTask.onProgressUpdate) {
      uploadTask.onProgressUpdate((res) => onProgress(res.progress));
    }
  });
}

/**
 * 下载文件（通过 JSON 接口获取 base64，避免云托管实例文件不同步问题）
 */
function downloadFile(url, filename, downloadKey) {
  return new Promise((resolve, reject) => {
    // 先通过 callApi 获取文件 base64
    if (downloadKey) {
      getApp().callApi({
        url: '/api/download/json',
        method: 'POST',
        data: { download_key: downloadKey },
        success(res) {
          try {
            const d = res.data;
            if (d.code !== 0) {
              reject(new Error(d.message || '下载失败'));
              return;
            }
            const fs = wx.getFileSystemManager();
            const tempDir = `${wx.env.USER_DATA_PATH}/downloads`;
            try { fs.mkdirSync(tempDir); } catch (e) {}
            const safeName = (downloadKey || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
            const tempPath = `${tempDir}/${safeName}`;
            const arrayBuffer = wx.base64ToArrayBuffer(d.data.file_base64);
            fs.writeFileSync(tempPath, arrayBuffer);
            resolve(tempPath);
          } catch (e) {
            reject(new Error('保存文件失败: ' + e.message));
          }
        },
        fail(err) {
          reject(new Error(err.errMsg || '下载失败'));
        },
      });
    } else {
      // 没有 downloadKey 时回退到直接下载
      const fullUrl = url.startsWith('http') ? url : `${CLOUD_HOST}${url}`;
      wx.downloadFile({
        url: fullUrl, timeout: 60000,
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
    }
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
          fileBase64: body.data.file_base64 || '',
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
          fileBase64: body.data.file_base64 || '',
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

/** 将 base64 保存为本地临时文件，返回文件路径 */
function saveBase64ToFile(base64, filename) {
  try {
    const fs = wx.getFileSystemManager();
    const tempDir = `${wx.env.USER_DATA_PATH}/downloads`;
    try { fs.mkdirSync(tempDir); } catch (e) {}
    const safeName = (filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempPath = `${tempDir}/${safeName}`;
    const arrayBuffer = wx.base64ToArrayBuffer(base64);
    fs.writeFileSync(tempPath, arrayBuffer);
    return tempPath;
  } catch (e) {
    console.warn('保存文件失败', e);
    return '';
  }
}

module.exports = {
  saveBase64ToFile,
  getBaseUrl,
  uploadAndConvert,
  downloadFile,
  openFile,
  formatSize,
  generateBarcode,
  generateQRCode,
  saveImageToAlbum,
};
