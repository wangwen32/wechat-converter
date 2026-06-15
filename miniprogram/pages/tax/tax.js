// pages/tax/tax.js — 个税计算器
Page({
  data: {
    income: 15000,
    social: 2000,
    special: 0,
    threshold: 5000,
    result: null,
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: Number(e.detail.value) || 0 });
  },

  onCalc() {
    const { income, social, special, threshold } = this.data;
    const taxable = income - social - special - threshold;
    if (taxable <= 0) {
      this.setData({ result: { tax: 0, rate: '0%', afterTax: income - social } });
      return;
    }
    let tax = 0, rate = '';
    if (taxable <= 3000) { tax = taxable * 0.03; rate = '3%'; }
    else if (taxable <= 12000) { tax = taxable * 0.1 - 210; rate = '10%'; }
    else if (taxable <= 25000) { tax = taxable * 0.2 - 1410; rate = '20%'; }
    else if (taxable <= 35000) { tax = taxable * 0.25 - 2660; rate = '25%'; }
    else if (taxable <= 55000) { tax = taxable * 0.3 - 4410; rate = '30%'; }
    else if (taxable <= 80000) { tax = taxable * 0.35 - 7160; rate = '35%'; }
    else { tax = taxable * 0.45 - 15160; rate = '45%'; }
    this.setData({ result: { tax: Math.round(tax), rate, afterTax: Math.round(income - social - tax) } });
  },
});
