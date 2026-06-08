// pages/barcode/barcode.js
const api = require('../../utils/api');
const themeUtil = require('../../utils/theme');

Page({
  data: {
    inputData: '',
    typeIndex: 0,
    typeList: [
      'Code128（通用）',
      'Code39（字母数字）',
      'EAN-13（商品码）',
      'EAN-8（商品码短）',
      'UPC-A（北美商品）',
    ],
    typeKeys: ['code128', 'code39', 'ean13', 'ean8', 'upca'],
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

  onTypeChange(e) {
    this.setData({ typeIndex: parseInt(e.detail.value) });
  },

  async onGenerate() {
    const data = this.data.inputData.trim();
    if (!data) {
      wx.showToast({ title: '请输入要编码的数据', icon: 'none' });
      return;
    }

    // 检查是否包含中文（条形码只支持英文和数字）
    const hasChinese = /[一-鿿　-〿＀-￯]/.test(data);
    if (hasChinese) {
      wx.showToast({ title: '条形码不支持中文，请输入英文或数字', icon: 'none' });
      return;
    }

    const typeKey = this.data.typeKeys[this.data.typeIndex];

    this.setData({ generating: true, resultUrl: '', resultLocalPath: '' });

    try {
      const result = await api.generateBarcode(data, typeKey);
      // 先下载图片到本地再显示
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
      wx.showToast({ title: '请先生成条形码', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
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

  onShareAppMessage() {
    return {
      title: '条形码生成 - PDF文档转换工具',
      path: '/pages/barcode/barcode',
    };
  },
});
