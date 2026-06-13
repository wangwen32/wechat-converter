// pages/color-match/color-match.js
Page({
  data: {
    colorList: [],
    loading: false,
  },

  onLoad() {
    this.generateColors();
  },

  /**
   * 生成一组随机配色
   */
  generateColors() {
    const colors = [];
    for (let i = 0; i < 5; i++) {
      colors.push(this.randomColor());
    }
    this.setData({ colorList: colors });
  },

  randomColor() {
    const hue = Math.floor(Math.random() * 360);
    const sat = 60 + Math.floor(Math.random() * 30);
    const lig = 40 + Math.floor(Math.random() * 30);
    const hex = this.hslToHex(hue, sat, lig);
    return { hsl: `hsl(${hue}, ${sat}%, ${lig}%)`, hex };
  },

  hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    const toHex = x => Math.round(255 * f(x)).toString(16).padStart(2, '0');
    return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
  },

  onRefresh() {
    this.generateColors();
  },

  onCopyColor(e) {
    const hex = e.currentTarget.dataset.hex;
    if (!hex) return;
    wx.setClipboardData({
      data: hex,
      success: () => {
        wx.showToast({ title: '已复制 ' + hex, icon: 'none' });
      },
    });
  },

  onShareAppMessage() {
    return { title: '配色推荐 - PDF文档转换工具', path: '/pages/color-match/color-match' };
  },
});
