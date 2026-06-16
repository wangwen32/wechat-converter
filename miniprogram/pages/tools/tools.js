// pages/tools/tools.js — 全工具分类导航
Page({
  data: {
    categories: [
      {
        name: '📄 文件转换',
        tools: [
          { id: 'pdf2word', name: 'PDF转Word', desc: 'PDF转换为可编辑Word', page: '/pages/convert/convert?type=pdf2word' },
          { id: 'word2pdf', name: 'Word转PDF', desc: 'Word文档转换为PDF', page: '/pages/convert/convert?type=word2pdf' },
          { id: 'img2pdf', name: '图片转PDF', desc: 'JPG/PNG合成PDF', page: '/pages/img2pdf/img2pdf' },
          { id: 'mergepdf', name: '合并PDF', desc: '多个PDF合并为一个', page: '/pages/pdf-tools/pdf-tools?tab=merge' },
          { id: 'splitpdf', name: '拆分PDF', desc: 'PDF按页拆分', page: '/pages/pdf-tools/pdf-tools?tab=split' },
          { id: 'watermark', name: 'PDF去水印', desc: '自动移除PDF水印', page: '/pages/remove-watermark/remove-watermark' },
          { id: 'ocr', name: '文字识别OCR', desc: '图片转文字', page: '/pages/ocr/ocr' },
        ],
      },
      {
        name: '🖼 图片工具',
        tools: [
          { id: 'compress', name: '图片压缩', desc: '减小图片体积', page: '/pages/image-compress/image-compress' },
          { id: 'restore', name: '老照片修复', desc: '修复模糊老照片', page: '/pages/photo-restore/photo-restore' },
        ],
      },
      {
        name: '🧮 计算工具',
        tools: [
          { id: 'mortgage', name: '房贷计算器', desc: '等额本息/本金', page: '/pages/mortgage/mortgage' },
          { id: 'tax', name: '个税计算器', desc: '个人所得税计算', page: '/pages/tax/tax' },
          { id: 'carloan', name: '车贷计算器', desc: '汽车贷款计算', page: '/pages/carloan/carloan' },
        ],
      },
      {
        name: '🔧 常用工具',
        tools: [
          { id: 'unit', name: '单位换算', desc: '长度/重量/温度等', page: '/pages/unit-convert/unit-convert' },
          { id: 'ts', name: '时间戳转换', desc: '时间戳↔日期', page: '/pages/timestamp/timestamp' },
          { id: 'base', name: '进制转换', desc: '2/8/10/16进制', page: '/pages/base-convert/base-convert' },
          { id: 'qrcode', name: '二维码生成', desc: '文本/链接生成', page: '/pages/qrcode/qrcode' },
          { id: 'barcode', name: '条形码生成', desc: 'Code128/EAN', page: '/pages/barcode/barcode' },
        ],
      },
      {
        name: '✨ 文案生成',
        tools: [
          { id: 'textgen', name: '文案生成', desc: '短句/文案/语录', page: '/pages/text-gen/text-gen' },
          { id: 'colormatch', name: '配色推荐', desc: '随机生成配色', page: '/pages/color-match/color-match' },
        ],
      },
      {
        name: '🎮 休闲娱乐',
        tools: [
          { id: 'game', name: '飞机大战', desc: '复古手绘射击', page: '/pages/game/game' },
          { id: 'gomoku', name: '手绘五子棋', desc: 'AI对战', page: '/pages/gomoku/gomoku' },
        ],
      },
    ],
  },

  onToolTap(e) {
    const url = e.currentTarget.dataset.page;
    wx.navigateTo({ url });
  },

  onShareAppMessage() {
    return { title: '文档转换大师 - 全部工具', path: '/pages/tools/tools' };
  },
});
