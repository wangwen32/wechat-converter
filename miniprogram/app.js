// app.js
App({
  globalData: {
    // 后端 API 地址 — 开发时用局域网 IP，上线后改 HTTPS 域名
    baseUrl: 'https://converter-api-264078-8-1438485063.sh.run.tcloudbase.com',
    theme: 'blue', // 'blue' | 'dark'
  },

  // 切换主题
  switchTheme() {
    const newTheme = this.globalData.theme === 'blue' ? 'dark' : 'blue';
    this.globalData.theme = newTheme;
    wx.setStorageSync('theme', newTheme);
    // 更新导航栏颜色
    wx.setNavigationBarColor({
      backgroundColor: newTheme === 'dark' ? '#1A1A1A' : '#FFF8F0',
      frontColor: newTheme === 'dark' ? '#ffffff' : '#000000',
    });
    // 同步页面背景色，防止页面切换时闪白
    wx.setBackgroundColor({
      backgroundColor: newTheme === 'dark' ? '#0A1628' : '#FFF8F0',
    });
    return newTheme;
  },

  // 初始化主题
  initTheme() {
    const saved = wx.getStorageSync('theme') || 'blue';
    this.globalData.theme = saved;
    // 更新导航栏
    wx.setNavigationBarColor({
      backgroundColor: saved === 'dark' ? '#1A1A1A' : '#FFF8F0',
      frontColor: saved === 'dark' ? '#ffffff' : '#000000',
    });
    // 同步页面背景色
    wx.setBackgroundColor({
      backgroundColor: saved === 'dark' ? '#0A1628' : '#FFF8F0',
    });
    return saved;
  },
});
