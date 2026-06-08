// pages/index/index.js
const app = getApp();

Page({
  data: {
    theme: 'blue',
    themeClass: '',
  },

  onLoad() {
    // 初始化主题
    const theme = app.initTheme();
    this.setData({
      theme: theme,
      themeClass: theme === 'dark' ? 'theme-dark' : '',
    });
  },

  onShow() {
    // 每次显示时同步主题（可能从更多页切换了主题回来）
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
  },

  /**
   * 点击 PDF → Word
   */
  onPdfToWord() {
    wx.navigateTo({
      url: '/pages/convert/convert?type=pdf2word',
    });
  },

  /**
   * 点击 Word → PDF
   */
  onWordToPdf() {
    wx.navigateTo({
      url: '/pages/convert/convert?type=word2pdf',
    });
  },

  /**
   * 点击 图片 → PDF
   */
  onImgToPdf() {
    wx.navigateTo({
      url: '/pages/img2pdf/img2pdf',
    });
  },

  /**
   * 点击 条形码生成
   */
  onBarcode() {
    wx.navigateTo({
      url: '/pages/barcode/barcode',
    });
  },

  /**
   * 点击 二维码生成
   */
  onQRCode() {
    wx.navigateTo({
      url: '/pages/qrcode/qrcode',
    });
  },

  /**
   * 点击 PDF 去水印
   */
  onRemoveWatermark() {
    wx.navigateTo({
      url: '/pages/remove-watermark/remove-watermark',
    });
  },

  /**
   * 更多选项
   */
  onMore() {
    wx.navigateTo({
      url: '/pages/more/more',
    });
  },
  onShareAppMessage() {
    return {
      title: 'PDF文档转换工具 - 免费在线转换',
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    return {
      title: 'PDF文档转换工具',
    };
  },
});
