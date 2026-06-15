// pages/photo-restore/photo-restore.js — 老照片修复/上色
const api = require('../../utils/api');
Page({
  data: { mode: 'restore', selected: false, imagePath: '', processing: false, resultPath: '' },

  onModeChange(e) { this.setData({ mode: e.currentTarget.dataset.mode, resultPath: '' }); },

  onChooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['original'], sourceType: ['album'],
      success: (res) => { this.setData({ selected: true, imagePath: res.tempFilePaths[0], resultPath: '' }); },
    });
  },

  onClearImage() { this.setData({ selected: false, imagePath: '', resultPath: '' }); },

  async onProcess() {
    this.setData({ processing: true });
    wx.showLoading({ title: '处理中...' });
    const endpoint = this.data.mode === 'restore' ? 'restore-photo' : 'restore-photo';
    try {
      const result = await api.uploadAndConvert(endpoint, this.data.imagePath, 'photo.jpg');
      wx.hideLoading();
      this.setData({ processing: false, resultPath: result.localPath || this.data.imagePath });
      wx.showToast({ title: '处理完成', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      this.setData({ processing: false });
      wx.showToast({ title: e.message || '处理失败', icon: 'none' });
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
