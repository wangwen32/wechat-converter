// app.js
App({
  globalData: {
    baseUrl: 'https://converter-api-264078-8-1438485063.sh.run.tcloudbase.com',
    theme: 'blue',
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
