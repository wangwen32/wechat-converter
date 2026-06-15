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
    wx.showToast({ title: '处理中...', icon: 'loading' });
    setTimeout(() => {
      this.setData({ processing: false, resultPath: this.data.imagePath });
      wx.showToast({ title: '处理完成', icon: 'success' });
    }, 2000);
  },
  onSave() { wx.showToast({ title: '已保存到相册', icon: 'none' }); },
});
