// pages/mortgage/mortgage.js — 房贷计算器
Page({
  data: {
    totalLoan: 1000000,
    yearRate: 4.2,
    years: 30,
    method: 'equal-payment', // equal-payment | equal-principal
    result: null,
  },

  onLoanInput(e) { this.setData({ totalLoan: Number(e.detail.value) || 0 }); },
  onRateInput(e) { this.setData({ yearRate: Number(e.detail.value) || 0 }); },
  onYearInput(e) { this.setData({ years: Number(e.detail.value) || 0 }); },
  onMethodChange(e) { this.setData({ method: e.detail.value }); },

  onCalc() {
    const { totalLoan, yearRate, years, method } = this.data;
    if (!totalLoan || !yearRate || !years) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    const monthRate = yearRate / 100 / 12;
    const months = years * 12;

    if (method === 'equal-payment') {
      const payment = totalLoan * monthRate * Math.pow(1 + monthRate, months) / (Math.pow(1 + monthRate, months) - 1);
      const totalPayment = payment * months;
      const totalInterest = totalPayment - totalLoan;
      this.setData({
        result: {
          monthly: Math.round(payment),
          totalInterest: Math.round(totalInterest),
          totalPayment: Math.round(totalPayment),
          methodName: '等额本息',
        },
      });
    } else {
      const principal = totalLoan / months;
      let totalInterest = 0;
      let firstMonth = 0;
      for (let i = 0; i < months; i++) {
        const interest = (totalLoan - principal * i) * monthRate;
        totalInterest += interest;
        if (i === 0) firstMonth = principal + interest;
      }
      this.setData({
        result: {
          monthly: Math.round(firstMonth),
          totalInterest: Math.round(totalInterest),
          totalPayment: Math.round(totalLoan + totalInterest),
          methodName: '等额本金',
          note: '首月还款，逐月递减',
        },
      });
    }
  },

  onClear() {
    this.setData({ result: null });
  },
});
