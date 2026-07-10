/**
 * 核心游戏场景
 * 9×10 下落式消消乐主逻辑
 *
 * 特性：
 * - 1×2 大方块：两格视觉连接，序号居中显示
 * - 落地后方块保持连接，重力时两格一起下落（不分离）
 * - Esc 提前结束游戏
 * - 深色舞台Live现场视觉风格
 */
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // 加载所有方块方向图片（5色 × 5号 × 4方向）
        const displayNames = ['Pink', 'Red', 'Light green', 'Violet', 'Yellow'];
        const directions = ['上', '下', '左', '右'];
        for (const displayName of displayNames) {
            for (let n = 1; n <= 5; n++) {
                for (const dir of directions) {
                    const key = `${displayName}${n}${dir}`;
                    this.load.image(key, `assets/${displayName}${n}/${key}.png`);
                }
            }
        }

        // 加载麻里奈角色立绘（NEXT面板装饰）
        this.load.image('marina1', 'assets/麻里奈1.png');
        this.load.image('marina2', 'assets/麻里奈2.png');

        // 加载游戏背景图（作为fallback保留）
        this.load.image('gameBg', 'assets/Game_background.png');

        // NEXT! 面板装饰与消除关系图
        this.load.image('woodenBucket', 'assets/wooden bucket.png');
        this.load.image('eliminateRelation', 'assets/消除关系.png');

        // 音频
        this.load.audio('bgmGame', 'assets/audio/bgm/Loof bgm_Gaming.mp3');
        this.load.audio('sfxLand', 'assets/audio/sfx/button.mp3');
        this.load.audio('sfxPink', 'assets/audio/sfx/Pink.mp3');
        this.load.audio('sfxRed', 'assets/audio/sfx/Red.mp3');
        this.load.audio('sfxLightGreen', 'assets/audio/sfx/Light green.mp3');
        this.load.audio('sfxViolet', 'assets/audio/sfx/Violet.mp3');
        this.load.audio('sfxYellow', 'assets/audio/sfx/Yellow.mp3');
        this.load.audio('sfxGameover', 'assets/audio/sfx/Gameover.mp3');
    }

    create() {
        // ==================== 深色舞台背景 ====================
        const { width, height } = this.cameras.main;
        this.bgGfx = this.add.graphics();   // 舞台背景（需在drawStageBackground之前创建）
        this.drawStageBackground(width, height);

        // ==================== 常量 ====================
        // 三栏布局坐标
        this.LEFT_COL_W = 72;
        this.BORDER1_X = 72; this.BORDER1_W = 10;
        this.BORDER2_X = 563; this.BORDER2_W = 10;
        this.RIGHT_COL_X = 573; this.RIGHT_COL_W = 147;
        this.CARD_X = 578; this.CARD_W = 137;
        this.CARD1_Y = 316; this.CARD1_H = 175;
        this.CARD2_Y = 505; this.CARD2_H = 345;
        this.CARD_RADIUS = 12;

        // 深色舞台网格色（暗灰、暗紫、藏蓝、墨青）
        this.GRID_CELL_COLORS = [0x2a2a38, 0x25253a, 0x1e2840, 0x1a3030];
        this.GRID_BG_COLOR = 0x0a0a18;

        this.COLS = 9;
        this.ROWS = 10;
        this.CELL_SIZE = 55;
        this.GRID_X = 75;
        this.GRID_Y = 310;
        this.GRID_W = this.COLS * this.CELL_SIZE;  // 495
        this.GRID_H = this.ROWS * this.CELL_SIZE;  // 550
        this.SPAWN_COL = 4;
        this.SPAWN_ROW = 0;

        this.COLORS = {
            pink:       0x2a2a38,
            red:        0x2a2a38,
            lightgreen: 0x2a2a38,
            violet:     0x2a2a38,
            yellow:     0x2a2a38
        };
        this.COLOR_NAMES = ['pink', 'red', 'lightgreen', 'violet', 'yellow'];

        this.FALL_SPEED_NORMAL = 1000;
        this.FALL_SPEED_FAST   = 60;
        this.MATCH_MIN         = 10;
        this.SCORE_PER_MATCH   = 10;

        // 动态速度系统（随分数加速）
        this.FALL_SPEED_BASE  = 1000;
        this.FALL_SPEED_MIN   = 200;
        this.SPEED_STEP_SCORE = 50;
        this.SPEED_STEP_MS    = 50;
        this.FAST_FALL_MIN    = 80;

        // ==================== 游戏状态 ====================
        // grid[row][col] = null | { color, number, blockGroupId }
        this.grid = [];
        for (let r = 0; r < this.ROWS; r++) {
            this.grid[r] = new Array(this.COLS).fill(null);
        }

        this.activeBlock = null;
        this.blockPool = [];
        this.nextBlockData = null;
        this.nextBlockData2 = null;
        this.score = 0;
        this.gameOver = false;
        this.processingMatches = false;
        this.fallAccumulator = 0;

        // 最高分（localStorage 持久化）
        this.highScore = (() => {
            try { return parseInt(localStorage.getItem('blockGameHighScore') || '0', 10); }
            catch (e) { return 0; }
        })();

        // COMBO 连击
        this.combo = 0;
        this.maxCombo = 0;
        this.endedByEsc = false;  // Esc退出标志，用于区分自然/主动结束

        // blockGroupId 自增计数器 + 组的文字/图片映射
        this.nextGroupId = 1;
        this.groupTexts = new Map();  // groupId → Phaser.Text
        this.blockImages = new Map(); // groupId → Phaser.Image

        // DAS 系统
        this.moveDir = 0;
        this.dasTimer = 0;
        this.dasDelay = 170;
        this.dasRepeat = 50;
        this.dasFirstMove = true;
        this.rotatePressed = false;

        // 退出对话框状态
        this.exitDialogActive = false;
        this.exitDialogElements = [];

        // ==================== 图形对象 ====================
        this.gridGfx        = this.add.graphics();   // 网格背景
        this.blockGfx       = this.add.graphics();   // 已落地方块
        this.activeGfx      = this.add.graphics();   // 活动方块
        this.previewGfx     = this.add.graphics();   // 预览回退
        this.bubbleGfx      = this.add.graphics();   // 气泡标题（替换leftPanelGfx）
        this.neonBorderGfx  = this.add.graphics();   // 霓虹边框（替换borderGfx）
        this.rightPanelGfx  = this.add.graphics();   // 右面板卡片

        this.activeTexts = [];   // 活动方块文本 (2个)
        this.previewText = null;
        this.previewImage = null;

        // 绘制所有背景层
        this.drawGridBackground();
        this.drawNeonBorders();
        this.drawBubbleTitle();
        this.drawRightPanel();

        // 消除关系图（放置在棋盘和NEXT!面板上方）
        if (this.textures.exists('eliminateRelation')) {
            const erImg = this.add.image(330, 150, 'eliminateRelation');
            erImg.setDisplaySize(450, 300);
            erImg.setDepth(5);
        }

        // 生成白色粒子纹理（用于消除特效）
        const particleGfx = this.make.graphics({ add: false });
        particleGfx.fillStyle(0xffffff, 1);
        particleGfx.fillCircle(4, 4, 4);
        particleGfx.generateTexture('white_particle', 8, 8);
        particleGfx.destroy();

        // ==================== 输入 ====================
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyS = this.input.keyboard.addKey('S');
        this.keyR = this.input.keyboard.addKey('R');
        this.keyEsc = this.input.keyboard.addKey('ESC');

        // 方向键 → 立即移动 + DAS
        this.input.keyboard.on('keydown-LEFT',  () => this.startMoveDir(-1));
        this.input.keyboard.on('keydown-RIGHT', () => this.startMoveDir(1));
        this.input.keyboard.on('keydown-A',     () => this.startMoveDir(-1));
        this.input.keyboard.on('keydown-D',     () => this.startMoveDir(1));

        this.input.keyboard.on('keyup-LEFT',  () => this.checkDirRelease(-1));
        this.input.keyboard.on('keyup-RIGHT', () => this.checkDirRelease(1));
        this.input.keyboard.on('keyup-A',     () => this.checkDirRelease(-1));
        this.input.keyboard.on('keyup-D',     () => this.checkDirRelease(1));

        // R 旋转
        this.input.keyboard.on('keydown-R', () => {
            if (!this.rotatePressed && this.activeBlock && !this.gameOver && !this.processingMatches && !this.exitDialogActive) {
                this.rotatePressed = true;
                this.rotateBlock();
            }
        });
        this.input.keyboard.on('keyup-R', () => { this.rotatePressed = false; });

        // Esc → 退出确认对话框
        this.input.keyboard.on('keydown-ESC', () => {
            if (!this.gameOver) {
                if (this.exitDialogActive) {
                    this.closeExitDialog();
                } else {
                    this.showExitDialog();
                }
            }
        });

        // ==================== 初始生成 ====================
        this.blockPool = this.generateBlockPool();

        // 播放游戏背景音乐（循环）
        this._gameBGM = this.sound.add('bgmGame', { loop: true, volume: 0.5 });
        this._gameBGM.play();

        this.spawnBlock();
    }

    // ==================== 深色舞台背景绘制 ====================
    drawStageBackground(w, h) {
        const gfx = this.bgGfx;
        gfx.clear();

        // 基础暗色填充
        gfx.fillStyle(0x282850, 1);
        gfx.fillRect(0, 0, w, h);

        // 舞台地面（底部30%更暗）
        gfx.fillStyle(0x1c1c40, 1);
        gfx.fillRect(0, h * 0.7, w, h * 0.3);

        // 舞台地面线
        gfx.fillStyle(0x3a3a60, 0.5);
        gfx.fillRect(0, h * 0.7, w, 2);

        // 聚光灯效果（从顶部中央向下扩散）
        // 多层半透明三角形模拟光束
        const beamColors = [
            { color: 0x664488, alpha: 0.06, centerX: w * 0.5, spread: 0.6 },
            { color: 0x553377, alpha: 0.05, centerX: w * 0.35, spread: 0.35 },
            { color: 0x335577, alpha: 0.05, centerX: w * 0.65, spread: 0.35 },
            { color: 0x553366, alpha: 0.04, centerX: w * 0.5, spread: 0.5 },
        ];

        for (const beam of beamColors) {
            gfx.fillStyle(beam.color, beam.alpha);
            gfx.beginPath();
            gfx.moveTo(beam.centerX - w * beam.spread / 2, 0);
            gfx.lineTo(beam.centerX + w * beam.spread / 2, 0);
            gfx.lineTo(beam.centerX + w * 0.1, h * 0.85);
            gfx.lineTo(beam.centerX - w * 0.1, h * 0.85);
            gfx.closePath();
            gfx.fillPath();
        }

        // 舞台顶部横梁灯光效果（彩色光点）
        const stageLightColors = [0xFF69B4, 0xBA55D3, 0x4488FF, 0xFF69B4, 0x9944CC, 0x4488FF];
        const lightSpacing = w / (stageLightColors.length + 1);
        for (let i = 0; i < stageLightColors.length; i++) {
            const lx = lightSpacing * (i + 1);
            // 灯光光晕
            gfx.fillStyle(stageLightColors[i], 0.15);
            gfx.fillCircle(lx, 12, 25);
            // 灯光亮点
            gfx.fillStyle(stageLightColors[i], 0.5);
            gfx.fillCircle(lx, 10, 5);
            // 光束向下投射
            gfx.fillStyle(stageLightColors[i], 0.03);
            gfx.fillTriangle(lx - 15, 15, lx + 15, 15, lx, h * 0.55);
        }

        // 底部舞台音响轮廓（左右两侧）
        const speakerY = h * 0.78;
        // 左侧音响
        gfx.fillStyle(0x111122, 0.8);
        gfx.fillRect(50, speakerY, 80, 120);
        gfx.fillStyle(0x1a1a30, 0.6);
        gfx.fillRect(55, speakerY + 5, 70, 110);
        // 音响网纹
        for (let sy = speakerY + 10; sy < speakerY + 110; sy += 8) {
            gfx.fillStyle(0x222244, 0.3);
            gfx.fillRect(60, sy, 60, 3);
        }
        // 音响指示灯
        gfx.fillStyle(0xFF4444, 0.8);
        gfx.fillCircle(90, speakerY - 8, 4);
        gfx.fillStyle(0x44FF44, 0.6);
        gfx.fillCircle(90, speakerY - 8, 2);

        // 右侧音响
        gfx.fillStyle(0x111122, 0.8);
        gfx.fillRect(w - 130, speakerY, 80, 120);
        gfx.fillStyle(0x1a1a30, 0.6);
        gfx.fillRect(w - 125, speakerY + 5, 70, 110);
        for (let sy = speakerY + 10; sy < speakerY + 110; sy += 8) {
            gfx.fillStyle(0x222244, 0.3);
            gfx.fillRect(w - 120, sy, 60, 3);
        }
        gfx.fillStyle(0x4488FF, 0.8);
        gfx.fillCircle(w - 90, speakerY - 8, 4);
        gfx.fillStyle(0x44BBFF, 0.6);
        gfx.fillCircle(w - 90, speakerY - 8, 2);
    }

    // ==================== 方向输入辅助 ====================
    startMoveDir(dir) {
        if (!this.activeBlock || this.gameOver || this.processingMatches || this.exitDialogActive) return;
        if (this.moveDir !== dir) this.moveBlock(dir, 0);
        this.moveDir = dir;
        this.dasTimer = 0;
        this.dasFirstMove = true;
    }

    checkDirRelease(dir) {
        if (this.moveDir !== dir) return;
        const oppositeDir = -dir;
        const oppositeDown = (oppositeDir === -1 && (this.cursors.left.isDown || this.keyA.isDown)) ||
                             (oppositeDir === 1 && (this.cursors.right.isDown || this.keyD.isDown));
        if (oppositeDown) {
            this.moveDir = oppositeDir;
            this.dasTimer = 0;
            this.dasFirstMove = true;
            this.moveBlock(oppositeDir, 0);
        } else {
            this.stopMove();
        }
    }

    // ==================== 每帧更新 ====================
    update(time, delta) {
        if (this.gameOver || this.processingMatches || this.exitDialogActive) return;
        if (!this.activeBlock) return;

        this.updateDAS(delta);

        const downHeld = this.cursors.down.isDown || this.keyS.isDown;
        const normalSpeed = this.getNormalFallSpeed();
        const fallInterval = downHeld
            ? Math.max(this.FAST_FALL_MIN, Math.floor(normalSpeed / 5))
            : normalSpeed;

        this.fallAccumulator += delta;
        while (this.fallAccumulator >= fallInterval) {
            this.fallAccumulator -= fallInterval;
            if (!this.moveBlock(0, 1)) break;
        }

        if (this.activeBlock) {
            this.drawActiveBlock();
        }
    }

    // ==================== DAS 系统 ====================
    updateDAS(delta) {
        if (this.moveDir === 0) return;
        const leftDown  = this.cursors.left.isDown || this.keyA.isDown;
        const rightDown = this.cursors.right.isDown || this.keyD.isDown;
        const stillHeld = (this.moveDir === -1 && leftDown) || (this.moveDir === 1 && rightDown);
        if (!stillHeld) { this.stopMove(); return; }

        this.dasTimer += delta;
        const threshold = this.dasFirstMove ? this.dasDelay : this.dasRepeat;
        while (this.dasTimer >= threshold) {
            this.dasTimer -= threshold;
            this.dasFirstMove = false;
            this.moveBlock(this.moveDir, 0);
        }
    }

    stopMove() {
        this.moveDir = 0;
        this.dasTimer = 0;
        this.dasFirstMove = true;
    }

    /**
     * 根据当前分数计算正常下落间隔
     * 分数越高间隔越短（速度越快），有下限保护
     */
    getNormalFallSpeed() {
        const levels = Math.floor(this.score / this.SPEED_STEP_SCORE);
        return Math.max(this.FALL_SPEED_MIN, this.FALL_SPEED_BASE - levels * this.SPEED_STEP_MS);
    }

    // ==================== 方块池 ====================
    generateBlockPool() {
        const pool = [];
        for (const color of this.COLOR_NAMES) {
            for (let n = 1; n <= 5; n++) {
                pool.push({ color, number: n });
            }
        }
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool;
    }

    // ==================== 生成方块 ====================
    spawnBlock() {
        if (this.grid[this.SPAWN_ROW][this.SPAWN_COL] !== null ||
            this.grid[this.SPAWN_ROW + 1][this.SPAWN_COL] !== null) {
            this.endGame();
            return;
        }

        if (this.blockPool.length === 0) {
            this.blockPool = this.generateBlockPool();
        }

        const blockData = this.blockPool.shift();

        this.activeBlock = {
            cells: [
                { row: this.SPAWN_ROW,     col: this.SPAWN_COL },
                { row: this.SPAWN_ROW + 1, col: this.SPAWN_COL }
            ],
            color: blockData.color,
            number: blockData.number,
            orientation: 'vertical'
        };

        this.fallAccumulator = 0;
        // 预取接下来两个方块数据
        this.nextBlockData = this.blockPool.length > 0 ? this.blockPool[0] : null;
        this.nextBlockData2 = this.blockPool.length > 1 ? this.blockPool[1] : null;

        this.drawActiveBlock();
        this.drawNextPreview();
    }

    // ==================== 移动 ====================
    moveBlock(dx, dy) {
        if (!this.activeBlock) return false;
        const newCells = this.activeBlock.cells.map(c => ({ row: c.row + dy, col: c.col + dx }));
        if (!this.canPlace(newCells)) {
            if (dy > 0) this.landBlock();
            return false;
        }
        this.activeBlock.cells = newCells;
        return true;
    }

    // ==================== 旋转 ====================
    rotateBlock() {
        if (!this.activeBlock) return;
        const pivot = this.activeBlock.cells[0];
        const other = this.activeBlock.cells[1];
        // 计算另一格相对 pivot 的方向，顺时针旋转
        const dr = other.row - pivot.row;  // -1=上, 0=同行, 1=下
        const dc = other.col - pivot.col;  // -1=左, 0=同列, 1=右
        // 顺时针：(dr,dc) 映射：下(1,0)→右(0,1)  右(0,1)→上(-1,0)  上(-1,0)→左(0,-1)  左(0,-1)→下(1,0)
        const newDr = dc;
        const newDc = -dr;
        const newCells = [
            { row: pivot.row, col: pivot.col },
            { row: pivot.row + newDr, col: pivot.col + newDc }
        ];
        if (this.canPlace(newCells)) {
            this.activeBlock.cells = newCells;
            // 更新朝向：同行=横向，同列=竖向
            this.activeBlock.orientation = (newCells[0].row === newCells[1].row) ? 'horizontal' : 'vertical';
            this.drawActiveBlock();
        }
    }

    canPlace(cells) {
        for (const cell of cells) {
            if (cell.col < 0 || cell.col >= this.COLS) return false;
            if (cell.row < 0 || cell.row >= this.ROWS) return false;
            if (this.grid[cell.row][cell.col] !== null) return false;
        }
        return true;
    }

    // ==================== 落地 ====================
    landBlock() {
        if (!this.activeBlock) return;

        this.sound.play('sfxLand', { volume: 0.7 });

        const landedCells = [...this.activeBlock.cells];
        const groupId = this.nextGroupId++;

        // 计算方块的朝向方向
        const direction = this.getBlockDirection(this.activeBlock.cells);

        for (const cell of landedCells) {
            const cellData = {
                color: this.activeBlock.color,
                number: this.activeBlock.number,
                blockGroupId: groupId,
                direction: direction
            };
            this.grid[cell.row][cell.col] = cellData;
        }

        this.clearActiveBlockDisplay();
        this.activeBlock = null;
        this.fallAccumulator = 0;

        this.drawLandedBlocks();
        this.createGroupText(groupId, landedCells);

        // 麻里奈落地瞬间表情切换
        if (this.marinaImage && this.textures.exists('marina2')) {
            this.marinaImage.setTexture('marina2');
            this.time.delayedCall(250, () => {
                if (this.marinaImage && this.marinaImage.active) {
                    this.marinaImage.setTexture('marina1');
                }
            });
        }

        this.processingMatches = true;
        this.processMatchChain();
    }

    // ==================== 消除检测 (BFS) ====================
    findMatches() {
        const visited = [];
        for (let r = 0; r < this.ROWS; r++) {
            visited[r] = new Array(this.COLS).fill(false);
        }
        const allMatches = [];

        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.grid[r][c] !== null && !visited[r][c]) {
                    const color = this.grid[r][c].color;
                    const group = [];
                    const queue = [{ r, c }];
                    visited[r][c] = true;

                    while (queue.length > 0) {
                        const { r: cr, c: cc } = queue.shift();
                        group.push({ row: cr, col: cc });
                        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                        for (const [dr, dc] of dirs) {
                            const nr = cr + dr, nc = cc + dc;
                            if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS &&
                                !visited[nr][nc] && this.grid[nr][nc] !== null &&
                                this.grid[nr][nc].color === color) {
                                visited[nr][nc] = true;
                                queue.push({ r: nr, c: nc });
                            }
                        }
                    }
                    if (group.length >= this.MATCH_MIN) {
                        allMatches.push(group);
                    }
                }
            }
        }
        return allMatches;
    }

    // ==================== 重力（连接感知，成组下落） ====================
    /**
     * 收集所有 blockGroup → 单元格列表的映射
     */
    collectGroups() {
        const map = new Map();  // groupId → [{row, col}, ...]
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const cell = this.grid[r][c];
                if (cell && cell.blockGroupId != null) {
                    const gid = cell.blockGroupId;
                    if (!map.has(gid)) map.set(gid, []);
                    map.get(gid).push({ row: r, col: c });
                }
            }
        }
        return map;
    }

    /**
     * 检查组内所有单元格是否都能向下移动 1 格
     */
    canGroupFall(groupCells) {
        for (const c of groupCells) {
            const nr = c.row + 1;
            if (nr >= this.ROWS) return false;
            const target = this.grid[nr][c.col];
            if (target !== null) {
                // 如果是同组的单元格（上方格挡住下方格），不算阻挡
                const sameGroup = groupCells.some(gc => gc.row === nr && gc.col === c.col);
                if (!sameGroup) return false;
            }
        }
        return true;
    }

    /**
     * 成组下落：只要组内任一格下方为空，整个组一起下落
     * 循环直到没有任何组可以下落为止
     */
    applyGravity() {
        let moved = true;
        while (moved) {
            moved = false;
            const groups = this.collectGroups();

            // 按底部行号降序排列，确保下方组先下落
            const groupList = [...groups.entries()].map(([gid, cells]) => {
                const bottomRow = Math.max(...cells.map(c => c.row));
                return { gid, cells, bottomRow };
            });
            groupList.sort((a, b) => b.bottomRow - a.bottomRow);

            for (const group of groupList) {
                if (this.canGroupFall(group.cells)) {
                    // 保存数据
                    const cellData = group.cells.map(c => ({
                        row: c.row + 1,
                        col: c.col,
                        data: this.grid[c.row][c.col]
                    }));
                    // 清除旧位置
                    for (const c of group.cells) {
                        this.grid[c.row][c.col] = null;
                    }
                    // 写入新位置
                    for (const cd of cellData) {
                        this.grid[cd.row][cd.col] = cd.data;
                    }
                    moved = true;
                }
            }
        }
    }

    // ==================== 连锁消除（粒子特效） ====================
    processMatchChain() {
        if (this.gameOver) return;
        const matches = this.findMatches();

        if (matches.length === 0) {
            this.combo = 0;  // 连锁结束，重置
            this.processingMatches = false;
            this.spawnBlock();
            return;
        }

        // 连锁+1
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.updateComboDisplay();

        const groupsCleared = matches.length;
        this.score += groupsCleared * this.SCORE_PER_MATCH;
        this.updateScoreDisplay();

        const allCells = [];
        for (const group of matches) {
            allCells.push(...group);
        }

        // 为每个消除组播放对应颜色音效（在清除 grid 前读取颜色）
        const COLOR_SFX_KEY = {
            pink: 'sfxPink', red: 'sfxRed', lightgreen: 'sfxLightGreen',
            violet: 'sfxViolet', yellow: 'sfxYellow',
        };
        for (const group of matches) {
            const sampleCell = group[0];
            const cellData = this.grid[sampleCell.row][sampleCell.col];
            if (cellData && COLOR_SFX_KEY[cellData.color]) {
                this.sound.play(COLOR_SFX_KEY[cellData.color], { volume: 0.7 });
            }
        }

        // 粒子特效：在每个消除格的中心生成白色粒子
        const s = this.CELL_SIZE;
        for (const { row, col } of allCells) {
            const px = this.GRID_X + col * s + s / 2;
            const py = this.GRID_Y + row * s + s / 2;
            const emitter = this.add.particles(px, py, 'white_particle', {
                speed: { min: 30, max: 150 },
                angle: { min: 200, max: 340 },
                scale: { start: 0.8, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: { min: 300, max: 800 },
                quantity: 8,
                tint: [0xffffff, 0xffffcc, 0xeeeeff],
                emitting: false
            });
            emitter.setDepth(20);
            emitter.explode(8);
            // 粒子消失后自动销毁
            this.time.delayedCall(1000, () => {
                if (emitter && emitter.active) emitter.destroy();
            });
        }

        // 记录受影响的 groupId
        const affectedGroups = new Set();
        for (const { row, col } of allCells) {
            if (this.grid[row][col] && this.grid[row][col].blockGroupId != null) {
                affectedGroups.add(this.grid[row][col].blockGroupId);
            }
            this.grid[row][col] = null;
        }

        // 更新受影响的组的文本和图片
        for (const gid of affectedGroups) {
            this.updateGroupText(gid);
            this.updateGroupImage(gid);
        }

        this.applyGravity();
        this.updateAllGroupTexts();
        this.updateAllGroupImages();
        this.drawLandedBlocks();

        // 粒子动画播放后递归检查连锁
        this.time.delayedCall(350, () => {
            this.processMatchChain();
        });
    }

    // ==================== 游戏结束 ====================
    endGame() {
        if (this.gameOver) return;

        this.gameOver = true;
        this.processingMatches = true;
        this.clearActiveBlockDisplay();

        // 先调度跳转（最关键操作，必须优先于可能失败的操作）
        this.time.delayedCall(500, () => {
            this.scene.start('GameOverScene', {
                score: this.score,
                highScore: this.highScore,
                maxCombo: this.maxCombo,
                isNewRecord: this.score >= this.highScore && this.score > 0
            });
        });

        // 音频操作（非关键，失败不影响跳转）
        if (this._gameBGM) this._gameBGM.stop();
        if (!this.endedByEsc) {
            try { this.sound.play('sfxGameover', { volume: 0.8 }); } catch (e) {}
        }

        // 保存最高分
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('blockGameHighScore', String(this.highScore)); } catch (e) {}
        }
    }

    // ==================== 退出确认对话框 ====================
    showExitDialog() {
        this.exitDialogActive = true;
        this.exitDialogElements = [];
        const { width, height } = this.cameras.main;

        // 半透明遮罩
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(100);
        this.exitDialogElements.push(overlay);

        // 对话框背景
        const dialogW = 400, dialogH = 210;
        const dx = (width - dialogW) / 2, dy = (height - dialogH) / 2;
        const dialogBg = this.add.graphics();
        dialogBg.fillStyle(0x1a1a3e, 0.97);
        dialogBg.fillRoundedRect(dx, dy, dialogW, dialogH, 16);
        dialogBg.lineStyle(2, 0x533483, 0.8);
        dialogBg.strokeRoundedRect(dx, dy, dialogW, dialogH, 16);
        dialogBg.setDepth(101);
        this.exitDialogElements.push(dialogBg);

        // 标题
        const title = this.add.text(width / 2, dy + 55, window.I18N.t('game.exit.title'), {
            fontSize: '26px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(102);
        this.exitDialogElements.push(title);

        // 确认退出按钮
        const confirmBtnGfx = this.add.graphics();
        const btnW = 155, btnH = 50;
        const confirmX = width / 2 - btnW - 10, confirmY = dy + 110;
        confirmBtnGfx.fillStyle(0x882222, 1);
        confirmBtnGfx.fillRoundedRect(confirmX, confirmY, btnW, btnH, 10);
        confirmBtnGfx.lineStyle(1, 0xff4444, 0.5);
        confirmBtnGfx.strokeRoundedRect(confirmX, confirmY, btnW, btnH, 10);
        confirmBtnGfx.setDepth(102);
        this.exitDialogElements.push(confirmBtnGfx);

        const confirmText = this.add.text(confirmX + btnW / 2, confirmY + btnH / 2, window.I18N.t('game.exit.confirm'), {
            fontSize: '20px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#ff6666',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(103);
        this.exitDialogElements.push(confirmText);

        const confirmZone = this.add.zone(confirmX + btnW / 2, confirmY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true }).setDepth(104);
        confirmZone.on('pointerup', () => { this.endedByEsc = true; this.endGame(); });
        this.exitDialogElements.push(confirmZone);

        // 继续游戏按钮
        const cancelBtnGfx = this.add.graphics();
        const cancelX = width / 2 + 10, cancelY = dy + 110;
        cancelBtnGfx.fillStyle(0x224422, 1);
        cancelBtnGfx.fillRoundedRect(cancelX, cancelY, btnW, btnH, 10);
        cancelBtnGfx.lineStyle(1, 0x44ff44, 0.5);
        cancelBtnGfx.strokeRoundedRect(cancelX, cancelY, btnW, btnH, 10);
        cancelBtnGfx.setDepth(102);
        this.exitDialogElements.push(cancelBtnGfx);

        const cancelText = this.add.text(cancelX + btnW / 2, cancelY + btnH / 2, window.I18N.t('game.exit.continue'), {
            fontSize: '20px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#90EE90',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(103);
        this.exitDialogElements.push(cancelText);

        const cancelZone = this.add.zone(cancelX + btnW / 2, cancelY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true }).setDepth(104);
        cancelZone.on('pointerup', () => { this.closeExitDialog(); });
        this.exitDialogElements.push(cancelZone);
    }

    closeExitDialog() {
        this.exitDialogActive = false;
        for (const el of this.exitDialogElements) {
            el.destroy();
        }
        this.exitDialogElements = [];
    }

    // ==================== 方块图片 ====================
    /**
     * 根据代码颜色名返回显示名
     * @param {string} color - 'pink' | 'red' | 'lightgreen' | 'violet' | 'yellow'
     * @returns {string} 显示名，如 'Pink', 'Light green'
     */
    getBlockDisplayName(color) {
        const map = {
            pink: 'Pink',
            red: 'Red',
            lightgreen: 'Light green',
            violet: 'Violet',
            yellow: 'Yellow'
        };
        return map[color] || color;
    }

    /**
     * 根据 cells[1] 相对 cells[0] 的位置返回方向
     * @param {Array} cells - [{row, col}, {row, col}]
     * @returns {string} '上' | '下' | '左' | '右'
     */
    getBlockDirection(cells) {
        const dr = cells[1].row - cells[0].row;
        const dc = cells[1].col - cells[0].col;
        if (dr === 1 && dc === 0) return '下';
        if (dr === 0 && dc === 1) return '右';
        if (dr === -1 && dc === 0) return '上';
        if (dr === 0 && dc === -1) return '左';
        return '下'; // fallback
    }

    /**
     * 根据颜色、序号和方向查找对应的方块图片 key
     * @param {string} color - 颜色名
     * @param {number} number - 序号
     * @param {Array} cells - 方块单元格数组，用于判断方向
     * @returns {string|null} 纹理 key 或 null
     */
    getBlockImageKey(color, number, cells) {
        if (!cells || cells.length !== 2) return null;
        const displayName = this.getBlockDisplayName(color);
        const direction = this.getBlockDirection(cells);
        const key = `${displayName}${number}${direction}`;
        return this.textures.exists(key) ? key : null;
    }

    // ==================== 渲染：网格背景（深色棋盘） ====================
    drawGridBackground() {
        const gfx = this.gridGfx; gfx.clear();
        const x = this.GRID_X, y = this.GRID_Y;
        const w = this.GRID_W, h = this.GRID_H, s = this.CELL_SIZE;

        // 深色棋盘底板
        gfx.fillStyle(this.GRID_BG_COLOR, 0.95);
        gfx.fillRoundedRect(x - 6, y - 6, w + 12, h + 12, 8);

        // 玻璃质感格子：半透明底色 + 顶部高光 + 微亮边框
        const cellGap = 2;  // 格间缝隙
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const cx = x + c * s + cellGap / 2;
                const cy = y + r * s + cellGap / 2;
                const cw = s - cellGap;
                const ch = s - cellGap;
                const cellColor = this.GRID_CELL_COLORS[(r + c) % 4];

                // ① 底层：半透明颜色填充（降低 alpha 让底板透出）
                gfx.fillStyle(cellColor, 0.35);
                gfx.fillRoundedRect(cx, cy, cw, ch, 3);

                // ② 中层：顶部高光条（模拟玻璃透光反射）
                gfx.fillStyle(0xffffff, 0.12);
                gfx.fillRoundedRect(cx + 2, cy + 1, cw - 4, 8, { tl: 2, tr: 2, bl: 0, br: 0 });

                // ③ 顶层：微亮边框（玻璃边缘质感）
                gfx.lineStyle(1, 0xffffff, 0.1);
                gfx.strokeRoundedRect(cx, cy, cw, ch, 3);
            }
        }

        // 外框（浅灰细线）
        gfx.lineStyle(1, 0x666688, 0.3);
        gfx.strokeRoundedRect(x - 6, y - 6, w + 12, h + 12, 8);
    }

    // ==================== 渲染：霓虹渐变边框 ====================
    drawNeonBorders() {
        const gfx = this.neonBorderGfx; gfx.clear();
        const topY = this.GRID_Y - 20;
        const botY = this.GRID_Y + this.GRID_H + 20;
        const stripH = botY - topY;
        const bw = this.BORDER1_W; // 10px

        // 左侧霓虹：渐变粉→紫→蓝
        const leftColors = [0xFF69B4, 0xDD55AA, 0xBB44AA, 0x9944CC, 0x7755DD, 0x5566EE, 0x4477EE, 0x4488EE, 0x4499EE, 0x44AAFF];
        for (let i = 0; i < bw; i++) {
            const t = i / (bw - 1);
            const colorIdx = Math.floor(t * (leftColors.length - 1));
            gfx.fillStyle(leftColors[colorIdx], 0.7 - i * 0.04);
            gfx.fillRect(this.BORDER1_X + i, topY, 1, stripH);
        }
        // 左侧发光层
        gfx.fillStyle(0xFF69B4, 0.12);
        gfx.fillRect(this.BORDER1_X - 4, topY, bw + 8, stripH);

        // 右侧霓虹：渐变蓝→紫→粉（镜像）
        const rightColors = [0x44AAFF, 0x4499EE, 0x4488EE, 0x4477EE, 0x5566EE, 0x7755DD, 0x9944CC, 0xBB44AA, 0xDD55AA, 0xFF69B4];
        for (let i = 0; i < bw; i++) {
            const t = i / (bw - 1);
            const colorIdx = Math.floor(t * (rightColors.length - 1));
            gfx.fillStyle(rightColors[colorIdx], 0.7 - i * 0.04);
            gfx.fillRect(this.BORDER2_X + i, topY, 1, stripH);
        }
        // 右侧发光层
        gfx.fillStyle(0x44AAFF, 0.12);
        gfx.fillRect(this.BORDER2_X - 4, topY, bw + 8, stripH);
    }

    // ==================== 渲染：左侧气泡标题 ====================
    drawBubbleTitle() {
        const gfx = this.bubbleGfx; gfx.clear();
        const cx = 36;
        const bubbleW = 68, bubbleH = 100;
        const bx = cx - bubbleW / 2, by = 60;

        // 气泡阴影
        gfx.fillStyle(0x000000, 0.2);
        gfx.fillRoundedRect(bx + 3, by + 3, bubbleW, bubbleH, 20);

        // 气泡主体（白色渐变到浅粉）
        gfx.fillStyle(0xFFFFFF, 0.95);
        gfx.fillRoundedRect(bx, by, bubbleW, bubbleH, 20);

        // 粉色气泡描边
        gfx.lineStyle(2.5, 0xFF69B4, 0.9);
        gfx.strokeRoundedRect(bx, by, bubbleW, bubbleH, 20);

        // 气泡顶部高光
        gfx.fillStyle(0xFFFFFF, 0.4);
        gfx.fillRoundedRect(bx + 8, by + 4, bubbleW - 16, 20, 10);

        // 星星装饰 — 四个角
        const starPositions = [
            { x: bx - 2, y: by - 2 },
            { x: bx + bubbleW + 2, y: by - 2 },
            { x: bx - 2, y: by + bubbleH + 2 },
            { x: bx + bubbleW + 2, y: by + bubbleH + 2 },
        ];
        // 小四角星
        for (const pos of starPositions) {
            this.drawStar(gfx, pos.x, pos.y, 5, 0xFFD700, 0.85);
        }

        // 标题文字 "パズル" / "ピコ"
        this.add.text(cx, by + 28, window.I18N.t('game.logo1'), {
            fontSize: '18px',
            fontFamily: '"Yu Gothic", "MS Gothic", "Microsoft YaHei", sans-serif',
            color: '#FF69B4',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(5);

        this.add.text(cx, by + 50, window.I18N.t('game.logo2'), {
            fontSize: '18px',
            fontFamily: '"Yu Gothic", "MS Gothic", "Microsoft YaHei", sans-serif',
            color: '#FF69B4',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(5);

        // 副标题
        this.add.text(cx, by + 72, window.I18N.t('game.logoSub'), {
            fontSize: '8px',
            fontFamily: 'Arial, sans-serif',
            color: '#CC88AA',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(5);

        // 小星星装饰（标题两侧）
        this.drawStar(gfx, cx - 20, by + 15, 4, 0xFFB6C1, 0.7);
        this.drawStar(gfx, cx + 20, by + 15, 4, 0xFFB6C1, 0.7);
    }

    /**
     * 绘制四角星形
     */
    drawStar(gfx, cx, cy, size, color, alpha) {
        gfx.fillStyle(color, alpha);
        gfx.beginPath();
        // 四角星：上下左右四个顶点 + 对角凹入
        const inner = size * 0.35;
        gfx.moveTo(cx, cy - size);        // 上
        gfx.lineTo(cx + inner, cy - inner); // 右上内
        gfx.lineTo(cx + size, cy);         // 右
        gfx.lineTo(cx + inner, cy + inner); // 右下内
        gfx.lineTo(cx, cy + size);         // 下
        gfx.lineTo(cx - inner, cy + inner); // 左下内
        gfx.lineTo(cx - size, cy);         // 左
        gfx.lineTo(cx - inner, cy - inner); // 左上内
        gfx.closePath();
        gfx.fillPath();
    }

    // ==================== 渲染：右侧信息面板 ====================
    drawCard(gfx, x, y, w, h) {
        // 投影
        gfx.fillStyle(0x000000, 0.15);
        gfx.fillRoundedRect(x + 4, y + 4, w, h, this.CARD_RADIUS);
        // 白色不透明底
        gfx.fillStyle(0xFFFFFF, 0.95);
        gfx.fillRoundedRect(x, y, w, h, this.CARD_RADIUS);
        // 浅灰边框
        gfx.lineStyle(1, 0xDDDDEE, 0.6);
        gfx.strokeRoundedRect(x, y, w, h, this.CARD_RADIUS);
    }

    drawRightPanel() {
        const gfx = this.rightPanelGfx; gfx.clear();

        // === Card 1: NEXT! ===
        this.drawCard(gfx, this.CARD_X, this.CARD1_Y, this.CARD_W, this.CARD1_H);
        const c1x = this.CARD_X + this.CARD_W / 2;

        // NEXT! 标题
        this.add.text(c1x, this.CARD1_Y + 16, window.I18N.t('game.next'), {
            fontSize: '18px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#FF69B4',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(5);

        // 麻里奈角色立绘（右侧，紧贴预览方块）
        const marinaY = this.CARD1_Y + 95;
        if (this.textures.exists('marina1')) {
            this.marinaImage = this.add.image(c1x + 27, marinaY, 'marina1');
            this.marinaImage.setDisplaySize(60, 130);
            this.marinaImage.setDepth(5);
        }

        // 预览锚点（下个方块预览，左侧）
        this.previewAnchorX = c1x - 28;
        this.previewAnchorY = this.CARD1_Y + 95;

        // 木桶装饰（覆盖预览图片下半部，预览更新时保持不变）
        if (this.textures.exists('woodenBucket')) {
            this.bucketImage = this.add.image(this.previewAnchorX, this.previewAnchorY + 27, 'woodenBucket');
            this.bucketImage.setDisplaySize(50, 55);
            this.bucketImage.setDepth(6);
        }

        // === Card 2: SCORE ===
        this.drawCard(gfx, this.CARD_X, this.CARD2_Y, this.CARD_W, this.CARD2_H);
        const c2x = this.CARD_X + this.CARD_W / 2;
        const cy = this.CARD2_Y;
        const padL = this.CARD_X + 12;  // 左内边距
        const padR = this.CARD_X + this.CARD_W - 12; // 右内边距

        // SCORE 标题
        this.add.text(c2x, cy + 16, window.I18N.t('game.score'), {
            fontSize: '18px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#FF69B4',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(5);

        // ---- 得分行 ----
        const scoreRowY = cy + 55;
        this.add.text(padL, scoreRowY, window.I18N.t('game.scoreLabel'), {
            fontSize: '14px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#555566',
        }).setDepth(5);

        this.scoreDisplay = this.add.text(padR, cy + 75, '000000', {
            fontSize: '18px',
            fontFamily: '"Courier New", Courier, "Consolas", monospace',
            color: '#FF69B4',
            fontStyle: 'bold',
        }).setOrigin(1, 0).setDepth(5);

        // ---- 分隔线 ----
        const sepY1 = cy + 88;
        gfx.lineStyle(1, 0xEEEEEE, 0.5);
        gfx.lineBetween(padL, sepY1, padR, sepY1);

        // ---- 最高分行 ----
        const hiRowY = cy + 102;
        this.add.text(padL, hiRowY, window.I18N.t('game.maxScore'), {
            fontSize: '14px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#555566',
        }).setDepth(5);

        this.highScoreDisplay = this.add.text(padR, cy + 122, String(this.highScore).padStart(6, '0'), {
            fontSize: '18px',
            fontFamily: '"Courier New", Courier, "Consolas", monospace',
            color: '#FF69B4',
            fontStyle: 'bold',
        }).setOrigin(1, 0).setDepth(5);

        // ---- 分隔线 ----
        const sepY2 = cy + 135;
        gfx.lineStyle(1, 0xEEEEEE, 0.5);
        gfx.lineBetween(padL, sepY2, padR, sepY2);

        // ---- MAX COMBO 黑色子模块 ----
        const mcY = cy + 150;
        const mcH = 70;
        // 黑色圆角子模块背景
        gfx.fillStyle(0x1a1a2e, 0.9);
        gfx.fillRoundedRect(padL, mcY, this.CARD_W - 24, mcH, 8);

        // MAX COMBO 文字
        this.add.text(padL + 10, mcY + 12, window.I18N.t('game.max'), {
            fontSize: '12px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#9999AA',
            fontStyle: 'bold',
        }).setDepth(5);

        this.add.text(padL + 10, mcY + 32, window.I18N.t('game.combo'), {
            fontSize: '12px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#9999AA',
            fontStyle: 'bold',
        }).setDepth(5);

        // COMBO 数字
        this.maxComboDisplay = this.add.text(padR - 6, mcY + mcH / 2, '0000', {
            fontSize: '22px',
            fontFamily: '"Courier New", Courier, "Consolas", monospace',
            color: '#FFFFFF',
            fontStyle: 'bold',
        }).setOrigin(1, 0.5).setDepth(5);

        // ---- SCORE 面板底部分隔线 ----
        const sepY3 = cy + 235;
        gfx.lineStyle(1, 0xEEEEEE, 0.5);
        gfx.lineBetween(padL, sepY3, padR, sepY3);

        // ---- 初始分数和最高分修正 ----
        // scoreDisplay和highScoreDisplay初始值已在上面设置，但需要根据实际状态更新
    }

    // ==================== 渲染：已落地方块（成组绘制） ====================
    drawLandedBlocks() {
        this.blockGfx.clear();

        // 清理旧图片：记录当前存在的 groupId
        const currentGroupIds = new Set();
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const cell = this.grid[r][c];
                if (cell && cell.blockGroupId != null) {
                    currentGroupIds.add(cell.blockGroupId);
                }
            }
        }
        // 销毁不再存在的组的图片
        for (const [gid, img] of this.blockImages) {
            if (!currentGroupIds.has(gid)) {
                img.destroy();
                this.blockImages.delete(gid);
            }
        }

        this.drawAllBlocks(null, null);
    }

    /**
     * 绘制所有已落地方块。
     * 同一 blockGroupId 的两格绘制为一个连通的大方块，序号居中。
     * @param {Array} flashCells 要高亮闪烁的单元格
     * @param {number} flashColor 闪烁颜色
     */
    drawAllBlocks(flashCells, flashColor) {
        const gfx = this.blockGfx;
        const s = this.CELL_SIZE;
        const flashSet = new Set();
        if (flashCells) {
            for (const { row, col } of flashCells) {
                flashSet.add(`${row},${col}`);
            }
        }

        // 收集已处理的组
        const drawnGroups = new Set();

        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const cell = this.grid[r][c];
                if (!cell) continue;

                const gid = cell.blockGroupId;
                if (gid != null && !drawnGroups.has(gid)) {
                    drawnGroups.add(gid);

                    // 找到该组所有单元格
                    const groupCells = [];
                    for (let gr = 0; gr < this.ROWS; gr++) {
                        for (let gc = 0; gc < this.COLS; gc++) {
                            if (this.grid[gr][gc] && this.grid[gr][gc].blockGroupId === gid) {
                                groupCells.push({ row: gr, col: gc });
                            }
                        }
                    }

                    if (groupCells.length === 0) continue;

                    // 找包围盒
                    const minRow = Math.min(...groupCells.map(c => c.row));
                    const maxRow = Math.max(...groupCells.map(c => c.row));
                    const minCol = Math.min(...groupCells.map(c => c.col));
                    const maxCol = Math.max(...groupCells.map(c => c.col));

                    const bx = this.GRID_X + minCol * s;
                    const by = this.GRID_Y + minRow * s;
                    const bw = (maxCol - minCol + 1) * s;
                    const bh = (maxRow - minRow + 1) * s;

                    const color = this.COLORS[cell.color];

                    // 检查是否有任何单元格需要闪烁
                    let useFlash = false;
                    if (flashCells) {
                        for (const gc of groupCells) {
                            if (flashSet.has(`${gc.row},${gc.col}`)) {
                                useFlash = true;
                                break;
                            }
                        }
                    }

                    const drawColor = (useFlash && flashColor != null) ? flashColor : color;

                    // 绘制连通大方块
                    gfx.fillStyle(drawColor, 0.85);
                    gfx.fillRoundedRect(bx + 2, by + 2, bw - 4, bh - 4, 6);
                    gfx.lineStyle(1, 0xffffff, 0.2);
                    gfx.strokeRoundedRect(bx + 2, by + 2, bw - 4, bh - 4, 6);

                    // 如果闪烁，在个别单元格上叠加闪烁效果
                    if (useFlash && flashColor != null) {
                        for (const gc of groupCells) {
                            if (flashSet.has(`${gc.row},${gc.col}`)) {
                                const px = this.GRID_X + gc.col * s;
                                const py = this.GRID_Y + gc.row * s;
                                gfx.fillStyle(flashColor, 0.7);
                                gfx.fillRoundedRect(px + 2, py + 2, s - 4, s - 4, 5);
                            }
                        }
                    }

                    // 叠加方块图片（所有方块均有方向图片）
                    const displayName = this.getBlockDisplayName(cell.color);
                    const imgKey = `${displayName}${cell.number}${cell.direction}`;
                    if (this.textures.exists(imgKey)) {
                        const imgCX = bx + bw / 2;
                        const imgCY = by + bh / 2;
                        const imgAngle = 0;  // 方向图片本身已正确朝向，无需旋转
                        if (this.blockImages.has(gid)) {
                            const img = this.blockImages.get(gid);
                            img.setTexture(imgKey);
                            img.setPosition(imgCX, imgCY);
                            img.setDisplaySize(bw - 4, bh - 4);
                            img.setAngle(imgAngle);
                            img.setVisible(true);
                        } else {
                            const img = this.add.image(imgCX, imgCY, imgKey);
                            img.setDisplaySize(bw - 4, bh - 4);
                            img.setAngle(imgAngle);
                            img.setDepth(3);
                            this.blockImages.set(gid, img);
                        }
                    }
                } else if (gid == null) {
                    // 无组的孤立单元格（向后兼容）
                    const px = this.GRID_X + c * s;
                    const py = this.GRID_Y + r * s;
                    let color;
                    if (flashSet.has(`${r},${c}`) && flashColor != null) {
                        color = flashColor;
                    } else {
                        color = this.COLORS[cell.color];
                    }
                    gfx.fillStyle(color, 0.85);
                    gfx.fillRoundedRect(px + 2, py + 2, s - 4, s - 4, 5);
                    gfx.lineStyle(1, 0xffffff, 0.2);
                    gfx.strokeRoundedRect(px + 2, py + 2, s - 4, s - 4, 5);
                }
            }
        }
    }

    // ==================== 渲染：活动方块 ====================
    drawActiveBlock() {
        if (!this.activeBlock) return;

        const gfx = this.activeGfx;
        gfx.clear();
        const color = this.COLORS[this.activeBlock.color];
        const s = this.CELL_SIZE;

        // 清除旧文本
        for (const t of this.activeTexts) {
            if (t) t.destroy();
        }
        this.activeTexts = [];

        // 找包围盒
        const rows = this.activeBlock.cells.map(c => c.row);
        const cols = this.activeBlock.cells.map(c => c.col);
        const minRow = Math.min(...rows), maxRow = Math.max(...rows);
        const minCol = Math.min(...cols), maxCol = Math.max(...cols);
        const bx = this.GRID_X + minCol * s;
        const by = this.GRID_Y + minRow * s;
        const bw = (maxCol - minCol + 1) * s;
        const bh = (maxRow - minRow + 1) * s;

        // 绘制连通大方块
        gfx.fillStyle(color, 0.9);
        gfx.fillRoundedRect(bx + 2, by + 2, bw - 4, bh - 4, 6);
        gfx.lineStyle(2, 0xffffff, 0.5);
        gfx.strokeRoundedRect(bx + 2, by + 2, bw - 4, bh - 4, 6);

        // 叠加图片或序号
        const cx = bx + bw / 2;
        const cy = by + bh / 2;
        const imgKey = this.getBlockImageKey(this.activeBlock.color, this.activeBlock.number, this.activeBlock.cells);
        if (imgKey) {
            // 有图片：显示图片，不显示序号
            const angle = 0;  // 所有方块均有方向图片，无需旋转
            if (this.activeBlockImage) {
                this.activeBlockImage.setTexture(imgKey);
                this.activeBlockImage.setPosition(cx, cy);
                this.activeBlockImage.setDisplaySize(bw - 4, bh - 4);
                this.activeBlockImage.setAngle(angle);
                this.activeBlockImage.setVisible(true);
            } else {
                this.activeBlockImage = this.add.image(cx, cy, imgKey);
                this.activeBlockImage.setDisplaySize(bw - 4, bh - 4);
                this.activeBlockImage.setAngle(angle);
                this.activeBlockImage.setDepth(3);
            }
        } else {
            // 无图片：显示序号
            const text = this.add.text(cx, cy, String(this.activeBlock.number), {
                fontSize: '24px',
                fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
            }).setOrigin(0.5).setDepth(10);
            this.activeTexts.push(text);
        }
    }

    clearActiveBlockDisplay() {
        this.activeGfx.clear();
        for (const t of this.activeTexts) {
            if (t) t.destroy();
        }
        this.activeTexts = [];
        if (this.activeBlockImage) {
            this.activeBlockImage.destroy();
            this.activeBlockImage = null;
        }
    }

    // ==================== 渲染：下一个方块预览 ====================
    drawNextPreview() {
        // 清理旧预览
        if (this.previewImage) { this.previewImage.destroy(); this.previewImage = null; }
        if (this.previewText) { this.previewText.destroy(); this.previewText = null; }
        this.previewGfx.clear();

        if (!this.nextBlockData) return;

        const displayName = this.getBlockDisplayName(this.nextBlockData.color);
        const imgKey = `${displayName}${this.nextBlockData.number}下`; // 预览始终竖向

        if (this.textures.exists(imgKey)) {
            this.previewImage = this.add.image(this.previewAnchorX, this.previewAnchorY, imgKey);
            this.previewImage.setDisplaySize(50, 110);
            this.previewImage.setDepth(5);
        } else {
            // 回退：纯色矩形
            const color = this.COLORS[this.nextBlockData.color];
            this.previewGfx.fillStyle(color, 0.85);
            this.previewGfx.fillRoundedRect(
                this.previewAnchorX - 13, this.previewAnchorY - 27, 26, 54, 5);
            this.previewGfx.lineStyle(1, 0xffffff, 0.4);
            this.previewGfx.strokeRoundedRect(
                this.previewAnchorX - 13, this.previewAnchorY - 27, 26, 54, 5);
        }
    }

    // ==================== 分数与连击显示更新 ====================
    updateScoreDisplay() {
        if (this.scoreDisplay) {
            this.scoreDisplay.setText(String(this.score).padStart(8, '0'));
        }
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('blockGameHighScore', String(this.highScore)); } catch (e) {}
            if (this.highScoreDisplay) {
                this.highScoreDisplay.setText(String(this.highScore).padStart(8, '0'));
            }
        }
    }

    updateComboDisplay() {
        if (this.maxComboDisplay) {
            this.maxComboDisplay.setText(String(this.maxCombo).padStart(4, '0'));
        }
    }

    // ==================== 组文本管理 ====================
    /**
     * 为一个 blockGroup 创建居中文本
     */
    createGroupText(groupId, _cells) {
        // 所有方块均有方向图片，无需显示序号文本
        // 清理该组的旧文本（如果存在）
        if (this.groupTexts.has(groupId)) {
            this.groupTexts.get(groupId).destroy();
            this.groupTexts.delete(groupId);
        }
    }

    /**
     * 更新某个组的文本（部分清除后，单元格数可能变成 1）
     */
    updateGroupText(groupId) {
        // 找到该组当前剩余单元格
        const cells = [];
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.grid[r][c] && this.grid[r][c].blockGroupId === groupId) {
                    cells.push({ row: r, col: c });
                }
            }
        }

        // 销毁旧文本
        if (this.groupTexts.has(groupId)) {
            this.groupTexts.get(groupId).destroy();
            this.groupTexts.delete(groupId);
        }

        if (cells.length > 0) {
            this.createGroupText(groupId, cells);
        }
    }

    /**
     * 重力后重建所有组的文本
     */
    updateAllGroupTexts() {
        // 销毁所有现有文本
        for (const [, text] of this.groupTexts) {
            text.destroy();
        }
        this.groupTexts.clear();

        // 遍历网格，为每个组重建文本
        const seenGroups = new Set();
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.grid[r][c] && this.grid[r][c].blockGroupId != null) {
                    const gid = this.grid[r][c].blockGroupId;
                    if (!seenGroups.has(gid)) {
                        seenGroups.add(gid);
                        // 收集该组所有单元格
                        const cells = [];
                        for (let gr = 0; gr < this.ROWS; gr++) {
                            for (let gc = 0; gc < this.COLS; gc++) {
                                if (this.grid[gr][gc] && this.grid[gr][gc].blockGroupId === gid) {
                                    cells.push({ row: gr, col: gc });
                                }
                            }
                        }
                        this.createGroupText(gid, cells);
                    }
                }
            }
        }
    }

    // ==================== 组图片管理 ====================
    /**
     * 更新某个组的图片（部分清除后）
     */
    updateGroupImage(groupId) {
        // 销毁旧图片
        if (this.blockImages.has(groupId)) {
            this.blockImages.get(groupId).destroy();
            this.blockImages.delete(groupId);
        }
    }

    /**
     * 重力后重建所有组的图片
     */
    updateAllGroupImages() {
        // 销毁所有现有图片
        for (const [, img] of this.blockImages) {
            img.destroy();
        }
        this.blockImages.clear();
        // 图片会在下一次 drawLandedBlocks() 时重新创建
    }
}
