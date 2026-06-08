// pages/result/result.js
const api = require('../../utils/api');
const themeUtil = require('../../utils/theme');

Page({
  data: {
    // 从转换页传入
    downloadUrl: '',
    filename: '',
    size: 0,
    sizeDisplay: '',
    convertType: '',

    // 状态: converting | ready | error
    status: 'converting',

    // 下载
    tempFilePath: '',
    downloadProgress: 0,
    errorMsg: '',
    downloadKey: '',
    localPath: '',

    // 主题
    theme: 'blue',
    themeClass: '',
  },

  onLoad(options) {
    // 初始化主题
    const td = themeUtil.initPageTheme();
    this.setData(td);
    this.setData({
      downloadUrl: decodeURIComponent(options.downloadUrl || ''),
      filename: decodeURIComponent(options.filename || ''),
      size: parseInt(options.size || '0'),
      sizeDisplay: api.formatSize(parseInt(options.size || '0')),
      convertType: options.convertType || '',
      downloadKey: decodeURIComponent(options.downloadKey || ''),
      localPath: decodeURIComponent(options.localPath || ''),
    });

    // 优先使用上传时已保存的本地文件
    if (this.data.localPath) {
      this.setData({ status: 'ready', tempFilePath: this.data.localPath });
    } else if (this.data.downloadUrl) {
      this.startDownload();
    } else {
      this.setData({ status: 'error', errorMsg: '下载地址无效' });
    }
  },

  /**
   * 下载转换后的文件
   */
  startDownload() {
    this.setData({ status: 'converting' });
    const ext = this.data.filename.substring(this.data.filename.lastIndexOf('.')).toLowerCase();

    api.downloadFile(this.data.downloadUrl, this.data.filename, this.data.downloadKey)
      .then((tempFilePath) => {
        this.setData({
          status: 'ready',
          tempFilePath: tempFilePath,
        });
      })
      .catch((err) => {
        this.setData({
          status: 'error',
          errorMsg: err.message || '下载失败',
        });
      });
  },

  /**
   * 打开/预览文件
   */
  onOpenFile() {
    if (!this.data.tempFilePath) {
      wx.showToast({ title: '文件不存在', icon: 'none' });
      return;
    }
    const ext = this.data.filename.substring(this.data.filename.lastIndexOf('.')).toLowerCase();
    api.openFile(this.data.tempFilePath, ext);
  },

  /**
   * 保存到手机
   */
  onSaveFile() {
    if (!this.data.tempFilePath) {
      wx.showToast({ title: '文件不存在', icon: 'none' });
      return;
    }

    wx.saveFile({
      tempFilePath: this.data.tempFilePath,
      success: (res) => {
        wx.showToast({ title: '保存成功', icon: 'success' });
        // 记录保存路径
        this.setData({ savedFilePath: res.savedFilePath });
      },
      fail: (err) => {
        // 部分设备可能不支持直接保存，引导用户使用「打开」后手动保存
        wx.showToast({ title: '请使用「打开文件」手动保存', icon: 'none' });
      },
    });
  },

  /**
   * 重新转换
   */
  onConvertAgain() {
    const type = this.data.convertType || 'pdf2word';
    wx.redirectTo({
      url: `/pages/convert/convert?type=${type}`,
    });
  },

  /**
   * 返回首页
   */
  onGoHome() {
    wx.switchTab({
      url: '/pages/index/index',
      fail: () => {
        wx.reLaunch({ url: '/pages/index/index' });
      },
    });
  },

  onShareAppMessage() {
    return {
      title: '文件转换完成 - PDF文档转换工具',
      path: '/pages/index/index',
    };
  },
});
