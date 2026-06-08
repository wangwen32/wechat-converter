// pages/qrcode/qrcode.js
const api = require('../../utils/api');
const themeUtil = require('../../utils/theme');

Page({
  data: {
    inputData: '',
    generating: false,
    canGenerate: false,
    resultUrl: '',
    resultLocalPath: '',
    resultFileName: '',

    // 主题
    theme: 'blue',
    themeClass: '',
  },

  onLoad() {
    const td = themeUtil.initPageTheme();
    this.setData(td);
  },

  onInputChange(e) {
    const val = e.detail.value;
    this.setData({
      inputData: val,
      canGenerate: val.trim().length > 0,
    });
  },

  async onGenerate() {
    const data = this.data.inputData.trim();
    if (!data) {
      wx.showToast({ title: '请输入要编码的数据', icon: 'none' });
      return;
    }

    this.setData({ generating: true, resultUrl: '' });

    try {
      const result = await api.generateQRCode(data);
      // 先下载图片到本地再显示（真机调试网络图片需要）
      const tempPath = await api.downloadFile(result.downloadUrl, result.filename, result.downloadKey);
      this.setData({
        generating: false,
        resultUrl: tempPath,
        resultLocalPath: tempPath,
        resultFileName: result.filename,
      });
    } catch (err) {
      this.setData({ generating: false });
      wx.showToast({ title: err.message || '生成失败', icon: 'none' });
    }
  },

  async onSaveImage() {
    if (!this.data.resultLocalPath) {
      wx.showToast({ title: '请先生成二维码', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      // 已经是本地路径，直接保存到相册
      wx.saveImageToPhotosAlbum({
        filePath: this.data.resultLocalPath,
        success() {
          wx.hideLoading();
          wx.showToast({ title: '已保存到相册', icon: 'success' });
        },
        fail(err) {
          wx.hideLoading();
          wx.showToast({ title: '保存失败', icon: 'none' });
        },
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  },

  onCopyLink() {
    if (!this.data.inputData) return;

    wx.setClipboardData({
      data: this.data.inputData,
      success() {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
      },
    });
  },
  onShareAppMessage() {
    return {
      title: "二维码生成 - PDF文档转换工具",
      path: '/pages/qrcode/qrcode',
    };
  },

  onShareTimeline() {
    return {
      title: 'PDF文档转换工具',
    };
  },
});
