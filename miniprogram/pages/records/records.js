// pages/records/records.js — 转换记录
const STORAGE_KEY = 'recent_conversions';

Page({
  data: {
    records: [],
    showClear: false,
  },

  onShow() {
    this.loadRecords();
  },

  loadRecords() {
    try {
      const records = wx.getStorageSync(STORAGE_KEY) || [];
      this.setData({ records, showClear: records.length > 0 });
    } catch (e) {
      this.setData({ records: [], showClear: false });
    }
  },

  onRecordTap(e) {
    const file = e.currentTarget.dataset.file;
    if (!file) return;
    wx.navigateTo({
      url: `/pages/result/result?fromHistory=1&downloadUrl=${encodeURIComponent(file.downloadUrl || '')}&filename=${encodeURIComponent(file.filename || '')}&size=${file.size || 0}&convertType=${file.convertType || ''}&downloadKey=${encodeURIComponent(file.downloadKey || '')}&localPath=${encodeURIComponent(file.localPath || '')}`,
    });
  },

  onClearAll() {
    wx.showModal({
      title: '清空记录',
      content: '确定清空所有转换记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync(STORAGE_KEY, []);
          this.setData({ records: [], showClear: false });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      },
    });
  },

  onShareAppMessage() {
    return { title: '文档转换大师 - 转换记录', path: '/pages/records/records' };
  },
});
