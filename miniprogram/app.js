// app.js
App({
  globalData: {
    // 云托管配置
    cloudEnv: 'wechat-converter-d7e0tcl57174390',
    cloudService: 'converter-api',

    // 后端 API 地址（本地开发用）
    baseUrl: 'http://172.22.13.20:8000',

    theme: 'blue', // 'blue' | 'dark'
    useCloud: true, // true=云托管 callContainer, false=本地局域网
  },

  onLaunch() {
    // 初始化云开发环境
    wx.cloud.init({
      env: this.globalData.cloudEnv,
    });
  },

  switchTheme() {
    const newTheme = this.globalData.theme === 'blue' ? 'dark' : 'blue';
    this.globalData.theme = newTheme;
    wx.setStorageSync('theme', newTheme);
    try {
      wx.setNavigationBarColor({
        backgroundColor: newTheme === 'dark' ? '#1A1A1A' : '#FFF8F0',
        frontColor: newTheme === 'dark' ? '#ffffff' : '#000000',
      });
    } catch(e) {}
    return newTheme;
  },

  initTheme() {
    try {
      const saved = wx.getStorageSync('theme') || 'blue';
      this.globalData.theme = saved;
      wx.setNavigationBarColor({
        backgroundColor: saved === 'dark' ? '#1A1A1A' : '#FFF8F0',
        frontColor: saved === 'dark' ? '#ffffff' : '#000000',
      });
      return saved;
    } catch(e) {
      return 'blue';
    }
  },
});
