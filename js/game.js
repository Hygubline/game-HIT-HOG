// 玩家
let player = { x: 1350, y: 750, vx: 0, vy: 0, facingRight: true, kicking: false, kickTimer: 0, slashing: false, slashTimer: 0, item: null, scale: 1, isDead: false,  invincible: false, invincibleTimer: 0, currentState: 'idle', visible: true, blocking: false, blockTimer: 0 };

// 数组
let slashEffects = [], enemies = [], particles = [], floatingTexts = [], items = [], meteors = [], lightnings = [], projectiles = [];
let enemySpawnInterval, itemSpawnInterval, eventInterval, danmakuInterval, timeInterval;

// 文本
const emojis = ['💀', '😱', '🤡', '👊', '💥', '⭐', '🔥', '😭', '🤣', '💨', '🐕', '⚡'];
const hitTexts = ['爽!', '666', '秀!', '起飞!', '芜湖~', 'yyds', '典!'];
const danmakuTexts = ['典', '6', '笑死', '离谱', '草', '太强了', '神', '汪汪汪'];
const absurdNames = ['xswl战神', '典孝急乐', '原神玩家', '喜羊羊', '光头强', '派大星', '灰太狼'];
const flyingQuotes = ['救命！', '芭比Q！', '寄！', '退钱！'];
const tauntQuotes = ['来打我！', '就这？', '你急了？', '汪汪！'];
const bossNames = ['狗中之王', '八重宿敌', '峡谷霸主'];
const bossQuotes = ['真正的高手来了！', '宿敌登场！', '狗王现身！'];

// B4: 敌人血量调整 - 提高基础血量增加挑战
const enemyTypes = [
    { name: '幽灵', color: '#88ccff', hp: 3, speed: 1.3, size: 45, points: 100, role: 'normal', img: 'ghostEnemy', imgScale: 0.12 },
    { name: '游魂', color: '#aaddff', hp: 5, speed: 1.5, size: 50, points: 200, role: 'normal', img: 'ghostEnemy', imgScale: 0.14 },
    { name: '怨灵', color: '#66bbff', hp: 7, speed: 1.8, size: 55, points: 300, role: 'normal', img: 'ghostEnemy', imgScale: 0.16 }
];
// B4: 特殊敌人血量调整
const specialEnemyTypes = [
    { name: '鬼火', color: '#ff6644', hp: 4, speed: 0.6, size: 45, points: 250, role: 'charger', chargeSpeed: 13, chargeDelay: 35, img: 'fireEnemy', imgScale: 0.12, spawnWeight: 3 },
    { name: '邪眼', color: '#aa44ff', hp: 5, speed: 0.8, size: 50, points: 300, role: 'shooter', shootCD: 80, keepDistance: 200, img: 'eyeEnemy', imgScale: 0.13, spawnWeight: 2 },
    { name: '黑雾', color: '#333366', hp: 10, speed: 0.5, size: 65, points: 400, role: 'tank', damageReduction: 0.4, img: 'fogEnemy', imgScale: 0.15, spawnWeight: 0.5 },
    { name: '幽焰', color: '#ffaa00', hp: 2, speed: 2.8, size: 38, points: 200, role: 'bomber', explodeTimer: 40, explodeRadius: 120, img: 'fireEnemy', imgScale: 0.10, spawnWeight: 2 }
];
const itemTypes = [
    { name: '西瓜', emoji: '🍉', effect: 'melee', damage: 3, color: '#22c55e' },
    { name: '臭豆腐', emoji: '💩', effect: 'bomb', radius: 150, color: '#854d0e' },
    { name: '喇叭', emoji: '📢', effect: 'pushAll', force: 20, color: '#f97316' }
];
// Danger Spike system - clear, readable danger phases
const dangerSpikes = [
    { name: '🔴 冲锋狂潮!', type: 'charger_rush', duration: 10, desc: '大量冲锋怪来袭' },
    { name: '🟣 嘴炮阵地!', type: 'shooter_surge', duration: 8, desc: '远程集火警告' },
    { name: '🟡 自爆预警!', type: 'bomber_wave', duration: 6, desc: '爆炸物接近中' },
    { name: '🟤 重甲推进!', type: 'tank_push', duration: 12, desc: '坦克大军压境' },
    { name: '💀 混编猎杀!', type: 'mixed_hunt', duration: 15, desc: '精锐混编小队' },
    { name: '⚫ 精英围剿!', type: 'elite_siege', duration: 10, desc: '全员精英化' },
    { name: '🦴 黄金狗潮!', type: 'golden_hunt', duration: 12, desc: '高赏金混战，骨头币掉得满地都是' }
];
let dangerSpikeActive = false;
let dangerSpikeTimer = 0;
let dangerSpikeType = null;
let dangerSpikeData = null;

// A5: 多杀系统
let multiKillCount = 0;
let multiKillTimer = 0;
const multiKillTexts = ['', '', 'DOUBLE KILL!', 'TRIPLE KILL!', 'QUAD KILL!', 'PENTA KILL!', 'MEGA KILL!'];

// === 肾上腺素系统 (低血量爽点) ===
let adrenalineActive = false;
let adrenalineSpeedBonus = 0;

// === 血之狂欢计数 ===
let bloodFrenzyKills = 0;
let bloodFrenzyTimer = 0;

// === 火雨计时 ===
let fireRainTimer = 0;

// === 连锁爆炸处理 ===
let chainExplosionQueue = [];

// === 无尽模式阶段系统 (氛围增强: 新手友好化) ===
const endlessPhaseConfig = [
    // 0-15秒：立即进入战斗，快速给压力
    { time: 0, name: '战斗开始', desc: '敌人来袭！', chargerWeight: 2, shooterWeight: 0.5, bomberWeight: 0, tankWeight: 0, eliteChance: 0.03, spawnRate: 1.5 },
    // 15-40秒：快速升温，引入特殊敌人
    { time: 15, name: '升温阶段', desc: '特殊敌人出现', chargerWeight: 2, shooterWeight: 1, bomberWeight: 0.3, tankWeight: 0.2, eliteChance: 0.08, spawnRate: 1.8 },
    // 40-75秒：包围趋势明显，第一次小高潮
    { time: 40, name: '狗潮涌动', desc: '包围来袭', chargerWeight: 3, shooterWeight: 2, bomberWeight: 0.8, tankWeight: 0.5, eliteChance: 0.12, spawnRate: 1.8 },
    // 75-120秒：正式压力，混编出现
    { time: 75, name: '压力测试', desc: '混编敌群', chargerWeight: 3, shooterWeight: 2, bomberWeight: 1, tankWeight: 0.5, eliteChance: 0.15, spawnRate: 2.0 },
    // 120秒后保持节奏递增
    { time: 120, name: '火力压制', desc: '远程集火', chargerWeight: 3, shooterWeight: 4, bomberWeight: 2, tankWeight: 1, eliteChance: 0.18, spawnRate: 2.2 },
    { time: 180, name: '混编危机', desc: '全类型混战', chargerWeight: 2, shooterWeight: 2, bomberWeight: 2, tankWeight: 1, eliteChance: 0.20, spawnRate: 2.0 },
    { time: 240, name: '精英入侵', desc: '精英频繁', chargerWeight: 3, shooterWeight: 3, bomberWeight: 2, tankWeight: 2, eliteChance: 0.28, spawnRate: 2.2 },
    { time: 300, name: '地狱难度', desc: '全面强化', chargerWeight: 4, shooterWeight: 4, bomberWeight: 3, tankWeight: 3, eliteChance: 0.35, spawnRate: 2.5 },
    { time: 420, name: '死亡狂潮', desc: '极限挑战', chargerWeight: 5, shooterWeight: 5, bomberWeight: 4, tankWeight: 4, eliteChance: 0.45, spawnRate: 2.8 },
    { time: 540, name: '绝望深渊', desc: '无尽噩梦', chargerWeight: 6, shooterWeight: 6, bomberWeight: 5, tankWeight: 5, eliteChance: 0.55, spawnRate: 3.2 }
];
let currentEndlessPhase = 0;
let lastPhaseTime = -1;

// === 本局流派标签系统 ===
let runBuildTags = {
    damage: 0,      // 输出流
    survival: 0,    // 生存流
    utility: 0,     // 工具流
    speed: 0,       // 速度流
    vampire: 0,     // 吸血流
    aoe: 0          // 范围流
};

// === 死因详细记录 ===
let detailedDeathContext = {
    killerType: null,       // 击杀者类型
    killerName: null,       // 击杀者名字
    damageType: 'contact',  // 伤害类型: contact/projectile/explosion
    wasElite: false,        // 是否被精英击杀
    wasBoss: false,         // 是否被Boss击杀
    nearbyEnemies: 0,       // 死亡时附近敌人数
    phase: 0                // 死亡时的阶段
};

// 获取当前阶段配置
function getCurrentPhaseConfig() {
    let config = endlessPhaseConfig[0];
    for (let i = endlessPhaseConfig.length - 1; i >= 0; i--) {
        if (gameStats.survivalTime >= endlessPhaseConfig[i].time) {
            config = endlessPhaseConfig[i];
            currentEndlessPhase = i;
            break;
        }
    }
    return config;
}

// 更新无尽模式阶段
function updateEndlessPhase() {
    if (selectedMode !== 'endless') return;

    const config = getCurrentPhaseConfig();

    // 阶段切换提示
    if (lastPhaseTime !== config.time && gameStats.survivalTime >= config.time) {
        lastPhaseTime = config.time;
        if (config.time > 0) {
            showBigEvent('⚠️ ' + config.name, config.desc, '#ff6600');
            playSound('boss');
        }
    }
}

// 大型事件提示（更醒目）
function showBigEvent(title, subtitle, color) {
    let bigEvent = document.getElementById('bigEvent');
    if (!bigEvent) {
        bigEvent = document.createElement('div');
        bigEvent.id = 'bigEvent';
        bigEvent.style.cssText = 'position:absolute;top:30%;left:50%;transform:translateX(-50%);text-align:center;z-index:100;pointer-events:none;';
        document.getElementById('gameContainer').appendChild(bigEvent);
    }
    bigEvent.innerHTML = `
        <div style="font-size:36px;font-weight:bold;color:${color};text-shadow:0 0 20px ${color},2px 2px 4px #000;animation:pulse 0.5s ease-in-out">${title}</div>
        <div style="font-size:18px;color:#fff;text-shadow:1px 1px 2px #000;margin-top:10px">${subtitle}</div>
    `;
    bigEvent.style.opacity = 1;
    setTimeout(() => { bigEvent.style.opacity = 0; }, 2500);
}

// 触发增强版危险事件
function triggerEnhancedDangerSpike() {
    if (dangerSpikeActive) return;

    // 根据阶段选择合适的危险事件
    const phase = currentEndlessPhase;
    let availableSpikes = dangerSpikes.slice(0, 3); // 基础事件
    if (phase >= 2) availableSpikes = dangerSpikes.slice(0, 4); // 加入坦克推进
    if (phase >= 3) availableSpikes = dangerSpikes.slice(0, 5); // 加入混编猎杀
    if (phase >= 4) availableSpikes = dangerSpikes.slice(0, 6); // 全部基础事件
    if (playerBuffs.unlockGoldenEvent) availableSpikes = [...availableSpikes, dangerSpikes[dangerSpikes.length - 1]];

    const spike = availableSpikes[Math.floor(Math.random() * availableSpikes.length)];
    dangerSpikeActive = true;
    dangerSpikeType = spike.type;
    dangerSpikeTimer = spike.duration * 60;
    dangerSpikeData = spike;

    showBigEvent(spike.name, spike.desc, '#ff0000');
    playSound('danger');
}

// ==================== 触屏控制 ====================
let touchState = { moveX: 0, moveY: 0, jump: false };
let joystickTouch = null;

function initMobileControls() {
    if (!isMobile) return;
    document.getElementById('mobileControls').style.display = 'flex';
    const joystickArea = document.getElementById('joystickArea');
    const thumb = document.getElementById('joystickThumb');
    const base = document.getElementById('joystickBase');

    joystickArea.addEventListener('touchstart', e => {
        e.preventDefault();
        joystickTouch = e.touches[0].identifier;
        updateJoystick(e.touches[0]);
    });
    joystickArea.addEventListener('touchmove', e => {
        e.preventDefault();
        for (let t of e.touches) {
            if (t.identifier === joystickTouch) updateJoystick(t);
        }
    });
    joystickArea.addEventListener('touchend', e => {
        for (let t of e.changedTouches) {
            if (t.identifier === joystickTouch) {
                joystickTouch = null;
                touchState.moveX = 0;
                touchState.moveY = 0;
                thumb.style.left = '37px';
                thumb.style.bottom = '37px';
            }
        }
    });

    function updateJoystick(touch) {
        const rect = base.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 35;
        if (dist > maxDist) { dx = dx / dist * maxDist; dy = dy / dist * maxDist; }
        thumb.style.left = (37 + dx) + 'px';
        thumb.style.bottom = (37 - dy) + 'px';
        touchState.moveX = dx / maxDist;
        touchState.moveY = -dy / maxDist;
    }

    // 技能按钮
    // 跳跃按钮已移除（俯视角模式）
    }

function setupTouchBtn(id, action) {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', e => { e.preventDefault(); btn.classList.add('active'); action(); });
    btn.addEventListener('touchend', e => { e.preventDefault(); btn.classList.remove('active'); });
}

// 键盘
const keys = {};
document.addEventListener('keydown', e => {
    // ESC键暂停/退出
    if (e.code === 'Escape' && gamePhase === 'playing') {
        if (document.getElementById('exitConfirm').style.display === 'block') {
            document.getElementById('exitConfirm').style.display = 'none';
            gameState.isPaused = false;
        } else {
            showExitConfirm();
        }
        return;
    }
    if (gamePhase !== 'playing' || gameState.isPaused) return;
    if (keys[e.code]) return;
    keys[e.code] = true;
    });
document.addEventListener('keyup', e => { keys[e.code] = false; });

// ==================== 菜单 ====================
document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('modeSelect').style.display = 'flex';
});
document.getElementById('backToMainBtn').addEventListener('click', () => {
    document.getElementById('modeSelect').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'block';
});
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedMode = btn.dataset.mode;
    });
});
document.getElementById('confirmStartBtn').addEventListener('click', () => {
    document.getElementById('modeSelect').style.display = 'none';
    // 首次游戏显示世界观介绍
    if (saveData.gamesPlayed === 0) {
        showLore(() => {
            startGame();
            // 首次游戏显示动态教程
            startDynamicTutorial();
        });
    } else {
        startGame();
    }
});
document.getElementById('shopBtn').addEventListener('click', showShop);
document.getElementById('achieveBtn').addEventListener('click', showAchieve);
document.getElementById('leaderboardBtn').addEventListener('click', showLeaderboard);

// 排行榜 tabs
document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => loadLeaderboard(tab.dataset.mode));
});

// 暂停/退出功能
document.getElementById('pauseBtn').addEventListener('click', showExitConfirm);
// 音效开关
document.getElementById('soundBtn').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    toggleBGM(); // 同时切换背景音乐
    document.getElementById('soundBtn').textContent = soundEnabled ? '🔊' : '🔇';
});
document.getElementById('confirmExitBtn').addEventListener('click', () => {
    document.getElementById('exitConfirm').style.display = 'none';
    backToMenu();
});
document.getElementById('cancelExitBtn').addEventListener('click', () => {
    document.getElementById('exitConfirm').style.display = 'none';
    gameState.isPaused = false;
});
function showExitConfirm() {
    gameState.isPaused = true;
    document.getElementById('exitConfirm').style.display = 'block';
}
document.getElementById('tutorialBtn').addEventListener('click', () => document.getElementById('tutorialScreen').style.display = 'flex');
function hideTutorial() { document.getElementById('tutorialScreen').style.display = 'none'; }

// === 动态新手引导系统 ===
const tutorialSteps = [
    {
        title: '移动躲避',
        text: '方向键/摇杆移动，躲开敌人！',
        keys: ['←', '→', '↑', '↓'],
        action: 'move',
        condition: () => Math.abs(player.vx) > 0.5 || Math.abs(player.vy) > 0.5
    },
    {
        title: '自动战斗',
        text: '武器会自动攻击附近敌人，你只需专注走位！',
        keys: [],
        action: 'auto',
        delay: 2500
    },
    {
        title: '收集升级',
        text: '拾取经验宝石升级，选择强化构建你的流派！',
        keys: [],
        action: 'auto',
        delay: 2500
    },
    {
        title: '开始战斗！',
        text: '活下去，变更强！',
        keys: [],
        action: 'complete',
        delay: 1500
    }
];

let tutorialActive = false;
let currentTutorialStep = 0;

function startDynamicTutorial() {
    if (saveData.tutorialCompleted) return;
    tutorialActive = true;
    currentTutorialStep = 0;
    document.getElementById('dynamicTutorial').style.display = 'flex';
    showTutorialStep(0);
}

function showTutorialStep(index) {
    if (index >= tutorialSteps.length) {
        completeTutorial();
        return;
    }

    const step = tutorialSteps[index];
    const stepEl = document.getElementById('tutorialStep');

    let keysHtml = step.keys.map(k =>
        `<span class="tutorial-key-highlight">${k}</span>`
    ).join('');

    stepEl.innerHTML = `
        <h3>${step.title}</h3>
        <p>${step.text}</p>
        ${keysHtml}
    `;

    // 更新进度点
    const progressEl = document.getElementById('tutorialProgress');
    progressEl.innerHTML = tutorialSteps.map((_, i) =>
        `<div class="tutorial-dot ${i < index ? 'done' : ''} ${i === index ? 'active' : ''}"></div>`
    ).join('');

    // 处理步骤推进
    if (step.action === 'auto' || step.action === 'complete') {
        setTimeout(() => {
            if (tutorialActive && currentTutorialStep === index) {
                currentTutorialStep++;
                showTutorialStep(currentTutorialStep);
            }
        }, step.delay);
    }
}

function checkTutorialCondition() {
    if (!tutorialActive) return;
    const step = tutorialSteps[currentTutorialStep];
    if (step && step.condition && step.condition()) {
        currentTutorialStep++;
        showTutorialStep(currentTutorialStep);
    }
}

function skipTutorial() {
    completeTutorial();
}

function completeTutorial() {
    tutorialActive = false;
    document.getElementById('dynamicTutorial').style.display = 'none';
    saveData.tutorialCompleted = true;
    saveGame();
    gameState.isPaused = false;
}

// === 世界观介绍 ===
const loreTexts = [
    { title: '八重之犬', delay: 0 },
    { text: '在那个被遗忘的世界里...', delay: 2000 },
    { text: '曾经和平的村庄，如今被无尽的怪物所侵袭', delay: 4500 },
    { text: '人们四处逃散，无人能够抵抗', delay: 7000 },
    { text: '直到——一只狗狗站了出来', delay: 9500 },
    { text: '"汪！"', delay: 12000 },
    { text: '它虽然只是一只狗，但它有着不屈的灵魂', delay: 14000 },
    { text: '用踢击、撒娇、甚至嘲讽，与怪物战斗', delay: 16500 },
    { text: '这是属于它的战斗...', delay: 19000 }
];

let loreShowing = false;
let loreTimeouts = [];
let loreOnComplete = null;

function showLore(onComplete) {
    loreShowing = true;
    loreOnComplete = onComplete;
    document.getElementById('loreScreen').style.display = 'flex';
    const container = document.getElementById('loreContent');
    container.innerHTML = '';

    loreTexts.forEach((item, i) => {
        const timeout = setTimeout(() => {
            if (item.title) {
                container.innerHTML += `<div class="lore-title">${item.title}</div>`;
            } else {
                container.innerHTML += `<p style="animation-delay:${i*0.1}s">${item.text}</p>`;
            }
        }, item.delay);
        loreTimeouts.push(timeout);
    });

    // 最后自动结束
    loreTimeouts.push(setTimeout(() => {
        finishLore();
    }, 22000));

    // 点击跳过
    document.getElementById('loreScreen').onclick = () => skipLore();
}

function skipLore() {
    finishLore();
}

function finishLore() {
    loreTimeouts.forEach(clearTimeout);
    loreTimeouts = [];
    loreShowing = false;
    document.getElementById('loreScreen').style.display = 'none';
    if (loreOnComplete) {
        loreOnComplete();
        loreOnComplete = null;
    }
}

function startGame() {
    gamePhase = 'playing';
    currentMap = 0; // 村庄广场
    // 初始化摄像机位置（玩家在中心）
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    document.getElementById('mapName').style.display = 'block';
    document.getElementById('pauseBtn').style.display = 'block';
    document.getElementById('soundBtn').style.display = 'block';
    document.getElementById('mapName').textContent = '📍 ' + mapThemes[currentMap].name;

    // 割草模式显示
    if (KUOSAO_MODE.enabled && selectedMode === 'endless') {
        document.getElementById('mapName').textContent += ' (割草模式)';
    }

    showPlayerHealthBar();
    // 无尽模式不显示技能栏（只用武器系统）
    if (selectedMode !== 'endless') {
        if (isMobile) document.getElementById('mobileControls').style.display = 'flex';
        else document.getElementById('skillBar').style.display = 'flex';
    }
    resetGame();
    applyPermUpgrades();
    initPlayerHealthBar();

    // 割草模式: 初始化经验条
    if (KUOSAO_MODE.enabled && KUOSAO_MODE.xpEnabled && selectedMode === 'endless') {
        updateXPBar();
    }

    gameState.isPaused = true;

    // 无尽模式：显示初始武器选择
    if (selectedMode === 'endless') {
        showStarterWeaponPanel();
    } else {
        // 首局自动选择默认天赋，跳过选择界面
        if (saveData.gamesPlayed === 0) {
            autoSelectDefaultTalent();
        } else {
            showTalentScreen();
        }
    }
    startTimers();

    // === 开始背景音乐 ===
    if (soundEnabled) startBGM();
}

// 首局自动选择默认天赋
function autoSelectDefaultTalent() {
    const defaultTalent = talents.find(t => t.id === 'balanced') || talents[0];
    selectedTalent = defaultTalent;
    defaultTalent.apply();
    maxPlayerLives = Math.max(maxPlayerLives, gameState.lives);
    buildHpSegments();
    updatePlayerHealthBar(false);
    spawnFloatingText(player.x, player.y - 60, '🎮 首次游戏!', '#4ade80');
    gameState.isPaused = false;
}

// === 开局武器选择面板 ===
function showStarterWeaponPanel() {
    const panel = document.getElementById('upgradePanel');
    const optionsDiv = document.getElementById('upgradeOptions');
    panel.querySelector('h2').textContent = '🎮 选择初始武器';
    optionsDiv.innerHTML = '';

    // 4个武器供选择
    const weaponIds = Object.keys(weaponDefinitions);

    weaponIds.forEach(weaponId => {
        const def = weaponDefinitions[weaponId];
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        const colors = { kick: '#ff8844', dagger: '#cccccc', lightning: '#ffdd44', fire: '#ff4422' };
        card.style.borderColor = colors[weaponId] || '#ff6600';
        card.style.background = 'linear-gradient(135deg, #3a2a1e, #4a3a2e)';
        card.innerHTML = `
            <div class="icon" style="font-size:40px">${def.icon}</div>
            <div class="name" style="color:${colors[weaponId] || '#fff'}">${def.name}</div>
            <div class="desc">${def.desc}</div>
            <div style="font-size:10px;color:#888;margin-top:5px">Lv1: ${def.levelDesc[1]}</div>
        `;
        card.onmouseenter = () => {
            card.style.transform = 'scale(1.08)';
            card.style.boxShadow = `0 0 20px ${colors[weaponId] || '#ff6600'}`;
            playSound('pickup');
        };
        card.onmouseleave = () => {
            card.style.transform = 'scale(1)';
            card.style.boxShadow = 'none';
        };
        card.onclick = () => {
            addWeapon(weaponId);
            document.getElementById('upgradePanel').style.display = 'none';
            panel.querySelector('h2').textContent = '🎁 选择强化!';
            gameState.isPaused = false;
            spawnFloatingText(player.x, player.y - 60, def.icon + ' ' + def.name + ' 获得!', '#ff6600');
            const weaponHUD = document.getElementById('weaponHUD');
            if (weaponHUD) weaponHUD.style.display = 'flex';
        };
        optionsDiv.appendChild(card);
    });

    panel.style.display = 'flex';
}

function backToMenu() {
    gamePhase = 'menu';
    stopTimers();
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('ui').style.display = 'none';
    document.getElementById('bossHealthBar').style.display = 'none';
    hidePlayerHealthBar();
    document.getElementById('mapName').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('soundBtn').style.display = 'none';
    document.getElementById('exitConfirm').style.display = 'none';
    document.getElementById('skillBar').style.display = 'none';
    document.getElementById('mobileControls').style.display = 'none';
    document.getElementById('modeSelect').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'block';
    document.getElementById('startScreen').style.display = 'flex';

    // 割草模式: 清理UI
    const xpBar = document.getElementById('xpBar');
    if (xpBar) xpBar.style.display = 'none';
    const xpLevel = document.getElementById('xpLevel');
    if (xpLevel) xpLevel.style.display = 'none';
    const killCounter = document.getElementById('killCounter');
    if (killCounter) killCounter.style.display = 'none';
    const weaponHUD = document.getElementById('weaponHUD');
    if (weaponHUD) weaponHUD.style.display = 'none';
}

function startTimers() {
    // === 割草模式敌人生成 ===
    if (KUOSAO_MODE.enabled && selectedMode === 'endless') {
        // 高密度敌人生成
        enemySpawnInterval = setInterval(() => {
            if (gamePhase !== 'playing' || gameState.isPaused) return;

            const activeEnemies = enemies.filter(e => !e.flying && !e.isBoss).length;
            const maxEnemies = Math.min(KUOSAO_MODE.maxEnemies, GAME_CONFIG.MAX_ENEMIES_BASE + Math.floor(gameStats.survivalTime / GAME_CONFIG.MAX_ENEMIES_INTERVAL) * GAME_CONFIG.MAX_ENEMIES_SCALING);

            if (activeEnemies < maxEnemies) {
                // 生成敌人
                spawnEnemy();
            }
        }, KUOSAO_MODE.spawnInterval);

        // === 波次脉冲: 定期制造紧张-释放节奏 ===
        setInterval(() => {
            if (gamePhase !== 'playing' || gameState.isPaused) return;
            const t = gameStats.survivalTime;
            if (t > 0 && t <= GAME_CONFIG.PULSE_MAX_TIME && t % GAME_CONFIG.PULSE_INTERVAL === 0) {
                const burstCount = GAME_CONFIG.PULSE_BASE_COUNT + Math.floor(t / 30);
                const pulseNames = ['⚠️ 敌潮来袭!', '⚠️ 包围来袭!', '⚠️ 高压波次!', '⚠️ 精锐突袭!', '⚠️ 疯狂涌入!'];
                showEvent(pulseNames[Math.min(Math.floor(t / GAME_CONFIG.PULSE_INTERVAL) - 1, pulseNames.length - 1)]);
                for (let i = 0; i < burstCount; i++) {
                    setTimeout(() => { if (gamePhase === 'playing') spawnEnemy(); }, i * 150);
                }
            }
        }, 1000);

        // 精英波次 - 每2分钟
        setInterval(() => {
            if (gamePhase !== 'playing' || gameState.isPaused) return;
            if (gameStats.survivalTime > 0 && gameStats.survivalTime % 120 === 0) {
                showEvent('⚠️ 精英波次!');
                for (let i = 0; i < 2; i++) {
                    setTimeout(() => {
                        if (gamePhase === 'playing') {
                            const type = specialEnemyTypes[Math.floor(Math.random() * specialEnemyTypes.length)];
                            spawnSpecificEnemy(type);
                            if (enemies.length > 0) {
                                const last = enemies[enemies.length - 1];
                                last.isElite = true;
                                last.hp *= 2;
                                last.currentHp *= 2;
                                last.points *= 3;
                            }
                        }
                    }, i * 500);
                }
            }
        }, 1000);

        // Boss波次 - 每3分钟
        setInterval(() => {
            if (gamePhase !== 'playing' || gameState.isPaused) return;
            if (gameStats.survivalTime > 0 && gameStats.survivalTime % 180 === 0) {
                showEvent('👑 Boss波次!');
                spawnBoss();
            }
        }, 1000);

    } else if (selectedMode === 'wave') {
        waveState = { current: 0, totalWaves: 10, waveTimer: 120, inWave: false, enemiesInWave: 0 };
        enemySpawnInterval = setInterval(() => {
            if (gamePhase !== 'playing' || gameState.isPaused) return;
            if (!waveState.inWave) {
                waveState.waveTimer--;
                if (waveState.waveTimer <= 0) startWave(waveState.current);
            } else if (enemies.filter(e => !e.flying).length === 0) {
                waveState.inWave = false;
                waveState.current++;
                if (waveState.current >= waveState.totalWaves) {
                    gameState.deathReason = '🎉 通关成功!';
                    gameState.score += 5000;
                    endGame();
                } else {
                    showUpgradePanel();
                    waveState.waveTimer = 150;
                }
            }
        }, 100);
    } else if (selectedMode === 'endless') {
        // 无尽模式：动态刷怪，根据阶段spawnRate调整
        enemySpawnInterval = setInterval(() => {
            if (gamePhase !== 'playing' || gameState.isPaused) return;
            const maxEnemies = 10 + Math.floor(gameStats.survivalTime / 20);
            const nonBossCount = enemies.filter(e => !e.isBoss).length;
            if (nonBossCount >= maxEnemies) return;
            const phase = getCurrentPhaseConfig();
            // spawnRate 控制每个tick生成几个敌人（1.2=偶尔生成2个，2.5=经常生成2-3个）
            const baseSpawn = Math.floor(phase.spawnRate);
            const extraChance = phase.spawnRate - baseSpawn;
            let toSpawn = baseSpawn + (Math.random() < extraChance ? 1 : 0);
            for (let i = 0; i < toSpawn && nonBossCount + i < maxEnemies; i++) {
                spawnEnemy();
            }
        }, 800);
    } else {
        enemySpawnInterval = setInterval(() => { if (gamePhase === 'playing' && !gameState.isPaused && enemies.filter(e => !e.isBoss).length < 6) spawnEnemy(); }, 1800);
    }
    itemSpawnInterval = setInterval(() => { if (gamePhase === 'playing' && !gameState.isPaused && items.length < 2) spawnItem(); }, 5000);
    eventInterval = setInterval(() => { if (gamePhase === 'playing' && !gameState.isPaused && Math.random() > 0.5) { triggerRandomEvent(); gameStats.eventCount++; } }, 12000);
    danmakuInterval = setInterval(() => { if (gamePhase === 'playing' && Math.random() > 0.7) spawnDanmaku(); }, 2500);
    timeInterval = setInterval(() => {
        if (gamePhase !== 'playing' || gameState.isPaused) return;
        gameStats.survivalTime++;
        gameStats.noHitTimer++; // 无伤计时器
        if (selectedMode === 'endless') {
            gameState.time = gameStats.survivalTime;
            document.getElementById('time').textContent = gameStats.survivalTime + 's';

            // === 无尽模式阶段系统 ===
            updateEndlessPhase();

            // === 前期奖励宝箱 (制造争夺目标) ===
            if (gameStats.survivalTime === 35) {
                const cx = player.x + (Math.random() > 0.5 ? 200 : -200);
                const cy = player.y + (Math.random() > 0.5 ? 150 : -150);
                spawnChest(
                    Math.max(50, Math.min(world.width - 50, cx)),
                    Math.max(50, Math.min(world.height - 50, cy)),
                    'rare'
                );
                showEvent('💎 宝箱出现了!');
            }

            // === 危险事件触发 (每30秒有几率触发) ===
            if (gameStats.survivalTime > 30 && gameStats.survivalTime % 30 === 0) {
                const triggerChance = 0.3 + currentEndlessPhase * 0.1; // 阶段越高几率越大
                if (Math.random() < triggerChance) {
                    triggerEnhancedDangerSpike();
                }
            }

            // 割草模式: 每60秒升级一次（经验系统也会触发升级）
            if (!KUOSAO_MODE.enabled && gameStats.survivalTime % 30 === 0) showUpgradePanel();
            // 割草模式Boss更频繁 - 改为阶段考试
            if (KUOSAO_MODE.enabled) {
                // Boss作为阶段考试，每个新阶段开始时出现
                const phaseConfig = getCurrentPhaseConfig();
                if (gameStats.survivalTime === phaseConfig.time && phaseConfig.time > 0) {
                    setTimeout(() => {
                        showBigEvent('👑 阶段考试!', '击败Boss进入下一阶段', '#ff0000');
                        setTimeout(() => spawnBoss(), 1500);
                    }, 500);
                }
                // 额外Boss每90秒
                if (gameStats.survivalTime % 90 === 0 && gameStats.survivalTime > 0) spawnBoss();
            } else {
                if (gameStats.survivalTime % 45 === 0) spawnBoss();
            }
        } else if (selectedMode === 'wave') {
            document.getElementById('time').textContent = '波' + (waveState.current + 1) + '/' + waveState.totalWaves;
        } else {
            if (gameState.time > 0) {
                gameState.time--;
                document.getElementById('time').textContent = gameState.time;
                if (gameState.time === 45 && !gameState.bossSpawned45) { gameState.bossSpawned45 = true; spawnBoss(); }
                if (gameState.time === 30 && !gameState.bossSpawned30) { gameState.bossSpawned30 = true; spawnBoss(); }
                if (gameState.time === 45 && !gameState.upgradeShown15) { gameState.upgradeShown15 = true; showUpgradePanel(); }
                if (gameState.time === 30 && !gameState.upgradeShown30) { gameState.upgradeShown30 = true; showUpgradePanel(); }
                if (gameState.time === 15 && !gameState.upgradeShown45) { gameState.upgradeShown45 = true; showUpgradePanel(); }
                if (gameState.time === 0) {
                    // 急速模式：时间到 = 胜利！
                    if (selectedMode !== 'endless') {
                        showVictory();
                    } else {
                        // 无尽模式理论上不会有时间到（只有死亡）
                        gameState.deathReason = '时间到了';
                        endGame();
                    }
                }
            }
        }
    }, 1000);
}

function stopTimers() { clearInterval(enemySpawnInterval); clearInterval(itemSpawnInterval); clearInterval(eventInterval); clearInterval(danmakuInterval); clearInterval(timeInterval); }

function startWave(waveNum) {
    waveState.inWave = true;
    waveState.enemiesInWave = 5 + waveNum * 2;
    showEvent('第 ' + (waveNum + 1) + ' 波!');
    let spawned = 0;
    const spawnNext = () => {
        if (spawned < waveState.enemiesInWave && gamePhase === 'playing') {
            spawnEnemy();
            spawned++;
            setTimeout(spawnNext, 400);
        }
        if (waveNum >= 4 && waveNum % 2 === 0 && spawned === waveState.enemiesInWave) {
            setTimeout(() => spawnBoss(), 500);
        }
    };
    spawnNext();
}

// 升级面板
function showUpgradePanel() {
    if (gameState.gameOver || player.isDead) return;
    playSound('upgrade');
    gameState.isPaused = true;
    const panel = document.getElementById('upgradePanel');
    const optionsDiv = document.getElementById('upgradeOptions');
    optionsDiv.innerHTML = '';

    const options = [];
    const count = playerBuffs.extraChoice ? 4 : 3;

    // 武器选项 (50%几率)
    const weaponIds = Object.keys(weaponDefinitions);
    const availableWeapons = weaponIds.filter(id => {
        const w = playerWeapons[id];
        return !w || w.level < weaponDefinitions[id].maxLevel;
    });

    // 属性选项
    const availableUpgrades = upgradePool.filter(u => !selectedUpgrades.includes(u.id));

    // 随机混合武器和属性
    while (options.length < count) {
        const addWeaponChoice = Math.random() < 0.5 && availableWeapons.length > 0;

        if (addWeaponChoice) {
            const idx = Math.floor(Math.random() * availableWeapons.length);
            const weaponId = availableWeapons.splice(idx, 1)[0];
            const def = weaponDefinitions[weaponId];
            const currentLv = playerWeapons[weaponId]?.level || 0;
            const nextLv = currentLv + 1;
            const isAwakening = nextLv === 5;
            options.push({
                type: 'weapon',
                id: weaponId,
                icon: def.icon,
                name: currentLv === 0 ? def.name : `${def.name} Lv${nextLv}${isAwakening ? ' ⭐觉醒' : ''}`,
                desc: currentLv === 0 ? def.desc : (def.levelDesc[nextLv] || `升级到 Lv${nextLv}`)
            });
        } else if (availableUpgrades.length > 0) {
            const idx = Math.floor(Math.random() * availableUpgrades.length);
            const upg = availableUpgrades.splice(idx, 1)[0];
            options.push({
                type: 'upgrade',
                data: upg,
                icon: upg.icon,
                name: upg.name,
                desc: upg.desc
            });
        } else if (availableWeapons.length > 0) {
            const idx = Math.floor(Math.random() * availableWeapons.length);
            const weaponId = availableWeapons.splice(idx, 1)[0];
            const def = weaponDefinitions[weaponId];
            const currentLv = playerWeapons[weaponId]?.level || 0;
            const nextLv = currentLv + 1;
            const isAwakening = nextLv === 5;
            options.push({
                type: 'weapon',
                id: weaponId,
                icon: def.icon,
                name: currentLv === 0 ? def.name : `${def.name} Lv${nextLv}${isAwakening ? ' ⭐觉醒' : ''}`,
                desc: currentLv === 0 ? def.desc : (def.levelDesc[nextLv] || `升级到 Lv${nextLv}`)
            });
        } else {
            break;
        }
    }

    const rarePool = availableUpgrades.filter(u => ['damage', 'survival', 'utility', 'style'].includes(u.category));
    if (rarePool.length > 0 && playerBuffs.rareUpgradeChance && Math.random() < playerBuffs.rareUpgradeChance) {
        const rare = rarePool[Math.floor(Math.random() * rarePool.length)];
        const replaceIndex = options.findIndex(opt => opt.type === 'upgrade');
        const injectIndex = replaceIndex >= 0 ? replaceIndex : Math.max(0, options.length - 1);
        options[injectIndex] = {
            type: 'upgrade',
            data: rare,
            icon: rare.icon,
            name: rare.name + ' ★',
            desc: rare.desc
        };
    }

    options.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        const arch = opt.data?.archetype ? ARCHETYPE[opt.data.archetype] : null;
        const borderColor = opt.type === 'weapon' ? '#ff6600' : (arch ? arch.color : '#6666ff');
        const typeLabel = opt.type === 'weapon' ? '⚔️武器' : (arch ? arch.label : '✨属性');
        card.style.borderColor = borderColor;

        // 检查是否有进化提示
        let evolutionHint = '';
        if (opt.type === 'upgrade') {
            const recipe = evolutionRecipes.find(r => r.baseSkill === opt.data.id?.replace(/Up|Dmg|CD/g, '').toLowerCase());
            if (recipe && !evolvedSkills.includes(recipe.evolved)) {
                const hasRelic = playerRelics.find(r => r.id === recipe.relic);
                const relicInfo = relicTypes.find(r => r.id === recipe.relic);
                if (hasRelic) {
                    evolutionHint = `<div style="font-size:10px;color:#ffd700;margin-top:5px">⚡ 可进化为 ${recipe.icon}${recipe.name}!</div>`;
                } else if (relicInfo) {
                    evolutionHint = `<div style="font-size:10px;color:#9370db;margin-top:5px">🔮 获得${relicInfo.icon}后可进化</div>`;
                }
            }
        }

        card.innerHTML = `
            <div style="font-size:10px;color:${borderColor};margin-bottom:3px">${typeLabel}</div>
            <div class="icon">${opt.icon}</div>
            <div class="name">${opt.name}</div>
            <div class="desc">${opt.desc}</div>
            ${evolutionHint}
        `;
        // A4: 升级选择预览特效
        card.onmouseenter = () => {
            playSound('pickup');
            card.style.transform = 'scale(1.08)';
            card.style.boxShadow = `0 0 20px ${borderColor}`;
        };
        card.onmouseleave = () => {
            card.style.transform = 'scale(1)';
            card.style.boxShadow = 'none';
        };
        card.onclick = () => selectUpgradeOption(opt);
        optionsDiv.appendChild(card);
    });

    // 添加进化提示面板
    const evolutionTips = getEvolutionTips();
    if (evolutionTips.length > 0) {
        const tipDiv = document.createElement('div');
        tipDiv.style.cssText = 'width:100%;text-align:center;margin-top:15px;padding:8px;background:rgba(147,112,219,0.2);border-radius:8px;font-size:12px;color:#9370db;';
        tipDiv.innerHTML = '🔮 进化提示: ' + evolutionTips.join(' | ');
        optionsDiv.appendChild(tipDiv);
    }

    panel.style.display = 'flex';
}

// 获取当前可用的进化提示
function getEvolutionTips() {
    const tips = [];
    for (const recipe of evolutionRecipes) {
        if (evolvedSkills.includes(recipe.evolved)) continue;

        const hasRelic = playerRelics.find(r => r.id === recipe.relic);
        const hasSkill = selectedUpgrades.some(u => u.includes(recipe.baseSkill));
        const relicInfo = relicTypes.find(r => r.id === recipe.relic);

        if (hasRelic && !hasSkill) {
            tips.push(`选择${recipe.baseSkill === 'kick' ? '踢击' : recipe.baseSkill === 'slash' ? '挠' : '撒娇'}升级→${recipe.icon}`);
        } else if (hasSkill && !hasRelic && relicInfo) {
            tips.push(`获得${relicInfo.icon}${relicInfo.name}→${recipe.icon}`);
        }
    }
    return tips;
}

function selectUpgradeOption(opt) {
    if (opt.type === 'weapon') {
        addWeapon(opt.id);
        spawnFloatingText(player.x, player.y - 60, opt.icon + opt.name, '#ff6600');
    } else {
        opt.data.apply();
        selectedUpgrades.push(opt.data.id);
        spawnFloatingText(player.x, player.y - 60, opt.icon + opt.name, '#ffd700');
        playSound('upgrade');
    }
    document.getElementById('upgradePanel').style.display = 'none';
    gameState.isPaused = false;
}

function selectUpgrade(upg) {
    upg.apply();
    selectedUpgrades.push(upg.id);
    document.getElementById('upgradePanel').style.display = 'none';
    gameState.isPaused = false;
    spawnFloatingText(player.x, player.y - 60, upg.icon + upg.name, '#ffd700');
}

// CD显示
function updateCooldownUI() {
    // 手机端CD显示
    const slashCDm = document.getElementById('slashCDm');
    const sajiaoCDm = document.getElementById('sajiaoCDm');
    const blockCDm = document.getElementById('blockCDm');
    if (slashCDm) {
        if (cooldowns.slash > 0) { slashCDm.style.display = 'flex'; slashCDm.textContent = Math.ceil(cooldowns.slash / 60); }
        else slashCDm.style.display = 'none';
    }
    if (sajiaoCDm) {
        if (cooldowns.sajiao > 0) { sajiaoCDm.style.display = 'flex'; sajiaoCDm.textContent = Math.ceil(cooldowns.sajiao / 60); }
        else sajiaoCDm.style.display = 'none';
    }
    if (blockCDm) {
        if (cooldowns.block > 0) { blockCDm.style.display = 'flex'; blockCDm.textContent = Math.ceil(cooldowns.block / 60); }
        else blockCDm.style.display = 'none';
    }

    // PC端技能栏CD显示 (已禁用手动技能)
    const skills = [];
    skills.forEach(s => {
        const slot = document.getElementById(s.id);
        const cdEl = document.getElementById(s.cdId);
        if (slot && cdEl) {
            if (s.cd > 0) {
                slot.classList.remove('ready');
                slot.classList.add('on-cd');
                cdEl.style.display = 'flex';
                cdEl.textContent = Math.ceil(s.cd / 60);
            } else {
                slot.classList.remove('on-cd');
                slot.classList.add('ready');
                cdEl.style.display = 'none';
            }
        }
    });
}

// ==================== 技能 ====================
function performSlash() {
    if (cooldowns.slash > 0 || player.slashing || player.isDead) return;
    playSound('slash');
    gameStats.skillUsage.slash++;
    player.slashing = true; player.slashTimer = 25; player.currentState = 'slash';
    cooldowns.slash = Math.floor(playerBuffs.slashCD);

    // 俯视角：朝最近敌人方向发射剑气
    let nearestEnemy = null, nearestDist = Infinity;
    enemies.forEach(e => {
        if (e.flying) return;
        const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
        if (dist < nearestDist) { nearestDist = dist; nearestEnemy = e; }
    });

    let dirX = player.facingRight ? 1 : -1, dirY = 0;
    if (nearestEnemy) {
        const dx = nearestEnemy.x - player.x;
        const dy = nearestEnemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) { dirX = dx / dist; dirY = dy / dist; }
        player.facingRight = dx > 0;
    }

    const sx = player.x + dirX * 60;
    const sy = player.y + dirY * 60;
    slashEffects.push({ x: sx, y: sy, vx: dirX * 15, vy: dirY * 15, width: playerBuffs.slashWidth, height: 60, life: 30, damage: playerBuffs.slashDamage });
    if (playerBuffs.slashDouble) slashEffects.push({ x: sx + dirY * 30, y: sy - dirX * 30, vx: dirX * 15, vy: dirY * 15, width: playerBuffs.slashWidth, height: 60, life: 30, damage: playerBuffs.slashDamage });

    let slashHit = false;
    enemies.forEach(e => {
        if (!e.flying && Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2) < 100) {
            slashHit = true;
            dealDamageToEnemy(e, 3, 'heavy');
            spawnHitEffect(e.x, e.y, 2);
        }
    });
    spawnFloatingText(player.x, player.y - 60, '⚔️', '#ffd700');
    gameState.screenShake = slashHit ? 10 : 5;
}

function performSajiao() {
    if (cooldowns.sajiao > 0 || player.isDead) return;
    playSound('sajiao');
    gameStats.skillUsage.sajiao++;
    cooldowns.sajiao = Math.floor(playerBuffs.sajiaoCD);
    player.currentState = 'sajiao';
    document.getElementById('sajiaoOverlay').style.opacity = 1;
    // Taunt effect merged: enemies get taunted and rush player (creates kick opportunities!)
    enemies.forEach(e => {
        if (!e.flying && !e.isBoss) {
            e.taunted = true;
            e.tauntTimer = 120;
            e.stunned = true;
            e.stunTimer = 30; // Brief stun then rush
        }
    });
    spawnFloatingText(player.x, player.y - 60, tauntQuotes[Math.floor(Math.random() * tauntQuotes.length)], '#ff69b4');
    setTimeout(() => {
        enemies.forEach(e => {
            if (!e.flying) {
                if (e.isBoss) {
                    dealDamageToEnemy(e, playerBuffs.sajiaoBossDmg);
                    spawnFloatingText(e.x, e.y, '-' + playerBuffs.sajiaoBossDmg, '#ff69b4');
                    // Boss gets briefly stunned too
                    e.stunned = true;
                    e.stunTimer = 60;
                }
                else {
                    // Weaken enemies instead of instant kill - makes them kickable!
                    e.currentHp = 1;
                    e.weakened = true;
                    spawnFloatingText(e.x, e.y, '💔', '#ff69b4');
                }
                spawnHitEffect(e.x, e.y, 2);
            }
        });
        // 减少撒娇粒子
        if (particles.length < 20) {
            for (let i = 0; i < 5; i++) particles.push({ x: player.x + (Math.random()-0.5)*100, y: player.y, vx: 0, vy: -2, life: 30, color: '#ff69b4', size: 6, isHeart: true });
        }
        gameState.screenShake = 20;
        if (playerBuffs.sajiaoInvincible) { player.invincible = true; player.invincibleTimer = 120; }
        if (playerBuffs.sajiaoFear) {
            enemies.forEach(e => { if (!e.flying && !e.isBoss) { e.stunned = true; e.stunTimer = 180; } });
            spawnFloatingText(player.x, player.y - 80, '😱定身!', '#ff69b4');
        }
        if (playerBuffs.sajiaoHeal && gameState.lives < 5) {
            gameState.lives++;
            updatePlayerHealthBar(false);
            spawnFloatingText(player.x, player.y - 100, '+1❤️', '#ff69b4');
        }
    }, 400);
    setTimeout(() => { document.getElementById('sajiaoOverlay').style.opacity = 0; if (!player.isDead) player.currentState = 'idle'; }, 1000);
}

function performTaunt() {
    if (cooldowns.taunt > 0 || player.isDead) return;
    playSound('slash');
    gameStats.skillUsage.taunt++;
    cooldowns.taunt = 480;
    spawnFloatingText(player.x, player.y - 60, tauntQuotes[Math.floor(Math.random() * tauntQuotes.length)], '#ff6b35');
    enemies.forEach(e => { if (!e.flying) { e.taunted = true; e.tauntTimer = playerBuffs.tauntDuration; e.speed *= 3; } });
}


function performBlock() {
    if (cooldowns.block > 0 || player.blocking || player.isDead || player.kicking || player.slashing) return;
    playSound('dash'); // 使用冲刺音效
    player.blocking = true;
    player.blockTimer = 45; // 格挡持续45帧 (约0.75秒)
    player.currentState = 'block';
    player.vx = 0; // 格挡时停止移动
    // 格挡特效
    spawnFloatingText(player.x, player.y - 60, '🛡️格挡!', '#4ade80');
}

function performKick() {
    if (player.kicking || player.slashing || player.isDead) return;
    playSound('kick');
    gameStats.skillUsage.kick++;
    player.kicking = true; player.kickTimer = 15; player.currentState = 'kick';
    const range = playerBuffs.kickRange * player.scale;
    let hit = 0;
    let executionKick = false;
    const kickLv = getKickLevel() || 1; // 普通模式默认Lv1

    // === 施放阶段特效 (按等级递增) ===
    spawnKickFXByLevel(kickLv, 'cast');

    enemies.forEach(e => {
        if (e.flying || (!playerBuffs.kickPierce && hit > 0)) return;
        if (Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2) < range) {
            hit++;

            // Boss特殊处理：不能被处决，只能造成固定伤害
            if (e.isBoss) {
                const bossDmg = playerBuffs.kickDamage * 2;
                dealDamageToEnemy(e, bossDmg, 'heavy');
                spawnFloatingText(e.x, e.y - 30, '-' + bossDmg, '#ffd700');
                const bossKnockAngle = Math.atan2(e.y - player.y, e.x - player.x);
                e.vx += Math.cos(bossKnockAngle) * 3;
                e.vy += Math.sin(bossKnockAngle) * 3;
                gameState.screenShake = 8;
                // Boss命中特效 (总是用高级)
                spawnKickFXByLevel(Math.max(kickLv, 3), 'hit', e.x, e.y - 15, false);
                return;
            }

            const isExecutable = e.weakened || e.currentHp <= 1 || (e.currentHp <= e.hp * 0.3);
            const knockbackMult = isExecutable ? 2.5 : 1;
            const damageMult = isExecutable ? 2 : 1;
            const hitType = isExecutable ? 'execution' : 'normal';

            dealDamageToEnemy(e, playerBuffs.kickDamage * damageMult, hitType);

            if (e.currentHp <= 0) {
                const kickAngle = Math.atan2(e.y - player.y, e.x - player.x);
                e.flying = true;
                e.vx = Math.cos(kickAngle) * playerBuffs.kickKnockback * knockbackMult;
                e.vy = Math.sin(kickAngle) * playerBuffs.kickKnockback * knockbackMult - (isExecutable ? 10 : 5);
                e.isProjectile = true;
                handleEnemyKill(e);
                gameState.screenShake = isExecutable ? 18 : 6;

                // === 命中爆发特效 (按等级) ===
                spawnKickFXByLevel(kickLv, 'hit', e.x, e.y, isExecutable);

                if (isExecutable) {
                    executionKick = true;
                    playSound('execution');
                    spawnFloatingText(e.x, e.y - 30, '💥处决!', '#ffd700');
                    if (particles.length < 30) {
                        for (let i = 0; i < 4; i++) {
                            const a = Math.random() * Math.PI * 2;
                            particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 15, color: '#ffd700', size: 4 });
                        }
                    }
                }

                if (playerBuffs.kickLifesteal && gameState.lives < 5 && Math.random() < 0.3) {
                    gameState.lives++;
                    updatePlayerHealthBar(false);
                    spawnFloatingText(player.x, player.y - 60, '+1❤️', '#ff4444');
                }
            } else {
                const pushAngle = Math.atan2(e.y - player.y, e.x - player.x);
                e.vx += Math.cos(pushAngle) * 10;
                e.vy += Math.sin(pushAngle) * 10;
                gameState.screenShake = 3;
                // 非致死命中特效
                spawnKickFXByLevel(kickLv, 'hit', e.x, e.y, false);
            }
            spawnHitEffect(e.x, e.y, isExecutable ? 3 : 1.2, isExecutable);
        }
    });
    if (executionKick) {
        gameState.slowMo = true;
        gameState.slowMoTimer = 12;
        document.getElementById('slowmo').style.opacity = 0.3;
    }
}

function dealDamageToEnemy(e, dmg, hitType = 'normal') {
    let d = dmg * (playerBuffs.globalAttackMult || 1);
    let wasCrit = false;

    // === 升级效果 ===
    // 越打越上头：连击伤害加成
    if (playerBuffs.comboScaling && gameState.combo > 0) {
        d *= (1 + gameState.combo * 0.05);
    }
    // 处决者：低血敌人额外伤害
    if (playerBuffs.executeDmg && e.currentHp < e.hp * 0.3) {
        d *= playerBuffs.executeDmg;
    }
    // 背水一战：1命时伤害翻倍
    if (playerBuffs.lastStand && gameState.lives === 1) {
        d *= 2;
    }
    // 肾上腺素：低血量伤害加成
    if (adrenalineActive) {
        d *= (1 + GAME_CONFIG.ADRENALINE_DAMAGE_BONUS);
    }
    // 冻伤加深：被减速敌人受伤增加
    if (playerBuffs.slowDamageBonus && (e.slowed || e.slowTimer > 0 || e.frozen)) {
        d *= (1 + playerBuffs.slowDamageBonus);
    }
    // 狂战之心(旧)：血量越低伤害越高
    if (playerBuffs.berserkerMode) {
        const hpRatio = gameState.lives / maxPlayerLives;
        const berserkerMult = 1 + (1 - hpRatio);
        d *= berserkerMult;
    }

    // === 新遗物系统 - 狂战之心 ===
    // 血量≤2时进入狂战状态：伤害+80%
    if (playerBuffs.berserkerHeart && gameState.lives <= 2) {
        d *= 1.8;
        relicState.berserkerActive = true;
    } else {
        relicState.berserkerActive = false;
    }

    // === 毁灭使者：充能完成后下次攻击造成500%伤害 ===
    if (playerBuffs.doomSlayer && relicState.doomReady) {
        d *= 5;
        relicState.doomReady = false;
        relicState.doomChargeTimer = 0;
        showBigEvent('☠️ 毁灭一击!', '500%伤害!', '#ff0000');
        gameState.screenShake = 20;
        triggerRelicHighlight('doomSlayer'); // 触发高亮
        // 冲击波效果
        enemies.forEach(nearby => {
            if (nearby !== e && !nearby.flying) {
                const dist = Math.sqrt((nearby.x - e.x) ** 2 + (nearby.y - e.y) ** 2);
                if (dist < 120) {
                    nearby.currentHp -= d * 0.3;
                    nearby.hitFlash = 12;
                    if (nearby.currentHp <= 0 && !nearby.flying) {
                        nearby.flying = true;
                        nearby.vx = (nearby.x - e.x) * 0.1;
                        nearby.vy = -15;
                        handleEnemyKill(nearby);
                    }
                }
            }
        });
        for (let i = 0; i < 15; i++) {
            particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 25, color: '#ff0000', size: 6 });
        }
        playSound('impact');
    }

    // 幸运8：暴击时8%概率造成300%额外伤害（Boss不秒杀）
    if (playerBuffs.critKillChance && wasCrit && Math.random() < playerBuffs.critKillChance) {
        const bonusDmg = d * 3;
        e.currentHp -= bonusDmg;
        spawnFloatingText(e.x, e.y - 30, '🎱 幸运8! +' + Math.floor(bonusDmg), '#ffd700');
        playSound('impact');
    }

    if (playerBuffs.critChance && Math.random() < playerBuffs.critChance) {
        d *= playerBuffs.critMultiplier || 1.6;
        wasCrit = true;
    }

    // === 神罚天降：暴击时召唤神罚光束 ===
    if (wasCrit && playerBuffs.divineWrath) {
        triggerRelicHighlight('divineWrath'); // 触发高亮
        const beamDmg = d * 2;
        // 神罚光束视觉效果
        for (let i = 0; i < 20; i++) {
            particles.push({
                x: e.x, y: e.y - 200 + i * 10,
                vx: 0, vy: 10,
                life: 15, color: '#ffd700', size: 4
            });
        }
        // 范围伤害
        enemies.forEach(nearby => {
            if (!nearby.flying) {
                const dist = Math.sqrt((nearby.x - e.x) ** 2 + (nearby.y - e.y) ** 2);
                if (dist < 80) {
                    nearby.currentHp -= beamDmg;
                    nearby.hitFlash = 12;
                    spawnFloatingText(nearby.x, nearby.y - 20, '✨', '#ffd700');
                    if (nearby.currentHp <= 0 && !nearby.flying) {
                        nearby.flying = true;
                        nearby.vx = (Math.random() - 0.5) * 10;
                        nearby.vy = -12;
                        handleEnemyKill(nearby);
                    }
                }
            }
        });
        playSound('impact');
        spawnFloatingText(e.x, e.y - 80, '✨神罚!', '#ffd700');
    }

    if (e.role === 'tank') d *= 0.5;
    e.currentHp -= d;

    // === 新遗物系统 - 吸血獠牙 ===
    // 连续攻击同一目标时吸血概率递增
    if (playerBuffs.vampireFang && gameState.lives < maxPlayerLives) {
        if (relicState.vampireLastTarget === e) {
            relicState.vampireHitCount++;
        } else {
            relicState.vampireLastTarget = e;
            relicState.vampireHitCount = 1;
        }
        const healChance = Math.min(relicState.vampireHitCount * 0.1, 0.5); // 10%→50%
        if (Math.random() < healChance) {
            gameState.lives++;
            updatePlayerHealthBar(false);
            spawnFloatingText(player.x, player.y - 50, '🧛+1❤️', '#ff6b6b');
            triggerRelicHighlight('vampireFang'); // 触发高亮
        }
    }

    // === 霜魂之心：攻击叠加冰霜层数 ===
    if (playerBuffs.frostCore && !e.flying) {
        const stacks = (relicState.frostStacks.get(e) || 0) + 1;
        relicState.frostStacks.set(e, stacks);
        e.slowed = 0.3 + stacks * 0.1; // 每层+10%减速
        e.slowTimer = 120;

        if (stacks >= 5) {
            // 满层冻结并冰爆
            e.frozen = true;
            e.frozenTimer = 90;
            e.slowed = 0;
            relicState.frostStacks.set(e, 0);
            spawnFloatingText(e.x, e.y - 40, '❄️冰冻!', '#00bfff');
            triggerRelicHighlight('frostCore'); // 触发高亮
            // 冰爆伤害
            enemies.forEach(nearby => {
                if (nearby !== e && !nearby.flying) {
                    const dist = Math.sqrt((nearby.x - e.x) ** 2 + (nearby.y - e.y) ** 2);
                    if (dist < 100) {
                        nearby.currentHp -= 15;
                        nearby.hitFlash = 8;
                        relicState.frostStacks.set(nearby, (relicState.frostStacks.get(nearby) || 0) + 2);
                        spawnFloatingText(nearby.x, nearby.y - 20, '❄️', '#00bfff');
                        if (nearby.currentHp <= 0 && !nearby.flying) {
                            nearby.flying = true;
                            nearby.vx = (Math.random() - 0.5) * 8;
                            nearby.vy = -10;
                            handleEnemyKill(nearby);
                        }
                    }
                }
            });
            for (let i = 0; i < 10; i++) {
                particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 20, color: '#00bfff', size: 4 });
            }
        } else {
            spawnFloatingText(e.x + 15, e.y - 20, `❄️x${stacks}`, '#87ceeb');
        }
    }

    // === 幻影残像：攻击召唤残影 ===
    if (playerBuffs.shadowClone && !e.flying) {
        relicState.shadowCombo++;
        // 普通残影攻击
        setTimeout(() => {
            if (!e.flying && e.currentHp > 0) {
                const shadowDmg = d * 0.4;
                e.currentHp -= shadowDmg;
                spawnFloatingText(e.x + 20, e.y - 30, '👥', '#9370db');
                if (e.currentHp <= 0 && !e.flying) {
                    e.flying = true;
                    e.vx = (Math.random() - 0.5) * 10;
                    e.vy = -10;
                    handleEnemyKill(e);
                }
            }
        }, 100);

        // 5连后释放强化残影范围斩
        if (relicState.shadowCombo >= 5) {
            relicState.shadowCombo = 0;
            showBigEvent('👥 幻影斩!', '范围攻击!', '#9370db');
            triggerRelicHighlight('shadowClone'); // 触发高亮
            enemies.forEach(nearby => {
                if (!nearby.flying) {
                    const dist = Math.sqrt((nearby.x - player.x) ** 2 + (nearby.y - player.y) ** 2);
                    if (dist < 150) {
                        const aoeD = d * 1.5;
                        nearby.currentHp -= aoeD;
                        nearby.hitFlash = 10;
                        spawnFloatingText(nearby.x, nearby.y - 30, '👥💥', '#9370db');
                        if (nearby.currentHp <= 0 && !nearby.flying) {
                            nearby.flying = true;
                            nearby.vx = (nearby.x - player.x) * 0.1;
                            nearby.vy = -12;
                            handleEnemyKill(nearby);
                        }
                    }
                }
            });
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                particles.push({ x: player.x, y: player.y, vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8, life: 20, color: '#9370db', size: 5 });
            }
            playSound('combo');
        }
    }

    // === 时空裂隙：每10次攻击重置武器冷却 ===
    if (playerBuffs.timeWarp) {
        relicState.attackCombo++;
        if (relicState.attackCombo >= 10) {
            relicState.attackCombo = 0;
            // 重置所有武器冷却
            Object.values(playerWeapons).forEach(w => w.lastTime = 0);
            d *= 2; // 下一次攻击双倍伤害
            showBigEvent('⏰ 时空重置!', '武器冷却刷新!', '#00ffff');
            triggerRelicHighlight('timeWarp'); // 触发高亮
            spawnFloatingText(player.x, player.y - 60, '⏰ 2x伤害!', '#00ffff');
            for (let i = 0; i < 8; i++) {
                particles.push({ x: player.x, y: player.y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 25, color: '#00ffff', size: 4 });
            }
            playSound('upgrade');
        }
    }

    // 显示伤害数字（区分普通/暴击/处决）
    const isExecution = hitType === 'execution';
    spawnDamageNumber(e.x, e.y, d, wasCrit, isExecution);

    // Enemy hit reaction (not for bosses on light hits, always for heavy/execution)
    const applyReaction = !e.isBoss || hitType !== 'normal';
    if (applyReaction && !e.flying) {
        e.hitFlash = 8; // White flash frames
        e.hitStun = hitType === 'execution' ? 12 : (hitType === 'heavy' ? 8 : 4);
        // Brief recoil
        const recoilStr = hitType === 'execution' ? 4 : (hitType === 'heavy' ? 2 : 1);
        e.vx += (player.x < e.x ? recoilStr : -recoilStr);
    }

    // Hitstop based on hit type
    if (hitType === 'execution') {
        triggerHitStop(HIT_STOP.EXECUTION);
        playSound('impact');
    } else if (hitType === 'heavy') {
        triggerHitStop(HIT_STOP.MEDIUM);
    } else {
        triggerHitStop(HIT_STOP.LIGHT);
    }

    if (e.currentHp <= 0 && !e.flying) {
        e.flying = true;
        e.vx = (Math.random() - 0.5) * 15;
        e.vy = -12;
        handleEnemyKill(e);
    }
}

// ==================== 敌人 ====================
function spawnEnemy() {
    let type;

    // 获取当前阶段配置
    const phaseConfig = getCurrentPhaseConfig();

    // 危险事件期间强制生成特定敌人
    if (dangerSpikeActive && dangerSpikeType) {
        switch (dangerSpikeType) {
            case 'charger_rush':
                type = specialEnemyTypes.find(t => t.role === 'charger');
                break;
            case 'shooter_surge':
                type = specialEnemyTypes.find(t => t.role === 'shooter');
                break;
            case 'bomber_wave':
                type = specialEnemyTypes.find(t => t.role === 'bomber');
                break;
            case 'tank_push':
                type = specialEnemyTypes.find(t => t.role === 'tank');
                break;
            case 'mixed_hunt':
            case 'elite_siege':
            case 'golden_hunt':
                type = specialEnemyTypes[Math.floor(Math.random() * specialEnemyTypes.length)];
                break;
        }
    }

    // 非危险事件时，使用阶段权重
    if (!type) {
        if (Math.random() < 0.45) {
            // Normal enemies
            type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        } else {
            // Special enemies with phase-based weighted selection
            const weights = {
                charger: phaseConfig.chargerWeight || 1,
                shooter: phaseConfig.shooterWeight || 1,
                bomber: phaseConfig.bomberWeight || 1,
                tank: phaseConfig.tankWeight || 0.5
            };
            const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
            let rand = Math.random() * totalWeight;

            for (const t of specialEnemyTypes) {
                const w = weights[t.role] || 1;
                rand -= w;
                if (rand <= 0) { type = t; break; }
            }
            if (!type) type = specialEnemyTypes[0];
        }
    }

    // === 时间缩放: 敌人随时间变强 ===
    const timeScale = getEnemyTimeScale();

    // 4方向生成：基于玩家位置在视野外生成
    const spawnDir = Math.floor(Math.random() * 4);
    let spawnX, spawnY, initVx = 0, initVy = 0;
    const spawnDist = gameStats.survivalTime < 30 ? GAME_CONFIG.EARLY_SPAWN_DISTANCE : GAME_CONFIG.NORMAL_SPAWN_DISTANCE;

    switch (spawnDir) {
        case 0: // 从左边
            spawnX = Math.max(0, player.x - spawnDist);
            spawnY = player.y + (Math.random() - 0.5) * canvas.height;
            initVx = 1;
            break;
        case 1: // 从右边
            spawnX = Math.min(world.width, player.x + spawnDist);
            spawnY = player.y + (Math.random() - 0.5) * canvas.height;
            initVx = -1;
            break;
        case 2: // 从上边
            spawnX = player.x + (Math.random() - 0.5) * canvas.width;
            spawnY = Math.max(0, player.y - spawnDist);
            initVy = 1;
            break;
        case 3: // 从下边
            spawnX = player.x + (Math.random() - 0.5) * canvas.width;
            spawnY = Math.min(world.height, player.y + spawnDist);
            initVy = -1;
            break;
    }
    // 确保在世界边界内
    spawnX = Math.max(50, Math.min(world.width - 50, spawnX));
    spawnY = Math.max(50, Math.min(world.height - 50, spawnY));

    // 精英几率受阶段和危险事件影响
    let eliteChance = phaseConfig.eliteChance || 0.13;
    if (dangerSpikeActive && dangerSpikeType === 'elite_siege') eliteChance = 0.8;
    if (dangerSpikeActive && dangerSpikeType === 'mixed_hunt') eliteChance = 0.4;
    if (dangerSpikeActive && dangerSpikeType === 'golden_hunt') eliteChance = 0.45;
    const isElite = Math.random() < eliteChance;
    const eliteMult = isElite ? { hp: 3, size: 1.4, speed: 1.2, points: 5 } : { hp: 1, size: 1, speed: 1, points: 1 };

    // 应用时间缩放到血量和速度
    const scaledHp = Math.ceil(type.hp * eliteMult.hp * timeScale.hp);
    const scaledSpeed = type.speed * eliteMult.speed * timeScale.speed;
    const scaledPoints = Math.ceil(type.points * eliteMult.points * timeScale.points);

    enemies.push({
        x: spawnX, y: spawnY,
        vx: initVx * scaledSpeed, vy: initVy * scaledSpeed, ...type,
        hp: scaledHp,
        size: type.size * eliteMult.size,
        points: scaledPoints,
        speed: scaledSpeed,
        originalSpeed: scaledSpeed,
        damage: timeScale.damage, // 敌人伤害倍率
        img: type.img, imgScale: type.imgScale * eliteMult.size,
        facingRight: initVx >= 0,
        name: isElite ? '精英' + type.name : (Math.random() > 0.5 ? absurdNames[Math.floor(Math.random() * absurdNames.length)] : type.name),
        currentHp: scaledHp, flying: false, rotation: 0, scale: gameState.globalScale,
        taunted: false, tauntTimer: 0, isBoss: false, isElite: isElite,
        chargeTimer: type.chargeDelay || 0, isCharging: false,
        shootTimer: type.shootCD || 0, explodeCountdown: -1, isExploding: false
    });
}

// 根据存活时间计算敌人强度缩放 (氛围增强: 新手友好化)
function getEnemyTimeScale() {
    const minutes = gameStats.survivalTime / 60;

    // 前1分钟稍微减缓
    const earlyGameFactor = minutes < 1 ? GAME_CONFIG.EARLY_GAME_FACTOR : 1;
    // 后期难度提升
    const lateGameBonus = minutes > 4 ? (minutes - 4) * 0.2 : 0;

    // 血量: 每分钟+12%，前期减半，后期加速
    const hpScale = 1 + minutes * 0.12 * earlyGameFactor + lateGameBonus;
    // 速度: 每分钟+3%，上限1.5x
    const speedScale = 1 + minutes * 0.03 * earlyGameFactor;
    // 伤害: 每分钟+6%，前期减半，后期加速
    const damageScale = 1 + minutes * 0.06 * earlyGameFactor + lateGameBonus * 0.5;
    // 分数: 每分钟+20%
    const pointsScale = 1 + minutes * 0.20;

    return {
        hp: hpScale,
        speed: Math.min(speedScale, 1.5),  // 速度上限1.5倍
        damage: damageScale,
        points: pointsScale
    };
}

function spawnBoss() {
    playSound('boss');
    showEvent(bossQuotes[Math.floor(Math.random() * bossQuotes.length)]);
    const name = bossNames[Math.floor(Math.random() * bossNames.length)];
    const bossImg = Math.random() > 0.5 ? 'boss1' : 'boss2';

    // Boss也随时间变强
    const timeScale = getEnemyTimeScale();
    const bossHp = Math.ceil(60 * timeScale.hp);
    const bossSpeed = 1.2 * Math.min(timeScale.speed, 1.3);
    const bossPoints = Math.ceil(5000 * timeScale.points);

    // 俯视角4方向生成（基于玩家位置）
    const spawnDir = Math.floor(Math.random() * 4);
    let spawnX, spawnY;
    const bossSpawnDist = 600;
    switch (spawnDir) {
        case 0: spawnX = Math.max(100, player.x - bossSpawnDist); spawnY = player.y; break;
        case 1: spawnX = Math.min(world.width - 100, player.x + bossSpawnDist); spawnY = player.y; break;
        case 2: spawnX = player.x; spawnY = Math.max(100, player.y - bossSpawnDist); break;
        case 3: spawnX = player.x; spawnY = Math.min(world.height - 100, player.y + bossSpawnDist); break;
    }

    enemies.push({
        x: spawnX, y: spawnY, vx: 0, vy: 0, name, color: '#ffd700',
        hp: bossHp, currentHp: bossHp, speed: bossSpeed, originalSpeed: bossSpeed, size: 85, points: bossPoints,
        role: 'boss', flying: false, rotation: 0, scale: 1, taunted: false, tauntTimer: 0,
        isBoss: true, bossTimer: 0, bossSkillCD: 80,
        phase: 1, enraged: false, attackCD: 0, summonCD: 0,
        img: bossImg, imgScale: 0.18, facingRight: spawnX < canvas.width / 2
    });
    document.getElementById('bossHealthBar').style.display = 'block';
    document.querySelector('#bossHealthBar .boss-name').textContent = '👑 ' + name;
}

// Boss AI update - called from main update loop
function updateBossAI(boss) {
    if (!boss || boss.flying) return;

    boss.bossTimer++;

    // Phase 2: Enraged at 50% HP
    if (!boss.enraged && boss.currentHp <= boss.hp * 0.5) {
        boss.enraged = true;
        boss.phase = 2;
        boss.speed = boss.originalSpeed * 1.5;
        boss.color = '#ff4444';
        showEvent('🔥 Boss狂暴化!');
        gameState.screenShake = 20;
        playSound('boss');
        // Burst of minions on enrage
        for (let i = 0; i < 3; i++) {
            setTimeout(() => spawnBossMinion(boss), i * 200);
        }
    }

    // Movement: approach player but keep some distance（俯视角8方向）
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    const targetDist = boss.enraged ? 100 : 150;
    if (distToPlayer > targetDist + 50 && distToPlayer > 0) {
        boss.vx = (dx / distToPlayer) * boss.speed;
        boss.vy = (dy / distToPlayer) * boss.speed;
    } else if (distToPlayer < targetDist - 30 && distToPlayer > 0) {
        boss.vx = -(dx / distToPlayer) * boss.speed * 0.5;
        boss.vy = -(dy / distToPlayer) * boss.speed * 0.5;
    } else {
        boss.vx = 0;
        boss.vy = 0;
    }

    // Summon minions periodically (kickable projectiles!)
    boss.summonCD = (boss.summonCD || 0) - 1;
    if (boss.summonCD <= 0) {
        boss.summonCD = boss.enraged ? 180 : 300; // Faster in enraged
        spawnBossMinion(boss);
        spawnFloatingText(boss.x, boss.y - 50, '召唤!', '#ffd700');
    }

    // Update boss health bar
    const hpPercent = (boss.currentHp / boss.hp) * 100;
    document.getElementById('bossHpFill').style.width = hpPercent + '%';
    if (boss.enraged) {
        document.getElementById('bossHpFill').style.background = 'linear-gradient(90deg, #ff4444, #ff0000)';
    }
}

function spawnBossMinion(boss) {
    // Spawn a weak enemy that's perfect for kicking into the boss!
    // 俯视角方向计算
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dist > 0 ? dx / dist : 0;
    const dirY = dist > 0 ? dy / dist : 0;

    const minion = {
        x: boss.x + (Math.random() - 0.5) * 60,
        y: boss.y + (Math.random() - 0.5) * 60,
        vx: dirX * 2,
        vy: dirY * 2,
        name: '小弟', color: '#ff6b6b',
        hp: 1, currentHp: 1, speed: 2.5, originalSpeed: 2.5,
        size: 30, points: 50, role: 'normal',
        flying: false, rotation: 0, scale: 1,
        taunted: false, tauntTimer: 0, isBoss: false, isElite: false,
        isBossMinion: true, weakened: true, // Pre-weakened = easy execution kicks!
        img: 'monster1', imgScale: 0.06, facingRight: player.x > boss.x
    };
    enemies.push(minion);
}

function spawnItem() {
    const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    // 俯视角道具在安全位置生成
    const pos = getSafeRandomPosition(60, 20);
    items.push({ x: pos.x, y: pos.y, ...type, bobOffset: Math.random() * Math.PI * 2 });
}

function useItem() {
    if (!player.item || player.isDead) return;
    const item = player.item;
    if (item.effect === 'melee') enemies.forEach(e => { if (Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2) < 100) { dealDamageToEnemy(e, item.damage); spawnHitEffect(e.x, e.y, 2); } });
    else if (item.effect === 'bomb') { enemies.forEach(e => { if (Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2) < item.radius) { e.currentHp = 0; e.flying = true; e.vy = -12; handleEnemyKill(e); } }); gameState.screenShake = 20; }
    else if (item.effect === 'pushAll') enemies.forEach(e => { e.vx += (e.x > player.x ? 1 : -1) * item.force; e.vy = -6; });
    spawnFloatingText(player.x, player.y - 40, item.emoji, item.color);
    player.item = null;
}

function handleEnemyKill(e) {
    playSound('kill');
    // A1: 击杀时停增强 - 精英/Boss有更长的时停
    triggerHitStop(e.isBoss ? HIT_STOP.HEAVY : (e.isElite ? HIT_STOP.MEDIUM : HIT_STOP.LIGHT));
    // A5: 多杀计数
    multiKillCount++;
    multiKillTimer = 45; // 0.75秒窗口

    // === 精英死亡AOE爆炸 (所有精英都有) ===
    if (e.isElite && !playerBuffs.explosiveFinish) {
        const aoeRange = GAME_CONFIG.ELITE_DEATH_AOE_RANGE;
        const aoeDmg = GAME_CONFIG.ELITE_DEATH_AOE_DAMAGE;
        enemies.forEach(nearby => {
            if (nearby !== e && !nearby.flying) {
                const dist = Math.sqrt((nearby.x - e.x) ** 2 + (nearby.y - e.y) ** 2);
                if (dist < aoeRange) {
                    nearby.currentHp -= aoeDmg;
                    nearby.hitFlash = 8;
                    if (nearby.currentHp <= 0 && !nearby.flying) {
                        nearby.flying = true;
                        nearby.vx = (nearby.x - e.x) * 0.1;
                        nearby.vy = -8;
                        handleEnemyKill(nearby);
                    }
                }
            }
        });
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            particles.push({
                x: e.x, y: e.y,
                vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
                life: 18, color: '#ffd700', size: 5
            });
        }
        gameState.screenShake = Math.min(gameState.screenShake + 6, 15);
        spawnFloatingText(e.x, e.y - 40, '💥精英爆破!', '#ffd700');
    }

    // === 肾上腺素击杀回血 ===
    if (adrenalineActive && gameState.lives < maxPlayerLives && Math.random() < GAME_CONFIG.ADRENALINE_LIFESTEAL) {
        gameState.lives++;
        updatePlayerHealthBar(false);
        spawnFloatingText(player.x, player.y - 50, '💢回血!', '#ff4444');
    }

    // === 血之狂欢: 2秒内杀3个=回满血 ===
    if (playerBuffs.bloodFrenzy) {
        bloodFrenzyKills++;
        bloodFrenzyTimer = 120; // 2秒窗口
        if (bloodFrenzyKills >= 3) {
            gameState.lives = maxPlayerLives;
            buildHpSegments();
            updatePlayerHealthBar(false);
            spawnFloatingText(player.x, player.y - 70, '🩸 血之狂欢! 满血!', '#ff0000');
            gameState.screenShake = 12;
            playSound('upgrade');
            bloodFrenzyKills = 0;
            bloodFrenzyTimer = 0;
        }
    }

    // === 连锁爆炸: 击杀触发二次爆炸 ===
    if (playerBuffs.chainExplosion && !e._chainExploded) {
        e._chainExploded = true;
        chainExplosionQueue.push({ x: e.x, y: e.y });
    }

    // === 感电扩散: 被电敌人死亡时电击周围 ===
    if (playerBuffs.shockSpread && (e.slowed || e.stunned)) {
        enemies.forEach(nearby => {
            if (nearby !== e && !nearby.flying) {
                const dist = Math.sqrt((nearby.x - e.x) ** 2 + (nearby.y - e.y) ** 2);
                if (dist < 120) {
                    dealDamageToEnemy(nearby, 6);
                    nearby.stunned = true;
                    nearby.stunTimer = 30;
                    for (let j = 0; j < 4; j++) {
                        particles.push({
                            x: nearby.x, y: nearby.y,
                            vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                            life: 10, color: '#ffff00', size: 3
                        });
                    }
                }
            }
        });
    }

    // === 新遗物系统 ===

    // 吸血獠牙：击杀残血敌人必回血
    if (playerBuffs.vampireFang && gameState.lives < maxPlayerLives) {
        // 残血敌人(30%以下)必定回血
        if (e.currentHp <= e.hp * 0.3) {
            gameState.lives++;
            updatePlayerHealthBar(false);
            spawnFloatingText(player.x, player.y - 50, '🧛处决回血!', '#ff6b6b');
            triggerRelicHighlight('vampireFang'); // 触发高亮
        }
    }

    // 爆裂终结者：击杀爆炸，异常状态敌人爆炸翻倍
    if (playerBuffs.explosiveFinish) {
        triggerRelicHighlight('explosiveFinish'); // 触发高亮
        const hasAbnormal = e.slowed || e.frozen || e.slowTimer > 0;
        const explosionRange = hasAbnormal ? 160 : 80;
        const explosionDmg = hasAbnormal ? 20 : 8;
        const explosionColor = hasAbnormal ? '#ff00ff' : '#ff6600';

        enemies.forEach(nearby => {
            if (nearby !== e && !nearby.flying) {
                const dist = Math.sqrt((nearby.x - e.x) ** 2 + (nearby.y - e.y) ** 2);
                if (dist < explosionRange) {
                    nearby.currentHp -= explosionDmg;
                    nearby.hitFlash = 10;
                    spawnFloatingText(nearby.x, nearby.y - 20, hasAbnormal ? '💥💥' : '💥', explosionColor);
                    if (nearby.currentHp <= 0 && !nearby.flying) {
                        nearby.flying = true;
                        nearby.vx = (nearby.x - e.x) * 0.15;
                        nearby.vy = -12;
                        handleEnemyKill(nearby);
                    }
                }
            }
        });

        const particleCount = hasAbnormal ? 12 : 6;
        for (let i = 0; i < particleCount; i++) {
            particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 20, color: explosionColor, size: hasAbnormal ? 6 : 4 });
        }
        if (hasAbnormal) {
            spawnFloatingText(e.x, e.y - 50, '💥异常爆破!', '#ff00ff');
        }
    }

    // 黄金猎手：连杀奖励递增
    if (playerBuffs.goldHunter) {
        relicState.killStreak++;
        relicState.killStreakTimer = 120; // 2秒窗口

        let bonusMult = 1;
        let streakText = '';
        if (relicState.killStreak >= 10) {
            bonusMult = 4; streakText = '💰10连杀! x4';
        } else if (relicState.killStreak >= 5) {
            bonusMult = 2.5; streakText = '💰5连杀! x2.5';
        } else if (relicState.killStreak >= 2) {
            bonusMult = 1.5; streakText = '💰连杀! x1.5';
        }

        if (bonusMult > 1) {
            const bonusCoins = Math.floor(e.points * (bonusMult - 1) / 50);
            gameState.score += bonusCoins * 50;
            spawnFloatingText(e.x, e.y - 60, streakText, '#ffd700');
            triggerRelicHighlight('goldHunter'); // 触发高亮
        }

        // 精英必掉稀有宝箱
        if (e.isElite && KUOSAO_MODE.enabled) {
            spawnChest(e.x, e.y, 'rare');
            spawnFloatingText(e.x, e.y - 80, '💰稀有箱!', '#4fc3f7');
        }
    }

    // 灵魂收割者：收集灵魂
    if (playerBuffs.soulReaper) {
        relicState.souls++;
        spawnFloatingText(e.x, e.y - 30, '💀', '#9400d3');

        // 满20个灵魂触发灵魂风暴
        if (relicState.souls >= 20) {
            relicState.souls = 0;
            showBigEvent('💀 灵魂风暴!', '范围伤害+满血+无敌!', '#9400d3');
            gameState.screenShake = 25;
            triggerRelicHighlight('soulReaper'); // 触发高亮

            // 范围伤害
            enemies.forEach(nearby => {
                if (!nearby.flying) {
                    const dist = Math.sqrt((nearby.x - player.x) ** 2 + (nearby.y - player.y) ** 2);
                    if (dist < 250) {
                        nearby.currentHp -= 50;
                        nearby.hitFlash = 15;
                        spawnFloatingText(nearby.x, nearby.y - 20, '💀💀', '#9400d3');
                        if (nearby.currentHp <= 0 && !nearby.flying) {
                            nearby.flying = true;
                            nearby.vx = (nearby.x - player.x) * 0.1;
                            nearby.vy = -15;
                            handleEnemyKill(nearby);
                        }
                    }
                }
            });

            // 满血+无敌
            gameState.lives = maxPlayerLives;
            updatePlayerHealthBar(false);
            player.invincible = true;
            player.invincibleTimer = 180;

            // 灵魂风暴粒子
            for (let i = 0; i < 25; i++) {
                const angle = (i / 25) * Math.PI * 2;
                particles.push({ x: player.x, y: player.y, vx: Math.cos(angle) * 12, vy: Math.sin(angle) * 12, life: 30, color: '#9400d3', size: 6 });
            }
            playSound('combo');
        }
    }

    // === 旧遗物效果(兼容) ===
    // 爆裂终结(旧)：击杀敌人时爆炸
    if (playerBuffs.killExplosion && !playerBuffs.explosiveFinish) {
        enemies.forEach(nearby => {
            if (nearby !== e && !nearby.flying) {
                const dist = Math.sqrt((nearby.x - e.x) ** 2 + (nearby.y - e.y) ** 2);
                if (dist < 80) {
                    dealDamageToEnemy(nearby, 5);
                    spawnFloatingText(nearby.x, nearby.y - 20, '💥', '#ff6600');
                }
            }
        });
        for (let i = 0; i < 6; i++) {
            particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 15, color: '#ff6600', size: 4 });
        }
    }
    // 灵魂收割者(旧)：击杀回血
    if (playerBuffs.killHeal && !playerBuffs.soulReaper && gameState.lives < maxPlayerLives) {
        gameState.lives++;
        updatePlayerHealthBar(false);
        spawnFloatingText(player.x, player.y - 50, '💀+1❤️', '#4ade80');
    }
    // 黄金猎手(旧)：双倍奖励
    if (playerBuffs.doubleReward && !playerBuffs.goldHunter) {
        gameStats.bonusBones += Math.floor(e.points / 100);
    }

    gameStats.killCount++;
    gameState.combo++;
    if (gameState.combo > gameStats.maxCombo) gameStats.maxCombo = gameState.combo;
    gameState.comboTimer = Math.floor(playerBuffs.comboKeep);
    const bonus = Math.floor(e.points * gameState.combo * playerBuffs.scoreMultiplier);
    gameState.score += bonus;

    // 掉落经验宝石 (割草模式)
    if (KUOSAO_MODE.enabled && KUOSAO_MODE.xpEnabled) {
        let xpValue = GAME_CONFIG.BASE_XP_DROP;
        if (e.isBoss) xpValue = GAME_CONFIG.BOSS_XP_DROP;
        else if (e.isElite) xpValue = GAME_CONFIG.ELITE_XP_MULT;
        else if (e.hp >= 3) xpValue = 5;

        // 经验加成
        if (playerBuffs.xpMultiplier) xpValue = Math.floor(xpValue * playerBuffs.xpMultiplier);

        gemPool.spawn(e.x, e.y, xpValue);

        // 精英/Boss额外掉落多个宝石
        if (e.isElite) {
            for (let i = 0; i < 3; i++) {
                gemPool.spawn(e.x + (Math.random() - 0.5) * 40, e.y + (Math.random() - 0.5) * 40, 5);
            }
        }
    }

    // 宝箱掉落 (割草模式 - 4级分层) - 降低爆率
    if (KUOSAO_MODE.enabled) {
        if (e.isBoss) {
            // Boss必掉Boss箱
            spawnChest(e.x, e.y, 'boss');
        } else if (e.isElite) {
            // 精英怪: 8%史诗箱, 15%稀有箱, 20%普通箱 (总43%)
            const roll = Math.random();
            if (roll < 0.08) spawnChest(e.x, e.y, 'epic');
            else if (roll < 0.23) spawnChest(e.x, e.y, 'rare');
            else if (roll < 0.43) spawnChest(e.x, e.y, 'normal');
        } else {
            // 普通怪: 0.8%普通箱, 0.1%稀有箱
            const roll = Math.random();
            if (roll < 0.001) spawnChest(e.x, e.y, 'rare');
            else if (roll < 0.009) spawnChest(e.x, e.y, 'normal');
        }
    }

    if (e.isBoss) {
        gameStats.bossKilled++;
        document.getElementById('bossHealthBar').style.display = 'none';

        // 大型Boss击败提示
        showBigEvent('👑 Boss已击败!', '阶段考试通过', '#ffd700');
        playSound('upgrade');

        // 满血击败Boss成就追踪
        if (gameState.lives >= maxPlayerLives) {
            saveData.perfectBossKills++;
            saveGame();
            setTimeout(() => showBigEvent('✨ 完美击杀!', '无伤过关', '#ff00ff'), 800);
        }

        // Boss庆祝粒子
        if (particles.length < 30) {
            for (let i = 0; i < 15; i++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 40, color: '#ffd700', size: 6 });
        }

        spawnRelic(e.x, e.y); // Guaranteed relic from boss

        if (playerBuffs.bossHealOnKill && gameState.lives < maxPlayerLives) {
            const heal = Math.min(playerBuffs.bossHealOnKill, maxPlayerLives - gameState.lives);
            if (heal > 0) {
                gameState.lives += heal;
                updatePlayerHealthBar(false);
                spawnFloatingText(e.x, e.y - 105, `🍖 +${heal}命`, '#4ade80');
            }
        }

        if (!outGameProgress.claimedBossRewards.firstBoss) {
            outGameProgress.claimedBossRewards.firstBoss = true;
            gameStats.bonusGoldTags += 1;
            spawnFloatingText(e.x, e.y - 125, '🏅 首次Boss击破!', '#ffd700');
        }

        // Bonus currency
        gameState.score += 3000;
        spawnFloatingText(e.x, e.y - 50, '+3000 Boss奖励!', '#ffd700');

        // === Boss击败奖励系统 ===
        const bossRewardRoll = Math.random();
        if (bossRewardRoll < 0.3) {
            // 30%几率回血
            if (gameState.lives < maxPlayerLives) {
                gameState.lives++;
                buildHpSegments();
                updatePlayerHealthBar(false);
                spawnFloatingText(e.x, e.y - 80, '❤️ 生命恢复!', '#ff6b6b');
            }
        } else if (bossRewardRoll < 0.5) {
            // 20%几率触发稀有升级
            setTimeout(() => {
                showBigEvent('🎁 稀有奖励!', '获得额外升级', '#9b59b6');
                showKuosaoUpgradePanel();
            }, 1000);
        }

        // Boss掉落大量经验宝石
        if (KUOSAO_MODE.enabled && KUOSAO_MODE.xpEnabled) {
            for (let i = 0; i < 20; i++) {
                gemPool.spawn(e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 120, 30);
            }
        }

        // 清除当前危险事件
        if (dangerSpikeActive) {
            dangerSpikeActive = false;
            dangerSpikeType = null;
            showEvent('危机解除');
        }
    }
    if (e.isElite) {
        showEvent('精英击杀!');
        if (playerBuffs.extraEliteBones) {
            gameStats.bonusBones += playerBuffs.extraEliteBones;
            spawnFloatingText(e.x, e.y - 55, `🦴+${playerBuffs.extraEliteBones}`, '#ffd700');
        }
        if (playerBuffs.relicDropBonus > 0 && Math.random() < playerBuffs.relicDropBonus) {
            spawnRelic(e.x, e.y);
            spawnFloatingText(e.x, e.y - 80, '👑 遗物嗅到了!', '#9b59b6');
        }
        // 减少精英粒子
        if (particles.length < 20) {
            for (let i = 0; i < 5; i++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 20, color: '#ffd700', size: 4 });
        }
    }
    spawnFloatingText(e.x, e.y - 20, '+' + bonus, e.isElite ? '#ffd700' : '#fff');
    if (gameState.combo >= 3) showCombo(gameState.combo);
}

function checkChainCollision() {
    let chainCount = 0;

    // 使用空间分区优化碰撞检测 (割草模式)
    if (KUOSAO_MODE.enabled && enemies.length > 30) {
        spatialGrid.clear();
        enemies.forEach(e => {
            if (!e.flying) spatialGrid.insert(e);
        });
    }

    for (let i = 0; i < enemies.length; i++) {
        if (!enemies[i].flying) continue;

        // 使用空间分区查询附近敌人
        let nearbyEnemies;
        if (KUOSAO_MODE.enabled && enemies.length > 30) {
            nearbyEnemies = spatialGrid.query(enemies[i].x, enemies[i].y, 100);
        } else {
            nearbyEnemies = enemies.filter((e, idx) => idx !== i && !e.flying);
        }

        for (const target of nearbyEnemies) {
            if (target === enemies[i] || target.flying) continue;
            const dx = target.x - enemies[i].x, dy = target.y - enemies[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (enemies[i].size + target.size) / 2) {
                const j = enemies.indexOf(target);
                if (j === -1) continue;
                // Boss不会被连锁秒杀，而是受到伤害
                if (enemies[j].isBoss) {
                    const chainDmg = 5 + chainCount * 2; // 连锁伤害
                    enemies[j].currentHp -= chainDmg;
                    spawnHitEffect(enemies[j].x, enemies[j].y, 3, true);
                    spawnFloatingText(enemies[j].x, enemies[j].y - 30, '-' + chainDmg, '#ffd700');
                    gameState.screenShake = 12;
                    playSound('impact');
                    // 更新Boss血条
                    const hpPercent = Math.max(0, (enemies[j].currentHp / enemies[j].hp) * 100);
                    document.getElementById('bossHpFill').style.width = hpPercent + '%';
                    // Boss死亡检查
                    if (enemies[j].currentHp <= 0 && !enemies[j].flying) {
                        enemies[j].flying = true;
                        enemies[j].vx = (Math.random() - 0.5) * 15;
                        enemies[j].vy = -12;
                        handleEnemyKill(enemies[j]);
                    }
                    continue; // Boss不参与连锁传递
                }

                chainCount++;
                enemies[j].flying = true;
                enemies[j].currentHp = 0;
                enemies[j].isProjectile = true;

                // Transfer momentum with boost
                const p = Math.sqrt(enemies[i].vx ** 2 + enemies[i].vy ** 2);
                const transferMult = 1.3; // Chain gets stronger!
                enemies[j].vx = (dx / dist) * p * transferMult;
                enemies[j].vy = (dy / dist) * p * transferMult - 10;

                // Chain bonus score
                const chainBonus = 200 * chainCount;
                gameState.score += chainBonus;

                handleEnemyKill(enemies[j]);

                // Enhanced chain hit effect
                const hitPower = 2 + chainCount * 0.8;
                spawnHitEffect(enemies[j].x, enemies[j].y, hitPower, chainCount >= 2);

                // Hitstop for chains
                triggerHitStop(chainCount >= 2 ? HIT_STOP.MEDIUM : HIT_STOP.LIGHT);

                // Chain collision sound
                playSound('chain');

                // Escalating feedback
                const chainTexts = ['连锁!', '双杀!', '三连!', '超神!', '绝杀!'];
                const chainColors = ['#ff6b35', '#ffd700', '#ff69b4', '#00ffff', '#ff0000'];
                const textIdx = Math.min(chainCount - 1, chainTexts.length - 1);
                const textSize = 22 + chainCount * 4;
                floatingTexts.push({ x: (enemies[i].x + enemies[j].x) / 2, y: enemies[i].y - 25, text: chainTexts[textIdx] + '+' + chainBonus, color: chainColors[textIdx], vy: -3, life: 60, size: textSize, isText: true });

                // Screen shake scales with chain
                gameState.screenShake = Math.min(6 + chainCount * 5, 22);

                // Sound feedback for bigger chains
                if (chainCount >= 2) playSound('combo');
            }
        }
    }
    // Big chain reaction reward
    if (chainCount >= 3) {
        showEvent('🔥 ' + chainCount + '连锁反应!');
        gameState.score += chainCount * 500;
        triggerHitStop(HIT_STOP.HEAVY);
        gameState.slowMo = true;
        gameState.slowMoTimer = 15;
        document.getElementById('slowmo').style.opacity = 0.25;
    }
    // 记录最大连锁
    if (chainCount > 0 && chainCount > saveData.maxChain) {
        saveData.maxChain = chainCount;
        saveGame();
    }
}

// 特效
function spawnDanmaku(text) {
    const el = document.getElementById('danmaku'), item = document.createElement('div');
    item.className = 'danmaku-item';
    item.textContent = text || danmakuTexts[Math.floor(Math.random() * danmakuTexts.length)];
    item.style.top = (Math.random() * 50 + 10) + '%';
    item.style.color = ['#fff', '#ffd700', '#ff6b6b', '#4ade80'][Math.floor(Math.random() * 4)];
    el.appendChild(item);
    setTimeout(() => item.remove(), 4000);
}

function showEvent(text) { const el = document.getElementById('event'); el.textContent = text; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 1200); }
// A3: 连击视觉升级 - 越高越大越亮
function showCombo(c) {
    playSound('combo');
    const el = document.getElementById('combo');
    const colors = ['#ffffff', '#ffd700', '#ff6b6b', '#ff00ff', '#00ffff'];
    const colorIdx = Math.min(Math.floor(c / 5), colors.length - 1);
    const scale = 1 + Math.min(c * 0.08, 1.5);
    const duration = 400 + Math.min(c * 30, 600);
    el.textContent = c + ' COMBO!';
    el.style.color = colors[colorIdx];
    el.style.transform = `scale(${scale})`;
    el.style.textShadow = `0 0 ${10 + c}px ${colors[colorIdx]}`;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; el.style.transform = 'scale(1)'; }, duration);
}
// A5: 多杀提示
function showMultiKill(text, count) {
    playSound('combo');
    const colors = ['#ffd700', '#ff6b6b', '#ff00ff', '#00ffff', '#ff0000'];
    const color = colors[Math.min(count - 2, colors.length - 1)];
    spawnFloatingText(player.x, player.y - 80, text, color, { size: 24 + count * 4, isCrit: true, life: 80 });
    gameState.screenShake = Math.min(5 + count * 3, 20);
    if (count >= 4) { gameState.slowMo = true; gameState.slowMoTimer = 15; document.getElementById('slowmo').style.opacity = 0.3; }
}
function spawnHitEffect(x, y, power, isExecution = false) {
    // 限制粒子总数，防止卡顿
    if (particles.length > 50) return;

    const particleCount = Math.floor(3 + power * 2);  // 大幅减少粒子数
    const baseSpeed = 2 + power * 2;
    const baseSize = 2 + power;
    const colors = isExecution ? ['#ffd700', '#ffffff'] : ['#ffd700', '#e94560'];

    for (let i = 0; i < particleCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = baseSpeed + Math.random() * baseSpeed;
        particles.push({
            x, y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 15,  // 缩短生命周期
            color: colors[i % colors.length],
            size: baseSize
        });
    }

    // 只在处决时显示特效
    if (isExecution && particles.length < 40) {
        particles.push({ x, y, vx: 0, vy: 0, life: 10, color: '#ffd700', size: 15, expanding: true, isWave: true });
    }

    // 减少飘字频率
    if (Math.random() < 0.3) {
        floatingTexts.push({ x: x, y: y - 15, text: emojis[Math.floor(Math.random() * emojis.length)], vy: -2, life: 25, size: 18 });
    }
}
function spawnFloatingText(x, y, text, color, options = {}) {
    const size = options.size || 18;
    const isCrit = options.isCrit || false;
    const life = options.life || 50;
    floatingTexts.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        text,
        color,
        vy: isCrit ? -3.5 : -2,
        life: isCrit ? 70 : life,
        size: isCrit ? size * 1.8 : size,
        isText: true,
        isCrit,
        scale: isCrit ? 1.5 : 1,
        scaleDecay: isCrit ? 0.02 : 0
    });
}

// 伤害数字飞字（区分普通/暴击）
function spawnDamageNumber(x, y, damage, isCrit = false, isExecution = false) {
    const dmgText = Math.round(damage);
    let color = '#ffffff';
    let size = 16;

    if (isExecution) {
        color = '#ffd700';
        size = 28;
    } else if (isCrit) {
        color = '#ff4444';
        size = 24;
    }

    spawnFloatingText(x, y - 20, dmgText.toString(), color, {
        size,
        isCrit: isCrit || isExecution,
        life: isCrit || isExecution ? 60 : 40
    });
}

function triggerRandomEvent() {
    // Replaced with danger spike system
    if (dangerSpikeActive) return;
    triggerDangerSpike();
}

function triggerDangerSpike() {
    if (dangerSpikeActive) return;
    const spikePool = playerBuffs.unlockGoldenEvent ? dangerSpikes : dangerSpikes.slice(0, 6);
    const spike = spikePool[Math.floor(Math.random() * spikePool.length)];
    dangerSpikeActive = true;
    dangerSpikeType = spike.type;
    dangerSpikeTimer = spike.duration * 60; // frames

    showEvent('⚠️ ' + spike.name);
    gameState.screenShake = 10;
    playSound('boss');

    // Spawn appropriate enemies for the danger spike
    if (spike.type === 'charger_rush') {
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                if (gamePhase === 'playing') {
                    const charger = specialEnemyTypes.find(e => e.role === 'charger');
                    spawnSpecificEnemy(charger);
                }
            }, i * 400);
        }
    } else if (spike.type === 'shooter_surge') {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (gamePhase === 'playing') {
                    const shooter = specialEnemyTypes.find(e => e.role === 'shooter');
                    spawnSpecificEnemy(shooter);
                }
            }, i * 500);
        }
    } else if (spike.type === 'bomber_wave') {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (gamePhase === 'playing') {
                    const bomber = specialEnemyTypes.find(e => e.role === 'bomber');
                    spawnSpecificEnemy(bomber);
                }
            }, i * 300);
        }
    } else if (spike.type === 'golden_hunt') {
        gameStats.bonusBones += 20;
        showEvent('🦴 黄金狗潮，工资到账!');
    }
}

function spawnSpecificEnemy(type) {
    if (!type) return;
    // 4方向生成（基于玩家位置）
    const spawnDir = Math.floor(Math.random() * 4);
    let spawnX, spawnY, initVx = 0, initVy = 0;
    const spawnDist = 500;

    switch (spawnDir) {
        case 0: spawnX = Math.max(50, player.x - spawnDist); spawnY = player.y + (Math.random() - 0.5) * 400; initVx = 1; break;
        case 1: spawnX = Math.min(world.width - 50, player.x + spawnDist); spawnY = player.y + (Math.random() - 0.5) * 400; initVx = -1; break;
        case 2: spawnX = player.x + (Math.random() - 0.5) * 400; spawnY = Math.max(50, player.y - spawnDist); initVy = 1; break;
        case 3: spawnX = player.x + (Math.random() - 0.5) * 400; spawnY = Math.min(world.height - 50, player.y + spawnDist); initVy = -1; break;
    }
    spawnX = Math.max(50, Math.min(world.width - 50, spawnX));
    spawnY = Math.max(50, Math.min(world.height - 50, spawnY));

    enemies.push({
        x: spawnX, y: spawnY,
        vx: initVx * type.speed, vy: initVy * type.speed, ...type,
        currentHp: type.hp, hp: type.hp,
        flying: false, rotation: 0, scale: 1,
        taunted: false, tauntTimer: 0, isBoss: false, isElite: false,
        chargeTimer: type.chargeDelay || 0, isCharging: false,
        shootTimer: type.shootCD || 0, explodeCountdown: -1, isExploding: false,
        facingRight: initVx >= 0, img: type.img, imgScale: type.imgScale,
        name: type.name, originalSpeed: type.speed
    });
}

function updateDangerSpike() {
    if (!dangerSpikeActive) return;
    dangerSpikeTimer--;

    // 危险事件期间加速刷怪
    if (dangerSpikeTimer % 30 === 0 && enemies.filter(e => !e.flying).length < 25) {
        spawnEnemy();
    }

    if (dangerSpikeTimer <= 0) {
        dangerSpikeActive = false;
        dangerSpikeType = null;
        dangerSpikeData = null;
        showBigEvent('✅ 危机解除!', '成功存活', '#4ade80');
        // Reward for surviving - 更多奖励
        const bonusScore = 800 + currentEndlessPhase * 200;
        gameState.score += bonusScore;
        spawnFloatingText(player.x, player.y - 60, '+' + bonusScore + ' 危机奖励!', '#4ade80');
        if (playerBuffs.dangerRewardBonus) {
            gameStats.bonusBones += playerBuffs.dangerRewardBonus;
            spawnFloatingText(player.x, player.y - 95, `🦴+${playerBuffs.dangerRewardBonus}`, '#ffd700');
        }
        // 掉落经验宝石
        if (KUOSAO_MODE.enabled && KUOSAO_MODE.xpEnabled) {
            for (let i = 0; i < 8; i++) {
                gemPool.spawn(player.x + (Math.random() - 0.5) * 150, player.y + (Math.random() - 0.5) * 150, 15);
            }
        }
        if (gameState.lives < maxPlayerLives && Math.random() < 0.25) {
            gameState.lives++;
            buildHpSegments();
            updatePlayerHealthBar(false);
            spawnFloatingText(player.x, player.y - 80, '❤️ 生命恢复!', '#ff6b6b');
            spawnFloatingText(player.x, player.y - 80, '+1❤️', '#ff69b4');
        }
    }
}

function playerHit(reason, killerInfo = null) {
    if (player.invincible || player.isDead) return;
    // 格挡：完全免疫伤害
    if (player.blocking) {
        playSound('combo');
        spawnFloatingText(player.x, player.y - 40, '🛡️完美格挡!', '#ffd700');
        gameState.screenShake = 8;
        // 格挡成功给予短暂无敌
        player.invincible = true;
        player.invincibleTimer = 20;
        // 格挡成功后进入冷却
        cooldowns.block = 180; // 3秒冷却
        player.blocking = false;
        player.blockTimer = 0;
        return;
    }
    // 减伤效果：有概率完全免伤
    if (playerBuffs.damageReduce > 0 && Math.random() < playerBuffs.damageReduce) {
        playSound('dash');
        spawnFloatingText(player.x, player.y - 40, '🛡️格挡!', '#4ade80');
        player.invincible = true; player.invincibleTimer = 30;
        return;
    }

    if (gameState.lives <= 1 && playerBuffs.lowHpGuard > 0 && Math.random() < playerBuffs.lowHpGuard) {
        playSound('upgrade');
        spawnFloatingText(player.x, player.y - 40, '⚠️绝境硬扛!', '#ffd700');
        player.invincible = true;
        player.invincibleTimer = 75;
        return;
    }

    // 狗命续上效果：本局首次致命伤保留1点生命+1秒无敌
    if (gameState.lives === 1 && playerBuffs.deathSave && !playerBuffs.deathSaveUsed) {
        playerBuffs.deathSaveUsed = true;
        playSound('upgrade');
        spawnFloatingText(player.x, player.y - 40, '🐕狗命续上!', '#ffd700');
        player.invincible = true;
        player.invincibleTimer = 60; // 1秒无敌
        gameState.screenShake = 20;
        return;
    }

    if (gameState.lives <= 1 && playerBuffs.oneTimeRevive && !gameState.deathSaveUsed) {
        gameState.deathSaveUsed = true;
        playSound('upgrade');
        spawnFloatingText(player.x, player.y - 40, '📜续命成功!', '#4ade80');
        player.invincible = true;
        player.invincibleTimer = 150;
        gameState.screenShake = 20;
        return;
    }

    // 记录最长无伤时间
    if (gameStats.noHitTimer > saveData.maxNoHitTime) {
        saveData.maxNoHitTime = gameStats.noHitTimer;
        saveGame();
    }
    gameStats.noHitTimer = 0; // 重置无伤计时器

    // 记录死因详情
    if (killerInfo) {
        detailedDeathContext.killerType = killerInfo.role || 'normal';
        detailedDeathContext.killerName = killerInfo.name || '敌人';
        detailedDeathContext.wasElite = killerInfo.isElite || false;
        detailedDeathContext.wasBoss = killerInfo.isBoss || false;
        detailedDeathContext.damageType = killerInfo.damageType || 'contact';
    }

    // 雷神庇护(旧)：受伤时反弹闪电
    if (playerBuffs.thorns && !playerBuffs.thunderGod) {
        enemies.forEach(e => {
            const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
            if (dist < 150 && !e.flying) {
                dealDamageToEnemy(e, 10);
                for (let j = 0; j < 5; j++) {
                    particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 12, color: '#ffff00', size: 3 });
                }
            }
        });
        spawnFloatingText(player.x, player.y - 60, '⚡反击!', '#ffff00');
    }

    // === 雷霆之怒(新)：受伤时召唤连锁闪电，连续受伤增加闪电数量 ===
    if (playerBuffs.thunderGod) {
        triggerRelicHighlight('thunderGod'); // 触发高亮
        relicState.thunderStacks = (relicState.thunderStacks || 0) + 1;
        const lightningCount = Math.min(relicState.thunderStacks + 2, 8); // 3~8道闪电

        // 找到最近的敌人作为闪电起点
        const nearbyEnemies = enemies.filter(e => !e.flying).sort((a, b) => {
            const distA = Math.sqrt((a.x - player.x) ** 2 + (a.y - player.y) ** 2);
            const distB = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
            return distA - distB;
        }).slice(0, lightningCount);

        let chainTargets = [...nearbyEnemies];
        nearbyEnemies.forEach((target, i) => {
            setTimeout(() => {
                if (!target.flying) {
                    const dmg = 15 + relicState.thunderStacks * 5;
                    target.currentHp -= dmg;
                    target.hitFlash = 10;
                    spawnFloatingText(target.x, target.y - 20, '⚡', '#ffff00');

                    // 闪电粒子连线
                    const steps = 5;
                    for (let s = 0; s < steps; s++) {
                        const t = s / steps;
                        particles.push({
                            x: player.x + (target.x - player.x) * t + (Math.random() - 0.5) * 20,
                            y: player.y + (target.y - player.y) * t + (Math.random() - 0.5) * 20,
                            vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
                            life: 15, color: '#ffff00', size: 4
                        });
                    }

                    if (target.currentHp <= 0 && !target.flying) {
                        target.flying = true;
                        target.vx = (Math.random() - 0.5) * 10;
                        target.vy = -12;
                        handleEnemyKill(target);
                    }
                }
            }, i * 50);
        });

        const stackText = relicState.thunderStacks > 1 ? ` x${relicState.thunderStacks}` : '';
        spawnFloatingText(player.x, player.y - 60, `⚡连锁闪电!${stackText}`, '#ffff00');
        gameState.screenShake = 10 + relicState.thunderStacks * 2;

        // 5秒后重置叠层
        setTimeout(() => {
            if (relicState.thunderStacks > 0) relicState.thunderStacks = 0;
        }, 5000);
    }

    playSound('hit');

    // === 受击视觉反馈 ===
    triggerDamageVignette();
    gameState.screenShake = Math.max(gameState.screenShake, 18);

    gameState.lives--; gameState.deathReason = reason;
    document.getElementById('lives').textContent = gameState.lives;
    updatePlayerHealthBar(true);

    // 不死凤凰(新)：死亡时满血复活+全屏火焰清屏
    if (gameState.lives <= 0 && playerBuffs.phoenixRevive && !gameState.phoenixUsed) {
        gameState.phoenixUsed = true;
        gameState.lives = maxPlayerLives;
        updatePlayerHealthBar(false);
        player.invincible = true;
        player.invincibleTimer = 240; // 4秒无敌
        showBigEvent('🔥 不死凤凰!', '浴火重生 - 全屏清除!', '#ff6600');
        gameState.screenShake = 35;
        triggerRelicHighlight('phoenix'); // 触发高亮

        // 全屏火焰爆发 - 清空所有敌人
        enemies.forEach(e => {
            if (!e.flying && !e.isBoss) {
                e.currentHp = 0;
                e.flying = true;
                e.vx = (e.x - player.x) * 0.15;
                e.vy = -15;
                // 每个敌人产生火焰粒子
                for (let j = 0; j < 5; j++) {
                    particles.push({
                        x: e.x, y: e.y,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10 - 5,
                        life: 25, color: ['#ff6600', '#ff0000', '#ffd700'][Math.floor(Math.random() * 3)], size: 5
                    });
                }
                handleEnemyKill(e);
            } else if (e.isBoss) {
                // Boss受到大量伤害但不被秒杀
                e.currentHp -= e.hp * 0.5;
                e.hitFlash = 20;
                spawnFloatingText(e.x, e.y - 50, '🔥50%伤害!', '#ff6600');
            }
        });

        // 巨大火焰爆发粒子
        for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2;
            const speed = 8 + Math.random() * 8;
            particles.push({
                x: player.x, y: player.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 40, color: ['#ff6600', '#ff0000', '#ffd700'][Math.floor(Math.random() * 3)], size: 6
            });
        }

        playSound('combo');
        return;
    }

    if (gameState.lives <= 0) { player.isDead = true; player.currentState = 'dead'; endGame(); }
    else { player.invincible = true; player.invincibleTimer = Math.floor(playerBuffs.invincibleTime); gameState.screenShake = 15; spawnFloatingText(player.x, player.y - 40, '受伤!', '#e94560'); }
}

// ==================== 更新 ====================
function update() {
    if (gamePhase !== 'playing' || gameState.gameOver || gameState.isPaused) return;

    // Hitstop: pause game briefly on impact
    if (gameState.hitStop > 0) {
        gameState.hitStop--;
        return; // Skip this frame for impact freeze
    }

    const ts = gameState.slowMo ? 0.3 : 1;
    if (cooldowns.slash > 0) cooldowns.slash--;
    if (cooldowns.sajiao > 0) cooldowns.sajiao--;
    if (cooldowns.taunt > 0) cooldowns.taunt--;
    if (cooldowns.slash > 0) cooldowns.slash--;

    // === 遗物状态更新 ===
    // 毁灭使者：每5秒充能一次
    if (playerBuffs.doomSlayer && !relicState.doomReady) {
        relicState.doomChargeTimer++;
        if (relicState.doomChargeTimer >= 300) { // 5秒 = 300帧
            relicState.doomReady = true;
            relicState.doomChargeTimer = 0;
            showBigEvent('☠️ 毁灭充能!', '下次攻击500%伤害!', '#ff0000');
            spawnFloatingText(player.x, player.y - 70, '☠️充能完毕!', '#ff0000');
            playSound('upgrade');
        }
    }

    // 黄金猎手：连杀计时器
    if (playerBuffs.goldHunter && relicState.killStreakTimer > 0) {
        relicState.killStreakTimer--;
        if (relicState.killStreakTimer <= 0) {
            relicState.killStreak = 0;
        }
    }

    // 狂战之心：低血量视觉效果
    if (playerBuffs.berserkerHeart && gameState.lives <= 2) {
        relicState.berserkerPulseTimer++;
        if (relicState.berserkerPulseTimer >= 30) {
            relicState.berserkerPulseTimer = 0;
            // 红光脉冲粒子
            for (let i = 0; i < 3; i++) {
                particles.push({
                    x: player.x + (Math.random() - 0.5) * 30,
                    y: player.y + (Math.random() - 0.5) * 30,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -2 - Math.random(),
                    life: 20, color: '#ff0000', size: 4
                });
            }
        }
    }

    // 虚空漫步者：穿越敌人时留下虚空裂痕
    if (playerBuffs.voidWalker) {
        enemies.forEach(e => {
            if (!e.flying && !e.voidMarked) {
                const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
                if (dist < 40) {
                    e.voidMarked = true;
                    // 留下虚空裂痕
                    relicState.voidRifts.push({
                        x: e.x, y: e.y,
                        timer: 120 // 2秒后爆炸
                    });
                    spawnFloatingText(e.x, e.y - 20, '🌀', '#9370db');
                }
            }
        });

        // 更新虚空裂痕
        for (let i = relicState.voidRifts.length - 1; i >= 0; i--) {
            const rift = relicState.voidRifts[i];
            rift.timer--;
            // 裂痕视觉
            if (rift.timer % 20 === 0) {
                particles.push({
                    x: rift.x + (Math.random() - 0.5) * 30,
                    y: rift.y + (Math.random() - 0.5) * 30,
                    vx: 0, vy: -1,
                    life: 15, color: '#9370db', size: 3
                });
            }

            if (rift.timer <= 0) {
                // 虚空爆炸
                triggerRelicHighlight('voidWalker'); // 触发高亮
                enemies.forEach(e => {
                    if (!e.flying) {
                        const dist = Math.sqrt((e.x - rift.x) ** 2 + (e.y - rift.y) ** 2);
                        if (dist < 100) {
                            // 吸引敌人
                            e.x += (rift.x - e.x) * 0.3;
                            e.y += (rift.y - e.y) * 0.3;
                            // 造成伤害
                            e.currentHp -= 25;
                            e.hitFlash = 10;
                            spawnFloatingText(e.x, e.y - 20, '🌀', '#9370db');
                            if (e.currentHp <= 0 && !e.flying) {
                                e.flying = true;
                                e.vx = (Math.random() - 0.5) * 8;
                                e.vy = -10;
                                handleEnemyKill(e);
                            }
                        }
                    }
                });
                // 爆炸粒子
                for (let j = 0; j < 10; j++) {
                    const angle = (j / 10) * Math.PI * 2;
                    particles.push({
                        x: rift.x, y: rift.y,
                        vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
                        life: 20, color: '#9370db', size: 5
                    });
                }
                relicState.voidRifts.splice(i, 1);
            }
        }
    }

    // 霜魂之心：清理已死亡敌人的冰霜层数
    if (playerBuffs.frostCore) {
        relicState.frostStacks.forEach((stacks, enemy) => {
            if (enemy.flying || enemy.currentHp <= 0) {
                relicState.frostStacks.delete(enemy);
            }
            // 冻结状态更新
            if (enemy.frozen && enemy.frozenTimer > 0) {
                enemy.frozenTimer--;
                if (enemy.frozenTimer <= 0) {
                    enemy.frozen = false;
                }
            }
        });
    }

    // === 定期更新遗物栏UI (每15帧) ===
    if (!window.relicBarUpdateCounter) window.relicBarUpdateCounter = 0;
    window.relicBarUpdateCounter++;
    if (window.relicBarUpdateCounter >= 15) {
        window.relicBarUpdateCounter = 0;
        if (acquiredRelics.length > 0 || playerRelics.length > 0) {
            updateRelicBar();
        }
    }

    // === 肾上腺素系统 (低血量爽点) ===
    const hpRatio = gameState.lives / maxPlayerLives;
    if (hpRatio <= GAME_CONFIG.ADRENALINE_HP_THRESHOLD && hpRatio > 0) {
        if (!adrenalineActive) {
            adrenalineActive = true;
            spawnFloatingText(player.x, player.y - 70, '💢 肾上腺素爆发!', '#ff0000');
            gameState.screenShake = 5;
            playSound('upgrade');
        }
        adrenalineSpeedBonus = GAME_CONFIG.ADRENALINE_SPEED_BONUS;
        // 视觉：红色粒子
        if (Math.random() < 0.3) {
            particles.push({
                x: player.x + (Math.random() - 0.5) * 40,
                y: player.y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random(),
                life: 12, color: '#ff4444', size: 3
            });
        }
    } else {
        if (adrenalineActive) {
            adrenalineActive = false;
            spawnFloatingText(player.x, player.y - 50, '状态恢复', '#4ade80');
        }
        adrenalineSpeedBonus = 0;
    }

    // === 血之狂欢计时 ===
    if (bloodFrenzyTimer > 0) {
        bloodFrenzyTimer--;
        if (bloodFrenzyTimer <= 0) bloodFrenzyKills = 0;
    }

    // === 火雨系统 ===
    if (playerBuffs.fireRain) {
        fireRainTimer++;
        if (fireRainTimer >= 900) { // 15秒 = 900帧@60fps
            fireRainTimer = 0;
            showEvent('🌋 火雨降临!');
            gameState.screenShake = 15;
            // 在随机位置投下火球
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    if (gamePhase !== 'playing') return;
                    const fx = player.x + (Math.random() - 0.5) * 400;
                    const fy = player.y + (Math.random() - 0.5) * 400;
                    enemies.forEach(e => {
                        if (!e.flying) {
                            const dist = Math.sqrt((e.x - fx) ** 2 + (e.y - fy) ** 2);
                            if (dist < 100) dealDamageToEnemy(e, 15);
                        }
                    });
                    for (let j = 0; j < 10; j++) {
                        particles.push({
                            x: fx, y: fy,
                            vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                            life: 20, color: j % 2 === 0 ? '#ff4400' : '#ffaa00', size: 5
                        });
                    }
                }, i * 200);
            }
        }
    }

    // === 连锁爆炸处理 ===
    if (chainExplosionQueue.length > 0) {
        const explosion = chainExplosionQueue.shift();
        enemies.forEach(e => {
            if (!e.flying) {
                const dist = Math.sqrt((e.x - explosion.x) ** 2 + (e.y - explosion.y) ** 2);
                if (dist < 80) {
                    dealDamageToEnemy(e, 10);
                    e.hitFlash = 8;
                }
            }
        });
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: explosion.x, y: explosion.y,
                vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                life: 15, color: '#ff6600', size: 4
            });
        }
        gameState.screenShake = Math.min(gameState.screenShake + 5, 15);
    }

    // === 割草模式: 自动攻击 ===
    if (KUOSAO_MODE.enabled) {
        updateAutoAttack();
    }

    // === 武器系统更新 ===
    updateWeapons();

    // === 受击视觉反馈更新 ===
    updateDamageVignette();

    // === 狂战动画更新 ===
    updateBerserkerAnimation(16);

    // === 动态教程条件检测 ===
    checkTutorialCondition();

    // === 待机动画更新 ===
    updateIdleAnimation(16); // 约60fps，每帧约16ms

    // === 跑步动画更新 ===
    if (Math.abs(player.vx) > 0.5 || Math.abs(player.vy) > 0.5) {
        playerAnim.runTimer += 16;
        if (playerAnim.runTimer >= playerAnim.runSpeed) {
            playerAnim.runTimer = 0;
            playerAnim.runFrame = (playerAnim.runFrame + 1) % 5;
            // 每两帧播放一次脚步声
            if (playerAnim.runFrame % 2 === 0) {
                playSound('run');
            }
        }
    } else {
        playerAnim.runFrame = 0;
        playerAnim.runTimer = 0;
    }

    // === 死亡动画更新 ===
    if (player.isDead && !playerAnim.deathPlaying) {
        playerAnim.deathPlaying = true;
        playerAnim.deathFrame = 0;
        playerAnim.deathTimer = 0;
        playSound('death');
    }
    if (playerAnim.deathPlaying && playerAnim.deathFrame < 4) {
        playerAnim.deathTimer += 16;
        if (playerAnim.deathTimer >= playerAnim.deathSpeed) {
            playerAnim.deathTimer = 0;
            playerAnim.deathFrame++;
        }
    }

    // === 割草模式: 经验宝石收集 ===
    if (KUOSAO_MODE.enabled && KUOSAO_MODE.xpEnabled && !player.isDead) {
        const magnetRange = playerBuffs.xpMagnetRange || 50;

        for (let i = gemPool.active.length - 1; i >= 0; i--) {
            const gem = gemPool.active[i];
            if (!gem.active) continue;

            const dx = player.x - gem.x;
            const dy = player.y - gem.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 磁铁效果 - 宝石飞向玩家
            if (dist < magnetRange) {
                gem.magnetSpeed += 0.5;
                gem.x += (dx / dist) * gem.magnetSpeed;
                gem.y += (dy / dist) * gem.magnetSpeed;
            }

            // 收集宝石
            if (dist < 25) {
                const xp = gemPool.collect(gem);
                playerXP.addXP(xp);
                playSound('pickup');
                // 小特效
                particles.push({
                    x: gem.x, y: gem.y,
                    vx: 0, vy: -3,
                    life: 15, color: gem.color, size: gem.size, expanding: true
                });
            }
        }
    }

    // === 割草模式: 宝箱收集 ===
    if (KUOSAO_MODE.enabled && !player.isDead) {
        for (let i = chests.length - 1; i >= 0; i--) {
            const chest = chests[i];
            const dx = player.x - chest.x;
            const dy = player.y - chest.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 40) {
                openChest(chest);
            }
        }
    }

    // 回春术效果：缓慢回血
    if (playerBuffs.regenRate > 0) {
        if (!gameState.regenTimer) gameState.regenTimer = 0;
        gameState.regenTimer++;
        if (gameState.regenTimer >= 600 && gameState.lives < 5) { // 约10秒回1血
            gameState.lives++;
            updatePlayerHealthBar(false);
            spawnFloatingText(player.x, player.y - 60, '🌿+1❤️', '#4ade80');
            gameState.regenTimer = 0;
        }
    }
    updateCooldownUI();
    updateDangerSpike();

    // === 新升级被动效果 ===
    // 社会狗气场：周围敌人持续受伤
    if (playerBuffs.damageAura && !player.isDead) {
        enemies.forEach(e => {
            if (e.flying) return;
            const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
            if (dist < 120) {
                e.currentHp -= playerBuffs.damageAura * 0.05; // 每帧伤害
                if (Math.random() < 0.02) { // 偶尔显示伤害数字
                    spawnFloatingText(e.x, e.y - 20, '-' + playerBuffs.damageAura, '#ff6600');
                }
            }
        });
    }

    // 整活专家：随机触发各种效果
    if (playerBuffs.chaosMode && Math.random() < 0.002) {
        const chaosEffects = [
            () => { gameState.screenShake = 10; showEvent('🎪 整活: 地震!'); },
            () => { enemies.forEach(e => { if (!e.flying && Math.random() < 0.3) e.currentHp -= 5; }); showEvent('🎪 整活: 天降正义!'); },
            () => { playerBuffs.speedMult *= 1.5; setTimeout(() => playerBuffs.speedMult /= 1.5, 3000); showEvent('🎪 整活: 极速!'); },
            () => { player.invincible = true; player.invincibleTimer = 60; showEvent('🎪 整活: 无敌!'); }
        ];
        chaosEffects[Math.floor(Math.random() * chaosEffects.length)]();
    }

    // 玩家移动（8方向键盘+全向摇杆）
    if (!player.isDead && !player.blocking) {
        let moveX = 0, moveY = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) moveX = -1;
        if (keys['ArrowRight'] || keys['KeyD']) moveX = 1;
        if (keys['ArrowUp'] || keys['KeyW']) moveY = -1;
        if (keys['ArrowDown'] || keys['KeyS']) moveY = 1;

        // 摇杆全向输入
        if (isMobile) {
            if (Math.abs(touchState.moveX) > 0.2) moveX = touchState.moveX;
            if (Math.abs(touchState.moveY) > 0.2) moveY = -touchState.moveY;
        }

        // 对角线归一化
        const mag = Math.sqrt(moveX * moveX + moveY * moveY);
        const speed = 6 * (playerBuffs.speedMult || 1) * (playerBuffs.speedBonus || 1) * (1 + adrenalineSpeedBonus);
        if (mag > 0) {
            player.vx = (moveX / mag) * speed * ts;
            player.vy = (moveY / mag) * speed * ts;
            if (moveX !== 0) player.facingRight = moveX > 0;
        } else {
            player.vx *= 0.8;
            player.vy *= 0.8;
        }

            }

    if (player.invincibleTimer > 0) { player.invincibleTimer--; if (player.invincibleTimer === 0) player.invincible = false; }
    if (player.kickTimer > 0) { player.kickTimer--; if (player.kickTimer === 0) { player.kicking = false; if (!player.isDead && player.currentState === 'kick') player.currentState = 'idle'; } }
    if (player.slashTimer > 0) { player.slashTimer--; if (player.slashTimer === 0) { player.slashing = false; if (!player.isDead && player.currentState === 'slash') player.currentState = 'idle'; } }
    // 格挡计时器
    if (player.blockTimer > 0) {
        player.blockTimer--;
        player.vx = 0; // 格挡时不能移动
        if (player.blockTimer === 0) {
            player.blocking = false;
            cooldowns.block = 180; // 格挡结束进入冷却
            if (!player.isDead) player.currentState = 'idle';
        }
    }

    if (!player.isDead) {
        // 俯视角移动：无重力，delta time补偿
        player.x += player.vx * ts * frameDeltaScale;
        player.y += player.vy * ts * frameDeltaScale;
        // 世界边界限制
        player.x = Math.max(40, Math.min(world.width - 40, player.x));
        player.y = Math.max(40, Math.min(world.height - 40, player.y));
        // 地图碰撞检测
        applyMapCollision(player, 25);
        // 更新摄像机
        camera.update();
    }

    // 剑气（俯视角双向移动）
    for (let i = slashEffects.length - 1; i >= 0; i--) {
        const e = slashEffects[i];
        e.x += e.vx * ts * frameDeltaScale;
        e.y += (e.vy || 0) * ts * frameDeltaScale;
        e.life--;
        enemies.forEach(en => { if (!en.flying && Math.abs(en.x - e.x) < e.width / 2 + en.size / 2 && Math.abs(en.y - e.y) < e.height / 2 + en.size / 2) { dealDamageToEnemy(en, e.damage); spawnHitEffect(en.x, en.y, 2); e.life = 0; } });
        if (e.life <= 0 || e.x < -50 || e.x > canvas.width + 50 || e.y < -50 || e.y > canvas.height + 50) slashEffects.splice(i, 1);
    }

    // 道具
    if (!player.isDead) for (let i = items.length - 1; i >= 0; i--) {
        if (Math.sqrt((items[i].x - player.x) ** 2 + (items[i].y - player.y) ** 2) < 35) {
            playSound('pickup');
            if (items[i].isRelic) { pickupRelic(items[i]); items.splice(i, 1); }
            else { player.item = items[i]; spawnFloatingText(items[i].x, items[i].y - 25, '拿到' + items[i].name, items[i].color); items.splice(i, 1); }
        }
    }

    // 敌人
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.tauntTimer > 0) { e.tauntTimer--; if (e.tauntTimer === 0) { e.taunted = false; e.speed = e.originalSpeed; } }
        // 定身处理
        if (e.stunTimer > 0) { e.stunTimer--; if (e.stunTimer === 0) e.stunned = false; }
        if (e.stunned) continue; // 定身时跳过AI

        // 冰冻处理 (霜魂之心)
        if (e.frozenTimer > 0) { e.frozenTimer--; if (e.frozenTimer === 0) e.frozen = false; }
        if (e.frozen) {
            // 冰冻时产生冰晶粒子
            if (Math.random() < 0.1) {
                particles.push({
                    x: e.x + (Math.random() - 0.5) * e.size,
                    y: e.y + (Math.random() - 0.5) * e.size,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -1 - Math.random(),
                    life: 15, color: '#00bfff', size: 3
                });
            }
            continue; // 冰冻时跳过AI
        }

        // 减速处理
        if (e.slowTimer > 0) { e.slowTimer--; if (e.slowTimer === 0) e.slowed = 0; }

        // Boss AI (多阶段)
        if (e.isBoss && !e.flying) {
            const hpRatio = e.currentHp / e.hp;

            // 检测进入狂暴阶段
            if (hpRatio <= 0.5 && !e.enraged) {
                e.enraged = true;
                e.phase = 2;
                e.speed = e.originalSpeed * 1.8;
                e.bossSkillCD = 60;
                e.color = '#ff4444';
                e.size = 100;
                showEvent('Boss狂暴了!');
                spawnFloatingText(e.x, e.y - 60, '💢 狂暴!', '#ff4444');
                gameState.screenShake = 20;
                if (particles.length < 20) {
                    for (let i = 0; i < 6; i++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 20, color: '#ff4444', size: 4 });
                }
                document.querySelector('#bossHealthBar .boss-name').textContent = '💢 ' + e.name + ' (狂暴)';
            }

            // 追击玩家（8方向）
            if (!e.taunted) {
                const dx = player.x - e.x;
                const dy = player.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const spd = e.speed * (e.enraged ? 1.2 : 0.8);
                    e.vx = (dx / dist) * spd;
                    e.vy = (dy / dist) * spd;
                }
            }

            e.bossTimer++;
            e.attackCD--;

            if (e.bossTimer >= e.bossSkillCD && e.attackCD <= 0) {
                e.bossTimer = 0;
                e.attackCD = 30;

                if (e.phase === 1) {
                    // 阶段1：普通技能
                    const sk = Math.floor(Math.random() * 3);
                    if (sk === 0) {
                        // 俯视角冲撞
                        const dx = player.x - e.x, dy = player.y - e.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) { e.vx = (dx / dist) * 12; e.vy = (dy / dist) * 12; }
                        spawnFloatingText(e.x, e.y - 50, '冲!', '#ff4444');
                    }
                    else if (sk === 1) { for (let j = 0; j < 3; j++) setTimeout(() => spawnBossMinion(e), j * 150); spawnFloatingText(e.x, e.y - 50, '叫小弟!', '#aa44ff'); }
                    else { const lx = player.x + (Math.random() - 0.5) * 100; lightnings.push({ x: lx, y: 0, targetY: canvas.height - 80, timer: 25 }); setTimeout(() => { if (Math.abs(player.x - lx) < 45) playerHit('被雷劈'); }, 250); spawnFloatingText(e.x, e.y - 50, '雷!', '#ffff00'); }
                } else {
                    // 阶段2：狂暴技能
                    const sk = Math.floor(Math.random() * 4);
                    if (sk === 0) {
                        // 俯视角狂暴冲撞
                        const dx = player.x - e.x, dy = player.y - e.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) { e.vx = (dx / dist) * 18; e.vy = (dy / dist) * 18; }
                        spawnFloatingText(e.x, e.y - 50, '狂冲!', '#ff4444');
                        gameState.screenShake = 10;
                    } else if (sk === 1) {
                        // 召唤更多小弟（kickable!）
                        for (let j = 0; j < 5; j++) setTimeout(() => spawnBossMinion(e), j * 80);
                        spawnFloatingText(e.x, e.y - 50, '全员出击!', '#aa44ff');
                    } else if (sk === 2) {
                        // 三连雷
                        for (let j = 0; j < 3; j++) {
                            const lx = player.x + (j - 1) * 80;
                            lightnings.push({ x: lx, y: 0, targetY: canvas.height - 80, timer: 25 });
                            setTimeout(() => { if (Math.abs(player.x - lx) < 50) playerHit('被连环雷劈'); }, 250);
                        }
                        spawnFloatingText(e.x, e.y - 50, '雷暴!', '#ffff00');
                        gameState.screenShake = 15;
                    } else {
                        // 弹幕攻击（俯视角扇形追踪）
                        const angle = Math.atan2(player.y - e.y, player.x - e.x);
                        for (let j = -2; j <= 2; j++) {
                            const spread = j * 0.25;
                            projectiles.push({ x: e.x, y: e.y, vx: Math.cos(angle + spread) * 6, vy: Math.sin(angle + spread) * 6, size: 15, life: 80, color: '#ff4444' });
                        }
                        spawnFloatingText(e.x, e.y - 50, '弹幕!', '#ff6b6b');
                    }
                }
            }

            document.getElementById('bossHpFill').style.width = (hpRatio * 100) + '%';
            // 狂暴时血条变红
            if (e.enraged) document.getElementById('bossHpFill').style.background = 'linear-gradient(90deg, #ff4444, #ff6b6b)';
        }

        // 特殊敌人AI（俯视角8方向追击）
        if (!e.flying && !e.isBoss) {
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (e.role === 'charger') {
                if (!e.isCharging) {
                    e.chargeTimer--;
                    if (e.chargeTimer <= 0 && dist < 250) {
                        e.isCharging = true;
                        if (dist > 0) { e.vx = (dx / dist) * e.chargeSpeed; e.vy = (dy / dist) * e.chargeSpeed; }
                    } else if (dist > 0) {
                        e.vx = (dx / dist) * e.speed; e.vy = (dy / dist) * e.speed;
                    }
                }
            } else if (e.role === 'shooter') {
                e.shootTimer--;
                if (dist < e.keepDistance && dist > 0) {
                    e.vx = -(dx / dist) * e.speed; e.vy = -(dy / dist) * e.speed;
                } else if (dist > e.keepDistance + 40 && dist > 0) {
                    e.vx = (dx / dist) * e.speed; e.vy = (dy / dist) * e.speed;
                } else {
                    e.vx = 0; e.vy = 0;
                }
                if (e.shootTimer <= 0 && dist > 0) {
                    e.shootTimer = e.shootCD;
                    const angle = Math.atan2(dy, dx);
                    projectiles.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, size: 12, life: 100, color: '#aa44ff' });
                }
            } else if (e.role === 'bomber') {
                if (dist > 0) { e.vx = (dx / dist) * e.speed; e.vy = (dy / dist) * e.speed; }
                if (dist < 50 && e.explodeCountdown < 0) { e.explodeCountdown = e.explodeTimer; e.isExploding = true; }
                if (e.explodeCountdown > 0) { e.explodeCountdown--; if (e.explodeCountdown <= 0) { if (dist < e.explodeRadius) playerHit('被炸死'); enemies.forEach(en => { if (en !== e && !en.flying && Math.sqrt((en.x - e.x) ** 2 + (en.y - e.y) ** 2) < e.explodeRadius) { en.flying = true; en.vy = -12; en.currentHp = 0; handleEnemyKill(en); } }); for (let j = 0; j < 20; j++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 35, color: '#ffff00', size: 5 }); gameState.screenShake = 15; e.flying = true; e.currentHp = 0; } }
            } else if (dist > 0) {
                const spd = e.speed * (e.taunted ? 3 : 1);
                e.vx = (dx / dist) * spd; e.vy = (dy / dist) * spd;
            }
        }

        // Enemy hit reaction updates
        if (e.hitFlash > 0) e.hitFlash--;
        if (e.hitStun > 0) {
            e.hitStun--;
            e.vx *= 0.8; // Friction during stun
        }

        // 减速效果处理
        if (e.slowTimer > 0) {
            e.slowTimer--;
            const slowMult = 1 - (e.slowed || 0);
            e.vx *= slowMult;
            e.vy *= slowMult;
        }

        if (e.flying) { e.vy += 0.5 * ts * frameDeltaScale; e.rotation += e.vx * 0.02 * ts * frameDeltaScale; }
        e.x += e.vx * ts * frameDeltaScale; e.y += e.vy * ts * frameDeltaScale;
        // 世界边界检测
        if (!e.flying) {
            e.x = Math.max(40, Math.min(world.width - 40, e.x));
            e.y = Math.max(40, Math.min(world.height - 40, e.y));
            // 敌人地图碰撞检测
            applyMapCollision(e, e.size / 2);
        }
        if (e.y > world.height - 80 && e.flying) { e.y = world.height - 80; e.vy *= -0.5; e.vx *= 0.8; if (Math.abs(e.vy) < 2) enemies.splice(i, 1); }
        if (e.flying && (e.x < -80 || e.x > world.width + 80 || e.y < -150)) enemies.splice(i, 1);
        if (!e.flying && !player.isDead && Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2) < 35 * player.scale && !player.kicking && !player.slashing) {
            playerHit('被打死', { role: e.role, name: e.name, isElite: e.isElite, isBoss: e.isBoss, damageType: 'contact' });
        }
    }
    // checkChainCollision(); // 俯视角模式不需要连锁碰撞

    // 弹幕球（俯视角双向移动）
    for (let i = projectiles.length - 1; i >= 0; i--) { const p = projectiles[i]; p.x += p.vx * ts * frameDeltaScale; p.y += p.vy * ts * frameDeltaScale; p.life--; if (Math.sqrt((p.x - player.x) ** 2 + (p.y - player.y) ** 2) < p.size + 25) { playerHit('被嘴炮打', { role: 'shooter', damageType: 'projectile' }); projectiles.splice(i, 1); continue; } if (p.life <= 0 || p.x < -40 || p.x > world.width + 40 || p.y < -40 || p.y > world.height + 40) projectiles.splice(i, 1); }
    // 陨石
    for (let i = meteors.length - 1; i >= 0; i--) { meteors[i].y += meteors[i].vy * ts; enemies.forEach(en => { if (!en.flying && Math.sqrt((en.x - meteors[i].x) ** 2 + (en.y - meteors[i].y) ** 2) < meteors[i].size + en.size / 2) { en.currentHp = 0; en.flying = true; en.vy = -8; handleEnemyKill(en); } }); if (!player.isDead && Math.sqrt((player.x - meteors[i].x) ** 2 + (player.y - meteors[i].y) ** 2) < meteors[i].size + 25) playerHit('被砸死'); if (meteors[i].y > canvas.height - 45) { spawnHitEffect(meteors[i].x, canvas.height - 55, 2); gameState.screenShake = 12; meteors.splice(i, 1); } }
    // 雷电
    for (let i = lightnings.length - 1; i >= 0; i--) { lightnings[i].timer--; if (lightnings[i].timer <= 0) lightnings.splice(i, 1); }
    // 慢动作
    if (gameState.slowMoTimer > 0) { gameState.slowMoTimer--; if (gameState.slowMoTimer === 0) { gameState.slowMo = false; document.getElementById('slowmo').style.opacity = 0; } }
    if (gameState.time <= 5 && gameState.time > 0 && !gameState.lastHitSlowMo) { gameState.slowMo = true; gameState.lastHitSlowMo = true; document.getElementById('slowmo').style.opacity = 0.5; showEvent('最后一击!'); }
    // 连击
    if (gameState.comboTimer > 0) { gameState.comboTimer--; if (gameState.comboTimer === 0) gameState.combo = 0; }
    // A5: 多杀计时
    if (multiKillTimer > 0) {
        multiKillTimer--;
        if (multiKillTimer === 0 && multiKillCount >= 2) {
            const text = multiKillTexts[Math.min(multiKillCount, multiKillTexts.length - 1)];
            showMultiKill(text, multiKillCount);
            multiKillCount = 0;
        }
    }
    // 踢击特效更新
    updateKickEffects(ts);
    // 粒子 (限制最大数量防止卡顿)
    if (particles.length > 60) particles.splice(0, particles.length - 60);
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; if (p.expanding) p.size += 3; p.x += p.vx * ts; p.y += p.vy * ts; if (!p.isWave && !p.isHeart && !p.isAfterImage) p.vy += 0.15 * ts; p.life--; if (p.life <= 0) particles.splice(i, 1); }
    // 飘字 (限制最大数量)
    if (floatingTexts.length > 20) floatingTexts.splice(0, floatingTexts.length - 20);
    for (let i = floatingTexts.length - 1; i >= 0; i--) { floatingTexts[i].y += floatingTexts[i].vy * ts; floatingTexts[i].life--; if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1); }
    if (gameState.screenShake > 0) gameState.screenShake--;
    document.getElementById('score').textContent = formatScore(gameState.score);

    // 割草模式: 更新击杀计数器和难度显示
    if (KUOSAO_MODE.enabled && selectedMode === 'endless') {
        let killCounter = document.getElementById('killCounter');
        if (!killCounter) {
            killCounter = document.createElement('div');
            killCounter.id = 'killCounter';
            killCounter.style.cssText = 'position:absolute;top:35px;right:10px;color:#e94560;font-size:14px;z-index:12;text-shadow:1px 1px 2px #000;';
            document.getElementById('gameContainer').appendChild(killCounter);
        }
        // 显示击杀数和当前难度
        const timeScale = getEnemyTimeScale();
        const diffLevel = Math.floor(gameStats.survivalTime / 60);
        const diffText = diffLevel > 0 ? ' | ⚠️x' + timeScale.hp.toFixed(1) : '';
        killCounter.textContent = '💀' + gameStats.killCount + diffText;
        killCounter.style.display = 'block';

        // 更新多进度条面板
        updateProgressPanel();
    }

    // === 无尽模式: 武器HUD (左下角，显示等级和描述) ===
    if (selectedMode === 'endless') {
        let weaponHUD = document.getElementById('weaponHUD');
        if (!weaponHUD) {
            weaponHUD = document.createElement('div');
            weaponHUD.id = 'weaponHUD';
            weaponHUD.style.cssText = 'position:absolute;bottom:60px;left:10px;display:flex;flex-direction:column;gap:4px;z-index:12;';
            document.getElementById('gameContainer').appendChild(weaponHUD);
        }
        let html = '';
        const hudColors = { kick: '#ff8844', dagger: '#cccccc', lightning: '#ffdd44', fire: '#ff4422' };
        Object.keys(playerWeapons).forEach(id => {
            const def = weaponDefinitions[id];
            const lv = playerWeapons[id].level;
            const color = hudColors[id] || '#ff6600';
            const isMax = lv >= 5;
            const shortDesc = def.levelDesc[lv] || '';
            html += `<div style="background:rgba(0,0,0,0.75);border:2px solid ${color};border-radius:8px;padding:4px 10px;display:flex;align-items:center;gap:8px;${isMax ? 'box-shadow:0 0 10px ' + color + '50;' : ''}">
                <div style="font-size:22px">${def.icon}</div>
                <div>
                    <div style="color:${color};font-size:11px;font-weight:bold">${def.name} Lv${lv}${isMax ? ' ⭐' : ''}</div>
                    <div style="color:#aaa;font-size:9px;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${shortDesc}</div>
                </div>
            </div>`;
        });
        weaponHUD.innerHTML = html || '<div style="color:#888;font-size:12px">无武器</div>';
    }
}

// 更新多进度条面板
function updateProgressPanel() {
    let panel = document.getElementById('progressPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'progressPanel';
        document.getElementById('gameContainer').appendChild(panel);
    }

    const phaseConfig = getCurrentPhaseConfig();
    const nextKillMilestone = [50, 100, 200, 300, 500, 750, 1000].find(n => n > gameStats.killCount) || '∞';
    const killProgress = nextKillMilestone !== '∞' ? Math.round((gameStats.killCount / nextKillMilestone) * 100) : 100;

    // 连击等级
    let comboRank = '';
    if (gameState.combo >= 20) comboRank = '🔥狂暴';
    else if (gameState.combo >= 10) comboRank = '⚡超神';
    else if (gameState.combo >= 5) comboRank = '✨不错';

    panel.innerHTML = `
        <div class="progress-item progress-combo">
            <span class="label">🔥连击</span>
            <span class="value">${gameState.combo}${comboRank ? ' ' + comboRank : ''}</span>
        </div>
        <div class="progress-item progress-kill">
            <span class="label">🎯目标</span>
            <span class="value">${gameStats.killCount}/${nextKillMilestone}</span>
        </div>
        <div class="progress-item progress-phase">
            <span class="label">📊阶段</span>
            <span class="value">${phaseConfig.name}</span>
        </div>
        <div class="progress-item progress-survive">
            <span class="label">⏱️存活</span>
            <span class="value">${gameStats.survivalTime}s</span>
        </div>
    `;
}

// ==================== 渲染 ====================
function render() {
    ctx.save();

    // 屏幕震动
    if (gameState.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * gameState.screenShake, (Math.random() - 0.5) * gameState.screenShake);
    }

    const theme = mapThemes[currentMap];
    const bgImg = images[theme.bgImage];

    // 绘制地图背景（应用摄像机偏移）
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        // 计算背景绘制位置（世界坐标转屏幕坐标）
        // 背景图覆盖整个世界，根据摄像机位置裁剪显示
        const srcX = (camera.x / world.width) * bgImg.naturalWidth;
        const srcY = (camera.y / world.height) * bgImg.naturalHeight;
        const srcW = (canvas.width / world.width) * bgImg.naturalWidth;
        const srcH = (canvas.height / world.height) * bgImg.naturalHeight;
        ctx.drawImage(bgImg, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
    } else {
        // 后备草地背景
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#2d5a27');
        gradient.addColorStop(0.5, '#3d7a37');
        gradient.addColorStop(1, '#2d5a27');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // === 应用摄像机变换（所有游戏对象都会自动偏移） ===
    ctx.translate(-camera.x, -camera.y);
    // 雷电
    lightnings.forEach(l => { ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(l.x, l.y); let y = l.y; while (y < l.targetY) { y += 18; ctx.lineTo(l.x + (Math.random() - 0.5) * 25, y); } ctx.stroke(); });
    // 陨石
    meteors.forEach(m => { ctx.fillStyle = '#ff6b35'; ctx.beginPath(); ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2); ctx.fill(); });
    // 弹幕球
    projectiles.forEach(p => { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); });
    // 粒子
    particles.forEach(p => { ctx.globalAlpha = p.life / 40; ctx.fillStyle = p.color; if (p.isFlash) { ctx.globalAlpha = p.life / 12; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); } else if (p.isWave) { ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke(); } else if (p.isHeart) { ctx.font = p.size + 'px Arial'; ctx.fillText('💕', p.x, p.y); } else if (p.isAfterImage) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size * 0.7, 0, 0, Math.PI * 2); ctx.fill(); } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); } });
    ctx.globalAlpha = 1;
    // 踢击图片特效
    renderKickEffects(ctx);
    // 道具
    items.forEach(item => { ctx.save(); ctx.translate(item.x, item.y + Math.sin(Date.now() / 200 + item.bobOffset) * 4); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(item.emoji, 0, 0); ctx.restore(); });

    // === 割草模式: 经验宝石 ===
    if (KUOSAO_MODE.enabled && KUOSAO_MODE.xpEnabled) {
        gemPool.active.forEach(gem => {
            if (!gem.active) return;
            ctx.save();
            ctx.translate(gem.x, gem.y + Math.sin(Date.now() / 150 + gem.bobOffset) * 3);

            // 发光效果
            ctx.shadowColor = gem.color;
            ctx.shadowBlur = 8;

            // 菱形宝石
            ctx.fillStyle = gem.color;
            ctx.beginPath();
            ctx.moveTo(0, -gem.size);
            ctx.lineTo(gem.size * 0.6, 0);
            ctx.lineTo(0, gem.size);
            ctx.lineTo(-gem.size * 0.6, 0);
            ctx.closePath();
            ctx.fill();

            // 高光
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.moveTo(0, -gem.size * 0.6);
            ctx.lineTo(gem.size * 0.3, 0);
            ctx.lineTo(0, -gem.size * 0.2);
            ctx.lineTo(-gem.size * 0.3, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        });
    }

    // === 割草模式: 宝箱 (使用图片) ===
    if (KUOSAO_MODE.enabled) {
        chests.forEach(chest => {
            ctx.save();
            const bobY = Math.sin(Date.now() / 300 + chest.bobOffset) * 5;
            ctx.translate(chest.x, chest.y + bobY);

            const config = chest.config;
            const chestImg = images[config.img];

            // 发光效果 (根据稀有度)
            ctx.shadowColor = config.color;
            ctx.shadowBlur = chest.type === 'boss' ? 25 : (chest.type === 'epic' ? 20 : (chest.type === 'rare' ? 15 : 10));

            // 使用图片绘制
            if (chestImg && chestImg.complete && chestImg.naturalWidth > 0) {
                const scale = config.imgScale || 0.1;
                const w = chestImg.width * scale;
                const h = chestImg.height * scale;
                ctx.drawImage(chestImg, -w / 2, -h / 2, w, h);
            } else {
                // 后备绘制
                ctx.fillStyle = config.color;
                ctx.fillRect(-20, -15, 40, 30);
                ctx.beginPath();
                ctx.moveTo(-22, -15); ctx.lineTo(0, -25); ctx.lineTo(22, -15);
                ctx.closePath(); ctx.fill();
            }

            // 宝箱类型标识
            ctx.shadowBlur = 0;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = config.color;
            const typeIcons = { normal: '📦', rare: '✨', epic: '💎', boss: '👑' };
            ctx.fillText(typeIcons[chest.type] || '', 0, -35);

            // Boss箱特殊光环动画
            if (chest.type === 'boss') {
                ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.2;
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 40 + Math.sin(Date.now() / 150) * 5, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        });
    }
    // 剑气
    slashEffects.forEach(e => { ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha = e.life / 30; ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(-e.width / 2, 0); ctx.lineTo(0, -e.height / 2); ctx.lineTo(e.width / 2, 0); ctx.lineTo(0, e.height / 2); ctx.closePath(); ctx.fill(); ctx.restore(); });
    // 敌人
    enemies.forEach(e => {
        // 俯视角阴影（不飞行时）
        if (!e.flying) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.size / 2 + 5, e.size / 2, e.size / 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rotation); ctx.scale(e.scale || 1, e.scale || 1);
        if (e.isExploding && Math.floor(Date.now() / 80) % 2 === 0) ctx.globalAlpha = 0.5;
        // Hit flash effect - brighten when recently hit
        const hasHitFlash = e.hitFlash > 0;
        // 精英怪外发光
        if (e.isElite && !e.flying) {
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, e.size / 2 + 5, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        // 使用图片绘制敌人
        const enemyImg = e.img ? images[e.img] : null;
        if (enemyImg && enemyImg.complete && enemyImg.naturalWidth > 0 && !e.flying) {
            // 根据敌人朝向翻转图片（优先用移动方向，否则面向玩家）
            let facingDir;
            if (Math.abs(e.vx) > 0.1) {
                // 有明显移动时，用移动方向
                facingDir = e.vx > 0 ? 1 : -1;
                e.lastFacingDir = facingDir; // 记住朝向
            } else {
                // 静止时，面向玩家或用上次朝向
                facingDir = e.lastFacingDir || (player.x > e.x ? 1 : -1);
            }
            ctx.scale(facingDir, 1);
            const imgW = enemyImg.width * (e.imgScale || 0.1);
            const imgH = enemyImg.height * (e.imgScale || 0.1);
            ctx.drawImage(enemyImg, -imgW / 2, -imgH / 2, imgW, imgH);
            ctx.scale(facingDir, 1); // 恢复
        } else {
            // 后备：圆形绘制
            ctx.fillStyle = e.isElite ? '#ff6b6b' : e.color; ctx.beginPath(); ctx.arc(0, 0, e.size / 2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = e.taunted ? '#ff0000' : (e.isBoss ? '#ffd700' : (e.isElite ? '#ffd700' : '#fff')); ctx.lineWidth = e.isBoss ? 4 : (e.isElite ? 3 : 2); ctx.stroke();
            ctx.fillStyle = '#fff';
            if (e.flying) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-3, 0); ctx.moveTo(-3, -6); ctx.lineTo(-10, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(10, 0); ctx.moveTo(10, -6); ctx.lineTo(3, 0); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 8, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); }
            else { ctx.beginPath(); ctx.arc(-6, -4, 4, 0, Math.PI * 2); ctx.arc(6, -4, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(-6, -4, 1.5, 0, Math.PI * 2); ctx.arc(6, -4, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 6, 6, 0, Math.PI); ctx.fill(); }
        }
        if (e.isBoss) { ctx.font = '24px Arial'; ctx.fillText('👑', -12, -e.size / 2 - 8); }
        if (e.isElite && !e.flying) { ctx.font = '16px Arial'; ctx.fillText('⭐', -8, -e.size / 2 - 10); }
        if (!e.flying) { ctx.fillStyle = e.isElite ? '#ffd700' : '#fff'; ctx.font = 'bold 10px Microsoft YaHei'; ctx.textAlign = 'center'; ctx.fillText(e.name, 0, e.size / 2 + 12); }
        // 敌人血量条（受伤后显示）
        if (e.currentHp < e.hp && !e.flying && !e.isBoss) {
            const barW = e.isElite ? 55 : 40;
            const barH = 6;
            const barY = -e.size / 2 - 12;
            // 血条背景
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(-barW/2 - 1, barY - 1, barW + 2, barH + 2);
            // 血条底色
            ctx.fillStyle = '#333';
            ctx.fillRect(-barW/2, barY, barW, barH);
            // 当前血量
            const hpPercent = Math.max(0, e.currentHp / e.hp);
            const hpColor = hpPercent > 0.5 ? '#4ade80' : (hpPercent > 0.25 ? '#ffd700' : '#e94560');
            ctx.fillStyle = e.isElite ? '#ffd700' : hpColor;
            ctx.fillRect(-barW/2, barY, barW * hpPercent, barH);
            // 血量数字
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(Math.ceil(e.currentHp) + '/' + e.hp, 0, barY - 2);
        }
        // Draw hit flash overlay
        if (hasHitFlash) {
            ctx.globalAlpha = e.hitFlash / 8 * 0.8;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, e.size / 2 + 5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    });
    // 玩家
    if (gamePhase === 'playing') {
        // 俯视角阴影（脚底位置）
        const footY = player.y + GAME_CONFIG.PLAYER_FOOT_OFFSET_Y;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(player.x, footY, GAME_CONFIG.SHADOW_RX, GAME_CONFIG.SHADOW_RY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 狂战光环 - 绘制在角色下层（脚底位置）
        if (playerBuffs.berserkerHeart && gameState.lives <= 2) {
            ctx.save();
            ctx.translate(player.x, footY);
            const auraImg = berserkerImages.aura[berserkerAnim.auraFrame];
            if (auraImg && auraImg.complete && auraImg.naturalWidth > 0) {
                const auraScale = player.scale * GAME_CONFIG.BERSERKER_AURA_SCALE;
                const auraW = auraImg.width * auraScale;
                const auraH = auraImg.height * auraScale;
                const pulse = 1 + Math.sin(Date.now() / 200) * 0.08;
                ctx.globalAlpha = GAME_CONFIG.BERSERKER_AURA_OPACITY;
                ctx.drawImage(auraImg, -auraW * pulse / 2, -auraH * pulse / 2, auraW * pulse, auraH * pulse);
                ctx.globalAlpha = 1;
            }
            ctx.restore();
        }

        ctx.save(); ctx.translate(player.x, player.y); ctx.scale(player.facingRight ? -1 : 1, 1);
        if (player.invincible && Math.floor(Date.now() / 50) % 2 === 0) ctx.globalAlpha = 0.5;

        // 选择图片：玛莎拉蒂或普通
        let img = images.main;
        let scale = player.scale * 0.15;

        if (saveData.ownsMaserati) {
            // 拥有玛莎拉蒂时使用车的图片
            if (player.isDead) img = images.dead;
            else { img = images.maserati; scale = player.scale * 0.18; }
        } else {
            // 普通狗图片
            if (player.isDead) {
                // 死亡动画
                img = deathFrames[playerAnim.deathFrame] || images.dead;
            }
            else if (player.blocking) img = images.main;
            else if (player.slashing) img = images.attack;
            else if (player.currentState === 'sajiao') img = images.sajiao;
            else if (player.kicking) img = images.kick;
            else if (Math.abs(player.vx) > 0.5 || Math.abs(player.vy) > 0.5) {
                // 跑步动画
                img = runFrames[playerAnim.runFrame] || images.main;
            }
            else {
                // 待机状态 - 使用待机动画
                img = getIdleImage();
                // 呼吸效果：用正弦波轻微缩放模拟呼吸
                if (idleAnim.currentAnim === 'breath') {
                    const breathScale = 1 + Math.sin(idleAnim.breathFrame * Math.PI / 2) * 0.02;
                    scale *= breathScale;
                }
            }
        }
        if (img.complete && img.naturalWidth > 0) { const w = img.width * scale, h = img.height * scale; ctx.drawImage(img, -w / 2, -h / 2 - 18, w, h); }
        else { ctx.fillStyle = '#d4a574'; ctx.beginPath(); ctx.ellipse(0, 0, 28 * player.scale, 22 * player.scale, 0, 0, Math.PI * 2); ctx.fill(); }
        if (playerBuffs.goldenSkin) {
            ctx.scale(player.facingRight ? -1 : 1, 1);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, -18, 34, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.scale(player.facingRight ? -1 : 1, 1);
        }
        // 狂战之心效果 (血量≤2时) - 爆发动画+红色发光（光环已移至脚底层）
        if (playerBuffs.berserkerHeart && gameState.lives <= 2) {
            ctx.scale(player.facingRight ? -1 : 1, 1);

            // 爆发动画 (触发时3帧序列) - 保持在角色上层
            if (berserkerAnim.burstActive) {
                const burstImg = berserkerImages.burst[berserkerAnim.burstFrame];
                if (burstImg && burstImg.complete && burstImg.naturalWidth > 0) {
                    const burstScale = player.scale * GAME_CONFIG.BERSERKER_BURST_SCALE;
                    const burstW = burstImg.width * burstScale;
                    const burstH = burstImg.height * burstScale;
                    const progress = berserkerAnim.burstFrame / 3;
                    const expandScale = 1 + progress * 0.5;
                    ctx.globalAlpha = 1 - progress * 0.3;
                    ctx.drawImage(burstImg, -burstW * expandScale / 2, -burstH * expandScale / 2 - 18, burstW * expandScale, burstH * expandScale);
                    ctx.globalAlpha = 1;
                }
            }

            // 红色发光边缘
            const pulseIntensity = 0.3 + Math.sin(Date.now() / 150) * 0.2;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 15 + Math.sin(Date.now() / 100) * 5;
            ctx.strokeStyle = `rgba(255, 50, 50, ${pulseIntensity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -18, 45, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.scale(player.facingRight ? -1 : 1, 1);
        }
        if (player.item) { ctx.scale(player.facingRight ? 1 : -1, 1); ctx.font = '26px Arial'; ctx.fillText(player.item.emoji, -45, -55); }
        // 格挡护盾效果
        if (player.blocking) {
            ctx.scale(player.facingRight ? -1 : 1, 1); // 取消翻转
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.3;
            ctx.beginPath();
            ctx.arc(0, -20, 50, 0, Math.PI * 2);
            ctx.stroke();
            // 内圈
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.arc(0, -20, 45, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    // 飘字
    floatingTexts.forEach(t => {
        const maxLife = t.isCrit ? 70 : 50;
        ctx.globalAlpha = Math.min(1, t.life / (maxLife * 0.6));
        // 暴击缩放效果
        let drawScale = t.scale || 1;
        if (t.scaleDecay && t.scale > 1) {
            t.scale = Math.max(1, t.scale - t.scaleDecay);
            drawScale = t.scale;
        }
        const fontSize = Math.round(t.size * drawScale);
        ctx.font = 'bold ' + fontSize + 'px Microsoft YaHei';
        ctx.textAlign = 'center';
        if (t.isText) {
            ctx.fillStyle = t.color || '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = t.isCrit ? 3 : 2;
            // 暴击文字添加发光效果
            if (t.isCrit) {
                ctx.shadowColor = t.color;
                ctx.shadowBlur = 8;
            }
            ctx.strokeText(t.text, t.x, t.y);
            ctx.fillText(t.text, t.x, t.y);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillText(t.text, t.x, t.y);
        }
    });
    ctx.globalAlpha = 1;

    // === 调试：绘制碰撞体积 (按P键切换) ===
    if (debugShowColliders && mapColliders[currentMap]) {
        ctx.globalAlpha = 0.4;
        mapColliders[currentMap].forEach(col => {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            if (col.type === 'circle') {
                ctx.beginPath(); ctx.arc(col.x, col.y, col.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            } else if (col.type === 'ellipse') {
                ctx.beginPath(); ctx.ellipse(col.x, col.y, col.rx, col.ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            } else if (col.type === 'rect') {
                ctx.fillRect(col.x, col.y, col.w, col.h); ctx.strokeRect(col.x, col.y, col.w, col.h);
            }
            // 显示名称
            if (col.name) {
                ctx.fillStyle = '#fff'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
                const cx = col.type === 'rect' ? col.x + col.w / 2 : col.x;
                const cy = col.type === 'rect' ? col.y + col.h / 2 : col.y;
                ctx.fillText(col.name, cx, cy);
            }
        });
        ctx.globalAlpha = 1;
    }

    // === 绘制武器效果 ===
    drawWeapons(ctx);

    // 恢复摄像机变换前的状态（用于绘制UI元素）
    ctx.restore();

    // === 小地图 ===
    if (gamePhase === 'playing') {
        const mmW = 150, mmH = 85; // 小地图尺寸
        const mmX = canvas.width - mmW - 10, mmY = canvas.height - mmH - 60; // 右下角
        const scaleX = mmW / world.width, scaleY = mmH / world.height;

        ctx.save();
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(mmX, mmY, mmW, mmH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(mmX, mmY, mmW, mmH);

        // 视野框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.strokeRect(
            mmX + camera.x * scaleX,
            mmY + camera.y * scaleY,
            canvas.width * scaleX,
            canvas.height * scaleY
        );

        // 敌人点
        ctx.fillStyle = '#ff4444';
        enemies.forEach(e => {
            if (!e.flying) {
                ctx.beginPath();
                ctx.arc(mmX + e.x * scaleX, mmY + e.y * scaleY, e.isBoss ? 4 : 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // 玩家点
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(mmX + player.x * scaleX, mmY + player.y * scaleY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // === 遗物状态UI ===
    if (gamePhase === 'playing') {
        ctx.save();
        let statusY = 130; // 起始Y位置
        const statusX = 15;
        ctx.font = 'bold 14px Microsoft YaHei';
        ctx.textAlign = 'left';

        // 狂战之心状态
        if (playerBuffs.berserkerHeart && gameState.lives <= 2) {
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 10;
            ctx.fillText('💢 狂战激活! +80%伤害 +50%攻速', statusX, statusY);
            ctx.shadowBlur = 0;
            statusY += 20;
        }

        // 毁灭使者充能状态
        if (playerBuffs.doomSlayer) {
            if (relicState.doomReady) {
                ctx.fillStyle = '#ff0000';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 10;
                ctx.fillText('☠️ 毁灭就绪! 下次攻击500%伤害', statusX, statusY);
                ctx.shadowBlur = 0;
            } else {
                const chargePercent = Math.floor((relicState.doomChargeTimer / 300) * 100);
                ctx.fillStyle = '#888';
                ctx.fillText(`☠️ 毁灭充能: ${chargePercent}%`, statusX, statusY);
            }
            statusY += 20;
        }

        // 时空裂隙连击计数
        if (playerBuffs.timeWarp) {
            ctx.fillStyle = '#00ffff';
            ctx.fillText(`⏰ 攻击连段: ${relicState.attackCombo}/10`, statusX, statusY);
            statusY += 20;
        }

        // 幻影残像连击计数
        if (playerBuffs.shadowClone) {
            ctx.fillStyle = '#9370db';
            ctx.fillText(`👥 残影连击: ${relicState.shadowCombo}/5`, statusX, statusY);
            statusY += 20;
        }

        // 灵魂收割者计数
        if (playerBuffs.soulReaper) {
            ctx.fillStyle = '#9400d3';
            ctx.fillText(`💀 灵魂: ${relicState.souls}/20`, statusX, statusY);
            statusY += 20;
        }

        // 黄金猎手连杀
        if (playerBuffs.goldHunter && relicState.killStreak > 0) {
            let color = '#ffd700';
            if (relicState.killStreak >= 10) color = '#ff0000';
            else if (relicState.killStreak >= 5) color = '#ff6600';
            ctx.fillStyle = color;
            ctx.fillText(`💰 连杀: ${relicState.killStreak}`, statusX, statusY);
            statusY += 20;
        }

        // 虚空裂痕数量
        if (playerBuffs.voidWalker && relicState.voidRifts.length > 0) {
            ctx.fillStyle = '#9370db';
            ctx.fillText(`🌀 虚空裂痕: ${relicState.voidRifts.length}`, statusX, statusY);
            statusY += 20;
        }

        ctx.restore();
    }

    // === 受击视觉反馈 ===
    renderDamageVignette(ctx);
}

// 调试开关
let debugShowColliders = false;
document.addEventListener('keydown', e => {
    if (e.code === 'KeyP' && gamePhase === 'playing') {
        debugShowColliders = !debugShowColliders;
        console.log('碰撞体积显示:', debugShowColliders ? '开启' : '关闭');
    }
});

// ==================== 结算 ====================
function endGame() {
    playSound('gameover');
    stopBGM(); // 停止背景音乐
    gameState.gameOver = true; player.isDead = true; player.currentState = 'dead';
    document.getElementById('deathImage').style.opacity = 1;
    hidePlayerHealthBar();
    if (isMobile) document.getElementById('mobileControls').style.display = 'none';

    // 记录死亡时的详细上下文
    detailedDeathContext.phase = currentEndlessPhase;
    detailedDeathContext.nearbyEnemies = enemies.filter(e => !e.flying && Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2) < 200).length;

    setTimeout(() => {
        earnCurrency();
        document.getElementById('deathImage').style.opacity = 0;
        document.getElementById('statKills').textContent = gameStats.killCount;
        document.getElementById('statMaxCombo').textContent = gameStats.maxCombo;
        document.getElementById('statBoss').textContent = gameStats.bossKilled;

        // 生存时间
        document.getElementById('statSurvival').textContent = gameStats.survivalTime + 's';

        // 死因细分
        let deathDetail = '';
        if (detailedDeathContext.killerType) {
            const killerNames = { charger: '冲锋怪', shooter: '嘴炮怪', bomber: '自爆怪', tank: '坦克怪', normal: '普通怪' };
            deathDetail = `被${killerNames[detailedDeathContext.killerType] || '敌人'}击杀`;
            if (detailedDeathContext.wasElite) deathDetail = '被精英' + deathDetail.slice(1);
            if (detailedDeathContext.wasBoss) deathDetail = '被Boss击杀';
            if (detailedDeathContext.damageType === 'projectile') deathDetail += ' (远程)';
            if (detailedDeathContext.damageType === 'explosion') deathDetail += ' (爆炸)';
        }
        if (detailedDeathContext.nearbyEnemies >= 5) deathDetail += ' | 被群殴';
        document.getElementById('deathDetail').textContent = deathDetail;

        // 阶段进度
        const phaseConfig = getCurrentPhaseConfig();
        const nextPhase = endlessPhaseConfig[currentEndlessPhase + 1];
        let phaseText = `阶段: ${phaseConfig.name}`;
        if (nextPhase) {
            const timeToNext = nextPhase.time - gameStats.survivalTime;
            phaseText += ` | 距下阶段还差${timeToNext}秒`;
        } else {
            phaseText += ' | 已达最高阶段!';
        }
        document.getElementById('statPhase').textContent = phaseText;

        // 流派标签
        const buildTag = getBuildTag();
        document.getElementById('statBuildTag').textContent = buildTag ? `🏷️ 本局流派: ${buildTag}` : '';

        let title = '路人甲';
        // 割草模式特殊称号
        if (KUOSAO_MODE.enabled && selectedMode === 'endless') {
            if (gameStats.killCount >= 500) title = '割草机之王';
            else if (gameStats.killCount >= 200) title = '收割者';
            else if (gameStats.killCount >= 100) title = '屠杀者';
            else if (gameStats.killCount >= 50) title = '杀戮机器';
            else if (playerXP.level >= 20) title = '满级大佬';
            else if (playerXP.level >= 10) title = '进化达人';
            else if (gameStats.bossKilled >= 3) title = 'Boss终结者';
            else if (gameStats.survivalTime >= 300) title = '老六存活王';
            else if (gameStats.survivalTime < 30) title = '速通失败';
        } else {
            if (gameStats.bossKilled >= 2) title = '真正的高手';
            else if (gameStats.maxCombo >= 8) title = '连击狂魔';
            else if (gameStats.killCount >= 25) title = '屠夫八重';
            else if (gameState.score >= 8000) title = '典孝急乐王';
        }
        document.getElementById('statTitle').textContent = title;

        // 更多搞笑评价
        const comments = [
            '你不强，但你很烦。',
            '八重之犬虽死，节目效果仍在。',
            '你不是来赢的，你是来整活的。',
            '狗都比你强...等等。',
            '建议回炉重造。',
            '这波啊，这波是技术性死亡。',
            '你的操作让敌人都懵了。',
            '死得其所，死得精彩。',
            '你已经超越了99%的...咳咳。',
            '下次记得带脑子。',
            '你这是在给敌人送温暖吗？',
            '建议改行，这行不适合你。'
        ];
        document.getElementById('statComment').textContent = '"' + comments[Math.floor(Math.random() * comments.length)] + '"';
        document.getElementById('finalScore').textContent = formatScore(gameState.score);
        document.getElementById('deathReason').textContent = gameState.deathReason;
        // Reset submit button for new game
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitStatus').textContent = '';

        // 生成下一局钩子
        generateNextRunHook();

        // 查询排行榜排名
        fetchRankComparison();

        document.getElementById('gameOver').style.display = 'block';
    }, 1200);
}

// ==================== 胜利动画 (急速模式) ====================
function showVictory() {
    playSound('upgrade'); // 播放胜利音效
    gameState.gameOver = true;
    gameState.isPaused = true;
    stopTimers();
    hidePlayerHealthBar();
    if (isMobile) document.getElementById('mobileControls').style.display = 'none';

    const overlay = document.getElementById('victoryOverlay');
    const victoryImg = overlay.querySelector('.victory-image');
    const statsDiv = overlay.querySelector('.victory-stats');
    const particlesDiv = overlay.querySelector('.victory-particles');

    // 随机选择胜利图片
    const victoryImages = [images.victory1, images.victory2];
    const selectedImg = victoryImages[Math.floor(Math.random() * victoryImages.length)];
    if (selectedImg && selectedImg.complete && selectedImg.naturalWidth > 0) {
        victoryImg.src = selectedImg.src;
    } else {
        // 后备：尝试直接加载
        victoryImg.src = Math.random() > 0.5 ? 'images/ui/胜利结算.png' : 'images/ui/胜利结算2.png';
    }

    // 显示统计
    statsDiv.innerHTML = `
        <div>🏆 得分: <span style="color:#ffd700;font-weight:bold">${formatScore(gameState.score)}</span></div>
        <div>💀 击杀: ${gameStats.killCount} | 🔥 最高连击: ${gameStats.maxCombo} | 👑 Boss: ${gameStats.bossKilled}</div>
    `;

    // 生成彩色纸屑
    particlesDiv.innerHTML = '';
    const colors = ['#ffd700', '#ff6b6b', '#4ade80', '#4fc3f7', '#ab47bc', '#ff9800'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'victory-confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        particlesDiv.appendChild(confetti);
    }

    // 显示胜利画面
    overlay.classList.add('active');

    // 屏幕震动
    gameState.screenShake = 20;

    // 点击继续到结算画面
    const continueHandler = () => {
        overlay.classList.remove('active');
        overlay.removeEventListener('click', continueHandler);
        // 延迟后显示正常结算（但标记为胜利）
        showVictorySettlement();
    };

    setTimeout(() => {
        overlay.addEventListener('click', continueHandler);
    }, 1000);
}

function showVictorySettlement() {
    // 调用正常的货币结算
    earnCurrency();

    // 填充结算数据
    document.getElementById('statKills').textContent = gameStats.killCount;
    document.getElementById('statMaxCombo').textContent = gameStats.maxCombo;
    document.getElementById('statBoss').textContent = gameStats.bossKilled;
    document.getElementById('statSurvival').textContent = '60s (通关)';
    document.getElementById('deathDetail').textContent = '';
    document.getElementById('statPhase').textContent = '🎉 速战模式通关!';
    document.getElementById('statBuildTag').textContent = '';

    // 胜利专属称号
    let title = '时间管理大师';
    if (gameStats.killCount >= 50) title = '速战之神';
    else if (gameStats.bossKilled >= 2) title = 'Boss终结者';
    else if (gameStats.maxCombo >= 10) title = '连击狂魔';
    else if (gameStats.killCount >= 30) title = '高效杀手';
    else if (gameStats.killCount < 10) title = '和平主义者';

    document.getElementById('statTitle').textContent = '🏆 ' + title;

    // 胜利评价
    const comments = [
        '恭喜通关！你真是太强了！',
        '60秒？对你来说不过是热身！',
        '敌人都被你打服了！',
        '八重之犬，名不虚传！',
        '这波操作，满分！',
        '你的实力已经超越了我的想象！',
        '速战速决，干净利落！',
        '胜利属于有准备的狗！'
    ];
    document.getElementById('statComment').textContent = '"' + comments[Math.floor(Math.random() * comments.length)] + '"';

    document.getElementById('finalScore').textContent = formatScore(gameState.score);
    document.getElementById('deathReason').textContent = '🎉 胜利通关!';
    document.getElementById('deathReason').style.color = '#4ade80';

    // Reset submit button
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitStatus').textContent = '';

    generateNextRunHook();
    fetchRankComparison();

    document.getElementById('gameOver').style.display = 'block';

    // 恢复死因颜色
    setTimeout(() => {
        document.getElementById('deathReason').style.color = '';
    }, 100);
}

// 获取排行榜排名对比
async function fetchRankComparison() {
    const rankDiv = document.getElementById('rankComparison');
    if (!supabase) {
        rankDiv.style.display = 'none';
        return;
    }

    try {
        const currentScore = gameState.score;
        const mode = selectedMode;

        // 查询当前分数能排第几名
        const { data: higherScores, error } = await supabase
            .from('leaderboard_scores')
            .select('id')
            .eq('mode', mode)
            .gt('score', currentScore);

        if (error) {
            console.error('Rank query error:', error);
            rankDiv.style.display = 'none';
            return;
        }

        const currentRank = (higherScores?.length || 0) + 1;

        // 获取玩家上次的排名（如果有记录）
        const playerName = document.getElementById('playerName').value.trim() || '无名狗';
        const { data: playerRecord } = await supabase
            .from('leaderboard_scores')
            .select('score')
            .eq('name', playerName)
            .eq('mode', mode)
            .order('score', { ascending: false })
            .limit(1);

        let rankText = `🏅 本局可排第 <span style="color:#ffd700">${currentRank}</span> 名`;

        if (playerRecord && playerRecord.length > 0) {
            const oldScore = playerRecord[0].score;
            if (currentScore > oldScore) {
                rankText += ` | <span style="color:#4ade80">⬆️ 超越了你的旧记录!</span>`;
            } else if (currentScore === oldScore) {
                rankText += ` | 持平历史最佳`;
            }
        }

        // 如果能进前10，特别提示
        if (currentRank <= 10) {
            rankText = `🥇 <span style="color:#ffd700">Top ${currentRank}!</span> ${currentRank <= 3 ? '太强了!' : '快提交分数上榜!'}`;
        }

        rankDiv.innerHTML = rankText;
        rankDiv.style.display = 'block';
    } catch (e) {
        console.error('Rank comparison error:', e);
        rankDiv.style.display = 'none';
    }
}

// 生成下一局钩子
function generateNextRunHook() {
    const hookDiv = document.getElementById('nextRunHook');
    const hooks = [];

    // 1. 最高分对比
    const currentScore = gameState.score;
    const highScore = saveData.highScore || 0;
    if (currentScore > highScore) {
        hooks.push('🏆 <span style="color:#ffd700">新纪录!</span> 超越了上次最高分!');
    } else if (highScore > 0) {
        const diff = highScore - currentScore;
        if (diff < highScore * 0.2) {
            hooks.push(`📈 离最高分只差 <span style="color:#ffd700">${formatScore(diff)}</span> 分!`);
        }
    }

    // 2. 解锁进度提示
    const currentBones = outGameProgress.bones;
    const shopItems = permUpgradeItems || [];
    for (const item of shopItems) {
        if (!item.isUnlockContent) continue;
        const purchased = outGameProgress.purchasedUpgrades[item.id] || 0;
        if (purchased >= item.maxLevel) continue;
        const cost = Math.floor(item.baseCost * Math.pow(item.costScaling, purchased));
        if (cost > currentBones && cost <= currentBones + 500) {
            hooks.push(`🔓 再赚 <span style="color:#ffd700">${cost - currentBones}</span> 骨头就能解锁 ${item.icon}${item.name}!`);
            break;
        }
    }

    // 3. 成就进度
    const killsToNext = [100, 500, 1000, 2500, 5000, 10000].find(n => saveData.totalKills < n);
    if (killsToNext) {
        const remaining = killsToNext - saveData.totalKills;
        if (remaining <= 50) {
            hooks.push(`💀 再击杀 <span style="color:#ffd700">${remaining}</span> 个敌人解锁新成就!`);
        }
    }

    // 4. 存活时间挑战
    const maxSurvival = saveData.maxSurvivalTime || 0;
    if (gameStats.survivalTime > maxSurvival * 0.8 && gameStats.survivalTime < maxSurvival) {
        hooks.push(`⏱️ 差点打破生存记录! 还差 <span style="color:#ffd700">${maxSurvival - gameStats.survivalTime}秒</span>!`);
    }

    // 5. Boss击杀里程碑
    const bossToNext = [5, 15, 30, 50].find(n => saveData.totalBossKills < n);
    if (bossToNext) {
        const remaining = bossToNext - saveData.totalBossKills;
        if (remaining <= 3) {
            hooks.push(`👑 再击败 <span style="color:#ffd700">${remaining}</span> 个Boss解锁特殊奖励!`);
        }
    }

    // 显示最多2条钩子
    if (hooks.length > 0) {
        hookDiv.innerHTML = hooks.slice(0, 2).join('<br>');
        hookDiv.style.display = 'block';
    } else {
        // 默认鼓励语
        hookDiv.innerHTML = '💪 再来一局，下次一定更强!';
        hookDiv.style.display = 'block';
    }
}

// 根据流派标签获取本局风格
function getBuildTag() {
    const tags = [];
    if (runBuildTags.damage >= 5) tags.push('暴力输出');
    if (runBuildTags.survival >= 5) tags.push('苟命流');
    if (runBuildTags.vampire >= 3) tags.push('吸血鬼');
    if (runBuildTags.speed >= 4) tags.push('闪电侠');
    if (runBuildTags.aoe >= 4) tags.push('范围清场');
    if (runBuildTags.utility >= 4) tags.push('工具人');

    // 武器流派
    const weaponCount = Object.keys(playerWeapons).length;
    if (weaponCount >= 4) tags.push('军火商');
    if (playerWeapons.fireball && playerWeapons.fireball.level >= 5) tags.push('火球术士');
    if (playerWeapons.lightning && playerWeapons.lightning.level >= 5) tags.push('雷神');
    if (playerWeapons.shield && playerWeapons.shield.level >= 5) tags.push('铜墙铁壁');

    return tags.length > 0 ? tags.slice(0, 2).join(' + ') : null;
}

function resetGame() {
    gameState = { score: 0, lives: 20, time: 60, combo: 0, comboTimer: 0, gameOver: false, screenShake: 0, slowMo: false, slowMoTimer: 0, lastHitSlowMo: false, globalScale: 1, deathReason: '被打死', bossSpawned45: false, bossSpawned30: false, upgradeShown15: false, upgradeShown30: false, upgradeShown45: false, isPaused: false, hitStop: 0, phoenixUsed: false };
    gameStats = { killCount: 0, maxCombo: 0, bossKilled: 0, skillUsage: { kick: 0, slash: 0, sajiao: 0, taunt: 0 }, eventCount: 0, survivalTime: 0, noHitTimer: 0, bonusBones: 0, bonusGoldTags: 0 };
    playerBuffs = { kickDamage: 1, kickRange: 80, kickKnockback: 15, kickPierce: false, slashCD: 120, slashWidth: 100, slashDouble: false, slashDamage: 5, sajiaoCD: 900, sajiaoBossDmg: 10, sajiaoInvincible: false, tauntDuration: 180, invincibleTime: 90, comboKeep: 120, scoreMultiplier: 1, speedMult: 1, gamblerMode: false, extraChoice: false, bossDmgBonus: 1, speedBonus: 1, xpMagnetRange: 50, xpMultiplier: 1, critChance: 0, critMultiplier: 1.55, globalAttackMult: 1, boneRewardBonus: 0, oneTimeRevive: 0, bossHealOnKill: 0, lowHpGuard: 0, rareUpgradeChance: 0, extraEliteBones: 0, dangerRewardBonus: 0, relicDropBonus: 0, openingBuff: 0, goldenSkin: false, unlockGoldenEvent: false, extraBossBones: 0 };
    selectedUpgrades = [];
    selectedTalent = null;
    playerRelics = [];
    cooldowns = { slash: 0, sajiao: 0, taunt: 0, block: 0 };
    player = { x: 1350, y: 750, vx: 0, vy: 0, facingRight: true, kicking: false, kickTimer: 0, slashing: false, slashTimer: 0, item: null, scale: 1, isDead: false,  invincible: false, invincibleTimer: 0, currentState: 'idle', visible: true, blocking: false, blockTimer: 0 };
    // 重置待机动画
    idleAnim.breathFrame = 0; idleAnim.breathTimer = 0;
    idleAnim.blinkTimer = 0; idleAnim.isBlinking = false;
    idleAnim.idleTime = 0; idleAnim.isGlasses = false;
    // 重置跑步/死亡动画
    playerAnim.runFrame = 0; playerAnim.runTimer = 0;
    playerAnim.deathFrame = 0; playerAnim.deathTimer = 0;
    playerAnim.deathPlaying = false;
    idleAnim.currentAnim = 'breath';
    // 重置狂战动画
    berserkerAnim.auraFrame = 0; berserkerAnim.auraTimer = 0;
    berserkerAnim.burstActive = false; berserkerAnim.burstFrame = 0;
    berserkerAnim.burstTimer = 0; berserkerAnim.wasActivated = false;
    // 重置摄像机
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    enemies = []; particles = []; floatingTexts = []; items = []; meteors = []; lightnings = []; slashEffects = []; projectiles = []; kickEffects = []; kickFXQueue = [];

    // === 重置武器系统 ===
    initWeaponSystem();
    burningEnemies = [];
    fireRainZones = [];

    // === 重置无尽模式阶段系统 ===
    currentEndlessPhase = 0;
    lastPhaseTime = -1;
    dangerSpikeActive = false;
    dangerSpikeTimer = 0;
    dangerSpikeType = null;
    dangerSpikeData = null;

    // === 重置流派标签 ===
    runBuildTags = { damage: 0, survival: 0, utility: 0, speed: 0, vampire: 0, aoe: 0 };

    // === 重置死因记录 ===
    detailedDeathContext = { killerType: null, killerName: null, damageType: 'contact', wasElite: false, wasBoss: false, nearbyEnemies: 0, phase: 0 };

    // === 重置新系统状态 ===
    adrenalineActive = false;
    adrenalineSpeedBonus = 0;
    bloodFrenzyKills = 0;
    bloodFrenzyTimer = 0;
    fireRainTimer = 0;
    chainExplosionQueue = [];

    // === 重置割草模式系统 ===
    gemPool.reset();
    chests = [];
    chestPanelActive = false;  // 重置宝箱面板状态
    pendingUpgrade = false;    // 重置待处理升级
    playerXP.reset();
    evolvedSkills = [];
    pendingEvolution = null;
    autoAttackConfig.kick.lastTime = 0;
    autoAttackConfig.slash.lastTime = 0;
    autoAttackConfig.sajiao.lastTime = 0;

    // === 重置遗物状态 ===
    relicState.vampireHitCount = 0;
    relicState.vampireLastTarget = null;
    relicState.berserkerActive = false;
    relicState.berserkerPulseTimer = 0;
    relicState.frostStacks.clear();
    relicState.thunderStacks = 0;
    relicState.shadowCombo = 0;
    relicState.attackCombo = 0;
    relicState.killStreak = 0;
    relicState.killStreakTimer = 0;
    relicState.doomChargeTimer = 0;
    relicState.doomReady = false;
    relicState.souls = 0;
    relicState.soulStormReady = false;
    relicState.voidRifts = [];

    // === 重置已获得遗物列表 ===
    acquiredRelics = [];
    updateRelicBar();

    // 移除经验条
    const xpBar = document.getElementById('xpBar');
    if (xpBar) xpBar.remove();
    const xpLevel = document.getElementById('xpLevel');
    if (xpLevel) xpLevel.remove();

    document.getElementById('lives').textContent = 20; document.getElementById('time').textContent = 60;
    document.getElementById('slowmo').style.opacity = 0; document.getElementById('deathImage').style.opacity = 0;
    document.getElementById('bossHealthBar').style.display = 'none'; document.getElementById('upgradePanel').style.display = 'none';
    updateRelicBar();
    waveState = { current: 0, totalWaves: 10, waveTimer: 0, inWave: false, enemiesInWave: 0 };
    gameStats.survivalTime = 0;
}

function restartGame() {
    stopTimers();
    document.getElementById('gameOver').style.display = 'none';
    currentMap = 0; // 村庄广场
    document.getElementById('mapName').textContent = '📍 ' + mapThemes[currentMap].name;

    // 割草模式显示
    if (KUOSAO_MODE.enabled && selectedMode === 'endless') {
        document.getElementById('mapName').textContent += ' (割草模式)';
    }

    resetGame();
    applyPermUpgrades();
    showPlayerHealthBar();
    initPlayerHealthBar();

    // 割草模式: 初始化经验条
    if (KUOSAO_MODE.enabled && KUOSAO_MODE.xpEnabled && selectedMode === 'endless') {
        updateXPBar();
    }

    gameState.isPaused = true;

    // 无尽模式：显示初始武器选择
    if (selectedMode === 'endless') {
        showStarterWeaponPanel();
    } else {
        showTalentScreen();
    }

    startTimers();
    gamePhase = 'playing';

    // 无尽模式不显示技能栏
    if (selectedMode !== 'endless') {
        if (isMobile) document.getElementById('mobileControls').style.display = 'flex';
    }
}

let lastFrameTime = performance.now();
let frameDeltaScale = 1; // 1 = 60fps基准
function gameLoop() {
    const now = performance.now();
    const dt = now - lastFrameTime;
    lastFrameTime = now;
    // 以60fps为基准，dt=16.67ms时scale=1
    frameDeltaScale = Math.min(dt / 16.667, 3); // 上限3防止跳帧过大
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// 初始化
loadGame();
initMobileControls();
gameLoop();

// Restore saved player name
try {
    const savedName = localStorage.getItem('dogGame_playerName');
    if (savedName) document.getElementById('playerName').value = savedName;
} catch(e) {}

// 初始化 Supabase (已在 head 中加载)
initSupabase();