/**
 * 游戏结束场景
 * 显示最终分数，提供重新开始和返回主菜单选项
 * 深色舞台Live风格
 */
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    preload() {
        // 不再加载gameBg，使用程序化深色背景
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.highScore = data.highScore || 0;
        this.maxCombo = data.maxCombo || 0;
        this.isNewRecord = data.isNewRecord || false;
    }

    create() {
        const { width, height } = this.cameras.main;

        // 程序化深色舞台背景
        this.drawSimpleStageBg(width, height);

        // 背景（深色叠加）
        const bgGraphics = this.add.graphics();
        bgGraphics.fillStyle(0x1a1a40, 0.12);
        bgGraphics.fillRect(0, 0, width, height);
        bgGraphics.fillStyle(0x0a0a10, 0.1);
        bgGraphics.fillRect(0, 0, width, height);

        // 游戏结束标题
        const title = this.add.text(width / 2, 180, window.I18N.t('over.title'), {
            fontSize: '52px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#ff6666',
            fontStyle: 'bold',
            stroke: '#330000',
            strokeThickness: 4,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000',
                blur: 10,
                fill: true
            }
        }).setOrigin(0.5);

        // 入场动画
        title.alpha = 0;
        title.setScale(0.5);
        this.tweens.add({
            targets: title,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 600,
            ease: 'Back.easeOut'
        });

        // 分数标签
        this.add.text(width / 2, 280, window.I18N.t('over.finalScore'), {
            fontSize: '22px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#8888AA',
        }).setOrigin(0.5);

        const scoreText = this.add.text(width / 2, 340, String(this.finalScore), {
            fontSize: '60px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#FFD700',
            fontStyle: 'bold',
            stroke: '#886600',
            strokeThickness: 3,
        }).setOrigin(0.5);

        // 分数计数动画
        const counter = { val: 0 };
        scoreText.setText('0');
        this.tweens.add({
            targets: counter,
            val: this.finalScore,
            duration: 1200,
            ease: 'Cubic.easeOut',
            delay: 400,
            onUpdate: () => {
                scoreText.setText(String(Math.floor(counter.val)));
            }
        });

        // 评价文字
        let rankText = '';
        let rankColor = '#ffffff';
        if (this.finalScore >= 100) {
            rankText = window.I18N.t('over.excellent');
            rankColor = '#FFD700';
        } else if (this.finalScore >= 50) {
            rankText = window.I18N.t('over.good');
            rankColor = '#90EE90';
        } else if (this.finalScore >= 20) {
            rankText = window.I18N.t('over.ok');
            rankColor = '#87CEEB';
        } else {
            rankText = window.I18N.t('over.tryHarder');
            rankColor = '#c0c0e0';
        }

        const rankLabel = this.add.text(width / 2, 410, rankText, {
            fontSize: '26px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: rankColor,
            fontStyle: 'bold',
        }).setOrigin(0.5);
        rankLabel.alpha = 0;
        this.tweens.add({
            targets: rankLabel,
            alpha: 1,
            duration: 500,
            delay: 1200,
        });

        // 新纪录标识（带呼吸动画）
        if (this.isNewRecord) {
            const newRec = this.add.text(width / 2, 460, window.I18N.t('over.newRecord'), {
                fontSize: '28px',
                fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
                color: '#FFD700',
                fontStyle: 'bold',
                stroke: '#886600',
                strokeThickness: 3,
            }).setOrigin(0.5);
            newRec.alpha = 0;
            this.tweens.add({
                targets: newRec,
                alpha: { from: 1, to: 0.5 },
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: 1400,
            });
        }

        // 最高分
        this.add.text(width / 2, 500, `${window.I18N.t('over.highScore')}: ${this.highScore}`, {
            fontSize: '18px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#c0c0e0',
        }).setOrigin(0.5);

        // 最大连击
        const comboTint = this.maxCombo > 0 ? '#90EE90' : '#666688';
        this.add.text(width / 2, 530, `${window.I18N.t('over.maxCombo')}: ${this.maxCombo}`, {
            fontSize: '18px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: comboTint,
        }).setOrigin(0.5);

        // 重新开始按钮
        this.createButton(width / 2, 590, window.I18N.t('over.restart'), '#FF69B4', () => {
            this.scene.start('GameScene');
        });

        // 返回主菜单按钮
        this.createButton(width / 2, 665, window.I18N.t('over.back'), '#2a2040', () => {
            this.scene.start('MenuScene');
        });

        // 按钮延迟出现
        const totalChildren = this.children.list.length;
        for (let i = totalChildren - 6; i < totalChildren; i++) {
            this.children.list[i].alpha = 0;
        }
        this.tweens.add({
            targets: this.children.list.slice(totalChildren - 6),
            alpha: 1,
            duration: 400,
            delay: 1600,
        });

        // Esc 返回主菜单
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('MenuScene');
        });
    }

    drawSimpleStageBg(w, h) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0x282850, 1);
        gfx.fillRect(0, 0, w, h);
        gfx.fillStyle(0x1c1c40, 1);
        gfx.fillRect(0, h * 0.75, w, h * 0.25);
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

    createButton(x, y, label, bgColor, callback) {
        const btnWidth = 240;
        const btnHeight = 55;
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
            fontSize: '24px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const hitZone = this.add.zone(x, y, btnWidth, btnHeight).setInteractive({ useHandCursor: true });

        hitZone.on('pointerover', () => { drawBtn(bgColor, 0.8); btnText.setScale(1.05); });
        hitZone.on('pointerout', () => { drawBtn(bgColor, 1); btnText.setScale(1); });
        hitZone.on('pointerdown', () => { drawBtn('#ffffff', 0.3); btnText.setScale(0.95); });
        hitZone.on('pointerup', () => { callback(); });
    }
}
