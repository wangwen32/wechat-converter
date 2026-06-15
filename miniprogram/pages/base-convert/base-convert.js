// pages/base-convert/base-convert.js — 进制转换
Page({
  data: {
    inputVal: '255',
    fromBase: 10,
    toBase: 16,
    result: '',
    bases: [2, 8, 10, 16],
    baseNames: ['二进制 (2)', '八进制 (8)', '十进制 (10)', '十六进制 (16)'],
  },

  onInput(e) { this.setData({ inputVal: e.detail.value }); this.convert(); },
  onFromChange(e) { this.setData({ fromBase: this.data.bases[e.detail.value] }); this.convert(); },
  onToChange(e) { this.setData({ toBase: this.data.bases[e.detail.value] }); this.convert(); },

  convert() {
    const { inputVal, fromBase, toBase } = this.data;
    try {
      const decimal = parseInt(inputVal, fromBase);
      if (isNaN(decimal)) { this.setData({ result: '无效输入' }); return; }
      this.setData({ result: decimal.toString(toBase).toUpperCase() });
    } catch (e) {
      this.setData({ result: '无效输入' });
    }
  },

  onCopy() {
    wx.setClipboardData({ data: this.data.result, success: () => wx.showToast({ title: '已复制', icon: 'success' }) });
  },
});
