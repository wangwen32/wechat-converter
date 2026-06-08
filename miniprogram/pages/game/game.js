// pages/game/game.js — 飞机大战（Canvas 2D）
// ==============================================
const STORAGE_KEY = 'plane_battle_best';

Page({
  data: {
    score: 0, bestScore: 0,
    gameState: 'ready',
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    this.W = sys.windowWidth;
    this.H = sys.windowHeight;
    this.DPR = sys.pixelRatio;
    this.setData({ bestScore: wx.getStorageSync(STORAGE_KEY) || 0 });

    // 获取 Canvas
    this.initCanvas();
  },

  initCanvas() {
    const q = wx.createSelectorQuery();
    q.select('#gameCanvas').fields({ node: true, size: true }).exec(([res]) => {
      if (!res || !res.node) {
        console.error('Canvas init fail, retry...');
        return setTimeout(() => this.initCanvas(), 200);
      }
      const canvas = res.node;
      const ctx = canvas.getContext('2d');
      canvas.width = this.W * this.DPR;
      canvas.height = this.H * this.DPR;
      ctx.scale(this.DPR, this.DPR);

      this.cv = canvas;
      this.ctx = ctx;

      // 测试绘制：画个矩形验证 Canvas 可用
      ctx.fillStyle = '#FFF8F0';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = '#2B5CE8';
      ctx.fillRect(10, 10, 100, 60);
      console.log('Canvas OK');
    });
  },

  // ── 开始游戏 ──
  onStartGame() {
    if (!this.ctx) return wx.showToast({ title: 'Canvas 初始化中', icon: 'none' });
    this.setData({ score: 0, gameState: 'playing' });

    this.player = { x: (this.W - 36) / 2, y: this.H - 100, w: 36, h: 44 };
    this.bullets = [];
    this.enemies = [];
    this.explosions = [];
    this.lastFire = 0;
    this.lastSpawn = 0;
    this.tX = -1;
    this.running = true;

    // 循环
    const loop = () => {
      if (!this.running) return;
      this.update();
      this.draw();
      this._timer = setTimeout(loop, 16);
    };
    loop();
  },

  onPause() {
    if (this.data.gameState === 'playing') this.setData({ gameState: 'paused' });
  },
  onResume() {
    if (this.data.gameState === 'paused') this.setData({ gameState: 'playing' });
  },
  onQuit() { this.running = false; wx.navigateBack(); },
  onUnload() { this.running = false; if (this._timer) clearTimeout(this._timer); },

  // ── 更新 ──
  update() {
    if (this.data.gameState !== 'playing') return;
    const now = Date.now();

    // 移动
    if (this.tX >= 0) {
      const tx = this.tX - this.player.w / 2;
      this.player.x += (tx - this.player.x) * 0.3;
      this.player.x = Math.max(0, Math.min(this.W - this.player.w, this.player.x));
    }

    // 子弹
    if (now - this.lastFire > 250) {
      this.bullets.push({ x: this.player.x + this.player.w/2 - 1.5, y: this.player.y - 4, w: 3, h: 12, speed: 12 });
      this.lastFire = now;
    }
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].y -= this.bullets[i].speed;
      if (this.bullets[i].y + this.bullets[i].h < 0) this.bullets.splice(i, 1);
    }

    // 敌机
    const level = Math.floor(this.data.score / 1000);
    if (now - this.lastSpawn > Math.max(300, 1500 - level*250) && this.enemies.length < Math.min(25, 8+level*3)) {
      const cnt = 1 + Math.floor(level/2);
      for (let i = 0; i < cnt; i++) {
        const s = 22 + Math.random()*18;
        this.enemies.push({ x: Math.random()*(this.W-s), y: -s-i*30, w: s, h: s, speed: 1+level*0.4+Math.random()*(2+level*0.5) });
      }
      this.lastSpawn = now;
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].y += this.enemies[i].speed;
      if (this.enemies[i].y > this.H+30) this.enemies.splice(i, 1);
    }

    // 碰撞
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (this.hit(this.bullets[i], this.enemies[j])) {
          this.explosions.push({ x: this.enemies[j].x+this.enemies[j].w/2, y: this.enemies[j].y+this.enemies[j].h/2, size: this.enemies[j].w, time: now, dur: 300 });
          this.enemies.splice(j,1); this.bullets.splice(i,1);
          this.setData({ score: this.data.score+10 }); break;
        }
      }
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.hit(this.enemies[i], this.player)) {
        this.explosions.push({ x: this.player.x+this.player.w/2, y: this.player.y+this.player.h/2, size: Math.max(this.player.w,this.player.h), time: now, dur: 500 });
        this.enemies.splice(i,1); this.gameOver(); return;
      }
    }
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      if (now-this.explosions[i].time > this.explosions[i].dur) this.explosions.splice(i,1);
    }
  },

  hit(a,b) { return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; },

  gameOver() {
    this.setData({ gameState: 'gameover' }); this.running = false;
    const best = wx.getStorageSync(STORAGE_KEY)||0, s=this.data.score;
    if (s>best) { wx.setStorageSync(STORAGE_KEY,s); this.setData({ bestScore:s }); }
    else { this.setData({ bestScore:best }); }
  },

  // ── 绘制 ──
  draw() {
    const ctx = this.ctx;
    if (!ctx) return;

    // 清空
    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, this.W, this.H);

    // 设置
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 子弹
    ctx.lineWidth = 2;
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x + b.w/2, b.y);
      ctx.lineTo(b.x + b.w/2, b.y + b.h);
      ctx.stroke();
    }

    // 敌机
    ctx.lineWidth = 2.5;
    for (const e of this.enemies) {
      const cx = e.x+e.w/2, cy = e.y+e.h/2;
      ctx.beginPath();
      ctx.moveTo(cx, cy-e.h/2);
      ctx.lineTo(cx+e.w/2, cy);
      ctx.lineTo(cx, cy+e.h/2);
      ctx.lineTo(cx-e.w/2, cy);
      ctx.closePath();
      ctx.stroke();
    }

    // 玩家
    ctx.lineWidth = 3;
    if (this.player && this.data.gameState === 'playing') {
      const p = this.player;
      ctx.beginPath();
      ctx.moveTo(p.x+p.w/2, p.y);          // 机头
      ctx.lineTo(p.x+p.w, p.y+p.h*0.6);    // 右翼尖
      ctx.lineTo(p.x+p.w*0.7, p.y+p.h);    // 右下
      ctx.lineTo(p.x+p.w/2, p.y+p.h*0.8);  // 机尾中
      ctx.lineTo(p.x+p.w*0.3, p.y+p.h);    // 左下
      ctx.lineTo(p.x, p.y+p.h*0.6);        // 左翼尖
      ctx.closePath();
      ctx.stroke();
    }

    // 爆炸
    ctx.lineWidth = 2;
    const now = Date.now();
    for (const ex of this.explosions) {
      const p = (now-ex.time)/ex.dur;
      if (p>=1) continue;
      for (let i=0;i<8;i++) {
        const a = Math.PI*2/8*i + p*0.5;
        const len = ex.size*0.25*(1-p*0.5);
        ctx.beginPath();
        ctx.moveTo(ex.x+Math.cos(a)*len*p*0.3, ex.y+Math.sin(a)*len*p*0.3);
        ctx.lineTo(ex.x+Math.cos(a)*len, ex.y+Math.sin(a)*len);
        ctx.stroke();
      }
    }
  },

  // ── 触摸 ──
  onTouchStart(e) { if(this.data.gameState!=='playing') return; const t=e.touches[0]; this.tX=t.clientX||t.x||0; },
  onTouchMove(e) { if(this.data.gameState!=='playing') return; const t=e.touches[0]; this.tX=t.clientX||t.x||0; },
  onTouchEnd() { this.tX=-1; },
  onGoHome() { wx.navigateBack(); },
  onShareAppMessage() { return { title:'✏️ 飞机大战', path:'/pages/game/game' }; },
  onShareTimeline() { return { title:'✏️ 飞机大战' }; },
});
