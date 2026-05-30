// pages/img2pdf/img2pdf.js
const api = require('../../utils/api');
const themeUtil = require('../../utils/theme');

Page({
  data: {
    // 文件
    selected: false,
    fileName: '',
    fileSize: '',
    filePath: '',
    tempImagePath: '',

    // 状态: idle | uploading | converting | done | error
    status: 'idle',
    progress: 0,
    errorMsg: '',

    // 主题
    theme: 'blue',
    themeClass: '',
  },

  onLoad() {
    const td = themeUtil.initPageTheme();
    this.setData(td);
  },

  /**
   * 选择图片
   */
  onChooseImage() {
    if (this.data.status === 'uploading' || this.data.status === 'converting') {
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles[0];
        const path = res.tempFilePaths[0];
        const name = file.name || path.split('/').pop() || 'image.jpg';

        this.setData({
          selected: true,
          fileName: name,
          fileSize: api.formatSize(file.size),
          filePath: path,
          tempImagePath: path,
          status: 'idle',
          errorMsg: '',
          progress: 0,
        });
      },
    });
  },

  /**
   * 清除已选文件
   */
  onClearFile() {
    this.setData({
      selected: false,
      fileName: '',
      fileSize: '',
      filePath: '',
      tempImagePath: '',
      status: 'idle',
      errorMsg: '',
      progress: 0,
    });
  },

  /**
   * 开始转换
   */
  async onStartConvert() {
    if (!this.data.selected || !this.data.filePath) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }

    this.setData({ status: 'uploading', progress: 0, errorMsg: '' });

    try {
      const result = await api.uploadAndConvert(
        'img2pdf',
        this.data.filePath,
        this.data.fileName,
        (percent) => {
          this.setData({ progress: percent });
        },
      );

      this.setData({ status: 'converting', progress: 99 });

      wx.redirectTo({
        url: `/pages/result/result?downloadUrl=${encodeURIComponent(result.downloadUrl)}&filename=${encodeURIComponent(result.filename)}&size=${result.size}&convertType=img2pdf`,
      });
    } catch (err) {
      this.setData({
        status: 'error',
        errorMsg: err.message || '转换失败，请稍后重试',
      });
      wx.showToast({ title: '转换失败', icon: 'none' });
    }
  },

  /**
   * 重试
   */
  onRetry() {
    this.setData({ status: 'idle', progress: 0, errorMsg: '' });
  },
});
