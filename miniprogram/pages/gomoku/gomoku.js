// pages/gomoku/gomoku.js — 手绘五子棋
// ==============================================
const SIZE = 15;
const EMPTY = 0, BLACK = 1, WHITE = 2;

Page({
  data: {
    gameState: 'ready',
    statusText: '',
    resultText: '',
    winCount: '',
  },

  GOMOKU_WINS_KEY: 'gomoku_wins',

  onLoad() {
    const s = wx.getSystemInfoSync();
    this.W = s.windowWidth;
    this.H = s.windowHeight;
    this.dpr = s.pixelRatio;

    // 读取胜场，计算AI等级
    this.wins = wx.getStorageSync(this.GOMOKU_WINS_KEY) || 0;
    this.aiLevel = Math.min(this.wins, 5); // 0~5级
    this.initGame();
  },

  initGame() {
    // 计算棋盘参数（更大，往下移）
    this.cellSize = Math.min(32, (this.W - 24) / (SIZE - 1));
    this.padding = (this.W - this.cellSize * (SIZE - 1)) / 2;
    this.topOff = 195; // 向下偏移
    this.board = [];
    for (let r = 0; r < SIZE; r++) {
      this.board[r] = [];
      for (let c = 0; c < SIZE; c++) this.board[r][c] = EMPTY;
    }
    this.turn = BLACK;
    this.gameOver = false;
    this.lastMove = null;
    this.stats = { black: 0, white: 0, draw: 0 };
  },

  // ── 开始 ──
  onStart() {
    this.initGame();
    const levelNames = ['🟢 入门', '🟢 初级', '🟡 中级', '🟡 高级', '🟠 专家', '🔴 大师'];
    const lv = levelNames[this.aiLevel] || '🟢 入门';
    this.setData({ gameState: 'playing', statusText: `✏️ 你的回合 · AI ${lv}` });
    this.drawBoard();
  },

  onRestart() {
    this.onStart();
  },

  onQuit() { wx.navigateBack(); },

  // ── 获取 Canvas 上下文 ──
  getCtx() { return wx.createCanvasContext('gobanCanvas'); },

  // ── 绘制棋盘（铅笔手绘风格） ──
  drawBoard() {
    const ctx = this.getCtx();
    const C = this.cellSize, P = this.padding, T = this.topOff;

    // 背景
    ctx.setFillStyle('#FFF8F0');
    ctx.fillRect(0, 0, this.W, this.H);

    // 棋盘底色
    ctx.setFillStyle('#F5EDE0');
    ctx.fillRect(P - C/2 - 4, P - C/2 - 4 + T, (SIZE-1)*C + 8, (SIZE-1)*C + 8);

    // 手绘网格线（带轻微抖动）
    ctx.setStrokeStyle('rgba(44,44,44,0.5)');
    ctx.setLineWidth(1);

    const jitter = () => (Math.random() - 0.5) * 0.6;
    for (let i = 0; i < SIZE; i++) {
      const x = P + i * C, y = P + i * C + T;
      // 横线
      ctx.beginPath();
      ctx.moveTo(P + jitter(), y + jitter());
      ctx.lineTo(P + (SIZE-1) * C + jitter(), y + jitter());
      ctx.stroke();
      // 竖线
      ctx.beginPath();
      ctx.moveTo(x + jitter(), P + jitter() + T);
      ctx.lineTo(x + jitter(), P + (SIZE-1) * C + jitter() + T);
      ctx.stroke();
    }

    // 星标（天元 + 小目）
    const stars = [[7,7], [3,3], [3,11], [11,3], [11,11]];
    ctx.setFillStyle('rgba(44,44,44,0.35)');
    for (const [r, c] of stars) {
      ctx.beginPath();
      ctx.arc(P + c * C, P + r * C + T, 2.5, 0, Math.PI*2);
      ctx.fill();
    }

    // 绘制棋子
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.board[r][c] === EMPTY) continue;
        const x = P + c * C, y = P + r * C + T;
        const isLast = this.lastMove && this.lastMove[0] === r && this.lastMove[1] === c;

        if (this.board[r][c] === BLACK) {
          // 黑子 - 手绘铅笔填充
          ctx.setFillStyle('rgba(44,44,44,0.9)');
          ctx.beginPath();
          ctx.arc(x, y, C * 0.42, 0, Math.PI*2);
          ctx.fill();
          // 手绘高光
          ctx.setFillStyle('rgba(255,255,255,0.15)');
          ctx.beginPath();
          ctx.arc(x - C*0.1, y - C*0.1, C*0.15, 0, Math.PI*2);
          ctx.fill();
        } else {
          // 白子 - 手绘轮廓
          ctx.setStrokeStyle('rgba(44,44,44,0.5)');
          ctx.setLineWidth(1.5);
          ctx.beginPath();
          ctx.arc(x, y, C * 0.42, 0, Math.PI*2);
          ctx.stroke();
          ctx.setFillStyle('rgba(255,255,255,0.7)');
          ctx.beginPath();
          ctx.arc(x, y, C * 0.42, 0, Math.PI*2);
          ctx.fill();
        }

        // 最后一步标记（手绘小圈）
        if (isLast) {
          ctx.setStrokeStyle('rgba(255,50,50,0.5)');
          ctx.setLineWidth(1.5);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI*2);
          ctx.stroke();
        }
      }
    }

    ctx.draw();
  },

  // ── 点击落子 ──
  onTap(e) {
    if (this.data.gameState !== 'playing' || this.gameOver) return;
    if (this.turn !== BLACK) return; // 电脑回合不能下

    const tx = e.detail ? (e.detail.x || e.x || 0) : (e.x || 0);
    const ty = e.detail ? (e.detail.y || e.y || 0) : (e.y || 0);
    const C = this.cellSize, P = this.padding;

    const c = Math.round((tx - P) / C);
    const r = Math.round((ty - P - this.topOff) / C);
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
    if (this.board[r][c] !== EMPTY) return;

    // 落黑子
    this.board[r][c] = BLACK;
    this.lastMove = [r, c];
    this.drawBoard();

    if (this.checkWin(r, c, BLACK)) {
      this.endGame('🎉 你赢了！');
      return;
    }
    if (this.isFull()) { this.endGame('🤝 平局'); return; }

    // 电脑回合
    this.turn = WHITE;
    this.setData({ statusText: '🤔 电脑思考中...' });

    setTimeout(() => {
      this.aiMove();
    }, 800);
  },

  // ── AI 走棋（按等级调整难度） ──
  aiMove() {
    if (this.gameOver) return;

    let bestScore = -1, bestMoves = [];

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (this.board[r][c] !== EMPTY) continue;
        const score = this.evaluatePos(r, c);
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [[r, c]];
        } else if (score === bestScore) {
          bestMoves.push([r, c]);
        }
      }
    }

    if (bestMoves.length === 0) {
      this.endGame('🤝 平局');
      return;
    }

    // 根据AI等级干扰选择（低级时故意选不是最优的）
    let move;
    if (this.aiLevel < 5 && Math.random() < (5 - this.aiLevel) * 0.12) {
      // 随机选一个不太差的位置
      const allMoves = [];
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if (this.board[r][c] === EMPTY) allMoves.push([r, c]);
      // 从评分前50%的位置中随机选
      const scored = allMoves.map(([r,c]) => ({r,c,s:this.evaluatePos(r,c)}))
        .sort((a,b) => b.s - a.s);
      const top = scored.slice(0, Math.max(3, Math.floor(scored.length * (0.3 + this.aiLevel * 0.1))));
      move = top[Math.floor(Math.random() * top.length)];
      move = [move.r, move.c];
    } else {
      move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    const [r, c] = move;
    this.board[r][c] = WHITE;
    this.lastMove = [r, c];
    this.drawBoard();

    if (this.checkWin(r, c, WHITE)) {
      this.endGame('💻 电脑赢了...');
      return;
    }
    if (this.isFull()) { this.endGame('🤝 平局'); return; }

    this.turn = BLACK;
    this.setData({ statusText: '✏️ 你的回合（黑棋）' });
  },

  // ── 评估位置（防守 + 进攻） ──
  evaluatePos(r, c) {
    let score = 0;
    const dirs = [[1,0], [0,1], [1,1], [1,-1]];

    for (const [dr, dc] of dirs) {
      // 进攻（白棋）
      let count = 1;
      for (let d = 1; d < 5; d++) {
        const nr = r + dr * d, nc = c + dc * d;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
        if (this.board[nr][nc] === WHITE) count++; else break;
      }
      for (let d = 1; d < 5; d++) {
        const nr = r - dr * d, nc = c - dc * d;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
        if (this.board[nr][nc] === WHITE) count++; else break;
      }
      if (count >= 5) score += 100000;
      else if (count === 4) score += 10000;
      else if (count === 3) score += 500;
      else if (count === 2) score += 50;

      // 防守（黑棋）- 权重更高
      count = 1;
      for (let d = 1; d < 5; d++) {
        const nr = r + dr * d, nc = c + dc * d;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
        if (this.board[nr][nc] === BLACK) count++; else break;
      }
      for (let d = 1; d < 5; d++) {
        const nr = r - dr * d, nc = c - dc * d;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
        if (this.board[nr][nc] === BLACK) count++; else break;
      }
      if (count >= 5) score += 200000;
      else if (count === 4) score += 20000;
      else if (count === 3) score += 1000;
      else if (count === 2) score += 100;
    }

    // 中心偏好
    const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
    score += (14 - centerDist) * 2;

    return score;
  },

  // ── 检测胜利 ──
  checkWin(r, c, player) {
    const dirs = [[1,0], [0,1], [1,1], [1,-1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let d = 1; d < 5; d++) {
        const nr = r + dr * d, nc = c + dc * d;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
        if (this.board[nr][nc] === player) count++; else break;
      }
      for (let d = 1; d < 5; d++) {
        const nr = r - dr * d, nc = c - dc * d;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
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

  endGame(msg) {
    this.gameOver = true;
    // 玩家赢了 → 记录胜场 → 升级AI
    if (msg.includes('你赢了')) {
      this.wins = (wx.getStorageSync(this.GOMOKU_WINS_KEY) || 0) + 1;
      wx.setStorageSync(this.GOMOKU_WINS_KEY, this.wins);
      this.aiLevel = Math.min(this.wins, 5);
    }
    const levelNames = ['🟢 入门', '🟢 初级', '🟡 中级', '🟡 高级', '🟠 专家', '🔴 大师'];
    const levelText = this.wins > 0 ? `AI等级：${levelNames[Math.min(this.wins, 5)]}` : '';
    this.setData({ gameState: 'gameover', resultText: msg, winCount: levelText });
  },
});
