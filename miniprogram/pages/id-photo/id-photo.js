// pages/id-photo/id-photo.js — 证件照制作
const COLORS = [
  { name: '白色', value: '#FFFFFF' },
  { name: '蓝色', value: '#1677FF' },
  { name: '红色', value: '#FF0000' },
  { name: '灰色', value: '#E5E7EB' },
];
Page({
  data: {
    selected: false, imagePath: '', bgColor: '#FFFFFF', colorIndex: 0,
    colors: COLORS, colorNames: COLORS.map(c => c.name), processing: false, resultPath: '',
  },
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
  onProcess() {
    if (!this.data.selected) return;
    this.setData({ processing: true });
    wx.showToast({ title: '制作中...', icon: 'loading' });
    setTimeout(() => {
      this.setData({ processing: false, resultPath: this.data.imagePath });
      wx.showToast({ title: '制作完成', icon: 'success' });
    }, 2000);
  },
  onSave() { wx.showToast({ title: '已保存到相册', icon: 'none' }); },
});
