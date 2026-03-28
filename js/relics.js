// === 遗物状态追踪系统 ===
const relicState = {
    // 吸血獠牙
    vampireHitCount: 0,        // 连续命中同一目标次数
    vampireLastTarget: null,   // 上次命中目标
    // 狂战之心
    berserkerActive: false,    // 狂战状态
    berserkerPulseTimer: 0,    // 脉冲动画
    // 霜心
    frostStacks: new Map(),    // 敌人冰霜层数
    // 雷霆之怒
    thunderStacks: 0,          // 受伤闪电叠层
    // 影分身
    shadowCombo: 0,            // 残影连击
    // 时间扭曲
    attackCombo: 0,            // 普攻连段
    // 黄金猎手
    killStreak: 0,             // 连杀数
    killStreakTimer: 0,        // 连杀计时
    // 毁灭者
    doomChargeTimer: 0,        // 毁灭充能
    doomReady: false,          // 毁灭一击就绪
    // 灵魂收割者
    souls: 0,                  // 灵魂数量
    soulStormReady: false,     // 灵魂风暴就绪
    // 虚空行者
    voidRifts: [],             // 虚空裂痕位置
};

// === 面板状态管理 (防止升级面板覆盖宝箱面板) ===
let chestPanelActive = false;   // 宝箱选择面板是否显示中
let pendingUpgrade = false;     // 是否有待处理的升级

// === 基础遗物定义 (简单增益型) ===
const basicRelics = [
    {
        id: 'boxingGlove',
        name: '拳击手套',
        icon: '🥊',
        desc: '踢击伤害+25%',
        playstyle: '近战流',
        effect: () => { playerBuffs.kickDamage *= 1.25; }
    },
    {
        id: 'luckyStar',
        name: '幸运星',
        icon: '⭐',
        desc: '升级时有小概率多1个选项',
        playstyle: '通用',
        effect: () => { playerBuffs.luckyStarExtra = true; }
    },
    {
        id: 'crown',
        name: '王冠',
        icon: '👑',
        desc: '对Boss伤害+35%',
        playstyle: '通用',
        effect: () => { playerBuffs.bossDamageBonus = 0.35; }
    },
    {
        id: 'windBoots',
        name: '疾风靴',
        icon: '👟',
        desc: '移速+20%',
        playstyle: '通用',
        effect: () => { playerBuffs.speedMult *= 1.2; }
    },
    {
        id: 'lifeGem',
        name: '生命宝石',
        icon: '💎',
        desc: '+1命',
        playstyle: '通用',
        effect: () => { gameState.lives++; maxPlayerLives = Math.max(maxPlayerLives, gameState.lives); buildHpSegments(); updatePlayerHealthBar(false); }
    }
];

// === 史诗遗物定义 (行为改变型) ===
const epicRelics = [
    {
        id: 'vampireFang',
        name: '嗜血獠牙',
        icon: '🧛',
        desc: '连续攻击同一目标时吸血递增，击杀残血回复生命',
        playstyle: '低血狂战流/吸血续航',
        effect: () => { playerBuffs.vampireFang = true; },
        // 机制: 连击同一目标时10%→20%→30%回血，击杀30%血以下敌人必回1血
    },
    {
        id: 'berserkerHeart',
        name: '狂战之心',
        icon: '💢',
        desc: '生命≤35%时，伤害+50%，攻速+25%，角色发红光',
        playstyle: '低血狂战流',
        effect: () => { playerBuffs.berserkerHeart = true; },
        // 机制: 低血时触发明显视觉变化+强化
    },
    {
        id: 'frostCore',
        name: '霜魂之心',
        icon: '❄️',
        desc: '攻击叠加冰霜层数(最多5层)，满层时冻结敌人并触发冰爆',
        playstyle: '控制流',
        effect: () => { playerBuffs.frostCore = true; },
        // 机制: 叠层控制，满层冻结+冰爆伤害
    },
    {
        id: 'thunderGod',
        name: '雷霆之怒',
        icon: '⚡',
        desc: '受伤时召唤连锁闪电打击周围敌人，连续受伤增加闪电数量',
        playstyle: '低血狂战流/反打流',
        effect: () => { playerBuffs.thunderGod = true; relicState.thunderStacks = 0; },
        // 机制: 受伤反打，连续受伤效果叠加
    },
    {
        id: 'shadowClone',
        name: '幻影残像',
        icon: '👥',
        desc: '攻击召唤残影同步攻击，连续触发5次后召唤强化残影造成范围斩',
        playstyle: '暴击流/连击流',
        effect: () => { playerBuffs.shadowClone = true; relicState.shadowCombo = 0; },
        // 机制: 有节奏高潮的残影系统
    },
    {
        id: 'explosiveFinish',
        name: '爆裂终结者',
        icon: '💥',
        desc: '击杀爆炸，异常状态敌人的爆炸范围略扩大',
        playstyle: '击杀爆炸流',
        effect: () => { playerBuffs.explosiveFinish = true; },
        // 机制: 与异常状态联动的击杀爆炸
    }
];

// === 传奇遗物定义 (质变型) ===
const legendaryRelics = [
    {
        id: 'weaponSlot',
        name: '军火大亨',
        icon: '🎰',
        desc: '解锁第4武器槽，并随机获得一把Lv1武器',
        playstyle: '全能流',
        effect: () => {
            playerBuffs.extraWeaponSlot = true;
            // 立即赠送随机武器
            const weapons = Object.keys(weaponDefinitions);
            const available = weapons.filter(id => !playerWeapons[id]);
            if (available.length > 0) {
                const weaponId = available[Math.floor(Math.random() * available.length)];
                playerWeapons[weaponId] = { level: 1, lastTime: 0 };
                const def = weaponDefinitions[weaponId];
                showBigEvent('🎁 附赠武器!', def.icon + def.name + ' Lv1', '#ffd700');
            }
        }
    },
    {
        id: 'finalForm',
        name: '终极形态',
        icon: '👑',
        desc: '所有武器伤害+25%，射程+15%',
        playstyle: '全能流',
        effect: () => {
            playerBuffs.finalForm = true;
            playerBuffs.globalAttackMult *= 1.25;
            // 每把武器都获得强化标记
            Object.keys(playerWeapons).forEach(id => {
                playerWeapons[id].enhanced = true;
                playerWeapons[id].level = Math.min(playerWeapons[id].level + 1, 8);
            });
            showBigEvent('👑 全武器强化!', '所有武器已进入终极形态', '#ffd700');
        }
    },
    {
        id: 'phoenix',
        name: '不死凤凰',
        icon: '🔥',
        desc: '本局死亡时满血复活1次，并触发火焰冲击',
        playstyle: '低血狂战流',
        effect: () => { playerBuffs.phoenixRevive = true; }
        // 机制: 复活时触发清屏级爆发
    },
    {
        id: 'divineWrath',
        name: '神罚天降',
        icon: '✨',
        desc: '暴击时有概率召唤神罚光束',
        playstyle: '暴击流',
        effect: () => {
            playerBuffs.divineWrath = true;
            playerBuffs.critChance = (playerBuffs.critChance || 0) + 0.15;
        }
        // 机制: 暴击触发神罚光束
    },
    {
        id: 'doomSlayer',
        name: '毁灭使者',
        icon: '☠️',
        desc: '每隔数秒充能，下次攻击造成高额额外伤害',
        playstyle: '爆发流',
        effect: () => {
            playerBuffs.doomSlayer = true;
            relicState.doomChargeTimer = 0;
            relicState.doomReady = false;
        }
        // 机制: 周期性超强一击
    },
    {
        id: 'evolution',
        name: '武器觉醒',
        icon: '⚗️',
        desc: '从当前持有武器中三选一，直接升至满级并觉醒',
        playstyle: '全能流',
        effect: () => {
            const weapons = Object.keys(playerWeapons);
            if (weapons.length > 0) {
                const weaponId = weapons[Math.floor(Math.random() * weapons.length)];
                playerWeapons[weaponId].level = 8;
                playerWeapons[weaponId].awakened = true;
                const def = weaponDefinitions[weaponId];
                showBigEvent('⚗️ 武器觉醒!', def.icon + def.name + ' 觉醒为传说形态!', '#ffd700');
                // 觉醒武器获得特殊效果
                playerBuffs.awakenedWeapon = weaponId;
            }
        }
    },
];

// === 宝箱系统 (4级分层) ===
const chestConfig = {
    normal: {
        name: '木箱', color: '#8b4513', img: 'chestNormal', imgScale: 0.08,
        openText: ['补给到货!', '小有收获~', '资源+1'],
        lootTable: [
            { type: 'coins', weight: 30, amount: [20, 50] },
            { type: 'heal', weight: 25, amount: 1 },
            { type: 'xp', weight: 25, amount: [10, 25] },
            { type: 'tempBuff', weight: 15, buff: 'speed', duration: 240, value: 1.25 },
            { type: 'tempBuff', weight: 5, buff: 'invincible', duration: 90, value: true }
        ]
    },
    rare: {
        name: '稀有箱', color: '#4fc3f7', img: 'chestRare', imgScale: 0.10,
        openText: ['稀有奖励!', '强化获得!', '实力提升!'],
        lootTable: [
            { type: 'weaponXP', weight: 25 },
            { type: 'statBoost', weight: 20, stat: 'critChance', value: 0.05 },
            { type: 'statBoost', weight: 20, stat: 'attackSpeed', value: 0.12 },
            { type: 'statBoost', weight: 15, stat: 'damage', value: 0.15 },
            { type: 'cooldownReduce', weight: 10, value: 0.10 },
            { type: 'xpMagnet', weight: 10, value: 25 }
        ]
    },
    epic: {
        name: '史诗箱', color: '#ab47bc', img: 'chestEpic', imgScale: 0.12,
        openText: ['史诗发现!', '命运抉择!', '流派核心!'],
        isPick3: true,
        relicPool: epicRelics
    },
    boss: {
        name: 'Boss宝箱', color: '#ffd700', img: 'chestBoss', imgScale: 0.14,
        openText: ['传奇降临!', '质变时刻!', '终极强化!'],
        isPick3: true,
        relicPool: legendaryRelics
    }
};

let chests = [];

function spawnChest(x, y, type = 'normal') {
    const config = chestConfig[type] || chestConfig.normal;
    chests.push({
        x, y,
        type: type,
        config: config,
        bobOffset: Math.random() * Math.PI * 2,
        opened: false,
        spawnTime: Date.now()
    });
}

function openChest(chest) {
    if (chest.opened) return;
    chest.opened = true;

    const config = chest.config;
    playSound('chest');

    // 开箱文案
    const text = config.openText[Math.floor(Math.random() * config.openText.length)];
    showBigEvent(config.name, text, config.color);

    // 3选1面板 (史诗和Boss箱)
    if (config.isPick3) {
        showChestPickPanel(chest);
        return;
    }

    // 普通/稀有箱直接掉落
    const loot = rollChestLoot(config.lootTable);
    applyChestLoot(loot, chest.x, chest.y);

    // 移除宝箱
    removeChest(chest);
}

function rollChestLoot(lootTable) {
    const totalWeight = lootTable.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of lootTable) {
        roll -= item.weight;
        if (roll <= 0) return item;
    }
    return lootTable[0];
}

function applyChestLoot(loot, x, y) {
    switch (loot.type) {
        case 'coins':
            const coins = loot.amount[0] + Math.floor(Math.random() * (loot.amount[1] - loot.amount[0]));
            gameState.score += coins * 10;
            gameStats.bonusBones += Math.floor(coins / 10);
            spawnFloatingText(x, y - 30, '+' + coins + '💰', '#ffd700');
            break;
        case 'heal':
            if (gameState.lives < maxPlayerLives) {
                gameState.lives = Math.min(gameState.lives + loot.amount, maxPlayerLives);
                updatePlayerHealthBar(false);
                spawnFloatingText(x, y - 30, '+' + loot.amount + '❤️', '#ff6b6b');
            } else {
                gameState.score += 500;
                spawnFloatingText(x, y - 30, '满血! +500分', '#4ade80');
            }
            break;
        case 'xp':
            const xp = loot.amount[0] + Math.floor(Math.random() * (loot.amount[1] - loot.amount[0]));
            playerXP.addXP(xp);
            spawnFloatingText(x, y - 30, '+' + xp + ' XP', '#4fc3f7');
            break;
        case 'tempBuff':
            if (loot.buff === 'speed') {
                playerBuffs.speedMult *= loot.value;
                setTimeout(() => { playerBuffs.speedMult /= loot.value; }, loot.duration * 16);
                spawnFloatingText(x, y - 30, '⚡加速5秒!', '#ffff00');
            } else if (loot.buff === 'invincible') {
                player.invincible = true;
                player.invincibleTimer = loot.duration;
                spawnFloatingText(x, y - 30, '🛡️无敌1.5秒!', '#4ade80');
            }
            break;
        case 'weaponUpgrade':
        case 'weaponXP':
            const weapons = Object.keys(playerWeapons);
            if (weapons.length > 0) {
                const weaponId = weapons[Math.floor(Math.random() * weapons.length)];
                const def = weaponDefinitions[weaponId];
                // 给武器经验而非直接升级
                spawnFloatingText(x, y - 30, def.icon + ' 武器经验!', '#ff6600');
                gameState.score += 500;
            }
            break;
        case 'statBoost':
            if (loot.stat === 'critChance') {
                playerBuffs.critChance = (playerBuffs.critChance || 0) + loot.value;
                spawnFloatingText(x, y - 30, '暴击+5%!', '#ff4444');
            } else if (loot.stat === 'attackSpeed') {
                // 减少武器间隔
                Object.keys(playerWeapons).forEach(id => {
                    const def = weaponDefinitions[id];
                    if (def.baseInterval) def.baseInterval *= (1 - loot.value);
                });
                spawnFloatingText(x, y - 30, '攻速+15%!', '#ffaa00');
            } else if (loot.stat === 'damage') {
                playerBuffs.globalAttackMult = (playerBuffs.globalAttackMult || 1) * (1 + loot.value);
                spawnFloatingText(x, y - 30, '伤害+20%!', '#ff6b6b');
            }
            break;
        case 'cooldownReduce':
            playerBuffs.cdReduce = (playerBuffs.cdReduce || 1) * (1 - loot.value);
            spawnFloatingText(x, y - 30, '冷却-15%!', '#4fc3f7');
            break;
        case 'xpMagnet':
            playerBuffs.xpMagnetRange = (playerBuffs.xpMagnetRange || 50) + loot.value;
            spawnFloatingText(x, y - 30, '🧲拾取+30!', '#9370db');
            break;
    }

    // 粒子效果
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6,
            life: 25, color: '#ffd700', size: 4
        });
    }
}

function showChestPickPanel(chest) {
    gameState.isPaused = true;
    chestPanelActive = true;  // 标记宝箱面板激活
    const panel = document.getElementById('upgradePanel');
    const optionsDiv = document.getElementById('upgradeOptions');
    const config = chest.config;

    panel.querySelector('h2').textContent = config.name + ' - 三选一!';
    panel.querySelector('h2').style.color = config.color;
    optionsDiv.innerHTML = '';

    // 使用relicPool(史诗/Boss箱)或lootTable(其他)
    const pool = config.relicPool || config.lootTable;

    // 过滤已拥有的遗物
    const available = pool.filter(item => {
        if (item.id && playerBuffs[item.id]) return false; // 已拥有的遗物
        return true;
    });

    // 随机选3个不重复的奖励
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 3);

    picks.forEach(relic => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.style.borderColor = config.color;
        card.style.background = `linear-gradient(135deg, rgba(0,0,0,0.8), ${config.color}33)`;

        // 显示遗物信息，包括流派提示
        const playstyleHint = relic.playstyle ? `<div style="color:#888;font-size:10px;margin-top:4px">💡 ${relic.playstyle}</div>` : '';
        card.innerHTML = `
            <div class="icon" style="font-size:36px">${relic.icon}</div>
            <div class="name" style="color:${config.color}">${relic.name}</div>
            <div class="desc">${relic.desc}</div>
            ${playstyleHint}
        `;

        card.onmouseenter = () => { playSound('pickup'); card.style.transform = 'scale(1.08)'; };
        card.onmouseleave = () => { card.style.transform = 'scale(1)'; };
        card.onclick = () => {
            // 执行遗物效果
            relic.effect();

            // 记录已获得的遗物
            if (relic.id) playerBuffs[relic.id] = true;

            // 关闭选择面板
            panel.style.display = 'none';
            panel.querySelector('h2').textContent = '🎁 选择强化!';
            panel.querySelector('h2').style.color = '';

            // 移除宝箱
            removeChest(chest);

            // 确定遗物稀有度
            const tier = chest.type === 'boss' ? 'legendary' : 'epic';

            // 添加到已获得遗物列表并触发演出
            addAcquiredRelic(relic, tier);

            // 宝箱面板关闭，检查是否有待处理的升级
            chestPanelActive = false;
            if (pendingUpgrade) {
                pendingUpgrade = false;
                setTimeout(() => showKuosaoUpgradePanel(), 100);
            } else {
                gameState.isPaused = false;
            }
        };

        optionsDiv.appendChild(card);
    });

    panel.style.display = 'flex';
}

function removeChest(chest) {
    const idx = chests.indexOf(chest);
    if (idx > -1) chests.splice(idx, 1);
}

function triggerRandomEvolution() {
    const weapons = Object.keys(playerWeapons);
    if (weapons.length === 0) {
        gameState.score += 3000;
        spawnFloatingText(player.x, player.y - 60, '无武器可进化 +3000分', '#ffd700');
        return;
    }
    const weaponId = weapons[Math.floor(Math.random() * weapons.length)];
    playerWeapons[weaponId].level = 8;
    playerWeapons[weaponId].evolved = true;
    const def = weaponDefinitions[weaponId];
    showBigEvent('⚗️ 武器进化!', def.icon + def.name + ' 已进化至满级!', '#ffd700');
}

// === 割草模式升级面板 (包含武器系统) ===
function showKuosaoUpgradePanel() {
    if (gameState.gameOver || player.isDead) return;

    // 如果宝箱面板正在显示，延迟升级面板
    if (chestPanelActive) {
        pendingUpgrade = true;
        return;
    }

    gameState.isPaused = true;
    const panel = document.getElementById('upgradePanel');
    const optionsDiv = document.getElementById('upgradeOptions');
    optionsDiv.innerHTML = '';

    // 属性升级池
    const kuosaoUpgrades = [
        { id: 'xpMagnet', name: '经验磁铁', icon: '🧲', desc: '拾取范围+50%', apply: () => { if (!playerBuffs.xpMagnetRange) playerBuffs.xpMagnetRange = 50; playerBuffs.xpMagnetRange *= 1.5; } },
        { id: 'xpBoost', name: '经验加成', icon: '📈', desc: '经验+25%', apply: () => { if (!playerBuffs.xpMultiplier) playerBuffs.xpMultiplier = 1; playerBuffs.xpMultiplier *= 1.25; } },
        { id: 'autoAtkSpeed', name: '攻速提升', icon: '⚡', desc: '自动攻击+20%', apply: () => { autoAttackConfig.kick.interval *= 0.8; autoAttackConfig.slash.interval *= 0.8; } },
        { id: 'areaDmg', name: '范围伤害', icon: '💥', desc: '攻击范围+30%', apply: () => { playerBuffs.kickRange *= 1.3; playerBuffs.slashWidth *= 1.3; } },
        ...upgradePool
    ];

    const options = [];
    const count = playerBuffs.extraChoice ? 4 : 3;

    // 武器选项
    const weaponIds = Object.keys(weaponDefinitions);
    const availableWeapons = weaponIds.filter(id => {
        const w = playerWeapons[id];
        return !w || w.level < weaponDefinitions[id].maxLevel;
    });

    // 属性选项
    const availableUpgrades = kuosaoUpgrades.filter(u => !selectedUpgrades.includes(u.id));

    // 随机混合武器和属性 (武器优先级更高)
    while (options.length < count) {
        // 60%几率出武器，40%几率出属性
        const addWeapon = Math.random() < 0.6 && availableWeapons.length > 0;

        if (addWeapon) {
            const idx = Math.floor(Math.random() * availableWeapons.length);
            const weaponId = availableWeapons.splice(idx, 1)[0];
            const def = weaponDefinitions[weaponId];
            const currentLv = playerWeapons[weaponId]?.level || 0;
            options.push({
                type: 'weapon',
                id: weaponId,
                icon: def.icon,
                name: currentLv === 0 ? `新武器: ${def.name}` : `${def.name} Lv${currentLv + 1}`,
                desc: currentLv === 0 ? def.desc : `伤害/效果提升`
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
            options.push({
                type: 'weapon',
                id: weaponId,
                icon: def.icon,
                name: currentLv === 0 ? `新武器: ${def.name}` : `${def.name} Lv${currentLv + 1}`,
                desc: currentLv === 0 ? def.desc : `伤害/效果提升`
            });
        } else {
            break;
        }
    }

    options.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        const isWeapon = opt.type === 'weapon';
        const arch = opt.data?.archetype ? ARCHETYPE[opt.data.archetype] : null;
        const borderColor = isWeapon ? '#ff6600' : (arch ? arch.color : '#6666ff');
        const bgGradient = isWeapon ? 'linear-gradient(135deg, #3a2a1e, #4a3a2e)' : 'linear-gradient(135deg, #2a2a4e, #3a3a5e)';
        const typeLabel = isWeapon ? '⚔️ 武器' : (arch ? arch.label : '✨ 属性');

        card.style.borderColor = borderColor;
        card.style.background = bgGradient;
        card.innerHTML = `
            <div style="font-size:11px;color:${borderColor};margin-bottom:5px;font-weight:bold">${typeLabel}</div>
            <div class="icon">${opt.icon}</div>
            <div class="name">${opt.name}</div>
            <div class="desc">${opt.desc}</div>
        `;

        card.onclick = () => {
            if (opt.type === 'weapon') {
                addWeapon(opt.id);
                spawnFloatingText(player.x, player.y - 60, opt.icon + ' ' + opt.name, '#ff6600');
            } else {
                opt.data.apply();
                selectedUpgrades.push(opt.data.id);
                const floatColor = arch ? arch.color : '#ffd700';
                spawnFloatingText(player.x, player.y - 60, opt.icon + opt.name, floatColor);
                playSound('upgrade');
            }
            // 升级选择时屏幕闪光反馈
            gameState.screenShake = 8;
            document.getElementById('upgradePanel').style.display = 'none';
            gameState.isPaused = false;
            checkEvolution();
        };
        optionsDiv.appendChild(card);
    });

    panel.style.display = 'flex';
}

// === 更新经验条UI ===
function updateXPBar() {
    let xpBar = document.getElementById('xpBar');
    if (!xpBar) {
        // 创建经验条
        xpBar = document.createElement('div');
        xpBar.id = 'xpBar';
        xpBar.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:8px;background:#222;z-index:11;';
        xpBar.innerHTML = '<div id="xpFill" style="height:100%;background:linear-gradient(90deg,#4fc3f7,#29b6f6);width:0%;transition:width 0.2s;"></div>';
        document.getElementById('gameContainer').appendChild(xpBar);

        // 等级显示
        const lvl = document.createElement('div');
        lvl.id = 'xpLevel';
        lvl.style.cssText = 'position:absolute;top:32px;left:50%;transform:translateX(-50%);color:#4fc3f7;font-size:14px;z-index:12;text-shadow:1px 1px 2px #000;';
        document.getElementById('gameContainer').appendChild(lvl);
    }

    const percent = (playerXP.current / playerXP.toNextLevel) * 100;
    document.getElementById('xpFill').style.width = percent + '%';
    document.getElementById('xpLevel').textContent = 'Lv.' + playerXP.level;
}
