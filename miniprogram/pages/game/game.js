// pages/game/game.js — DOM 版飞机大战
// ==============================================
const STORAGE_KEY = 'plane_battle_best';

Page({
  data: {
    gameState: 'ready',
    score: 0, bestScore: 0,
    playerX: 0, playerY: 0, showPlayer: false,
    bullets: [], enemies: [], explosions: [],
  },

  onLoad() {
    this.setData({ bestScore: wx.getStorageSync(STORAGE_KEY) || 0 });
    const sys = wx.getSystemInfoSync();
    this.W = sys.windowWidth;
    this.H = sys.windowHeight;
  },

  onUnload() { this.running = false; },

  onStart() {
    this.setData({
      gameState: 'playing', score: 0, showPlayer: true,
      playerX: this.W / 2, playerY: this.H - 80,
      bullets: [], enemies: [], explosions: [],
    });
    this.pos = { x: this.W / 2, y: this.H - 80 };
    this.bullets = [];
    this.enemies = [];
    this.explosions = [];
    this.lastFire = 0;
    this.lastSpawn = 0;
    this.tX = -1;
    this.running = true;
    this.nextId = 0;
    this.tick = 0;

    const loop = () => {
      if (!this.running) return;
      this.tick++;
      this.update();
      this.render();
      setTimeout(loop, 33);
    };
    loop();
  },

  onPause() { this.setData({ gameState: 'paused' }); },
  onResume() { this.setData({ gameState: 'playing' }); },
  onQuit() { this.running = false; wx.navigateBack(); },

  update() {
    if (this.data.gameState !== 'playing') return;
    const now = Date.now();

    // 1. 玩家横向移动
    if (this.tX >= 0) {
      this.pos.x += (this.tX - this.pos.x) * 0.25;
      this.pos.x = Math.max(25, Math.min(this.W - 25, this.pos.x));
    }

    // 2. 子弹
    if (now - this.lastFire > 300) {
      this.bullets.push({ id: this.nextId++, x: this.pos.x, y: this.pos.y - 30, speed: 9 });
      this.lastFire = now;
    }
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].y -= this.bullets[i].speed;
      if (this.bullets[i].y < -20) this.bullets.splice(i, 1);
    }

    // 3. 敌机
    const level = Math.floor(this.data.score / 1000);
    const spawnTick = Math.max(20, 45 - level * 8);
    const maxEnemies = Math.min(20, 8 + level * 3);

    if (this.tick % spawnTick === 0 && this.enemies.length < maxEnemies) {
      const s = 20 + Math.random() * 16;
      this.enemies.push({
        id: this.nextId++, x: Math.random() * this.W, y: -s,
        w: s, h: s, speed: 1 + level * 0.3 + Math.random() * 2,
      });
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].y += this.enemies[i].speed;
      if (this.enemies[i].y > this.H + 30) this.enemies.splice(i, 1);
    }

    // 4. 碰撞（子弹 vs 敌机）
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (Math.abs(this.bullets[i].x - this.enemies[j].x) < 20 &&
            Math.abs(this.bullets[i].y - this.enemies[j].y) < 20) {
          this.explosions.push({ id: this.nextId++, x: this.enemies[j].x, y: this.enemies[j].y, t: 0 });
          this.enemies.splice(j, 1);
          this.bullets.splice(i, 1);
          this.setData({ score: this.data.score + 10 });
          break;
        }
      }
    }

    // 5. 敌机 vs 玩家
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (Math.abs(this.enemies[i].x - this.pos.x) < 25 &&
          Math.abs(this.enemies[i].y - this.pos.y) < 25) {
        this.explosions.push({ id: this.nextId++, x: this.pos.x, y: this.pos.y, t: 0 });
        this.enemies.splice(i, 1);
        this.gameOver();
        return;
      }
    }

    // 6. 清理爆炸
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      this.explosions[i].t++;
      if (this.explosions[i].t > 15) this.explosions.splice(i, 1);
    }
  },

  gameOver() {
    this.setData({ gameState: 'gameover', showPlayer: false });
    this.running = false;
    const best = wx.getStorageSync(STORAGE_KEY) || 0;
    const s = this.data.score;
    if (s > best) { wx.setStorageSync(STORAGE_KEY, s); this.setData({ bestScore: s }); }
    else { this.setData({ bestScore: best }); }
  },

  render() {
    this.setData({
      playerX: this.pos.x,
      playerY: this.pos.y,
      bullets: this.bullets.slice(-40).map(b => ({ id: b.id, x: b.x - 2, y: b.y })),
      enemies: this.enemies.map(e => ({ id: e.id, x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h })),
      explosions: this.explosions.map(ex => ({ id: ex.id, x: ex.x, y: ex.y })),
    });
  },

  // ── 触摸 ──
  onTouchStart(e) {
    if (this.data.gameState === 'playing') this.tX = e.touches[0].clientX || e.touches[0].x || 0;
  },
  onTouchMove(e) {
    if (this.data.gameState === 'playing') this.tX = e.touches[0].clientX || e.touches[0].x || 0;
  },
  onTouchEnd() { this.tX = -1; },
});
