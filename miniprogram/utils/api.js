/**
 * API 工具模块
 * 封装与后端的所有 HTTP 通信
 */

const app = getApp();

/**
 * 获取后端基础地址
 */
function getBaseUrl() {
  return app.globalData.baseUrl;
}

/**
 * 上传文件并转换
 * @param {string}  convertType  - 'word2pdf' / 'pdf2word' / 'img2pdf' / 'remove-watermark'
 * @param {string}  filePath     - 本地文件路径
 * @param {string}  fileName     - 文件名
 * @param {Function} onProgress  - 上传进度回调 (percent: number)
 * @returns {Promise<{downloadUrl: string, filename: string, size: number}>}
 */
function uploadAndConvert(convertType, filePath, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    const url = `${getBaseUrl()}/api/convert/${convertType}`;

    const uploadTask = wx.uploadFile({
      url: url,
      filePath: filePath,
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

    // 监听上传进度
    if (onProgress) {
      uploadTask.onProgressUpdate((res) => {
        onProgress(res.progress);
      });
    }
  });
}

/**
 * 下载转换后的文件
 * @param {string} url       - 文件下载地址
 * @param {string} filename  - 保存的文件名
 * @returns {Promise<string>} 临时文件路径
 */
function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: url,
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
 * @param {string} filePath - 本地文件路径
 * @param {string} ext      - 文件扩展名 (.pdf / .docx)
 */
function openFile(filePath, ext) {
  wx.openDocument({
    filePath: filePath,
    fileType: ext === '.pdf' ? 'pdf' : 'docx',
    showMenu: true,  // 允许转发/保存
    success() {
      console.log('文件打开成功');
    },
    fail(err) {
      wx.showToast({ title: '打开文件失败', icon: 'none' });
      console.error(err);
    },
  });
}

/**
 * 生成条形码
 * @param {string} data        - 要编码的数据
 * @param {string} barcodeType - 条形码类型 (code128, code39, ean13 等)
 * @returns {Promise<{downloadUrl: string, filename: string, size: number}>}
 */
function generateBarcode(data, barcodeType = 'code128') {
  return new Promise((resolve, reject) => {
    const url = `${getBaseUrl()}/api/generate/barcode`;
    wx.request({
      url: url,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { data, barcode_type: barcodeType },
      success(res) {
        if (res.statusCode !== 200) {
          const detail = res.data?.detail || res.data?.message || '';
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
 * @param {string} data - 要编码的数据（文本/URL）
 * @returns {Promise<{downloadUrl: string, filename: string, size: number}>}
 */
function generateQRCode(data) {
  return new Promise((resolve, reject) => {
    const url = `${getBaseUrl()}/api/generate/qrcode`;
    wx.request({
      url: url,
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
 * @param {string} imageUrl - 图片网络地址
 * @returns {Promise<string>} 本地临时路径
 */
function saveImageToAlbum(imageUrl) {
  return new Promise((resolve, reject) => {
    // 先下载图片
    wx.downloadFile({
      url: imageUrl,
      success(res) {
        if (res.statusCode !== 200) {
          reject(new Error('图片下载失败'));
          return;
        }
        // 保存到相册
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success() {
            resolve(res.tempFilePath);
          },
          fail(err) {
            // 可能需要授权
            if (err.errMsg && err.errMsg.includes('auth deny')) {
              wx.showModal({
                title: '提示',
                content: '需要相册权限才能保存图片',
                success(m) {
                  if (m.confirm) {
                    wx.openSetting();
                  }
                },
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
