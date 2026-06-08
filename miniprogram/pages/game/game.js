// pages/game/game.js — 飞机大战（铅笔线稿风格）
// ==============================================

const STORAGE_KEY = 'plane_battle_best';

Page({
  data: {
    score: 0,
    bestScore: 0,
    gameState: 'ready', // ready | playing | paused | gameover
  },

  onLoad() {
    const best = wx.getStorageSync(STORAGE_KEY) || 0;
    this.setData({ bestScore: best });

    const sys = wx.getSystemInfoSync();
    this.winW = sys.windowWidth;
    this.winH = sys.windowHeight;

  },

  onReady() {
    // 页面渲染完成后再绘制 Canvas
    this.drawBgOnce();
  },

  onUnload() {
    this.running = false;
  },

  // =============================================
  //  背 景 绘 制（只画一次，卡顿优化：去掉网格纹理）
  // =============================================
  drawBgOnce() {
    const ctx = wx.createCanvasContext('gameCanvas');
    ctx.setFillStyle('#FFF8F0');
    ctx.fillRect(0, 0, this.winW, this.winH);
    // 少量水平线（素描本风格，减少绘制量）
    ctx.setStrokeStyle('rgba(0,0,0,0.04)');
    ctx.setLineWidth(0.5);
    for (let y = 0; y < this.winH; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.winW, y); ctx.stroke();
    }
    ctx.draw();
  },

  // =============================================
  //  游 戏 开 始
  // =============================================
  onStartGame() {
    this.setData({ score: 0, gameState: 'playing' });

    this.player = { x: (this.winW - 36) / 2, y: this.winH - 100, w: 36, h: 44 };
    this.bullets = [];
    this.enemies = [];
    this.explosions = [];
    this.lastFire = 0;
    this.lastSpawn = 0;
    this.tX = -1;
    this.running = true;

    // 60fps 游戏循环
    const step = () => {
      if (!this.running) return;
      this.update();
      this.render();
      setTimeout(step, 16);
    };
    step();
  },

  // =============================================
  //  暂 停 / 继 续
  // =============================================
  onPause() {
    if (this.data.gameState === 'playing') {
      this.setData({ gameState: 'paused' });
    }
  },

  onResume() {
    if (this.data.gameState === 'paused') {
      this.setData({ gameState: 'playing' });
    }
  },

  onQuit() {
    this.running = false;
    wx.navigateBack();
  },

  // =============================================
  //  更 新 逻 辑
  // =============================================
  update() {
    if (this.data.gameState !== 'playing') return;
    const now = Date.now();

    // 1. 玩家仅横向移动
    if (this.tX >= 0) {
      const tx = this.tX - this.player.w / 2;
      this.player.x += (tx - this.player.x) * 0.3;
      this.player.x = Math.max(0, Math.min(this.winW - this.player.w, this.player.x));
    }

    // 2. 发射子弹
    if (now - this.lastFire > 250) {
      this.bullets.push({
        x: this.player.x + this.player.w / 2 - 1.5,
        y: this.player.y - 4, w: 3, h: 12, speed: 12,
      });
      this.lastFire = now;
    }

    // 3. 移动子弹
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].y -= this.bullets[i].speed;
      if (this.bullets[i].y + this.bullets[i].h < 0) this.bullets.splice(i, 1);
    }

    // 4. 按分数区间生成敌机（卡顿优化：限制场上最大数量）
    const level = Math.floor(this.data.score / 1000);
    const spawnDelay = Math.max(300, 1500 - level * 250);
    const minSpeed = 1 + level * 0.4;
    const maxSpeed = 3 + level * 0.5;
    const maxEnemies = Math.min(25, 8 + level * 3);

    if (now - this.lastSpawn > spawnDelay && this.enemies.length < maxEnemies) {
      const cnt = 1 + Math.floor(level / 2);
      for (let i = 0; i < cnt; i++) {
        const s = 22 + Math.random() * 18;
        this.enemies.push({
          x: Math.random() * (this.winW - s), y: -s - i * 30,
          w: s, h: s, speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
        });
      }
      this.lastSpawn = now;
    }

    // 5. 移动敌机
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].y += this.enemies[i].speed;
      if (this.enemies[i].y > this.winH + 30) this.enemies.splice(i, 1);
    }

    // 6. 子弹 vs 敌机碰撞
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (this.hit(this.bullets[i], this.enemies[j])) {
          this.explosions.push({
            x: this.enemies[j].x + this.enemies[j].w / 2,
            y: this.enemies[j].y + this.enemies[j].h / 2,
            size: this.enemies[j].w, time: now, dur: 300,
          });
          this.enemies.splice(j, 1);
          this.bullets.splice(i, 1);
          this.setData({ score: this.data.score + 10 });
          break;
        }
      }
    }

    // 7. 敌机 vs 玩家碰撞
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.hit(this.enemies[i], this.player)) {
        this.explosions.push({
          x: this.player.x + this.player.w / 2,
          y: this.player.y + this.player.h / 2,
          size: Math.max(this.player.w, this.player.h),
          time: now, dur: 500,
        });
        this.enemies.splice(i, 1);
        this.gameOver();
        return;
      }
    }

    // 8. 清理过期爆炸
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      if (now - this.explosions[i].time > this.explosions[i].dur) {
        this.explosions.splice(i, 1);
      }
    }
  },

  hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  },

  gameOver() {
    this.setData({ gameState: 'gameover' });
    this.running = false;
    const best = wx.getStorageSync(STORAGE_KEY) || 0;
    const score = this.data.score;
    if (score > best) {
      wx.setStorageSync(STORAGE_KEY, score);
      this.setData({ bestScore: score });
    } else {
      this.setData({ bestScore: best });
    }
  },

  // =============================================
  //  渲 染（卡 顿 优 化）
  //
  //  卡顿原因分析与优化：
  //  1. ❌ 旧 API (wx.createCanvasContext) 每次都要
  //     ctx.draw() 批量提交，相比 Canvas 2D 慢 2-3 倍
  //  2. ❌ 每帧重绘背景网格 → 改为只画一次 + 清空用矩形覆盖
  //  3. ❌ Math.random() 在每根线里调用 → 改为预计算一次
  //  4. ❌ 30fps setTimeout → 改为 60fps (16ms)
  //  5. ❌ 敌机/子弹无限累积 → 增加 maxEnemies 上限
  // =============================================
  render() {
    const ctx = wx.createCanvasContext('gameCanvas');
    const W = this.winW;
    const H = this.winH;
    const now = Date.now();

    // 清空画布（实心覆盖，避免残留）
    ctx.setFillStyle('#FFF8F0');
    ctx.fillRect(0, 0, W, H);

    // 铅笔设置
    ctx.setStrokeStyle('#2C2C2C');
    ctx.setLineCap('round');
    ctx.setLineJoin('round');

    // 预先计算一次抖动值（避免每根线都调 Math.random）
    this._j = (this._j + 1) % 100;
    const j = [0.3, -0.5, 0.8, -1.0, 0.1, -0.3, 0.6, -0.8, 0.4, -0.2];
    const jx = j[this._j % 10];
    const jy = j[(this._j + 3) % 10];

    // 绘制子弹
    ctx.setLineWidth(2);
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2 + jx, b.y + jy);
      ctx.lineTo(b.x + b.w / 2 + jx, b.y + b.h + jy);
      ctx.stroke();
    }

    // 绘制敌机
    ctx.setLineWidth(2.5);
    for (const e of this.enemies) {
      const cx = e.x + e.w / 2 + jx, cy = e.y + e.h / 2 + jy;
      const rx = e.w / 2, ry = e.h / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - ry);
      ctx.lineTo(cx + rx, cy);
      ctx.lineTo(cx, cy + ry);
      ctx.lineTo(cx - rx, cy);
      ctx.closePath();
      ctx.stroke();
    }

    // 绘制玩家飞机
    if (this.data.gameState === 'playing' && this.player) {
      ctx.setLineWidth(3);
      const px = this.player.x, py = this.player.y;
      const pw = this.player.w, ph = this.player.h;
      const pcx = px + pw / 2 + jx, pcy = py + ph / 2 + jy;

      ctx.beginPath();
      ctx.moveTo(pcx, py + jy);
      ctx.lineTo(pcx - pw * 0.3, py + ph * 0.7 + jy);
      ctx.lineTo(pcx, py + ph * 0.5 + jy);
      ctx.lineTo(pcx + pw * 0.3, py + ph * 0.7 + jy);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(px + jx, pcy + ph * 0.1);
      ctx.lineTo(pcx - pw * 0.15, pcy - ph * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pcx + pw * 0.15, pcy - ph * 0.1);
      ctx.lineTo(px + pw + jx, pcy + ph * 0.1);
      ctx.stroke();
    }

    // 绘制爆炸（减少粒子数）
    ctx.setLineWidth(2);
    for (const ex of this.explosions) {
      const p = (now - ex.time) / ex.dur;
      if (p >= 1) continue;
      const cnt = 8;
      for (let i = 0; i < cnt; i++) {
        const a = (Math.PI * 2 / cnt) * i + p * 0.5;
        const len = ex.size * 0.25 * (1 - p * 0.5);
        const x1 = ex.x + Math.cos(a) * len * p * 0.3;
        const y1 = ex.y + Math.sin(a) * len * p * 0.3;
        const x2 = ex.x + Math.cos(a) * len;
        const y2 = ex.y + Math.sin(a) * len;
        ctx.beginPath();
        ctx.moveTo(x1 + jx, y1 + jy);
        ctx.lineTo(x2 + jx, y2 + jy);
        ctx.stroke();
      }
    }

    ctx.draw();
  },

  // =============================================
  //  触 摸 事 件
  // =============================================
  onTouchStart(e) {
    if (this.data.gameState !== 'playing') return;
    const t = e.touches[0];
    this.tX = t.clientX || t.x || t.pageX || 0;
  },

  onTouchMove(e) {
    if (this.data.gameState !== 'playing') return;
    const t = e.touches[0];
    this.tX = t.clientX || t.x || t.pageX || 0;
  },

  onTouchEnd() {
    this.tX = -1;
  },

  onGoHome() { wx.navigateBack(); },

  onShareAppMessage() {
    return {
      title: '✏️ 铅笔线稿飞机大战 - 来挑战最高分！',
      path: '/pages/game/game',
    };
  },
  onShareTimeline() { return { title: '✏️ 铅笔线稿飞机大战' }; },
});
