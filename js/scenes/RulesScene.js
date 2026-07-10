/**
 * 玩法介绍场景
 * 显示游戏操作说明和规则
 * 深色舞台Live风格
 */
class RulesScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RulesScene' });
    }

    preload() {
        // 不再加载gameBg，使用程序化深色背景
    }

    create() {
        const { width, height } = this.cameras.main;

        // 程序化深色舞台背景
        this.drawSimpleStageBg(width, height);

        // 背景（深色叠加）
        const bgGraphics = this.add.graphics();
        bgGraphics.fillStyle(0x1a1a40, 0.12);
        bgGraphics.fillRect(0, 0, width, height);

        // 标题
        this.add.text(width / 2, 50, window.I18N.t('rules.title'), {
            fontSize: '38px',
            fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
            color: '#FF69B4',
            fontStyle: 'bold',
            stroke: '#331144',
            strokeThickness: 3,
        }).setOrigin(0.5);

        // 分隔线
        const lineGraphics = this.add.graphics();
        lineGraphics.lineStyle(2, 0xFF69B4, 0.5);
        lineGraphics.moveTo(60, 90);
        lineGraphics.lineTo(width - 60, 90);
        lineGraphics.strokePath();

        // 规则内容
        const rules = [
            { key: 'rules.goal', title: true },
            { space: true },
            { key: 'rules.control', title: true },
            { key: 'rules.move', desc: true },
            { key: 'rules.drop', desc: true },
            { key: 'rules.rotate', desc: true },
            { key: 'rules.esc', desc: true },
            { space: true },
            { key: 'rules.block', title: true },
            { key: 'rules.block.desc1', desc: true },
            { key: 'rules.block.desc2', desc: true },
            { space: true },
            { key: 'rules.scoring', title: true },
            { key: 'rules.end', title: true },
            { key: 'rules.end.desc1', title: true },
            { key: 'rules.end.desc2', title: true },
        ];

        let y = 115;
        const lineHeight = 34;

        for (const item of rules) {
            if (item.space) {
                y += 12;
                continue;
            }
            const text = window.I18N.t(item.key);
            if (item.title) {
                this.add.text(60, y, text, {
                    fontSize: '18px',
                    fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
                    color: '#FFD700',
                    fontStyle: 'bold',
                });
            } else if (item.desc) {
                this.add.text(80, y, text, {
                    fontSize: '16px',
                    fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
                    color: '#c0c0e0',
                });
            }
            y += lineHeight;
        }

        // // 颜色示例
        // y += 10;
        // this.add.text(60, y, '🎨 方块颜色', {
        //     fontSize: '18px',
        //     fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        //     color: '#FFD700',
        //     fontStyle: 'bold',
        // });

        // const colorNames = ['粉', '红', '淡绿', '紫罗兰', '黄'];
        // const colorValues = [0xFF69B4, 0xFF4444, 0x90EE90, 0xBA55D3, 0xFFD700];
        // const colorY = y + 40;
        // const colorSpacing = 80;

        // const colorGraphics = this.add.graphics();
        // for (let i = 0; i < colorNames.length; i++) {
        //     const cx = 80 + i * colorSpacing;
        //     colorGraphics.fillStyle(colorValues[i], 0.9);
        //     colorGraphics.fillRoundedRect(cx, colorY, 44, 44, 8);
        //     colorGraphics.lineStyle(1, 0xffffff, 0.4);
        //     colorGraphics.strokeRoundedRect(cx, colorY, 44, 44, 8);

        //     this.add.text(cx + 22, colorY + 56, colorNames[i], {
        //         fontSize: '14px',
        //         fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        //         color: '#c0c0e0',
        //     }).setOrigin(0.5, 0);
        // }

        // 返回按钮
        this.createButton(width / 2, height - 70, window.I18N.t('rules.back'), '#FF69B4', () => {
            this.scene.wake('MenuScene');
            this.scene.stop('RulesScene');
        });

        // 按 Esc 也可返回
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.wake('MenuScene');
            this.scene.stop('RulesScene');
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
