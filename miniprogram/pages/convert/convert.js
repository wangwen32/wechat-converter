// pages/convert/convert.js
const api = require('../../utils/api');

Page({
  data: {
    // 转换类型
    convertType: '',       // 'pdf2word' | 'word2pdf'
    convertLabel: '',      // 显示用
    acceptExt: '',         // 接受的文件扩展名描述

    // 文件选择
    selected: false,
    fileName: '',
    fileSize: '',
    filePath: '',

    // 状态: idle | uploading | converting | done | error
    status: 'idle',
    progress: 0,
    errorMsg: '',

    
    
  },

  onLoad(options) {
    
    const type = options.type || 'pdf2word';
    const config = {
      'pdf2word': { label: 'PDF → Word', accept: '.pdf' },
      'word2pdf': { label: 'Word → PDF', accept: '.docx' },
    };
    const cfg = config[type] || config['pdf2word'];
    this.setData({
      convertType: type,
      convertLabel: cfg.label,
      acceptExt: cfg.accept,
    });
    wx.setNavigationBarTitle({ title: cfg.label });
  },

  /**
   * 选择文件
   */
  onChooseFile() {
    if (this.data.status === 'uploading' || this.data.status === 'converting') {
      return; // 转换中禁止操作
    }

    const ext = this.data.acceptExt;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const file = res.tempFiles[0];
        // 校验扩展名
        const name = file.name || '';
        const extname = name.substring(name.lastIndexOf('.')).toLowerCase();
        if (extname !== ext) {
          wx.showToast({
            title: `请选择 ${ext} 文件`,
            icon: 'none',
          });
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
   * 开始转换
   */
  async onStartConvert() {
    if (!this.data.selected || !this.data.filePath) {
      wx.showToast({ title: '请先选择文件', icon: 'none' });
      return;
    }

    this.setData({ status: 'uploading', progress: 0, errorMsg: '' });

    try {
      // 上传并转换
      const result = await api.uploadAndConvert(
        this.data.convertType,
        this.data.filePath,
        this.data.fileName,
        (percent) => {
          this.setData({ progress: percent });
        },
      );

      // 上传完成，后端正在转换
      this.setData({ status: 'converting', progress: 99 });

      // 跳转到结果页
      wx.redirectTo({
        url: `/pages/result/result?downloadUrl=${encodeURIComponent(result.downloadUrl)}&filename=${encodeURIComponent(result.filename)}&size=${result.size}&convertType=${this.data.convertType}&downloadKey=${encodeURIComponent(result.downloadKey || '')}&localPath=${encodeURIComponent(result.localPath || '')}`,
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
    this.setData({
      status: 'idle',
      progress: 0,
      errorMsg: '',
    });
  },
  onShareAppMessage() {
    return {
      title: this.data.convertLabel || "文档转换",
      path: `/pages/convert/convert?type=${this.data.convertType}`,
    };
  },

  onShareTimeline() {
    return {
      title: 'PDF文档转换工具',
    };
  },
});
