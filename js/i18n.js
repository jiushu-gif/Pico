/**
 * 邦邦消消乐 — 国际化模块
 * 支持：中文 (zh)、日本語 (ja)、English (en)
 *
 * 用法：
 *   window.I18N.t('key')        — 获取当前语言文本
 *   window.I18N.setLang('ja')   — 切换语言
 */
window.I18N = (function() {
    const strings = {
        zh: {
            // ---- 文档 ----
            'doc.title': '邦邦消消乐',

            // ---- 菜单 ----
            'menu.title': '邦邦消消乐',
            'menu.start': '开始游戏',
            'menu.rules': '玩法介绍',
            'menu.version': 'v1.0 | Made with Phaser 3',

            // ---- 语言/音乐 ----
            'lang.label': '语言',
            'music.on': '♪ BGM: ON',
            'music.off': '♪ BGM: OFF',

            // ---- 玩法介绍 ----
            'rules.title': '玩法介绍',
            'rules.goal': '🎯 游戏目标 ：连接 5 个或以上同乐队角色即可消除得分！',
            'rules.control': '🎮 操作方法',
            'rules.move': '← → 或 A D — 左右移动方块',
            'rules.drop': '↓ 或 S — 加速方块下落',
            'rules.rotate': 'R — 旋转方块（垂直 ⇄ 水平）',
            'rules.esc': 'Esc — 提前结束游戏',
            'rules.block': '📐 角色方块说明 : 方块为 1×2 大小，共有5个乐队',
            'rules.block.desc1': '每个乐队有五个角色，共 25 个角色',
            'rules.block.desc2': '随机顺序出现，循环使用',
            'rules.scoring': '⭐ 计分规则 ：每消除同一乐队的人物加 10 分',
            'rules.end': '💀 游戏结束 ：当新角色出现时超出框架顶部，游戏结束',
            'rules.end.desc1': '      初次进入游戏时,需要等待加载几秒钟',
            'rules.end.desc2': '',
            'rules.back': '返回主菜单',

            // ---- 游戏界面 ----
            'game.logo1': 'パズル',
            'game.logo2': 'ピコ',
            'game.logoSub': 'Puzzle pico',
            'game.next': 'NEXT!',
            'game.score': 'SCORE',
            'game.scoreLabel': 'Score',
            'game.maxScore': 'Max Score',
            'game.max': 'MAX',
            'game.combo': 'COMBO',
            'game.exit.title': '确认退出？',
            'game.exit.confirm': '确认退出',
            'game.exit.continue': '继续游戏',

            // ---- 游戏结束 ----
            'over.title': '游戏结束',
            'over.finalScore': '最终得分',
            'over.highScore': '最高分',
            'over.maxCombo': '最大连击',
            'over.newRecord': '★ 新纪录! ★',
            'over.excellent': '🏆 太厉害了！',
            'over.good': '👍 做得不错！',
            'over.ok': '💪 继续加油！',
            'over.tryHarder': '🌱 再接再厉！',
            'over.restart': '重新开始',
            'over.back': '返回主菜单',
        },

        ja: {
            'doc.title': 'バンドリ！パズルピコ',
            'menu.title': 'バンドリ！パズルピコ',
            'menu.start': 'ゲームスタート',
            'menu.rules': '遊び方',
            'menu.version': 'v1.0 | Made with Phaser 3',
            'lang.label': '言語',
            'music.on': '♪ BGM: ON',
            'music.off': '♪ BGM: OFF',
            'rules.title': '遊び方',
            'rules.goal': '🎯 目標：同じバンドのキャラを5つ以上つなげて消そう！',
            'rules.control': '🎮 操作説明',
            'rules.move': '← → または A D — ブロックを左右に移動',
            'rules.drop': '↓ または S — 落下速度アップ',
            'rules.rotate': 'R — ブロックを回転（縦 ⇄ 横）',
            'rules.esc': 'Esc — ゲーム終了',
            'rules.block': '📐 ブロック説明：1×2サイズ、全5バンド',
            'rules.block.desc1': '各バンド5キャラ、合計25キャラ',
            'rules.block.desc2': 'ランダム順で出現、繰り返し',
            'rules.scoring': '⭐ スコア：同じバンドのキャラを消すごとに+10点',
            'rules.end': '💀 ゲームオーバー：新しいブロックが枠外に出ると終了',
            'rules.end.desc1': 'ゲームに初めて入るときは、数秒間ロードを待つ必要がある',
            'rules.end.desc2': '',
            'rules.back': 'メニューに戻る',
            'game.logo1': 'パズル',
            'game.logo2': 'ピコ',
            'game.logoSub': 'Puzzle pico',
            'game.next': 'NEXT!',
            'game.score': 'SCORE',
            'game.scoreLabel': 'Score',
            'game.maxScore': 'Max Score',
            'game.max': 'MAX',
            'game.combo': 'COMBO',
            'game.exit.title': '終了しますか？',
            'game.exit.confirm': '終了',
            'game.exit.continue': '続ける',
            'over.title': 'ゲームオーバー',
            'over.finalScore': '最終スコア',
            'over.highScore': 'ハイスコア',
            'over.maxCombo': '最大コンボ',
            'over.newRecord': '★ 新記録! ★',
            'over.excellent': '🏆 素晴らしい！',
            'over.good': '👍 よくできました！',
            'over.ok': '💪 がんばろう！',
            'over.tryHarder': '🌱 もう一度！',
            'over.restart': 'もう一度',
            'over.back': 'メニューに戻る',
        },

        en: {
            'doc.title': 'Bang Dream! Puzzle Pico',
            'menu.title': 'Bang Dream! Puzzle Pico',
            'menu.start': 'Start Game',
            'menu.rules': 'How to Play',
            'menu.version': 'v1.0 | Made with Phaser 3',
            'lang.label': 'Language',
            'music.on': '♪ BGM: ON',
            'music.off': '♪ BGM: OFF',
            'rules.title': 'How to Play',
            'rules.goal': '🎯 Goal: Connect 5+ same-band characters to clear them!',
            'rules.control': '🎮 Controls',
            'rules.move': '← → or A D — Move block left/right',
            'rules.drop': '↓ or S — Fast drop',
            'rules.rotate': 'R — Rotate block (vertical ⇄ horizontal)',
            'rules.esc': 'Esc — End game early',
            'rules.block': '📐 Blocks: 1×2 size, 5 bands total',
            'rules.block.desc1': '5 characters per band, 25 characters total',
            'rules.block.desc2': 'Random order, cycles through all',
            'rules.scoring': '⭐ Scoring: +10 points per group cleared',
            'rules.end': '💀 Game Over: New block spawns outside the grid',
            'rules.end.desc1': 'The first time you enter the game, you will need to wait a few seconds for',
            'rules.end.desc2': 'it to load.',
            'rules.back': 'Back to Menu',
            'game.logo1': 'Puzzle',
            'game.logo2': 'Pico',
            'game.logoSub': 'Puzzle pico',
            'game.next': 'NEXT!',
            'game.score': 'SCORE',
            'game.scoreLabel': 'Score',
            'game.maxScore': 'Max Score',
            'game.max': 'MAX',
            'game.combo': 'COMBO',
            'game.exit.title': 'Quit Game?',
            'game.exit.confirm': 'Quit',
            'game.exit.continue': 'Continue',
            'over.title': 'Game Over',
            'over.finalScore': 'Final Score',
            'over.highScore': 'High Score',
            'over.maxCombo': 'Max Combo',
            'over.newRecord': '★ New Record! ★',
            'over.excellent': '🏆 Excellent!',
            'over.good': '👍 Good Job!',
            'over.ok': '💪 Keep Trying!',
            'over.tryHarder': '🌱 Try Again!',
            'over.restart': 'Play Again',
            'over.back': 'Back to Menu',
        }
    };

    // 从 localStorage 恢复语言偏好
    let currentLang = 'zh';
    try {
        const stored = localStorage.getItem('gameLanguage');
        if (stored && strings[stored]) currentLang = stored;
    } catch (e) { /* ignore */ }

    return {
        get lang() { return currentLang; },

        setLang: function(lang) {
            if (strings[lang]) {
                currentLang = lang;
                try { localStorage.setItem('gameLanguage', lang); } catch (e) {}
                document.title = strings[lang]['doc.title'] || '邦邦消消乐';
            }
        },

        t: function(key) {
            const s = strings[currentLang];
            return (s && s[key] !== undefined) ? s[key] : key;
        }
    };
})();

// 初始设置文档标题
document.title = window.I18N.t('doc.title');
