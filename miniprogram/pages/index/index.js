// pages/index/index.js — 首页
const STORAGE_KEY = 'recent_conversions';

Page({
  data: {
    // 状态栏高度
    statusBarHeight: 0,

    // 功能分类
    categories: [
      {
        name: '文件转换',
        icon: '📄',
        tools: [
          { name: 'PDF转Word', page: '/pages/convert/convert?type=pdf2word' },
          { name: 'Word转PDF', page: '/pages/convert/convert?type=word2pdf' },
          { name: '图片转PDF', page: '/pages/img2pdf/img2pdf' },
          { name: '合并PDF', page: '/pages/pdf-tools/pdf-tools?tab=merge' },
          { name: '拆分PDF', page: '/pages/pdf-tools/pdf-tools?tab=split' },
          { name: 'PDF去水印', page: '/pages/remove-watermark/remove-watermark' },
          { name: '文字识别', page: '/pages/ocr/ocr' },
        ],
      },
      {
        name: '图片工具',
        icon: '🖼',
        tools: [
          { name: '图片压缩', page: '/pages/image-compress/image-compress' },
          { name: '老照片修复', page: '/pages/photo-restore/photo-restore' },
          { name: '证件照制作', page: '/pages/id-photo/id-photo' },
        ],
      },
      {
        name: '计算工具',
        icon: '🧮',
        tools: [
          { name: '房贷计算器', page: '/pages/mortgage/mortgage' },
          { name: '个税计算器', page: '/pages/tax/tax' },
          { name: '车贷计算器', page: '/pages/carloan/carloan' },
        ],
      },
      {
        name: '常用工具',
        icon: '🔧',
        tools: [
          { name: '单位换算', page: '/pages/unit-convert/unit-convert' },
          { name: '时间戳转换', page: '/pages/timestamp/timestamp' },
          { name: '进制转换', page: '/pages/base-convert/base-convert' },
          { name: '二维码生成', page: '/pages/qrcode/qrcode' },
          { name: '条形码生成', page: '/pages/barcode/barcode' },
        ],
      },
    ],

    // 文案生成
    textGen: { icon: '✨', name: '文案生成', page: '/pages/text-gen/text-gen' },

    // 最近使用
    recentFiles: [],

    // 休闲娱乐
    games: [
      { id: 'game', name: '飞机大战', icon: '✈', desc: '复古手绘风格射击', page: '/pages/game/game' },
      { id: 'gomoku', name: '手绘五子棋', icon: '✏', desc: '素描风格AI对战', page: '/pages/gomoku/gomoku' },
    ],
  },

  onLoad() {
    // 获取状态栏高度
    const sys = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sys.statusBarHeight,
    });
  },

  onShow() {
    this.loadRecentFiles();
  },

  /**
   * 加载最近使用记录
   */
  loadRecentFiles() {
    try {
      const records = wx.getStorageSync(STORAGE_KEY) || [];
      this.setData({ recentFiles: records.slice(0, 5) });
    } catch (e) {
      this.setData({ recentFiles: [] });
    }
  },

  // ── 导航 ──
  onPdfToWord() {
    wx.navigateTo({ url: '/pages/convert/convert?type=pdf2word' });
  },

  onWordToPdf() {
    wx.navigateTo({ url: '/pages/convert/convert?type=word2pdf' });
  },

  onImgToPdf() {
    wx.navigateTo({ url: '/pages/img2pdf/img2pdf' });
  },

  onQRCode() {
    wx.navigateTo({ url: '/pages/qrcode/qrcode' });
  },

  onBarcode() {
    wx.navigateTo({ url: '/pages/barcode/barcode' });
  },

  onRemoveWatermark() {
    wx.navigateTo({ url: '/pages/remove-watermark/remove-watermark' });
  },

  onGame(e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({ url });
  },

  onNav(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },

  onViewAllTools() {
    wx.switchTab({ url: '/pages/tools/tools' });
  },

  // ── 最近文件操作 ──
  onRecentFileTap(e) {
    const file = e.currentTarget.dataset.file;
    if (file && file.downloadUrl) {
      wx.navigateTo({
        url: `/pages/result/result?fromHistory=1&downloadUrl=${encodeURIComponent(file.downloadUrl)}&filename=${encodeURIComponent(file.filename || '')}&size=${file.size || 0}&convertType=${file.convertType || ''}&downloadKey=${encodeURIComponent(file.downloadKey || '')}&localPath=${encodeURIComponent(file.localPath || '')}`,
      });
    }
  },

  onClearRecent() {
    wx.showModal({
      title: '清空记录',
      content: '确定清空最近使用记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync(STORAGE_KEY, []);
          this.setData({ recentFiles: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      },
    });
  },

  // ── 分享 ──
  onShareAppMessage() {
    return { title: '文档转换大师 - 免费文档工具箱', path: '/pages/index/index' };
  },

  onShareTimeline() {
    return { title: '文档转换大师 - 免费文档工具箱' };
  },
});
