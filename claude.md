# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## How to Run

Open `index.html` directly in a browser — no build step, no dev server required. All dependencies load from CDN.

## Architecture

This is a **falling-block 2D puzzle game** ("邦邦消消乐") built with Phaser 3.60.0. No npm, no bundler — plain JS files loaded via `<script>` tags in `index.html`.

### Scene flow

```
MenuScene → GameScene → GameOverScene → (restart loop)
              ↓ Esc
           GameOverScene
MenuScene → RulesScene → MenuScene
```

Each scene is defined as a class extending `Phaser.Scene` in `js/scenes/`, registered in `js/main.js` via the `scene` array.

### Three-column layout (GameScene)

The 720×960 canvas is divided into three vertical zones:

```
┌──────────┬─┬───────────────────────┬─┬─────────────┐
│  LEFT    │█│      GRID 9×10       │█│   RIGHT     │
│  0..72   │█│   75..569 (495px)    │█│ 573..720    │
│  Logo    │█│   CELL_SIZE=55       │█│   (147px)   │
│  Title   │█│   GRID_Y=385         │█│ Card1 NEXT! │
│          │█│                      │█│ Card2 SCORE │
└──────────┴─┴───────────────────────┴─┴─────────────┘
```

| Constant | Value | Purpose |
|----------|-------|---------|
| `LEFT_COL_W` | 72 | Logo panel width |
| `GRID_X` | 75 | Grid left edge |
| `BORDER1_X`/`BORDER2_X` | 72 / 570 | Decorative gradient strips (3px each) |
| `RIGHT_COL_X` | 573 | Right panel left edge |
| `CARD_X`/`CARD_W` | 581 / 131 | Info cards in right column |
| `CARD1_Y`/`CARD1_H` | 70 / 172 | NEXT! preview card |
| `CARD2_Y`/`CARD2_H` | 262 / 260 | SCORE card |

### Core game (GameScene.js)

- **9×10 grid**, 55px cells. Pastel macaron checkerboard: 4 colors cycling via `(row+col)%4` — light gray, lavender, hazy blue, gray-cyan — on a dark `0x1a1840` backing board
- **1×2 domino blocks** in 5 colors (pink, red, lightgreen, violet, yellow), each numbered 1–5
- **25 unique blocks** (5 colors × 5 numbers), shuffled via Fisher-Yates, cycled from a pool
- **Match rule**: connected same-color cells ≥ 10 (BFS flood-fill, orthogonal adjacency)
- **Scoring**: +10 per matched group, with chain reactions (match → clear → gravity → recheck)
- **COMBO system**: `this.combo` increments each chain step, resets when chain ends. `this.maxCombo` tracks the highest combo achieved in the game, displayed in the SCORE card
- **High score**: persisted via `localStorage.getItem/setItem('blockGameHighScore')`. Loaded on game start, updated in real-time when surpassed, displayed in the SCORE card and GameOverScene
- **Rotation**: R key rotates the active block clockwise around `cells[0]` as pivot using `(dr, dc) → (dc, -dr)` transform — allows all 4 orientations
- **Particle effects**: white particle burst on matched cells (`white_particle` texture generated via `this.make.graphics()`, emitters auto-destroy after 1s)
- **Esc exit dialog**: overlay with confirm/cancel buttons, managed via `exitDialogActive` flag and `exitDialogElements[]` array; all input handlers check `exitDialogActive` before responding

### Directional block images

ALL 25 blocks (5 colors × 5 numbers) have 4 directional images each (上/下/左/右 = 100 total images). Loaded from `assets/{DisplayName}{Number}/` folders via nested loop in `preload()`.

Key methods:
- `getBlockDisplayName(color)` — maps code keys (`pink`, `lightgreen`) to display names (`Pink`, `Light green`)
- `getBlockDirection(cells)` — returns '上'/'下'/'左'/'右' based on cells[1] relative to cells[0]
- `getBlockImageKey(color, number, cells)` — constructs texture key `"${DisplayName}${Number}${Direction}"`

Direction is stored as `cell.direction` on every grid cell at landing time. Since images are pre-oriented, all image rendering uses `angle = 0` (no rotation needed). Number text is never created — `createGroupText()` is a no-op (cleanup only).

### Block grouping system (`blockGroupId`)

When a 1×2 block lands, both cells are assigned the same `blockGroupId` (auto-incrementing `nextGroupId`). This ID is the key invariant for:

- **Rendering**: cells with the same `blockGroupId` are drawn as a single rounded rectangle covering their bounding box, with one centered directional image
- **Gravity (`applyGravity`)**: groups are collected, sorted by bottom-row descending, and a group falls only when ALL its cells can move down one row — this prevents cells from separating after landing
- **Image management**: one `Phaser.Image` per group in `blockImages` Map. Rebuilt after gravity or partial clearing via `updateGroupImage()`/`updateAllGroupImages()`. `groupTexts` Map still exists but `createGroupText()` is a no-op since all blocks use images

### DAS (Delayed Auto Shift)

Keyboard movement uses DAS: first move is instant on keydown, then 170ms initial delay, then 50ms repeat rate. Managed by `startMoveDir()`, `updateDAS(delta)`, and keyup handlers.

### Key constants

| Constant | Value | Location |
|----------|-------|----------|
| Canvas size | 720×960 | `js/main.js` |
| Cell size | 55px | `GameScene.js` |
| Grid origin | (75, 385) | `GameScene.js` |
| Grid dimensions | 9×10 (495×550px) | `GameScene.js` |
| Match minimum | 10 | `GameScene.js` (`MATCH_MIN`) |
| Score per match | 10 | `GameScene.js` (`SCORE_PER_MATCH`) |
| Normal fall speed | 1000ms | `GameScene.js` |
| Fast fall speed | 60ms | `GameScene.js` |
| localStorage key | `'blockGameHighScore'` | `GameScene.js` |

### Rendering layers

| Graphics object | Purpose | Depth |
|----------------|---------|-------|
| `gameBg` image | `Game_background.png` full-canvas backdrop | 0 |
| `gridGfx` | Pastel checkerboard + dark backing board | default |
| `leftPanelGfx` | Logo decorations (colored squares) | default |
| `borderGfx` | Pink→purple gradient vertical strips | default |
| `rightPanelGfx` | White card backgrounds, separators | default |
| `blockGfx` | Landed blocks (cleared and redrawn on each change) | default |
| `activeGfx` | Currently falling block (redrawn each frame) | default |
| `previewGfx` | Preview fallback (colored rect when image missing) | default |
| `blockImages` Map | Directional sprite images on landed blocks (groupId → Image) | 3 |
| `activeBlockImage` | Directional sprite on active block (single ref) | 3 |
| `previewImage` | Directional sprite in NEXT! card (single ref) | 5 |
| Panel text | NEXT!, SCORE, HIGH SCORE, MAX COMBO, hints | 5 |
| `activeTexts[]` | Number text on active block (fallback only) | 10 |
| Particle emitters | Match burst effects | 20 |
| Exit dialog elements | Overlay, background, buttons, text, zones | 100–104 |

### Scene patterns

Every scene follows the same patterns:
- `preload()` loads `Game_background.png` as `'gameBg'`
- `create()` sets up backgrounds via `this.add.graphics()`, text via `this.add.text()`, and input via `this.input.keyboard`
- Buttons use a common `createButton(x, y, label, bgColor, callback)` method found in MenuScene, RulesScene, and GameOverScene (duplicated — not shared)
- All scenes use `this.cameras.main.width/height` for layout calculations

### Assets

Block images are organized in `assets/{DisplayName}{Number}/` folders (e.g. `assets/Pink1/Pink1下.png`, `assets/Light green3/Light green3右.png`). Naming: `{DisplayName}{Number}{Direction}.png`. All 100 images (5 colors × 5 numbers × 4 directions) are loaded via nested loop in `GameScene.preload()`. To add new block images, create the folder with 4 directional PNGs following the naming convention — they'll be picked up automatically since the preload loop covers all combinations.

Background images: `assets/Background.png` (CSS body background), `assets/Game_background.png` (in-canvas scene background, loaded as `'gameBg'`).

All other visuals (grid, blocks, particles, cards, borders) are drawn programmatically via the Phaser Graphics API. No audio files. `css/style.css` provides the dark centered page layout with `Background.png` and semi-transparent canvas (`opacity: 0.97`).
