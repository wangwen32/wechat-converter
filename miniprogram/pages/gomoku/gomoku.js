// pages/gomoku/gomoku.js — 手绘五子棋（全部画在 Canvas 上）
// ==============================================
const SIZE = 15;
const EMPTY = 0, BLACK = 1, WHITE = 2;

Page({
  data: {},

  GOMOKU_WINS_KEY: 'gomoku_wins',

  onLoad() {
    const s = wx.getSystemInfoSync();
    this.W = s.windowWidth;
    this.H = s.windowHeight;
    this.dpr = s.pixelRatio;
    this.wins = wx.getStorageSync(this.GOMOKU_WINS_KEY) || 0;
    this.aiLevel = Math.min(this.wins, 5);
    this.initGame();
    this.state = 'ready'; // ready | playing | gameover
    this.getCtxAndDraw();
  },

  initGame() {
    this.cellSize = Math.min(32, (this.W - 24) / (SIZE - 1));
    this.padding = (this.W - this.cellSize * (SIZE - 1)) / 2;
    this.topOff = 140;
    this.board = [];
    for (let r = 0; r < SIZE; r++) {
      this.board[r] = [];
      for (let c = 0; c < SIZE; c++) this.board[r][c] = EMPTY;
    }
    this.turn = BLACK;
    this.over = false;
    this.lastMove = null;
  },

  getCtxAndDraw() {
    const ctx = wx.createCanvasContext('gobanCanvas');
    this.ctx = ctx;
    this.drawAll(ctx);
  },

  // ── 绘制全部（棋盘 + UI + 覆盖层） ──
  drawAll(ctx) {
    if (!ctx) { this.getCtxAndDraw(); return; }
    this.drawBoard(ctx);
    this.drawUI(ctx);
    if (this.state === 'ready') this.drawOverlay(ctx, '✏️ 手绘五子棋', '素描风格 · 你执黑先手', '开始下棋');
    else if (this.state === 'gameover') {
      const title = this.resultMsg || '🎉 游戏结束';
      const sub = this.winMsg || '';
      this.drawOverlay(ctx, title, sub, this.overBtn || '再来一局');
    }
    ctx.draw();
  },

  // ── 绘制棋盘 ──
  drawBoard(ctx) {
    const C = this.cellSize, P = this.padding, T = this.topOff;
    ctx.setFillStyle('#FFF8F0');
    ctx.fillRect(0, 0, this.W, this.H);

    // 棋盘底色
    ctx.setFillStyle('#F5EDE0');
    ctx.fillRect(P - C/2 - 4, P - C/2 - 4 + T, (SIZE-1)*C + 8, (SIZE-1)*C + 8);

    // 手绘网格线
    ctx.setStrokeStyle('rgba(44,44,44,0.5)');
    ctx.setLineWidth(1);
    const jitter = () => (Math.random() - 0.5) * 0.6;
    for (let i = 0; i < SIZE; i++) {
      const x = P + i * C, y = P + i * C + T;
      ctx.beginPath(); ctx.moveTo(P + jitter(), y + jitter());
      ctx.lineTo(P + (SIZE-1)*C + jitter(), y + jitter()); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + jitter(), P + jitter() + T);
      ctx.lineTo(x + jitter(), P + (SIZE-1)*C + jitter() + T); ctx.stroke();
    }

    // 星标
    const stars = [[7,7], [3,3], [3,11], [11,3], [11,11]];
    ctx.setFillStyle('rgba(44,44,44,0.35)');
    for (const [r, c] of stars) {
      ctx.beginPath(); ctx.arc(P + c*C, P + r*C + T, 2.5, 0, Math.PI*2); ctx.fill();
    }

    // 棋子
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.board[r][c] === EMPTY) continue;
        const x = P + c*C, y = P + r*C + T;
        const isLast = this.lastMove && this.lastMove[0] === r && this.lastMove[1] === c;
        if (this.board[r][c] === BLACK) {
          ctx.setFillStyle('rgba(44,44,44,0.9)');
          ctx.beginPath(); ctx.arc(x, y, C*0.42, 0, Math.PI*2); ctx.fill();
          ctx.setFillStyle('rgba(255,255,255,0.15)');
          ctx.beginPath(); ctx.arc(x - C*0.1, y - C*0.1, C*0.15, 0, Math.PI*2); ctx.fill();
        } else {
          ctx.setStrokeStyle('rgba(44,44,44,0.5)'); ctx.setLineWidth(1.5);
          ctx.beginPath(); ctx.arc(x, y, C*0.42, 0, Math.PI*2); ctx.stroke();
          ctx.setFillStyle('rgba(255,255,255,0.7)');
          ctx.beginPath(); ctx.arc(x, y, C*0.42, 0, Math.PI*2); ctx.fill();
        }
        if (isLast) {
          ctx.setStrokeStyle('rgba(255,50,50,0.5)'); ctx.setLineWidth(1.5);
          ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.stroke();
        }
      }
    }
  },

  // ── 绘制 UI（状态文字 + 重来按钮） ──
  drawUI(ctx) {
    // 状态文字
    ctx.setFillStyle('rgba(0,0,0,0.3)');
    ctx.setFontSize(14);
    ctx.setTextAlign('center');
    ctx.setTextBaseline('top');
    let text = '';
    if (this.state === 'playing') {
      const lvNames = ['🟢入门','🟢初级','🟡中级','🟡高级','🟠专家','🔴大师'];
      text = this.turn === BLACK ? `✏️ 你的回合 · ${lvNames[this.aiLevel] || '入门'}` : '🤔 电脑思考中...';
    }
    if (this.state === 'ready') text = '';
    if (text) ctx.fillText(text, this.W / 2, 50);

    // 重来按钮
    if (this.state === 'playing') {
      const bx = this.W / 2 - 50, by = this.H - 60, bw = 100, bh = 30;
      ctx.setStrokeStyle('rgba(0,0,0,0.15)'); ctx.setLineWidth(1);
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
      ctx.setFillStyle('rgba(0,0,0,0.25)'); ctx.setFontSize(13); ctx.setTextAlign('center'); ctx.setTextBaseline('middle');
      ctx.fillText('⟳ 重来', this.W / 2, by + bh / 2);
      this.restartRect = { x: bx, y: by, w: bw, h: bh };
    } else {
      this.restartRect = null;
    }
  },

  // ── 绘制覆盖层（开始/结束） ──
  drawOverlay(ctx, title, sub, btnText) {
    // 半透明背景
    ctx.setFillStyle('rgba(255,248,240,0.92)');
    ctx.fillRect(0, 0, this.W, this.H);

    // 标题
    ctx.setFillStyle('#1A2332');
    ctx.setFontSize(26);
    ctx.setTextAlign('center');
    ctx.setTextBaseline('middle');
    ctx.fillText(title, this.W / 2, this.H / 2 - 50);

    // 副标题
    if (sub) {
      ctx.setFillStyle('rgba(0,0,0,0.3)');
      ctx.setFontSize(14);
      ctx.fillText(sub, this.W / 2, this.H / 2 - 15);
    }

    // 按钮
    const bw = 160, bh = 44, bx = (this.W - bw) / 2, by = this.H / 2 + 20;
    ctx.setFillStyle('#1A2332');
    this.roundRect(ctx, bx, by, bw, bh, 22);
    ctx.fill();

    ctx.setFillStyle('#FFF8F0');
    ctx.setFontSize(16);
    ctx.fillText(btnText, this.W / 2, by + bh / 2);

    // 退出按钮（仅gameover）
    if (this.state === 'gameover') {
      ctx.setFillStyle('rgba(0,0,0,0.25)');
      ctx.setFontSize(14);
      ctx.fillText('退出', this.W / 2, by + bh + 30);
      this.quitRect = { x: this.W/2 - 30, y: by + bh + 10, w: 60, h: 30 };
    }

    this.btnRect = { x: bx, y: by, w: bw, h: bh };
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  },

  // ── 点击处理 ──
  onTap(e) {
    const tx = e.detail ? (e.detail.x || e.x || 0) : (e.x || 0);
    const ty = e.detail ? (e.detail.y || e.y || 0) : (e.y || 0);

    // 按钮点击检测
    if (this.btnRect && tx >= this.btnRect.x && tx <= this.btnRect.x + this.btnRect.w &&
        ty >= this.btnRect.y && ty <= this.btnRect.y + this.btnRect.h) {
      if (this.state === 'ready') this.startGame();
      else if (this.state === 'gameover') this.startGame();
      return;
    }
    if (this.quitRect && tx >= this.quitRect.x && tx <= this.quitRect.x + this.quitRect.w &&
        ty >= this.quitRect.y && ty <= this.quitRect.y + this.quitRect.h) {
      wx.navigateBack();
      return;
    }
    if (this.restartRect && tx >= this.restartRect.x && tx <= this.restartRect.x + this.restartRect.w &&
        ty >= this.restartRect.y && ty <= this.restartRect.y + this.restartRect.h) {
      this.startGame();
      return;
    }

    // 落子
    if (this.state !== 'playing' || this.over || this.turn !== BLACK) return;
    const C = this.cellSize, P = this.padding, T = this.topOff;
    const c = Math.round((tx - P) / C);
    const r = Math.round((ty - P - T) / C);
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE || this.board[r][c] !== EMPTY) return;

    this.board[r][c] = BLACK;
    this.lastMove = [r, c];
    if (this.checkWin(r, c, BLACK)) { this.endGame('🎉 你赢了！', ''); return; }
    if (this.isFull()) { this.endGame('🤝 平局', ''); return; }

    this.turn = WHITE;
    this.getCtxAndDraw();
    setTimeout(() => { if (!this.over) this.aiMove(); }, 800);
  },

  startGame() {
    this.over = false;
    this.state = 'playing';
    this.turn = BLACK;
    this.lastMove = null;
    this.initGame();
    this.getCtxAndDraw();
  },

  // ── AI ──
  aiMove() {
    if (this.over || this.state !== 'playing') return;
    let bestScore = -1, bestMoves = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.board[r][c] !== EMPTY) continue;
        const s = this.evaluatePos(r, c);
        if (s > bestScore) { bestScore = s; bestMoves = [[r, c]]; }
        else if (s === bestScore) bestMoves.push([r, c]);
      }
    }
    if (bestMoves.length === 0) { this.endGame('🤝 平局', ''); return; }

    let move;
    if (this.aiLevel < 3 && Math.random() < (3 - this.aiLevel) * 0.08) {
      const allMoves = [];
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++)
        if (this.board[r][c] === EMPTY) allMoves.push([r, c]);
      const scored = allMoves.map(([r,c]) => ({r,c,s:this.evaluatePos(r,c)})).sort((a,b) => b.s - a.s);
      const top = scored.slice(0, Math.max(3, Math.floor(scored.length * (0.3 + this.aiLevel * 0.1))));
      move = top[Math.floor(Math.random() * top.length)];
      move = [move.r, move.c];
    } else {
      move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    const [r, c] = move;
    this.board[r][c] = WHITE;
    this.lastMove = [r, c];
    if (this.checkWin(r, c, WHITE)) { this.endGame('💻 电脑赢了...', ''); return; }
    if (this.isFull()) { this.endGame('🤝 平局', ''); return; }
    this.turn = BLACK;
    this.getCtxAndDraw();
  },

  evaluatePos(r, c) {
    let score = 0;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      for (const player of [WHITE, BLACK]) {
        const weight = player === WHITE ? 1 : 2;
        let count = 1;
        for (let d = 1; d < 5; d++) {
          const nr = r+dr*d, nc = c+dc*d;
          if (nr<0||nr>=SIZE||nc<0||nc>=SIZE) break;
          if (this.board[nr][nc] === player) count++; else break;
        }
        for (let d = 1; d < 5; d++) {
          const nr = r-dr*d, nc = c-dc*d;
          if (nr<0||nr>=SIZE||nc<0||nc>=SIZE) break;
          if (this.board[nr][nc] === player) count++; else break;
        }
        if (count >= 5) score += 200000 * weight;
        else if (count === 4) score += 20000 * weight;
        else if (count === 3) score += 1000 * weight;
        else if (count === 2) score += 100 * weight;
      }
    }
    score += (14 - Math.abs(r-7) - Math.abs(c-7)) * 2;
    return score;
  },

  checkWin(r, c, player) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let d = 1; d < 5; d++) {
        const nr = r+dr*d, nc = c+dc*d;
        if (nr<0||nr>=SIZE||nc<0||nc>=SIZE) break;
        if (this.board[nr][nc] === player) count++; else break;
      }
      for (let d = 1; d < 5; d++) {
        const nr = r-dr*d, nc = c-dc*d;
        if (nr<0||nr>=SIZE||nc<0||nc>=SIZE) break;
        if (this.board[nr][nc] === player) count++; else break;
      }
      if (count >= 5) return true;
    }
    return false;
  },

  isFull() {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (this.board[r][c] === EMPTY) return false;
    return true;
  },

  endGame(msg, sub) {
    this.over = true;
    this.state = 'gameover';
    this.resultMsg = msg;
    this.winMsg = sub;
    this.overBtn = '再来一局';

    if (msg.includes('你赢了')) {
      this.wins = (wx.getStorageSync(this.GOMOKU_WINS_KEY) || 0) + 1;
      wx.setStorageSync(this.GOMOKU_WINS_KEY, this.wins);
      this.aiLevel = Math.min(this.wins, 5);
    }
    this.getCtxAndDraw();
  },
});
