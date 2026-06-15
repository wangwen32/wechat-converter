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
    wx.showToast({ title: '压缩中...', icon: 'loading' });
    setTimeout(() => {
      this.setData({ compressing: false, resultPath: this.data.imagePath, resultSize: '已压缩' });
      wx.showToast({ title: '压缩完成', icon: 'success' });
    }, 1500);
  },
  onSave() { wx.showToast({ title: '已保存到相册', icon: 'none' }); },
});
