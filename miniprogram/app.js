// app.js
const CLOUD_HOST = 'https://converter-api-264078-8-1438485063.sh.run.tcloudbase.com';

App({
  globalData: {
    // ========== 云托管配置 ==========
    cloudEnv: 'wechat-converter-d7e0tcl57174390',
    cloudService: 'converter-api',

    // ========== 调试开关 ==========
    // true = 走公网域名（本地调试用）
    // false = 走 callContainer 内网链路（上线用）
    isDebug: true,

    // ========== 主题 ==========
    theme: 'blue',
  },

  // =============================================
  // 1. 通用 JSON 请求方法
  //    包装 wx.cloud.callContainer，自动处理初始化 + 调试模式
  // =============================================
  callApi(options) {
    const { url, method = 'POST', data = {}, header = {}, success, fail, complete } = options;

    // 路径清洗：去掉完整域名，只保留 /api/xxx 路径
    let path = url;
    if (path.startsWith('http')) {
      try {
        path = '/' + path.split('/').slice(3).join('/');
      } catch (e) {
        // 保留原 path
      }
    }

    // 确保已初始化 wx.cloud
    if (!this._cloudInited) {
      try {
        wx.cloud.init({ env: this.globalData.cloudEnv });
        this._cloudInited = true;
      } catch (e) {
        // 忽略重复初始化
      }
    }

    if (this.globalData.isDebug) {
      // ===== 调试模式：走公网域名 =====
      const fullUrl = `${CLOUD_HOST}${path}`;
      wx.request({
        url: fullUrl,
        method,
        data,
        header: {
          'content-type': 'application/json',
          ...header,
        },
        success(res) {
          if (res.statusCode !== 200) {
            const detail = (res.data && (res.data.detail || res.data.message)) || '';
            fail && fail({ errMsg: detail || `服务器错误 (${res.statusCode})` });
            complete && complete();
            return;
          }
          success && success(res);
          complete && complete();
        },
        fail(err) {
          fail && fail(err);
          complete && complete();
        },
      });
    } else {
      // ===== 上线模式：走 callContainer 内网链路 =====
      wx.cloud.callContainer({
        config: { env: this.globalData.cloudEnv },
        path,
        method,
        header: {
          'X-WX-SERVICE': this.globalData.cloudService,
          'content-type': 'application/json',
          ...header,
        },
        data,
        success(res) {
          if (res.statusCode !== 200) {
            const detail = (res.data && (res.data.detail || res.data.message)) || '';
            fail && fail({ errMsg: detail || `服务器错误 (${res.statusCode})` });
            complete && complete();
            return;
          }
          success && success(res);
          complete && complete();
        },
        fail(err) {
          fail && fail(err);
          complete && complete();
        },
      });
    }
  },

  // =============================================
  // 2. 文件上传方法
  //    包装 wx.uploadFile，自动拼接云托管地址
  // =============================================
  uploadFileToCloud(options) {
    const { url, filePath, name = 'file', formData = {}, header = {}, success, fail, complete } = options;

    // 路径清洗：去掉完整域名，只保留 /api/xxx 路径
    let path = url;
    if (path.startsWith('http')) {
      try {
        path = '/' + path.split('/').slice(3).join('/');
      } catch (e) {}
    }

    // 拼接完整 URL
    const baseUrl = CLOUD_HOST;

    const fullUrl = `${baseUrl}${path}`;

    const uploadTask = wx.uploadFile({
      url: fullUrl,
      filePath,
      name,
      formData,
      header,
      success(res) {
        if (res.statusCode !== 200) {
          // 尝试获取服务器返回的具体错误信息
          let detail = '';
          try {
            const body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            detail = body.detail || body.message || '';
          } catch (e) {}
          fail && fail({ errMsg: detail || `服务器错误 (${res.statusCode})` });
          complete && complete();
          return;
        }
        // 尝试自动解析 JSON
        try {
          res.data = JSON.parse(res.data);
        } catch (e) {}
        success && success(res);
        complete && complete();
      },
      fail(err) {
        fail && fail(err);
        complete && complete();
      },
    });
    return uploadTask;
  },

  // =============================================
  // 3. 主题切换（保持原有）
  // =============================================
  switchTheme() {
    const newTheme = this.globalData.theme === 'blue' ? 'dark' : 'blue';
    this.globalData.theme = newTheme;
    wx.setStorageSync('theme', newTheme);
    try {
      wx.setNavigationBarColor({
        backgroundColor: newTheme === 'dark' ? '#1A1A1A' : '#FFF8F0',
        frontColor: newTheme === 'dark' ? '#ffffff' : '#000000',
      });
    } catch (e) {}
    return newTheme;
  },

  initTheme() {
    try {
      const saved = wx.getStorageSync('theme') || 'blue';
      this.globalData.theme = saved;
      wx.setNavigationBarColor({
        backgroundColor: saved === 'dark' ? '#1A1A1A' : '#FFF8F0',
        frontColor: saved === 'dark' ? '#ffffff' : '#000000',
      });
      return saved;
    } catch (e) {
      return 'blue';
    }
  },
});
