// pages/index/index.js
Page({
  data: {},

  onLoad() {},

  onPdfToWord() { wx.navigateTo({ url: '/pages/convert/convert?type=pdf2word' }); },
  onWordToPdf() { wx.navigateTo({ url: '/pages/convert/convert?type=word2pdf' }); },
  onImgToPdf() { wx.navigateTo({ url: '/pages/img2pdf/img2pdf' }); },
  onBarcode() { wx.navigateTo({ url: '/pages/barcode/barcode' }); },
  onGame() { wx.navigateTo({ url: '/pages/game/game' }); },
  onQRCode() { wx.navigateTo({ url: '/pages/qrcode/qrcode' }); },
  onRemoveWatermark() { wx.navigateTo({ url: '/pages/remove-watermark/remove-watermark' }); },
  onMore() { wx.navigateTo({ url: '/pages/more/more' }); },

  onShareAppMessage() {
    return { title: 'PDF文档转换工具 - 免费在线转换', path: '/pages/index/index' };
  },
  onShareTimeline() {
    return { title: 'PDF文档转换工具' };
  },
});
