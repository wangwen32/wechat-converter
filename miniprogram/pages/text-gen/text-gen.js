// pages/text-gen/text-gen.js — 短句/文案/语录生成
const QUOTES = {
  short: {
    name: '短句',
    data: [
      '心有山海，静而无边。', '万物皆有裂痕，那是光照进来的地方。', '慢慢来，比较快。',
      '山不见我，我自去见山。', '且行且忘且随风，且行且看且从容。', '等风来，不如追风去。',
      '生活不是为了赶路，而是为了感受路。', '日落尤其温柔，人间皆是浪漫。', '保持热爱，奔赴山海。',
      '你要自己发光，而不是被照亮。', '心之所向，素履以往。', '平凡的日子也会发光。',
      '温柔半两，从容一生。', '半山腰太挤了，要去山顶看看。', '世界很大，但你的心更大。',
    ],
  },
  Copywriting: {
    name: '文案',
    data: [
      '每一份努力，都是未来的基石。', '成功不是终点，而是每一步的积累。', '你的坚持，终将美好。',
      '所有的努力，都会在某个时刻开花结果。', '今天的选择，决定明天的生活。', '相信相信的力量。',
      '最好的投资，是投资自己。', '行动是治愈焦虑的良药。', '把每一件小事做好，就是最大的不平凡。',
      '机会永远留给有准备的人。', '不要等待机会，而要创造机会。', '成功的路上并不拥挤，因为坚持的人不多。',
      '你的格局，决定你的结局。', '每一个不曾起舞的日子，都是对生命的辜负。', '做自己的太阳，无需凭借谁的光。',
    ],
  },
  quote: {
    name: '语录',
    data: [
      '读书破万卷，下笔如有神。——杜甫', '学而不思则罔，思而不学则殆。——孔子', '天行健，君子以自强不息。——《周易》',
      '路漫漫其修远兮，吾将上下而求索。——屈原', '业精于勤，荒于嬉。——韩愈', '三人行，必有我师焉。——孔子',
      '千里之行，始于足下。——老子', '宝剑锋从磨砺出，梅花香自苦寒来。', '世上无难事，只怕有心人。',
      '不积跬步，无以至千里。——荀子', '志当存高远。——诸葛亮', '书山有路勤为径，学海无涯苦作舟。',
      '人生自古谁无死，留取丹心照汗青。——文天祥', '海纳百川，有容乃大；壁立千仞，无欲则刚。——林则徐', '长风破浪会有时，直挂云帆济沧海。——李白',
    ],
  },
};

Page({
  data: {
    categories: Object.keys(QUOTES).map(k => QUOTES[k].name),
    catKeys: Object.keys(QUOTES),
    catIndex: 0,
    currentText: '',
    favoriteCount: 0,
  },

  onLoad() {
    this.generate();
  },

  onCatChange(e) {
    this.setData({ catIndex: Number(e.detail.value) });
    this.generate();
  },

  generate() {
    const { catKeys, catIndex } = this.data;
    const key = catKeys[catIndex];
    const list = QUOTES[key].data;
    const text = list[Math.floor(Math.random() * list.length)];
    this.setData({ currentText: text });
  },

  onCopy() {
    wx.setClipboardData({
      data: this.data.currentText,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },
});
