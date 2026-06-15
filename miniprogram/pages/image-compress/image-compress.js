// pages/image-compress/image-compress.js — 图片压缩
const api = require('../../utils/api');
Page({
  data: { selected: false, imagePath: '', fileName: '', fileSize: '', quality: 70, compressing: false, resultPath: '', resultSize: '' },

  onChooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['original'], sourceType: ['album'],
      success: (res) => {
        const f = res.tempFiles[0];
        this.setData({ selected: true, imagePath: res.tempFilePaths[0], fileName: f.name || 'image.jpg', fileSize: api.formatSize(f.size), resultPath: '', resultSize: '' });
      },
    });
  },

  onClearImage() { this.setData({ selected: false, imagePath: '', resultPath: '', resultSize: '' }); },

  onQualityChange(e) { this.setData({ quality: e.detail.value }); },

  async onCompress() {
    this.setData({ compressing: true });
    wx.showLoading({ title: '压缩中...' });
    try {
      const result = await api.uploadAndConvert('compress-image', this.data.imagePath, this.data.fileName, (pct) => {});
      wx.hideLoading();
      this.setData({
        compressing: false,
        resultPath: result.localPath || this.data.imagePath,
        resultSize: api.formatSize(result.size || 0),
      });
      wx.showToast({ title: '压缩完成', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      this.setData({ compressing: false });
      wx.showToast({ title: e.message || '压缩失败', icon: 'none' });
    }
  },

  onSave() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.resultPath,
      success: () => wx.showToast({ title: '已保存', icon: 'success' }),
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
    });
  },
});
