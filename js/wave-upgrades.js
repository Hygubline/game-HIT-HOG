// ==================== 波次战斗升级系统 ====================
// 15 个专属升级, 替代旧的武器/遗物/强化
// 所有升级以配置驱动, 运行时状态集中管理

// === 升级图片资源 ===
const upgradeImages = {};
const _ui = (id, src) => { upgradeImages[id] = new Image(); upgradeImages[id].src = 'images/character/' + src; };
_ui('slash_aftershock1', '斩击余波.png');
_ui('slash_aftershock2', '斩击余波2.png');
_ui('hunt_step',         '猎步强化.png');
_ui('heart_vulnerable',  '心动易伤.png');
_ui('sajiao_heal1',      '撒娇回场.png');
_ui('sajiao_heal2',      '撒娇回场2.png');

// === 运行时状态 (每局重置) ===
const waveUpgradeState = {
    active: {},               // { upgradeId: true } 已激活的升级
    // --- 普攻系 ---
    slashComboCount: 0,       // 三连计数 (斩击余波/第三段重斩/连斩加速)
    slashComboTimer: 0,       // 连击超时 (帧)
    chainAccelBuff: 0,        // 连斩加速剩余帧
    // --- 冲刺系 ---
    dashEmpowered: false,     // 猎步强化: 下一刀强化
    dashEmpowerTimer: 0,      // 猎步强化: 剩余帧
    dashCharges: 1,           // 双段冲刺: 当前充能数
    dashMaxCharges: 1,        // 双段冲刺: 最大充能数
    dashRechargeTimer: 0,     // 双段冲刺: 回复计时
    flashGuardTimer: 0,       // 余闪护身: 减伤剩余帧
    perfectDodgeBuff: 0,      // 完美闪避: 增伤剩余帧
    // --- 撒娇系 ---
    // (心动易伤挂在敌人 e.heartMarkTimer 上)
    // (撒娇回场在伤害帧直接结算)
    // (爱心扩圈直接改 range)
};

// 重置 (每局开始调用)
function resetWaveUpgradeState() {
    waveUpgradeState.active = {};
    waveUpgradeState.slashComboCount = 0;
    waveUpgradeState.slashComboTimer = 0;
    waveUpgradeState.chainAccelBuff = 0;
    waveUpgradeState.dashEmpowered = false;
    waveUpgradeState.dashEmpowerTimer = 0;
    waveUpgradeState.dashCharges = 1;
    waveUpgradeState.dashMaxCharges = 1;
    waveUpgradeState.dashRechargeTimer = 0;
    waveUpgradeState.flashGuardTimer = 0;
    waveUpgradeState.perfectDodgeBuff = 0;
}

// === 15 个升级定义 ===
const waveUpgradePool = [
    // ────── 一、普攻系 (6) ──────
    {
        id: 'slash_widen', name: '裂金加宽', icon: '🗡️', category: 'normal_attack',
        desc: '劈砍攻击范围扩大25%',
        apply() {
            SkillDefinitions.dog_kick.range *= 1.25;
        }
    },
    {
        id: 'heavy_third', name: '第三段重斩', icon: '⚔️', category: 'normal_attack',
        desc: '三连第三段伤害+50%，击退更强',
        apply() { /* 逻辑在 _slashDamageFrame 中检查 */ }
    },
    {
        id: 'slash_aftershock', name: '斩击余波', icon: '💥', category: 'normal_attack',
        desc: '第三段劈砍额外释放冲击波',
        apply() { /* 逻辑在 _slashDamageFrame 中检查 */ }
    },
    {
        id: 'blood_echo', name: '血战回响', icon: '🩸', category: 'normal_attack',
        desc: '劈砍命中回复生命，多目标回复更多',
        apply() { /* 逻辑在 _slashDamageFrame 中检查 */ }
    },
    {
        id: 'opening_slash', name: '开局斩', icon: '🔪', category: 'normal_attack',
        desc: '对满血敌人首次劈砍+40%伤害',
        apply() { /* 逻辑在 dealDamageToEnemy 中检查 */ }
    },
    {
        id: 'chain_accel', name: '连斩加速', icon: '⚡', category: 'normal_attack',
        desc: '完成三连后短时间攻速提升30%',
        apply() { /* 逻辑在 _slashDamageFrame 中检查 */ }
    },

    // ────── 二、冲刺系 (4) ──────
    {
        id: 'hunt_step', name: '猎步强化', icon: '🐾', category: 'dash',
        desc: '闪避后下一次劈砍范围+50%、伤害+50%',
        apply() { /* 逻辑在 dodge 行为和 _slashDamageFrame 中检查 */ }
    },
    {
        id: 'flash_guard', name: '余闪护身', icon: '🛡️', category: 'dash',
        desc: '闪避后短时间减伤30%',
        apply() { /* 逻辑在 dodge 行为和 playerTakeDamage 中检查 */ }
    },
    {
        id: 'double_dash', name: '双段冲刺', icon: '💨', category: 'dash',
        desc: '闪避可储存2次充能',
        rarity: 'rare',
        apply() {
            waveUpgradeState.dashMaxCharges = 2;
            waveUpgradeState.dashCharges = 2;
        }
    },
    {
        id: 'perfect_dodge', name: '完美闪避', icon: '✨', category: 'dash',
        desc: '闪避躲开攻击后短时间增伤25%',
        apply() { /* 逻辑在 checkPlayerCollision 中检查 */ }
    },

    // ────── 三、撒娇系 (3) ──────
    {
        id: 'heart_expand', name: '爱心扩圈', icon: '💗', category: 'sajiao',
        desc: '撒娇大招范围扩大50%',
        apply() {
            SkillDefinitions.dog_sajiao.range = Math.round(SkillDefinitions.dog_sajiao.range * 1.5);
        }
    },
    {
        id: 'heart_vulnerable', name: '心动易伤', icon: '💔', category: 'sajiao',
        desc: '撒娇命中的敌人受伤+25%持续5秒',
        apply() { /* 逻辑在 _sajiaoDamageFrame 中检查 */ }
    },
    {
        id: 'sajiao_heal', name: '撒娇回场', icon: '💖', category: 'sajiao',
        desc: '撒娇每命中一个敌人回复0.5生命(上限3)',
        apply() { /* 逻辑在 _sajiaoDamageFrame 中检查 */ }
    },

    // ────── 四、通用 (2) ──────
    {
        id: 'wave_rest', name: '波次喘息', icon: '🌿', category: 'general',
        desc: '每完成一波恢复2点生命',
        apply() { /* 逻辑在 WaveManager.onWaveCleared 中检查 */ }
    },
    {
        id: 'gentleman_step', name: '绅士步伐', icon: '🎩', category: 'general',
        desc: '移动速度+20%',
        apply() {
            playerBuffs.speedMult = (playerBuffs.speedMult || 1) * 1.2;
        }
    }
];

// === 类别颜色 ===
const UPGRADE_CATEGORY_COLORS = {
    normal_attack: { color: '#ff6600', label: '🗡️ 普攻' },
    dash:          { color: '#44aaff', label: '💨 闪避' },
    sajiao:        { color: '#ff69b4', label: '💕 撒娇' },
    general:       { color: '#4ade80', label: '✨ 通用' }
};

// === 波次专用升级面板 ===
function showWaveUpgradePanel() {
    if (gameState.gameOver || player.isDead) return;
    playSound('upgrade');
    gameState.isPaused = true;

    const panel = document.getElementById('upgradePanel');
    const optionsDiv = document.getElementById('upgradeOptions');
    optionsDiv.innerHTML = '';

    // 过滤已拥有的升级
    const available = waveUpgradePool.filter(u => !waveUpgradeState.active[u.id]);
    if (available.length === 0) {
        // 全部升级已获取, 直接跳过
        gameState.isPaused = false;
        if (typeof WaveManager !== 'undefined' && WaveManager.state === 'upgrade_select') {
            WaveManager.onUpgradeSelected();
        }
        return;
    }

    // 随机选3个
    const shuffled = available.sort(() => Math.random() - 0.5);
    const options = shuffled.slice(0, Math.min(3, shuffled.length));

    options.forEach(upg => {
        const cat = UPGRADE_CATEGORY_COLORS[upg.category] || { color: '#aaa', label: '?' };
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.style.borderColor = cat.color;

        const rarityBadge = upg.rarity === 'rare'
            ? '<div style="font-size:10px;color:#ffd700;margin-top:3px">★ 稀有</div>' : '';

        card.innerHTML = `
            <div style="font-size:10px;color:${cat.color};margin-bottom:3px">${cat.label}</div>
            <div class="icon">${upg.icon}</div>
            <div class="name">${upg.name}</div>
            <div class="desc">${upg.desc}</div>
            ${rarityBadge}
        `;

        card.onmouseenter = () => {
            playSound('pickup');
            card.style.transform = 'scale(1.08)';
            card.style.boxShadow = `0 0 20px ${cat.color}`;
        };
        card.onmouseleave = () => {
            card.style.transform = 'scale(1)';
            card.style.boxShadow = 'none';
        };
        card.onclick = () => selectWaveUpgrade(upg);
        optionsDiv.appendChild(card);
    });

    panel.style.display = 'flex';
}

function selectWaveUpgrade(upg) {
    // 执行升级效果
    upg.apply();
    waveUpgradeState.active[upg.id] = true;

    // UI 反馈
    if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(player.x, player.y - 60, upg.icon + ' ' + upg.name, '#4ade80');
    }
    playSound('upgrade');

    // 关闭面板
    document.getElementById('upgradePanel').style.display = 'none';
    gameState.isPaused = false;

    // 波次管理器推进
    if (typeof WaveManager !== 'undefined' && WaveManager.state === 'upgrade_select') {
        WaveManager.onUpgradeSelected();
    }
}

// === 每帧更新升级状态计时器 ===
function updateWaveUpgrades(ts) {
    // 连击超时
    if (waveUpgradeState.slashComboTimer > 0) {
        waveUpgradeState.slashComboTimer--;
        if (waveUpgradeState.slashComboTimer <= 0) {
            waveUpgradeState.slashComboCount = 0;
        }
    }

    // 连斩加速buff
    if (waveUpgradeState.chainAccelBuff > 0) {
        waveUpgradeState.chainAccelBuff--;
    }

    // 猎步强化超时
    if (waveUpgradeState.dashEmpowerTimer > 0) {
        waveUpgradeState.dashEmpowerTimer--;
        if (waveUpgradeState.dashEmpowerTimer <= 0) {
            waveUpgradeState.dashEmpowered = false;
        }
    }

    // 余闪护身
    if (waveUpgradeState.flashGuardTimer > 0) {
        waveUpgradeState.flashGuardTimer--;
    }

    // 完美闪避增伤
    if (waveUpgradeState.perfectDodgeBuff > 0) {
        waveUpgradeState.perfectDodgeBuff--;
    }

    // 双段冲刺回复
    if (waveUpgradeState.active.double_dash) {
        if (waveUpgradeState.dashCharges < waveUpgradeState.dashMaxCharges) {
            waveUpgradeState.dashRechargeTimer++;
            // 每90帧(~1.5秒)回复一次
            if (waveUpgradeState.dashRechargeTimer >= 90) {
                waveUpgradeState.dashRechargeTimer = 0;
                waveUpgradeState.dashCharges = Math.min(waveUpgradeState.dashCharges + 1, waveUpgradeState.dashMaxCharges);
            }
        }
    }

    // 心动易伤: 更新所有敌人的debuff计时
    if (waveUpgradeState.active.heart_vulnerable) {
        for (const e of enemies) {
            if (e.heartMarkTimer > 0) {
                e.heartMarkTimer--;
                if (e.heartMarkTimer <= 0) {
                    e.heartMark = false;
                }
            }
        }
    }
}

// === 斩击余波效果 (第三段触发) ===
function spawnSlashAftershock(x, y, damage) {
    const dir = player.facingRight ? 1 : -1;

    // 生成余波投射物 (短距, 大范围)
    weaponProjectiles.push({
        type: 'slash_aftershock',
        x: x + dir * 40,
        y: y,
        vx: dir * 8,
        vy: 0,
        damage: damage,
        pierce: 5,
        hit: [],
        life: 20,
        maxLife: 20,
        color: '#ffaa44',
        size: 25,
        _isAftershock: true
    });

    // 震屏
    gameState.screenShake = Math.min(gameState.screenShake + 4, 10);
}

// === 撒娇回场回血效果 ===
function applySajiaoHeal(hitCount) {
    const healAmount = Math.min(hitCount * 0.5, 3);
    if (healAmount <= 0) return;

    gameState.lives = Math.min(gameState.lives + healAmount, maxPlayerLives);
    if (typeof updatePlayerHealthBar === 'function') updatePlayerHealthBar(false);
    if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(player.x, player.y - 50, `💖 +${healAmount.toFixed(1)}`, '#ff69b4');
    }

    // 回场VFX (2帧切换)
    upgradeVfxList.push({
        type: 'sajiao_heal',
        x: player.x, y: player.y,
        frame: 0, timer: 0,
        frameSpeed: 150,
        totalFrames: 2
    });
}

// === 完美闪避触发 ===
function triggerPerfectDodge() {
    waveUpgradeState.perfectDodgeBuff = 180; // 3秒增伤

    // 视觉反馈
    if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(player.x, player.y - 60, '✨ 完美闪避!', '#ffd700');
    }
    gameState.screenShake = Math.min(gameState.screenShake + 3, 8);
    if (typeof playSound === 'function') playSound('pickup');

    // 金色粒子爆发
    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i;
        particles.push({
            x: player.x + Math.cos(angle) * 15,
            y: player.y + Math.sin(angle) * 15,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            life: 20, color: '#ffd700', size: 4
        });
    }

    // 冲刺CD减少 (如果有闪避技能)
    if (HeroSystem.skillCooldowns.dog_slash > 10) {
        HeroSystem.skillCooldowns.dog_slash -= 10;
    }
    // 大招CD减少
    if (HeroSystem.skillCooldowns.dog_sajiao > 20) {
        HeroSystem.skillCooldowns.dog_sajiao -= 20;
    }
}

// === 升级VFX列表 (独立于粒子系统) ===
let upgradeVfxList = [];

function updateUpgradeVfx(deltaTime) {
    for (let i = upgradeVfxList.length - 1; i >= 0; i--) {
        const vfx = upgradeVfxList[i];
        vfx.timer += deltaTime;
        if (vfx.timer >= vfx.frameSpeed) {
            vfx.timer -= vfx.frameSpeed;
            vfx.frame++;
            if (vfx.frame >= vfx.totalFrames) {
                upgradeVfxList.splice(i, 1);
            }
        }
    }
}

function drawUpgradeVfx(ctx) {
    for (const vfx of upgradeVfxList) {
        ctx.save();

        if (vfx.type === 'sajiao_heal') {
            const img = vfx.frame === 0 ? upgradeImages.sajiao_heal1 : upgradeImages.sajiao_heal2;
            if (img && img.complete && img.naturalWidth > 0) {
                const scale = 0.2 + vfx.frame * 0.05;
                const w = img.width * scale, h = img.height * scale;
                ctx.globalAlpha = 1 - vfx.frame * 0.3;
                ctx.drawImage(img, vfx.x - w / 2, vfx.y - h / 2 - 20, w, h);
            }
        } else if (vfx.type === 'slash_aftershock') {
            const img = vfx.frame === 0 ? upgradeImages.slash_aftershock1 : upgradeImages.slash_aftershock2;
            if (img && img.complete && img.naturalWidth > 0) {
                const scale = 0.15 + vfx.frame * 0.05;
                const w = img.width * scale, h = img.height * scale;
                ctx.globalAlpha = 1 - vfx.frame * 0.4;
                ctx.drawImage(img, vfx.x - w / 2, vfx.y - h / 2, w, h);
            }
        } else if (vfx.type === 'hunt_step') {
            const img = upgradeImages.hunt_step;
            if (img && img.complete && img.naturalWidth > 0) {
                const progress = vfx.timer / (vfx.frameSpeed * vfx.totalFrames);
                const scale = 0.25;
                const w = img.width * scale, h = img.height * scale;
                ctx.globalAlpha = Math.max(0, 1 - progress);
                // 画在角色后面 (角色中心偏下)
                ctx.drawImage(img, vfx.x - w / 2, vfx.y - h / 2 + 5, w, h);
            }
        }

        ctx.restore();
    }
}

// === 心动易伤标记渲染 (画在敌人头顶) ===
function drawHeartMarks(ctx) {
    if (!waveUpgradeState.active.heart_vulnerable) return;
    const img = upgradeImages.heart_vulnerable;
    if (!img || !img.complete || !img.naturalWidth) return;

    for (const e of enemies) {
        if (e.flying || e.currentHp <= 0 || !e.heartMark) continue;

        ctx.save();
        // 呼吸缩放效果
        const pulse = 1 + Math.sin(e.heartMarkTimer * 0.1) * 0.15;
        const scale = 0.08 * pulse;
        const w = img.width * scale, h = img.height * scale;
        ctx.globalAlpha = Math.min(1, e.heartMarkTimer / 30); // 淡出
        ctx.drawImage(img, e.x - w / 2, e.y - (e.size || 40) * 0.6 - h, w, h);
        ctx.restore();
    }
}

// === 猎步强化VFX (闪避后显示) ===
function spawnHuntStepVfx() {
    upgradeVfxList.push({
        type: 'hunt_step',
        x: player.x, y: player.y,
        frame: 0, timer: 0,
        frameSpeed: 200,
        totalFrames: 3
    });
}

// === 爱心扩圈: 扩大波纹效果 (修改drawSajiaoVfx中的渲染) ===
// 在 hero-system.js drawSajiaoVfx 中通过检查 waveUpgradeState.active.heart_expand 来放大
