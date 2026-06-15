// pages/ocr/ocr.js — 文字识别 OCR
const api = require('../../utils/api');
Page({
  data: { selected: false, imagePath: '', result: '', recognizing: false },
  onChooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['original'], sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ selected: true, imagePath: res.tempFilePaths[0], result: '' });
      },
    });
  },
  onClearImage() { this.setData({ selected: false, imagePath: '', result: '' }); },
  async onRecognize() {
    if (!this.data.imagePath) return;
    this.setData({ recognizing: true, result: '' });
    wx.showToast({ title: '上传识别中...', icon: 'loading' });
    try {
      const result = await api.uploadAndConvert('ocr', this.data.imagePath, 'ocr.jpg');
      if (result.localPath) {
        // 本地已有文件
      }
      wx.showToast({ title: '识别完成', icon: 'success' });
      this.setData({ result: '识别功能需要后端部署 PaddleOCR\n请安装: pip install paddlepaddle paddleocr', recognizing: false });
    } catch (e) {
      this.setData({ result: '识别失败: ' + (e.message || '未知错误'), recognizing: false });
    }
  },
  onCopy() {
    wx.setClipboardData({ data: this.data.result, success: () => wx.showToast({ title: '已复制', icon: 'success' }) });
  },
});
