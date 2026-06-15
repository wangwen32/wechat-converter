// pages/pdf-tools/pdf-tools.js — 合并/拆分 PDF
const api = require('../../utils/api');

Page({
  data: {
    tab: 'merge', // merge | split
    // 合并
    files: [],
    merging: false,
    // 拆分
    selected: false,
    fileName: '',
    filePath: '',
    splitMode: 'all',
    splitPageRange: '',
    splitting: false,
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
  },

  // ── 合并 ──
  onAddFile() {
    wx.chooseMessageFile({
      count: 10,
      type: 'file',
      success: (res) => {
        const pdfs = res.tempFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
        if (pdfs.length === 0) {
          wx.showToast({ title: '请选择 PDF 文件', icon: 'none' });
          return;
        }
        this.setData({ files: [...this.data.files, ...pdfs] });
      },
    });
  },

  onRemoveFile(e) {
    const idx = e.currentTarget.dataset.index;
    const files = [...this.data.files];
    files.splice(idx, 1);
    this.setData({ files });
  },

  async onMerge() {
    if (this.data.files.length < 2) {
      wx.showToast({ title: '请至少选择 2 个 PDF', icon: 'none' });
      return;
    }
    this.setData({ merging: true });
    try {
      // 逐个上传到临时目录，后端合并
      wx.showToast({ title: '开发中，即将上线', icon: 'none' });
      this.setData({ merging: false });
    } catch (e) {
      wx.showToast({ title: e.message || '合并失败', icon: 'none' });
      this.setData({ merging: false });
    }
  },

  // ── 拆分 ──
  onChooseFile() {
    if (this.data.splitting) return;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const file = res.tempFiles[0];
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          wx.showToast({ title: '请选择 PDF 文件', icon: 'none' });
          return;
        }
        this.setData({
          selected: true, fileName: file.name,
          filePath: file.path, fileSize: api.formatSize(file.size),
        });
      },
    });
  },

  onClearFile() {
    this.setData({ selected: false, fileName: '', filePath: '', fileSize: '' });
  },

  onSplitModeChange(e) {
    this.setData({ splitMode: e.detail.value });
  },

  onRangeInput(e) {
    this.setData({ splitPageRange: e.detail.value });
  },

  async onSplit() {
    if (!this.data.selected) {
      wx.showToast({ title: '请先选择 PDF 文件', icon: 'none' });
      return;
    }
    this.setData({ splitting: true });
    wx.showToast({ title: '开发中，即将上线', icon: 'none' });
    this.setData({ splitting: false });
  },
});
