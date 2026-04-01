### 键盘（PC）
- **方向键**：八向移动
- **ESC**：暂停 / 退出

> 当前版本以“自动攻击”为核心，玩家主要专注于走位、生存和升级选择。

### 触屏（移动端）
- 左侧虚拟摇杆移动
- 武器自动攻击
- 适合手机浏览器直接体验

---

## 快速开始

### 方式 1：直接本地运行
克隆仓库后，直接用浏览器打开 `index.html`：

```bash
git clone https://github.com/Hygubline/game-HIT-HOG.git
cd game-HIT-HOG

然后直接打开：

index.html
方式 2：使用本地静态服务器（更推荐）

某些浏览器环境下，图片、音频或联网功能在本地直接打开时可能受限制，建议使用任意静态服务器运行，例如：

python -m http.server 8000

然后访问：

http://localhost:8000
方式 3：部署到静态托管平台

可直接部署到：

GitHub Pages
Vercel
Netlify
任意静态站点服务
技术栈
HTML5
CSS3
Vanilla JavaScript
Canvas 2D API

项目同时包含本地存档 / 局外进度相关模块，以及在线排行榜相关集成。

项目结构
game-HIT-HOG/
├── index.html
├── collision-map.html
├── README.md
├── CHANGELOG.md
├── DEVLOG.md
├── images/
└── js/
    ├── audio.js
    ├── config.js
    ├── enemy-manager.js
    ├── game.js
    ├── hero-system.js
    ├── map.js
    ├── player.js
    ├── relics.js
    ├── save.js
    ├── shop.js
    ├── ui.js
    ├── wave-manager.js
    ├── wave-upgrades.js
    └── weapons.js
开发说明

这个项目目前已经不是早期的单文件原型，而是正在逐步拆分为多个模块：

game.js：主流程与运行逻辑
player.js：玩家相关逻辑
enemy-manager.js：敌人生成与管理
weapons.js：武器系统
relics.js：遗物系统
wave-manager.js / wave-upgrades.js：波次模式与强化逻辑
save.js：本地存档 / 进度
shop.js：商店与永久强化
ui.js：界面展示
audio.js：音频相关

如果你准备继续迭代，推荐优先保证以下三件事：

模式说明与实际玩法一致
README、教程、游戏内文案同步
新功能优先服务于核心手感，而不是只增加系统数量
当前版本定位

当前版本更适合描述为：

一款以自动攻击、走位生存、局内升级和双模式挑战为核心的浏览器动作 Roguelite。

它不是传统“手动搓技能”的动作游戏，也不是纯塔防或纯经营项目，而是更偏向轻量化的动作生存 + build 成长体验。

后续可继续完善的方向
更清晰的角色 / 武器差异
更强的 Boss 演出与机制识别
更明显的流派成型反馈
更准确的移动端操作体验
更完整的版本说明与更新记录整理
贡献

欢迎提交 Issue 或 Pull Request。
如果你对这个项目的玩法、平衡或表现有建议，也欢迎直接提出反馈。
## 📄 许可证

MIT License
