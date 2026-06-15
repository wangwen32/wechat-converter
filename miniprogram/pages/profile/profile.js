// pages/profile/profile.js — 我的
Page({
  data: {
    cacheSize: '0 KB',
  },

  onShow() {
    this.getCacheSize();
  },

  getCacheSize() {
    try {
      const records = wx.getStorageSync('recent_conversions') || [];
      const size = records.length;
      this.setData({ cacheSize: size > 0 ? size + ' 条记录' : '0 条记录' });
    } catch (e) {}
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定清除本地缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.getCacheSize();
          this.setData({ isDarkMode: false });
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      },
    });
  },

  onContact() {
    wx.setClipboardData({
      data: '19571845180',
      success: () => {
        wx.showModal({
          title: '联系开发者',
          content: '微信号：19571845180\n\n已复制到剪贴板，请打开微信搜索添加',
          showCancel: false,
          confirmText: '知道了',
        });
      },
    });
  },

  onShareAppMessage() {
    return { title: '文档转换大师 - 免费文档工具箱', path: '/pages/index/index' };
  },
});
