// pages/id-photo/id-photo.js — 证件照制作
const api = require('../../utils/api');
const COLORS = [
  { name: '白色', value: '#FFFFFF' },
  { name: '蓝色', value: '#1677FF' },
  { name: '红色', value: '#FF0000' },
  { name: '灰色', value: '#E5E7EB' },
];
Page({
  data: { selected: false, imagePath: '', bgColor: '#FFFFFF', colorIndex: 0,
    colors: COLORS, colorNames: COLORS.map(c => c.name), processing: false, resultPath: '' },

  onChooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['original'], sourceType: ['album', 'camera'],
      success: (res) => { this.setData({ selected: true, imagePath: res.tempFilePaths[0], resultPath: '' }); },
    });
  },

  onClearImage() { this.setData({ selected: false, imagePath: '', resultPath: '' }); },

  onColorChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ colorIndex: idx, bgColor: COLORS[idx].value });
  },

  async onProcess() {
    if (!this.data.selected) return;
    this.setData({ processing: true });
    wx.showLoading({ title: '制作中...' });
    try {
      const result = await new Promise((resolve, reject) => {
        getApp().uploadFileToCloud({
          url: '/api/convert/id-photo',
          filePath: this.data.imagePath,
          name: 'file',
          formData: { bg_color: this.data.bgColor },
          success(res) {
            try {
              const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
              if (data.code === 0) resolve(data);
              else reject(new Error(data.message || '制作失败'));
            } catch (e) { reject(new Error('解析响应失败')); }
          },
          fail(err) { reject(new Error(err.errMsg || '网络请求失败')); },
        });
      });
      wx.hideLoading();
      const rd = result.data || {};
      let localPath = '';
      if (rd.file_base64) {
        localPath = api.saveBase64ToFile(rd.file_base64, rd.filename || 'idphoto.jpg');
      }
      this.setData({ processing: false, resultPath: localPath || this.data.imagePath });
      wx.showToast({ title: '制作完成', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      this.setData({ processing: false });
      wx.showToast({ title: e.message || '制作失败', icon: 'none' });
    }
  },

  onSave() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.resultPath,
      success: () => wx.showToast({ title: '已保存', icon: 'success' }),
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
    });
  },
});
