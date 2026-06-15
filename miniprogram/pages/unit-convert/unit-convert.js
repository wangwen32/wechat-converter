// pages/unit-convert/unit-convert.js — 单位换算
const CONVERSIONS = [
  { name: '长度', units: ['毫米', '厘米', '分米', '米', '千米', '英寸', '英尺', '码', '英里'],
    toBase: [1, 10, 100, 1000, 1e6, 25.4, 304.8, 914.4, 1.609e6] },
  { name: '重量', units: ['毫克', '克', '千克', '吨', '盎司', '磅'],
    toBase: [0.001, 1, 1000, 1e6, 28.35, 453.59] },
  { name: '面积', units: ['平方毫米', '平方厘米', '平方米', '亩', '公顷', '平方千米'],
    toBase: [1, 100, 1e6, 666666.7, 1e7, 1e12] },
  { name: '温度', units: ['摄氏度(℃)', '华氏度(℉)', '开尔文(K)'], special: true },
  { name: '体积', units: ['毫升', '升', '立方米', '加仑(美)', '立方英尺'],
    toBase: [1, 1000, 1e6, 3785.41, 28316.85] },
  { name: '速度', units: ['米/秒', '千米/时', '英里/时', '节'],
    toBase: [1, 0.27778, 0.44704, 0.51444] },
];

Page({
  data: {
    catNames: CONVERSIONS.map(c => c.name),
    catIndex: 0,
    fromIdx: 0,
    toIdx: 1,
    inputVal: '1',
    resultVal: '',
    currentUnits: CONVERSIONS[0].units,
    fromUnit: CONVERSIONS[0].units[0],
    toUnit: CONVERSIONS[0].units[1],
  },

  onCatChange(e) {
    const idx = Number(e.detail.value);
    const cat = CONVERSIONS[idx];
    this.setData({
      catIndex: idx, fromIdx: 0, toIdx: 1, inputVal: '1', resultVal: '',
      currentUnits: cat.units, fromUnit: cat.units[0], toUnit: cat.units[1],
    });
    this.doConvert();
  },

  onFromChange(e) {
    const idx = Number(e.detail.value);
    const cat = CONVERSIONS[this.data.catIndex];
    this.setData({ fromIdx: idx, fromUnit: cat.units[idx] });
    this.doConvert();
  },

  onToChange(e) {
    const idx = Number(e.detail.value);
    const cat = CONVERSIONS[this.data.catIndex];
    this.setData({ toIdx: idx, toUnit: cat.units[idx] });
    this.doConvert();
  },

  onInput(e) {
    this.setData({ inputVal: e.detail.value });
    this.doConvert();
  },

  doConvert() {
    const { catIndex, fromIdx, toIdx, inputVal } = this.data;
    const cat = CONVERSIONS[catIndex];
    const val = parseFloat(inputVal);
    if (isNaN(val)) { this.setData({ resultVal: '' }); return; }

    if (cat.special) {
      // 温度
      let celsius;
      if (fromIdx === 0) celsius = val;
      else if (fromIdx === 1) celsius = (val - 32) / 1.8;
      else celsius = val - 273.15;

      let result;
      if (toIdx === 0) result = celsius;
      else if (toIdx === 1) result = celsius * 1.8 + 32;
      else result = celsius + 273.15;
      this.setData({ resultVal: result.toFixed(2) });
    } else {
      const baseVal = val * cat.toBase[fromIdx];
      const result = baseVal / cat.toBase[toIdx];
      this.setData({ resultVal: result < 0.01 ? result.toExponential(4) : this.trimZero(result.toFixed(6)) });
    }
  },

  trimZero(s) {
    if (!s.includes('.')) return s;
    return s.replace(/\.?0+$/, '');
  },
});
