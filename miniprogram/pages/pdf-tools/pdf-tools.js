// pages/pdf-tools/pdf-tools.js — 合并/拆分 PDF
const api = require('../../utils/api');
const CLOUD_HOST = 'https://convertmy.kaixin8.top';

Page({
  data: {
    tab: 'merge',
    // 合并
    files: [],
    merging: false,
    // 拆分
    selected: false,
    fileName: '',
    filePath: '',
    fileSize: '',
    splitMode: 'all',
    splitModeIdx: 0,
    splitPageRange: '',
    splitting: false,
  },

  onTabChange(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  // ── 合并 ──
  onAddFile() {
    wx.chooseMessageFile({
      count: 10, type: 'file',
      success: (res) => {
        const pdfs = res.tempFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
        if (pdfs.length === 0) { wx.showToast({ title: '请选择 PDF 文件', icon: 'none' }); return; }
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
    wx.showLoading({ title: '上传合并中...' });

    try {
      // 将每个 PDF 读取为 base64，一次性发送给后端
      const fs = wx.getFileSystemManager();
      const fileBases = [];
      for (const f of this.data.files) {
        const base64 = fs.readFileSync(f.path, 'base64');
        fileBases.push({ name: f.name, data: base64 });
      }

      const app = getApp();
      const baseUrl = app.globalData.isDebug ? CLOUD_HOST : '';

      const result = await new Promise((resolve, reject) => {
        wx.request({
          url: baseUrl + '/api/convert/merge-pdf',
          method: 'POST',
          data: { files: fileBases },
          timeout: 120000,
          success: (res) => {
            if (res.data && res.data.code === 0) resolve(res.data);
            else reject(new Error((res.data && res.data.detail) || '合并失败'));
          },
          fail: (err) => reject(new Error(err.errMsg || '网络请求失败')),
        });
      });

      wx.hideLoading();
      this.setData({ merging: false });

      // 跳转到结果页
      wx.redirectTo({
        url: `/pages/result/result?downloadUrl=${encodeURIComponent(result.data.download_url)}&filename=${encodeURIComponent(result.data.filename)}&size=${result.data.size}&convertType=merge-pdf&downloadKey=${encodeURIComponent(result.data.download_key || '')}&localPath=${encodeURIComponent(result.data.file_base64 || '')}`,
      });
    } catch (e) {
      wx.hideLoading();
      this.setData({ merging: false });
      wx.showToast({ title: e.message || '合并失败', icon: 'none' });
    }
  },

  // ── 拆分 ──
  onChooseFile() {
    if (this.data.splitting) return;
    wx.chooseMessageFile({
      count: 1, type: 'file',
      success: (res) => {
        const file = res.tempFiles[0];
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          wx.showToast({ title: '请选择 PDF 文件', icon: 'none' }); return;
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
    const idx = Number(e.detail.value);
    this.setData({ splitModeIdx: idx, splitMode: idx === 0 ? 'all' : 'range' });
  },

  onRangeInput(e) {
    this.setData({ splitPageRange: e.detail.value });
  },

  async onSplit() {
    if (!this.data.selected) {
      wx.showToast({ title: '请先选择 PDF 文件', icon: 'none' }); return;
    }
    if (this.data.splitMode === 'range' && !this.data.splitPageRange.trim()) {
      wx.showToast({ title: '请输入页码范围', icon: 'none' }); return;
    }
    this.setData({ splitting: true });
    wx.showLoading({ title: '拆分中...' });

    try {
      const app = getApp();
      const baseUrl = app.globalData.isDebug ? CLOUD_HOST : '';

      const result = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: baseUrl + '/api/convert/split-pdf',
          filePath: this.data.filePath,
          name: 'file',
          formData: {
            mode: this.data.splitMode,
            page_ranges: this.data.splitPageRange,
          },
          timeout: 120000,
          success: (res) => {
            try {
              const data = JSON.parse(res.data);
              if (data.code === 0) resolve(data);
              else reject(new Error(data.detail || '拆分失败'));
            } catch (e) {
              reject(new Error('解析响应失败'));
            }
          },
          fail: (err) => reject(new Error(err.errMsg || '网络请求失败')),
        });
      });

      wx.hideLoading();
      this.setData({ splitting: false });

      wx.redirectTo({
        url: `/pages/result/result?downloadUrl=${encodeURIComponent(result.data.download_url)}&filename=${encodeURIComponent(result.data.filename)}&size=${result.data.size}&convertType=split-pdf&downloadKey=${encodeURIComponent(result.data.download_key || '')}&localPath=${encodeURIComponent(result.data.file_base64 || '')}`,
      });
    } catch (e) {
      wx.hideLoading();
      this.setData({ splitting: false });
      wx.showToast({ title: e.message || '拆分失败', icon: 'none' });
    }
  },
});
