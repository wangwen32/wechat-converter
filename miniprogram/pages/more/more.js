// pages/more/more.js
const app = getApp();

Page({
  data: {
    theme: 'blue',
    themeClass: '',
  },

  onLoad() {
    const theme = app.globalData.theme || 'blue';
    this.setData({
      theme: theme,
      themeClass: theme === 'dark' ? 'theme-dark' : '',
    });
  },

  onShow() {
    // 从其它页面返回时同步主题
    const currentTheme = app.globalData.theme || 'blue';
    this.setData({
      theme: currentTheme,
      themeClass: currentTheme === 'dark' ? 'theme-dark' : '',
    });
  },

  /**
   * 切换主题
   */
  onToggleTheme() {
    const newTheme = app.switchTheme();
    this.setData({
      theme: newTheme,
      themeClass: newTheme === 'dark' ? 'theme-dark' : '',
    });
    wx.showToast({
      title: newTheme === 'dark' ? '已切换为高级黑' : '已切换为高级蓝',
      icon: 'none',
    });
  },

  /**
   * 清除本地缓存
   */
  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？清除后需要重新登录和设置。',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          // 保留主题设置
          wx.setStorageSync('theme', app.globalData.theme);
          wx.showToast({ title: '缓存已清除', icon: 'success' });
        }
      },
    });
  },

  /**
   * 分享给好友
   */
  onShare() {
    wx.showActionSheet({
      itemList: ['分享给好友'],
      success: () => {
        // 触发右上角分享
        wx.showToast({ title: '点击右上角···分享', icon: 'none' });
      },
    });
  },

  /**
   * 联系开发者
   */
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

  /**
   * 自定义分享
   */
  onShareAppMessage() {
    return {
      title: 'PDF文档转换工具 - 免费在线转换',
      path: '/pages/index/index',
    };
  },
});
