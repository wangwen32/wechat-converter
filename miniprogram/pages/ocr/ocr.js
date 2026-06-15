// pages/ocr/ocr.js — 文字识别 OCR
const CLOUD_HOST = 'https://convertmy.kaixin8.top';

Page({
  data: { selected: false, imagePath: '', result: '', recognizing: false, confidence: 0 },

  onChooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['original'], sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ selected: true, imagePath: res.tempFilePaths[0], result: '', confidence: 0 });
      },
    });
  },

  onClearImage() { this.setData({ selected: false, imagePath: '', result: '', confidence: 0 }); },

  async onRecognize() {
    if (!this.data.imagePath) return;
    this.setData({ recognizing: true, result: '', confidence: 0 });
    wx.showLoading({ title: '识别中...' });

    try {
      const result = await this.uploadForOcr(this.data.imagePath);
      wx.hideLoading();

      if (result.code === 0 && result.data) {
        this.setData({
          result: result.data.text || '未识别到文字',
          confidence: result.data.confidence || 0,
          recognizing: false,
        });
        wx.showToast({ title: '识别完成', icon: 'success' });
      } else {
        this.setData({ result: result.message || '识别失败', recognizing: false });
      }
    } catch (e) {
      wx.hideLoading();
      this.setData({ result: '识别失败: ' + (e.message || '未知错误'), recognizing: false });
    }
  },

  uploadForOcr(filePath) {
    return new Promise((resolve, reject) => {
      const app = getApp();
      const url = app.globalData.isDebug
        ? `${CLOUD_HOST}/api/convert/ocr`
        : `${CLOUD_HOST}/api/convert/ocr`;

      wx.uploadFile({
        url: url,
        filePath,
        name: 'file',
        timeout: 30000,
        success(res) {
          try {
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            resolve(data);
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        },
        fail(err) {
          reject(new Error(err.errMsg || '网络请求失败'));
        },
      });
    });
  },

  onCopy() {
    wx.setClipboardData({ data: this.data.result, success: () => wx.showToast({ title: '已复制', icon: 'success' }) });
  },
});
