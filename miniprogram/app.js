// app.js
const CLOUD_HOST = 'https://convertmy.kaixin8.top';

App({
  globalData: {
    cloudEnv: 'wechat-converter-d7e0tcl57174390',
    cloudService: 'converter-api',
    isDebug: false,
  },

  onLaunch() {
    wx.cloud.init({ env: this.globalData.cloudEnv });
  },

  // ── 通用请求 ──
  callApi(options) {
    const { url, method = 'POST', data = {}, header = {}, success, fail, complete } = options;
    let path = url;
    if (path.startsWith('http')) {
      try { path = '/' + path.split('/').slice(3).join('/'); } catch (e) {}
    }

    if (this.globalData.isDebug) {
      const fullUrl = `${CLOUD_HOST}${path}`;
      wx.request({
        url: fullUrl, method, data,
        header: { 'content-type': 'application/json', ...header },
        success(res) {
          if (res.statusCode !== 200) {
            const detail = (res.data && (res.data.detail || res.data.message)) || '';
            fail && fail({ errMsg: detail || `服务器错误 (${res.statusCode})` });
            complete && complete(); return;
          }
          success && success(res); complete && complete();
        },
        fail(err) { fail && fail(err); complete && complete(); },
      });
    } else {
      if (!this._cloudInited) {
        try { wx.cloud.init({ env: this.globalData.cloudEnv }); this._cloudInited = true; } catch (e) {}
      }
      wx.cloud.callContainer({
        config: { env: this.globalData.cloudEnv },
        path, method,
        header: { 'X-WX-SERVICE': this.globalData.cloudService, 'content-type': 'application/json', ...header },
        data,
        success(res) {
          if (res.statusCode !== 200) {
            const detail = (res.data && (res.data.detail || res.data.message)) || '';
            fail && fail({ errMsg: detail || `服务器错误 (${res.statusCode})` });
            complete && complete(); return;
          }
          success && success(res); complete && complete();
        },
        fail(err) { fail && fail(err); complete && complete(); },
      });
    }
  },

  // ── 文件上传 ──
  uploadFileToCloud(options) {
    const { url, filePath, name = 'file', formData = {}, header = {}, success, fail, complete } = options;
    let path = url;
    if (path.startsWith('http')) {
      try { path = '/' + path.split('/').slice(3).join('/'); } catch (e) {}
    }
    const uploadTask = wx.uploadFile({
      url: `${CLOUD_HOST}${path}`, filePath, name, formData, header,
      success(res) {
        if (res.statusCode !== 200) {
          let detail = '';
          try { const b = typeof res.data === 'string' ? JSON.parse(res.data) : res.data; detail = b.detail || b.message || ''; } catch(e) {}
          fail && fail({ errMsg: detail || `服务器错误 (${res.statusCode})` });
          complete && complete(); return;
        }
        try { res.data = JSON.parse(res.data); } catch (e) {}
        success && success(res); complete && complete();
      },
      fail(err) { fail && fail(err); complete && complete(); },
    });
    return uploadTask;
  },
});
