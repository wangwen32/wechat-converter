// pages/more/more.js
const app = getApp();

Page({
  data: {
    
    
  },

  onLoad() {
    const theme = app.globalData.theme || 'blue';
    this.setData({
      theme: theme,
      themeClass: theme === 'dark' ? 'theme-dark' : '',
    });
  },

    // 从其它页面返回时同步主题
    this.setData({
    });
  },

  /**
   * 切换主题
   */

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
