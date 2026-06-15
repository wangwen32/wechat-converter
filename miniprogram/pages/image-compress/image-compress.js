// pages/image-compress/image-compress.js — 图片压缩
const api = require('../../utils/api');
Page({
  data: { selected: false, imagePath: '', fileName: '', fileSize: '', quality: 70, compressing: false, resultPath: '', resultSize: '' },

  onChooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['original'], sourceType: ['album'],
      success: (res) => {
        const f = res.tempFiles[0];
        this.setData({ selected: true, imagePath: res.tempFilePaths[0], fileName: f.name || 'image.jpg', fileSize: api.formatSize(f.size), resultPath: '', resultSize: '' });
      },
    });
  },

  onClearImage() { this.setData({ selected: false, imagePath: '', resultPath: '', resultSize: '' }); },

  onQualityChange(e) { this.setData({ quality: e.detail.value }); },

  async onCompress() {
    this.setData({ compressing: true });
    wx.showLoading({ title: '压缩中...' });
    try {
      const result = await new Promise((resolve, reject) => {
        getApp().uploadFileToCloud({
          url: '/api/convert/compress-image',
          filePath: this.data.imagePath,
          name: 'file',
          formData: { quality: this.data.quality },
          success(res) {
            try {
              const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
              if (data.code === 0) resolve(data);
              else reject(new Error(data.message || '压缩失败'));
            } catch (e) {
              reject(new Error('解析响应失败'));
            }
          },
          fail(err) { reject(new Error(err.errMsg || '网络请求失败')); },
        });
      });
      wx.hideLoading();
      const rd = result.data || {};
      let localPath = '';
      if (rd.file_base64) {
        localPath = api.saveBase64ToFile(rd.file_base64, rd.filename || 'compressed.jpg');
      }
      this.setData({
        compressing: false,
        resultPath: localPath || this.data.imagePath,
        resultSize: api.formatSize(rd.size || 0),
      });
      wx.showToast({ title: '压缩完成', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      this.setData({ compressing: false });
      wx.showToast({ title: e.message || '压缩失败', icon: 'none' });
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
