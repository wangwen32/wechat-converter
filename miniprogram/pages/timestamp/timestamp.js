// pages/timestamp/timestamp.js — 时间戳转换
Page({
  data: {
    timestamp: Math.floor(Date.now() / 1000).toString(),
    dateTime: '',
    resultDate: '',
    resultStamp: '',
  },

  onLoad() {
    this.stampToDate();
  },

  onStampInput(e) {
    this.setData({ timestamp: e.detail.value });
    this.stampToDate();
  },

  onDateInput(e) {
    this.setData({ dateTime: e.detail.value });
  },

  stampToDate() {
    const ts = parseInt(this.data.timestamp);
    if (isNaN(ts)) { this.setData({ resultDate: '无效' }); return; }
    const d = new Date(ts * 1000);
    this.setData({
      resultDate: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`,
      dateTime: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
    });
  },

  dateToStamp() {
    const d = new Date(this.data.dateTime);
    if (isNaN(d.getTime())) { wx.showToast({ title: '日期格式无效', icon: 'none' }); return; }
    this.setData({ resultStamp: Math.floor(d.getTime() / 1000).toString() });
  },

  onCopy(e) {
    const { text } = e.currentTarget.dataset;
    wx.setClipboardData({ data: text, success: () => wx.showToast({ title: '已复制', icon: 'success' }) });
  },

  onNow() {
    this.setData({ timestamp: Math.floor(Date.now() / 1000).toString() });
    this.stampToDate();
  },
});
