/**
 * 下落消消乐 — 游戏入口
 * Phaser 3 配置与启动
 */
const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 960,
    parent: 'game-container',
    transparent: true,
    scene: [MenuScene, RulesScene, GameScene, GameOverScene],
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
