// app.js
App({
  globalData: {
    // 后端 API 地址 — 开发时用局域网 IP，上线后改 HTTPS 域名
    baseUrl: 'http://172.22.13.20:8000',
    theme: 'dark', // 'blue' | 'dark'
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
    return newTheme;
  },

  // 初始化主题
  initTheme() {
    const saved = wx.getStorageSync('theme') || 'dark';
    this.globalData.theme = saved;
    // 更新导航栏
    wx.setNavigationBarColor({
      backgroundColor: saved === 'dark' ? '#1A1A1A' : '#FFF8F0',
      frontColor: saved === 'dark' ? '#ffffff' : '#000000',
    });
    return saved;
  },
});
