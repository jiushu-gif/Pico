/**
 * 开始界面场景
 * 包含游戏标题、开始按钮和玩法介绍按钮
 * 深色舞台Live风格
 */
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        this.load.audio('bgmMenu', 'assets/audio/bgm/Loop bgm.mp3');
    }

    create() {
        const { width, height } = this.cameras.main;

        // 程序化深色舞台背景
        this.drawSimpleStageBg(width, height);

        // 背景装饰（深色叠加）
        this._bgOverlay = this.add.graphics();
        this._bgOverlay.fillStyle(0x1a1a40, 0.1);
        this._bgOverlay.fillRect(0, 0, width, height);

        // 装饰性网格线（更暗更淡）
        this._bgOverlay.lineStyle(1, 0x2a2a50, 0.10);
        for (let x = 0; x < width; x += 45) {
            this._bgOverlay.moveTo(x, 0);
            this._bgOverlay.lineTo(x, height);
        }
        for (let y = 0; y < height; y += 45) {
            this._bgOverlay.moveTo(0, y);
            this._bgOverlay.lineTo(width, y);
        }
        this._bgOverlay.strokePath();

        // 游戏标题
        this.titleText = this.add.text(width / 2, 180, window.I18N.t('menu.title'), {
            fontSize: '56px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#FF69B4',
            fontStyle: 'bold',
            stroke: '#331144',
            strokeThickness: 4,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000',
                blur: 8,
                fill: true
            }
        }).setOrigin(0.5);

        // 入场动画：标题从上方滑入
        this.titleText.alpha = 0;
        this.titleText.y = 60;
        this.tweens.add({
            targets: this.titleText,
            y: 180,
            alpha: 1,
            duration: 800,
            ease: 'Back.easeOut'
        });

        // 开始游戏按钮
        const startResult = this.createButton(width / 2, 430, window.I18N.t('menu.start'), '#FF69B4', () => {
            if (this._menuBGM) this._menuBGM.pause();
            this.scene.start('GameScene');
        });
        this.startBtnText = startResult.btnText;

        // 玩法介绍按钮
        const rulesResult = this.createButton(width / 2, 510, window.I18N.t('menu.rules'), '#2a2040', () => {
            this.scene.sleep('MenuScene');
            this.scene.launch('RulesScene');
        });
        this.rulesBtnText = rulesResult.btnText;

        // ==================== 语言切换按钮 ====================
        const langLabel = this.add.text(width / 2, 562, window.I18N.t('lang.label'), {
            fontSize: '13px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#8888AA',
        }).setOrigin(0.5);
        this._langLabel = langLabel;

        const langBtnSize = 36;
        const langBtnY = 578;
        const langData = [
            { lang: 'zh', label: '中' },
            { lang: 'ja', label: '日' },
            { lang: 'en', label: 'EN' },
        ];
        const totalLangW = langData.length * langBtnSize + (langData.length - 1) * 8;
        const langStartX = width / 2 - totalLangW / 2;

        this._langBtnElements = [];
        for (let i = 0; i < langData.length; i++) {
            const btn = langData[i];
            const bx = langStartX + i * (langBtnSize + 8);
            const by = langBtnY;

            const gfx = this.add.graphics();
            const zone = this.add.zone(bx + langBtnSize / 2, by + langBtnSize / 2, langBtnSize, langBtnSize)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx + langBtnSize / 2, by + langBtnSize / 2, btn.label, {
                fontSize: '15px',
                fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            zone.on('pointerup', () => {
                window.I18N.setLang(btn.lang);
                this.refreshLanguage();
                this.redrawLangButtons();
            });

            this._langBtnElements.push({ gfx, txt, zone, lang: btn.lang, x: bx, y: by, size: langBtnSize });
        }
        this.redrawLangButtons();

        // ==================== 音乐开关按钮 ====================
        this._musicOn = true;
        const musicBtnW = 150;
        const musicBtnH = 34;
        const musicBtnX = width / 2 - musicBtnW / 2;
        const musicBtnY = 628;

        this._musicBtnGfx = this.add.graphics();
        this._musicBtnText = this.add.text(width / 2, musicBtnY + musicBtnH / 2, window.I18N.t('music.on'), {
            fontSize: '16px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#90EE90',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const musicZone = this.add.zone(width / 2, musicBtnY + musicBtnH / 2, musicBtnW, musicBtnH)
            .setInteractive({ useHandCursor: true });
        musicZone.on('pointerup', () => {
            if (!this._menuBGM) return;
            if (this._musicOn) {
                this._menuBGM.pause();
                this._musicOn = false;
                this._musicBtnText.setText(window.I18N.t('music.off'));
                this._musicBtnText.setColor('#ff6666');
            } else {
                this._menuBGM.resume();
                this._musicOn = true;
                this._musicBtnText.setText(window.I18N.t('music.on'));
                this._musicBtnText.setColor('#90EE90');
            }
            this.drawMusicBtn(musicBtnX, musicBtnY, musicBtnW, musicBtnH);
        });

        this.drawMusicBtn(musicBtnX, musicBtnY, musicBtnW, musicBtnH);

        // 底部版本信息
        this.versionText = this.add.text(width / 2, height - 30, window.I18N.t('menu.version'), {
            fontSize: '12px',
            color: '#444466',
        }).setOrigin(0.5);

        // 播放菜单背景音乐（循环），兼容浏览器自动播放策略
        this._menuBGM = this.sound.add('bgmMenu', { loop: true, volume: 0.5 });
        this._menuBGM.play();
        // 如果 AudioContext 被浏览器锁定，首次交互后再试
        if (this.sound.context && this.sound.context.state === 'suspended') {
            this.input.once('pointerdown', () => {
                if (this._menuBGM && !this._menuBGM.isPlaying) {
                    this._menuBGM.play();
                }
            });
        }

        // wake 事件：从 RulesScene 返回时刷新语言
        this.events.on('wake', () => {
            this.refreshLanguage();
            this.redrawLangButtons();
        });
    }

    /**
     * 简化版深色舞台背景
     */
    drawSimpleStageBg(w, h) {
        const gfx = this.add.graphics();
        // 自上而下深色渐变
        gfx.fillStyle(0x282850, 1);
        gfx.fillRect(0, 0, w, h);
        // 底部舞台地面
        gfx.fillStyle(0x1c1c40, 1);
        gfx.fillRect(0, h * 0.75, w, h * 0.25);
        // 舞台地面线
        gfx.fillStyle(0x3a3a60, 0.5);
        gfx.fillRect(0, h * 0.75, w, 1.5);
        // 聚光灯光束
        gfx.fillStyle(0x664477, 0.06);
        gfx.beginPath();
        gfx.moveTo(w * 0.2, 0);
        gfx.lineTo(w * 0.4, 0);
        gfx.lineTo(w * 0.55, h * 0.8);
        gfx.lineTo(w * 0.45, h * 0.8);
        gfx.closePath();
        gfx.fillPath();
        gfx.fillStyle(0x446688, 0.04);
        gfx.beginPath();
        gfx.moveTo(w * 0.6, 0);
        gfx.lineTo(w * 0.8, 0);
        gfx.lineTo(w * 0.55, h * 0.8);
        gfx.lineTo(w * 0.45, h * 0.8);
        gfx.closePath();
        gfx.fillPath();
    }

    /**
     * 创建一个交互式按钮
     */
    createButton(x, y, label, bgColor, callback) {
        const btnWidth = 240;
        const btnHeight = 60;
        const btn = this.add.graphics();

        const drawBtn = (color, alpha) => {
            btn.clear();
            btn.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, alpha);
            btn.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 14);
            btn.lineStyle(2, 0xffffff, 0.4);
            btn.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 14);
        };

        drawBtn(bgColor, 1);

        const btnText = this.add.text(x, y, label, {
            fontSize: '26px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const hitZone = this.add.zone(x, y, btnWidth, btnHeight).setInteractive({ useHandCursor: true });

        hitZone.on('pointerover', () => {
            drawBtn(bgColor, 0.8);
            btnText.setScale(1.05);
        });

        hitZone.on('pointerout', () => {
            drawBtn(bgColor, 1);
            btnText.setScale(1);
        });

        hitZone.on('pointerdown', () => {
            drawBtn('#ffffff', 0.3);
            btnText.setScale(0.95);
        });

        hitZone.on('pointerup', () => {
            callback();
        });

        return { btn, btnText, hitZone };
    }

    /**
     * 刷新所有文本为当前语言
     */
    refreshLanguage() {
        if (this.titleText && this.titleText.active) {
            this.titleText.setText(window.I18N.t('menu.title'));
        }
        if (this.startBtnText && this.startBtnText.active) {
            this.startBtnText.setText(window.I18N.t('menu.start'));
        }
        if (this.rulesBtnText && this.rulesBtnText.active) {
            this.rulesBtnText.setText(window.I18N.t('menu.rules'));
        }
        if (this.versionText && this.versionText.active) {
            this.versionText.setText(window.I18N.t('menu.version'));
        }
        if (this._langLabel && this._langLabel.active) {
            this._langLabel.setText(window.I18N.t('lang.label'));
        }
        if (this._musicBtnText && this._musicBtnText.active) {
            this._musicBtnText.setText(window.I18N.t(this._musicOn ? 'music.on' : 'music.off'));
        }
    }

    /**
     * 重绘语言按钮高亮状态
     */
    redrawLangButtons() {
        if (!this._langBtnElements) return;
        const currentLang = window.I18N.lang;
        for (const el of this._langBtnElements) {
            const isActive = el.lang === currentLang;
            el.gfx.clear();
            el.gfx.fillStyle(isActive ? 0xFF69B4 : 0x333355, isActive ? 1 : 0.6);
            el.gfx.fillRoundedRect(el.x, el.y, el.size, el.size, 6);
            el.gfx.lineStyle(1, 0xffffff, 0.3);
            el.gfx.strokeRoundedRect(el.x, el.y, el.size, el.size, 6);
        }
    }

    /**
     * 绘制音乐开关按钮背景
     */
    drawMusicBtn(x, y, w, h) {
        this._musicBtnGfx.clear();
        const bgColor = this._musicOn ? 0x224422 : 0x442222;
        const borderColor = this._musicOn ? 0x44ff44 : 0xff4444;
        this._musicBtnGfx.fillStyle(bgColor, 0.8);
        this._musicBtnGfx.fillRoundedRect(x, y, w, h, 8);
        this._musicBtnGfx.lineStyle(1, borderColor, 0.6);
        this._musicBtnGfx.strokeRoundedRect(x, y, w, h, 8);
    }
}
