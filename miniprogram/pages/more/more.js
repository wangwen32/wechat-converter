// pages/more/more.js
Page({
  data: {},

  onLoad() {},

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: '缓存已清除', icon: 'success' });
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
          content: '微信号：19571845180\n\n已复制到剪贴板',
          showCancel: false,
          confirmText: '知道了',
        });
      },
    });
  },

  onShareAppMessage() {
    return { title: 'PDF文档转换工具 - 免费在线转换', path: '/pages/index/index' };
  },
  onShareTimeline() {
    return { title: 'PDF文档转换工具' };
  },
});
