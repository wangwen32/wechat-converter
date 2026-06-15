// pages/carloan/carloan.js — 车贷计算器
Page({
  data: {
    totalPrice: 200000,
    downPayment: 60000,
    yearRate: 4.75,
    years: 3,
    result: null,
  },
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: Number(e.detail.value) || 0 });
  },
  onCalc() {
    const { totalPrice, downPayment, yearRate, years } = this.data;
    const loan = totalPrice - downPayment;
    if (loan <= 0) { wx.showToast({ title: '贷款金额必须大于0', icon: 'none' }); return; }
    const monthRate = yearRate / 100 / 12;
    const months = years * 12;
    const payment = loan * monthRate * Math.pow(1 + monthRate, months) / (Math.pow(1 + monthRate, months) - 1);
    this.setData({
      result: {
        loan: Math.round(loan),
        monthly: Math.round(payment),
        totalInterest: Math.round(payment * months - loan),
        totalPayment: Math.round(payment * months),
      },
    });
  },
});
