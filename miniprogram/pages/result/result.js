// pages/result/result.js
const api = require('../../utils/api');
const STORAGE_KEY = 'recent_conversions';

/**
 * 保存转换记录到缓存
 */
function saveRecentFile(file) {
  try {
    const records = wx.getStorageSync(STORAGE_KEY) || [];
    records.unshift({
      ...file,
      time: Date.now(),
      timeDisplay: new Date().toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }),
    });
    wx.setStorageSync(STORAGE_KEY, records.slice(0, 20));
  } catch (e) {}
}

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

    // 是否来自历史记录（来自历史不重复保存）
    fromHistory: false,

    // 下载
    tempFilePath: '',
    downloadProgress: 0,
    errorMsg: '',
    downloadKey: '',
    localPath: '',

    
    
  },

  onLoad(options) {

    this.setData({
      downloadUrl: decodeURIComponent(options.downloadUrl || ''),
      filename: decodeURIComponent(options.filename || ''),
      size: parseInt(options.size || '0'),
      sizeDisplay: api.formatSize(parseInt(options.size || '0')),
      convertType: options.convertType || '',
      downloadKey: decodeURIComponent(options.downloadKey || ''),
      localPath: decodeURIComponent(options.localPath || ''),
      fromHistory: options.fromHistory === '1',
    });

    // 优先使用上传时已保存的本地文件
    if (this.data.localPath) {
      this.setData({ status: 'ready', tempFilePath: this.data.localPath });
      // 来自历史记录不重复保存
      if (!this.data.fromHistory) {
        saveRecentFile({
          filename: this.data.filename,
          size: this.data.size,
          sizeDisplay: this.data.sizeDisplay,
          convertType: this.data.convertType,
          downloadUrl: this.data.downloadUrl,
          downloadKey: this.data.downloadKey,
          localPath: this.data.localPath,
        });
      }
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
        // 来自历史记录不重复保存
        if (!this.data.fromHistory) {
          saveRecentFile({
            filename: this.data.filename,
            size: this.data.size,
            sizeDisplay: this.data.sizeDisplay,
            convertType: this.data.convertType,
            downloadUrl: this.data.downloadUrl,
            downloadKey: this.data.downloadKey,
            localPath: this.data.localPath,
          });
        }
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
    wx.reLaunch({ url: '/pages/index/index' });
  },
  onShareAppMessage() {
    return {
      title: "文件转换完成 - PDF文档转换工具",
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    return {
      title: 'PDF文档转换工具',
    };
  },
});
