// pages/remove-watermark/remove-watermark.js
const api = require('../../utils/api');

Page({
  data: {
    // 文件
    selected: false,
    fileName: '',
    fileSize: '',
    filePath: '',

    // 状态: idle | uploading | converting | done | error
    status: 'idle',
    progress: 0,
    errorMsg: '',

    
    
  },

  onLoad() {
    this.setData(td);
  },

  /**
   * 选择 PDF 文件
   */
  onChooseFile() {
    if (this.data.status === 'uploading' || this.data.status === 'converting') {
      return;
    }

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const file = res.tempFiles[0];
        const name = file.name || '';
        const ext = name.substring(name.lastIndexOf('.')).toLowerCase();

        if (ext !== '.pdf') {
          wx.showToast({ title: '请选择 PDF 文件', icon: 'none' });
          return;
        }

        this.setData({
          selected: true,
          fileName: name,
          fileSize: api.formatSize(file.size),
          filePath: file.path,
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
      status: 'idle',
      errorMsg: '',
      progress: 0,
    });
  },

  /**
   * 开始处理
   */
  async onStartConvert() {
    if (!this.data.selected || !this.data.filePath) {
      wx.showToast({ title: '请先选择 PDF 文件', icon: 'none' });
      return;
    }

    this.setData({ status: 'uploading', progress: 0, errorMsg: '' });

    try {
      const result = await api.uploadAndConvert(
        'remove-watermark',
        this.data.filePath,
        this.data.fileName,
        (percent) => {
          this.setData({ progress: percent });
        },
      );

      this.setData({ status: 'converting', progress: 99 });

      wx.redirectTo({
        url: `/pages/result/result?downloadUrl=${encodeURIComponent(result.downloadUrl)}&filename=${encodeURIComponent(result.filename)}&size=${result.size}&convertType=remove-watermark&downloadKey=${encodeURIComponent(result.downloadKey || '')}&localPath=${encodeURIComponent(result.localPath || '')}`,
      });
    } catch (err) {
      this.setData({
        status: 'error',
        errorMsg: err.message || '处理失败，请稍后重试',
      });
      wx.showToast({ title: '处理失败', icon: 'none' });
    }
  },

  /**
   * 重试
   */
  onRetry() {
    this.setData({ status: 'idle', progress: 0, errorMsg: '' });
  },
  onShareAppMessage() {
    return {
      title: "PDF去水印 - PDF文档转换工具",
      path: '/pages/remove-watermark/remove-watermark',
    };
  },

  onShareTimeline() {
    return {
      title: 'PDF文档转换工具',
    };
  },
});
