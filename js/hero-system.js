// ==================== 英雄系统 + 技能模块 ====================
// 所有英雄通过 heroDefinitions 配置, 不再写死 if-else
// 技能定义与技能行为分离, 后续加英雄只需新增配置 + 行为函数

// === 技能行为注册表 ===
// 每个技能行为是一个函数: (caster, skillDef, targets) => void
const SkillBehaviors = {
    // --- 近战范围斩击 (帧动画: slash_char_01~04, 第3帧判定伤害) ---
    melee_slash: (caster, skill) => {
        // 启动劈砍帧动画, 伤害在第3帧 (index=2) 由 updateSkillAnimation 触发
        if (typeof skillAnim !== 'undefined') {
            skillAnim.active = 'slash';
            skillAnim.frame = 0;
            skillAnim.timer = 0;
            skillAnim.frameSpeed = 100; // 每帧100ms, 总计400ms
            skillAnim.damageDealt = false;
            skillAnim._pendingSkill = skill; // 存储技能数据供伤害帧使用
        }
        if (typeof playSound === 'function') playSound('knife');
    },

    // --- 劈砍伤害判定 (由动画第3帧触发) ---
    _slashDamageFrame: (caster, skill) => {
        let range = skill.range || 100;
        let dmgMult = 1;
        let knockbackMult = 1;
        const us = (typeof waveUpgradeState !== 'undefined') ? waveUpgradeState : null;

        // 升级: 猎步强化 (闪避后下一刀范围+50%,伤害+50%)
        if (us && us.dashEmpowered) {
            range *= 1.5;
            dmgMult *= 1.5;
            us.dashEmpowered = false;
            us.dashEmpowerTimer = 0;
            // 猎步VFX
            if (typeof upgradeVfxList !== 'undefined') {
                upgradeVfxList.push({
                    type: 'hunt_step',
                    x: caster.x, y: caster.y,
                    frame: 0, timer: 0,
                    frameSpeed: 150, totalFrames: 3
                });
            }
        }

        // 升级: 连斩加速buff中攻速提升 → CD减少
        if (us && us.chainAccelBuff > 0) {
            const kickSkill = SkillDefinitions.dog_kick;
            // 立即减少当前CD (模拟攻速)
            if (HeroSystem.skillCooldowns.dog_kick > 5) {
                HeroSystem.skillCooldowns.dog_kick = Math.round(HeroSystem.skillCooldowns.dog_kick * 0.7);
            }
        }

        // 三连计数
        if (us) {
            us.slashComboCount++;
            us.slashComboTimer = 180; // 3秒超时重置
        }

        const isThirdHit = us && us.slashComboCount >= 3;

        // 升级: 第三段重斩 (第三段伤害+50%, 击退+100%)
        if (isThirdHit && us && us.active.heavy_third) {
            dmgMult *= 1.5;
            knockbackMult = 2;
        }

        // 升级: 完美闪避增伤
        if (us && us.perfectDodgeBuff > 0) {
            dmgMult *= 1.25;
        }

        const targets = enemies.filter(e =>
            !e.flying && e.currentHp > 0 &&
            Math.sqrt((e.x - caster.x) ** 2 + (e.y - caster.y) ** 2) < range
        );
        targets.forEach(t => {
            let finalDmg = skill.damage * dmgMult;
            // 升级: 开局斩 (满血+40%)
            if (us && us.active.opening_slash && t.currentHp >= t.hp) {
                finalDmg *= 1.4;
            }
            if (typeof dealDamageToEnemy === 'function') {
                dealDamageToEnemy(t, finalDmg);
            } else {
                t.currentHp -= finalDmg;
                t.hitFlash = 8;
            }
            if (typeof spawnHitEffect === 'function') spawnHitEffect(t.x, t.y, 1.5);
            if (skill.knockback) {
                const angle = Math.atan2(t.y - caster.y, t.x - caster.x);
                t.x += Math.cos(angle) * skill.knockback * knockbackMult;
                t.y += Math.sin(angle) * skill.knockback * knockbackMult;
            }
        });

        // 升级: 血战回响 (命中回血)
        if (us && us.active.blood_echo && targets.length > 0) {
            const heal = Math.min(targets.length * 0.3, 2);
            gameState.lives = Math.min(gameState.lives + heal, maxPlayerLives);
            if (typeof updatePlayerHealthBar === 'function') updatePlayerHealthBar(false);
            if (targets.length >= 3 && typeof spawnFloatingText === 'function') {
                spawnFloatingText(caster.x, caster.y - 50, `🩸+${heal.toFixed(1)}`, '#ff6666');
            }
        }

        // 升级: 斩击余波 (第三段额外冲击波)
        if (isThirdHit && us && us.active.slash_aftershock && targets.length > 0) {
            if (typeof spawnSlashAftershock === 'function') {
                spawnSlashAftershock(caster.x, caster.y, skill.damage * 0.6);
            }
            // 斩击余波VFX
            if (typeof upgradeVfxList !== 'undefined') {
                const dir = caster.facingRight ? 1 : -1;
                upgradeVfxList.push({
                    type: 'slash_aftershock',
                    x: caster.x + dir * 50, y: caster.y,
                    frame: 0, timer: 0,
                    frameSpeed: 120, totalFrames: 2
                });
            }
        }

        // 升级: 连斩加速 (三连后攻速buff)
        if (isThirdHit && us && us.active.chain_accel) {
            us.chainAccelBuff = 180; // 3秒加速
            if (typeof spawnFloatingText === 'function') {
                spawnFloatingText(caster.x, caster.y - 40, '⚡加速!', '#ffaa00');
            }
        }

        // 三连完成重置计数
        if (isThirdHit && us) {
            us.slashComboCount = 0;
        }

        if (typeof spawnKickFXByLevel === 'function') {
            spawnKickFXByLevel(Math.min(skill._level || 1, 5), 'cast');
        }
        if (targets.length > 0) {
            gameState.screenShake = Math.min(gameState.screenShake + 5, 12);
        }
        return targets.length;
    },

    // --- 投射物技能 ---
    projectile: (caster, skill) => {
        // 找最近敌人确定方向
        let dirX = caster.facingRight ? 1 : -1, dirY = 0;
        let nearestEnemy = null, nearestDist = Infinity;
        enemies.forEach(e => {
            if (e.flying || e.currentHp <= 0) return;
            const dist = Math.sqrt((e.x - caster.x) ** 2 + (e.y - caster.y) ** 2);
            if (dist < nearestDist) { nearestDist = dist; nearestEnemy = e; }
        });
        if (nearestEnemy) {
            const dx = nearestEnemy.x - caster.x;
            const dy = nearestEnemy.y - caster.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) { dirX = dx / dist; dirY = dy / dist; }
        }

        const speed = skill.projectileSpeed || 10;
        const count = skill.projectileCount || 1;

        for (let i = 0; i < count; i++) {
            const spread = count > 1 ? (i - (count - 1) / 2) * 0.2 : 0;
            const cos = Math.cos(spread), sin = Math.sin(spread);
            const vx = (dirX * cos - dirY * sin) * speed;
            const vy = (dirX * sin + dirY * cos) * speed;

            weaponProjectiles.push({
                type: skill.projectileType || 'hero_projectile',
                x: caster.x + dirX * 30,
                y: caster.y + dirY * 30,
                vx: vx, vy: vy,
                damage: skill.damage,
                pierce: skill.pierce || 1,
                hit: [],
                life: skill.projectileLife || 60,
                maxLife: skill.projectileLife || 60,
                color: skill.vfxColor || '#ffaa00',
                size: skill.projectileSize || 8
            });
        }

        if (typeof playSound === 'function') playSound(skill.sound || 'slash');
    },

    // --- 范围AOE技能 (撒娇帧动画: sajiao_char 3帧, 第2帧释放) ---
    aoe_ground: (caster, skill) => {
        // 启动撒娇帧动画, 技能效果在第2帧 (index=1) 由 updateSkillAnimation 触发
        if (typeof skillAnim !== 'undefined') {
            skillAnim.active = 'sajiao';
            skillAnim.frame = 0;
            skillAnim.timer = 0;
            skillAnim.frameSpeed = 150; // 每帧150ms, 总计450ms (大招节奏慢一点)
            skillAnim.damageDealt = false;
            skillAnim._pendingSkill = skill;
            // 初始化撒娇VFX (爱心+波纹在第2帧启动)
            skillAnim.sajiaoVfx = null;
        }
        if (typeof playSound === 'function') playSound(skill.sound || 'explosion');
    },

    // --- 撒娇伤害判定 (由动画第2帧触发) ---
    _sajiaoDamageFrame: (caster, skill) => {
        const range = skill.range || 150;
        const hitTargets = [];
        const us = (typeof waveUpgradeState !== 'undefined') ? waveUpgradeState : null;

        enemies.forEach(e => {
            if (e.flying || e.currentHp <= 0) return;
            const dist = Math.sqrt((e.x - caster.x) ** 2 + (e.y - caster.y) ** 2);
            if (dist < range) {
                if (typeof dealDamageToEnemy === 'function') {
                    dealDamageToEnemy(e, skill.damage);
                } else {
                    e.currentHp -= skill.damage;
                    e.hitFlash = 8;
                }
                if (typeof spawnHitEffect === 'function') spawnHitEffect(e.x, e.y, 2);
                hitTargets.push({ x: e.x, y: e.y });

                // 升级: 心动易伤 (标记debuff)
                if (us && us.active.heart_vulnerable) {
                    e.heartMark = true;
                    e.heartMarkTimer = 300; // 5秒
                }
            }
        });

        gameState.screenShake = Math.min(gameState.screenShake + 8, 15);

        // 升级: 撒娇回场 (命中回血)
        if (us && us.active.sajiao_heal && hitTargets.length > 0) {
            if (typeof applySajiaoHeal === 'function') {
                applySajiaoHeal(hitTargets.length);
            }
        }

        // 启动撒娇VFX序列: heart(聚集→爆发→飘散) + wave(起爆→扩散)
        if (typeof skillAnim !== 'undefined') {
            skillAnim.sajiaoVfx = {
                phase: 'heart',  // heart → wave → hit → done
                frame: 0,
                timer: 0,
                x: caster.x,
                y: caster.y,
                hitTargets: hitTargets,
                range: range
            };
        }
    },

    // --- 闪避 (K键, 纯无敌帧位移, 无伤害) ---
    dodge: (caster, skill) => {
        // 双段冲刺检查
        if (typeof waveUpgradeState !== 'undefined' && waveUpgradeState.active.double_dash) {
            if (waveUpgradeState.dashCharges <= 0) return;
            waveUpgradeState.dashCharges--;
        }

        const dir = caster.facingRight ? 1 : -1;
        let dodgeX = dir * (skill.dodgeDistance || 100);
        let dodgeY = 0;
        if (Math.abs(caster.vx) > 0.3 || Math.abs(caster.vy) > 0.3) {
            const mag = Math.sqrt(caster.vx * caster.vx + caster.vy * caster.vy);
            dodgeX = (caster.vx / mag) * (skill.dodgeDistance || 100);
            dodgeY = (caster.vy / mag) * (skill.dodgeDistance || 100);
        }

        const newX = Math.max(40, Math.min(world.width - 40, caster.x + dodgeX));
        const newY = Math.max(40, Math.min(world.height - 40, caster.y + dodgeY));
        caster.x = newX;
        caster.y = newY;

        // 无敌帧
        caster.invincible = true;
        caster.invincibleTimer = skill.iFrames || 15;
        caster._dodgeActive = true;
        caster._dodgeTimer = skill.iFrames || 15;

        // 闪避帧动画 (3帧: 冲刺.png/冲刺1.png/冲刺2.png)
        if (typeof skillAnim !== 'undefined') {
            skillAnim.active = 'dodge';
            skillAnim.frame = 0;
            skillAnim.timer = 0;
            skillAnim.frameSpeed = 80;
            skillAnim.damageDealt = false;
        }

        // 残影粒子
        for (let i = 0; i < 4; i++) {
            particles.push({
                x: caster.x - dodgeX * (i / 4) + (Math.random() - 0.5) * 15,
                y: caster.y - dodgeY * (i / 4) + (Math.random() - 0.5) * 15,
                vx: 0, vy: 0, life: 12,
                color: '#88ccff', size: 5, isAfterImage: true
            });
        }

        // 升级钩子: 猎步强化
        if (typeof waveUpgradeState !== 'undefined' && waveUpgradeState.active.hunt_step) {
            waveUpgradeState.dashEmpowered = true;
            waveUpgradeState.dashEmpowerTimer = 180; // 3秒
            if (typeof spawnHuntStepVfx === 'function') spawnHuntStepVfx();
        }
        // 升级钩子: 余闪护身
        if (typeof waveUpgradeState !== 'undefined' && waveUpgradeState.active.flash_guard) {
            waveUpgradeState.flashGuardTimer = 120; // 2秒
        }

        if (typeof playSound === 'function') playSound('dash');
    },

    // --- 冲刺/位移技能 ---
    dash: (caster, skill) => {
        const dir = caster.facingRight ? 1 : -1;
        let dashX = 0, dashY = 0;

        // 根据当前移动方向冲刺
        if (Math.abs(caster.vx) > 0.3 || Math.abs(caster.vy) > 0.3) {
            const mag = Math.sqrt(caster.vx * caster.vx + caster.vy * caster.vy);
            dashX = (caster.vx / mag) * skill.dashDistance;
            dashY = (caster.vy / mag) * skill.dashDistance;
        } else {
            dashX = dir * skill.dashDistance;
        }

        // 执行位移
        const newX = Math.max(40, Math.min(world.width - 40, caster.x + dashX));
        const newY = Math.max(40, Math.min(world.height - 40, caster.y + dashY));

        // 路径上的敌人受伤
        if (skill.dashDamage) {
            enemies.forEach(e => {
                if (e.flying || e.currentHp <= 0) return;
                // 简化: 检测冲刺路径附近的敌人
                const dist = pointToLineDistance(e.x, e.y, caster.x, caster.y, newX, newY);
                if (dist < 60) {
                    if (typeof dealDamageToEnemy === 'function') {
                        dealDamageToEnemy(e, skill.dashDamage);
                    }
                    if (typeof spawnHitEffect === 'function') spawnHitEffect(e.x, e.y, 1.5);
                }
            });
        }

        caster.x = newX;
        caster.y = newY;

        // 冲刺后短暂无敌
        if (skill.invincibleFrames) {
            caster.invincible = true;
            caster.invincibleTimer = skill.invincibleFrames;
        }

        // 残影粒子
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: caster.x - dashX * (i / 5) + (Math.random() - 0.5) * 20,
                y: caster.y - dashY * (i / 5) + (Math.random() - 0.5) * 20,
                vx: 0, vy: 0, life: 15,
                color: skill.vfxColor || '#88ccff',
                size: 6, isAfterImage: true
            });
        }

        if (typeof playSound === 'function') playSound('dash');
    }
};

// 点到线段距离 (辅助函数)
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx, projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

// === 技能定义数据结构 ===
const SkillDefinitions = {
    // --- 狗: 踢击 (基础攻击) ---
    dog_kick: {
        id: 'dog_kick',
        name: '踢击',
        icon: '🦵',
        cooldown: 40,          // 帧 (约0.67秒)
        damage: 15,
        range: 90,
        knockback: 15,
        castTime: 0,
        duration: 0,
        targetingType: 'nearest',
        behaviorKey: 'melee_slash',
        vfxKey: 'kick',
        sound: 'knife',
        _level: 1,
        keyBind: 'KeyJ'       // J键
    },

    // --- 狗: 闪避 ---
    dog_slash: {
        id: 'dog_slash',
        name: '闪避',
        icon: '💨',
        cooldown: 60,          // 帧 (~1秒)
        damage: 0,
        range: 0,
        castTime: 0,
        duration: 0,
        targetingType: 'self',
        behaviorKey: 'dodge',
        dodgeDistance: 100,
        iFrames: 15,
        vfxColor: '#88ccff',
        _level: 1,
        keyBind: 'KeyK'       // K键
    },

    // --- 狗: 撒娇AOE ---
    dog_sajiao: {
        id: 'dog_sajiao',
        name: '撒娇冲击',
        icon: '🥺',
        cooldown: 300,         // 帧 (约5秒)
        damage: 30,
        range: 150,
        castTime: 0,
        duration: 0,
        targetingType: 'aoe_center',
        behaviorKey: 'aoe_ground',
        vfxEmoji: '💕',
        vfxColor: '#ff69b4',
        sound: 'explosion',
        _level: 1,
        keyBind: 'KeyL'       // L键
    },

    // --- 狗: 冲刺 ---
    dog_dash: {
        id: 'dog_dash',
        name: '冲刺',
        icon: '💨',
        cooldown: 180,         // 帧 (约3秒)
        damage: 0,
        range: 0,
        castTime: 0,
        duration: 0,
        targetingType: 'self',
        behaviorKey: 'dash',
        dashDistance: 150,
        dashDamage: 10,
        invincibleFrames: 20,
        vfxColor: '#88ccff',
        _level: 1,
        keyBind: 'Space'      // 空格键
    }
};

// === 英雄定义 ===
const heroDefinitions = {
    dog001: {
        id: 'dog001',
        name: 'HIT DOG',
        displayName: '八重之犬',
        baseStats: {
            maxHp: 20,
            moveSpeed: 6,
            defense: 0,
            critChance: 0,
            critMultiplier: 1.5
        },
        skills: {
            basic: 'dog_kick',
            skill1: 'dog_slash',
            skill2: 'dog_sajiao',
            skill3: 'dog_dash'
        },
        passive: {
            id: 'dog_tenacity',
            name: '不屈之犬',
            desc: '生命低于25%时, 移速+35%, 攻击+20%',
            trigger: 'low_hp',
            threshold: 0.25,
            effects: { speedBonus: 0.35, damageBonus: 0.2 }
        },
        visualRefs: {
            idle: 'main',
            attack: 'attack',
            dash: 'dash',
            dead: 'dead',
            sajiao: 'sajiao',
            kick: 'kick'
        },
        tags: ['melee', 'tanky', 'starter']
    }
};

// === 英雄运行时系统 ===
const HeroSystem = {
    currentHeroId: 'dog001',
    skillCooldowns: {},       // { skillId: remainingFrames }
    skillSlots: [],           // ['dog_kick', 'dog_slash', 'dog_sajiao', 'dog_dash']

    // 初始化英雄
    init(heroId) {
        this.currentHeroId = heroId || 'dog001';
        const hero = heroDefinitions[this.currentHeroId];
        if (!hero) return;

        // 设置技能槽
        this.skillSlots = [
            hero.skills.basic,
            hero.skills.skill1,
            hero.skills.skill2,
            hero.skills.skill3
        ].filter(Boolean);

        // 重置冷却
        this.skillCooldowns = {};
        this.skillSlots.forEach(sid => {
            this.skillCooldowns[sid] = 0;
        });

        // 应用基础属性到 gameState
        gameState.lives = hero.baseStats.maxHp;
    },

    // 每帧更新冷却
    updateCooldowns() {
        for (const sid in this.skillCooldowns) {
            if (this.skillCooldowns[sid] > 0) {
                this.skillCooldowns[sid]--;
            }
        }
    },

    // 尝试释放技能
    castSkill(skillId) {
        if (player.isDead) return false;

        const skillDef = SkillDefinitions[skillId];
        if (!skillDef) return false;

        // 双段冲刺: 闪避技能使用充能而非普通CD
        if (skillDef.behaviorKey === 'dodge' && typeof waveUpgradeState !== 'undefined' && waveUpgradeState.active.double_dash) {
            if (waveUpgradeState.dashCharges <= 0) return false;
            // 不检查普通CD, 用充能代替
        } else {
            // 检查冷却
            if (this.skillCooldowns[skillId] > 0) return false;
        }

        // 获取行为函数
        const behavior = SkillBehaviors[skillDef.behaviorKey];
        if (!behavior) return false;

        // 执行技能
        behavior(player, skillDef);

        // 设置冷却 (双段冲刺用较短CD)
        if (skillDef.behaviorKey === 'dodge' && typeof waveUpgradeState !== 'undefined' && waveUpgradeState.active.double_dash) {
            this.skillCooldowns[skillId] = Math.round(skillDef.cooldown * 0.5);
        } else {
            this.skillCooldowns[skillId] = skillDef.cooldown;
        }

        // 统计
        gameStats.skillUsage[skillDef.vfxKey] = (gameStats.skillUsage[skillDef.vfxKey] || 0) + 1;

        return true;
    },

    // 检查键盘输入并释放技能
    checkSkillInput(keys) {
        for (const skillId of this.skillSlots) {
            const skillDef = SkillDefinitions[skillId];
            if (skillDef && keys[skillDef.keyBind]) {
                // 防止按住连续释放
                if (this._keyHeld && this._keyHeld[skillDef.keyBind]) continue;
                if (!this._keyHeld) this._keyHeld = {};
                this._keyHeld[skillDef.keyBind] = true;

                this.castSkill(skillId);
            } else if (skillDef) {
                if (this._keyHeld) this._keyHeld[skillDef.keyBind] = false;
            }
        }
    },

    // 获取技能冷却百分比 (用于UI)
    getSkillCooldownPercent(skillId) {
        const skillDef = SkillDefinitions[skillId];
        if (!skillDef) return 0;
        const remaining = this.skillCooldowns[skillId] || 0;
        return remaining / skillDef.cooldown;
    },

    // 获取当前英雄被动效果
    getPassiveEffects() {
        const hero = heroDefinitions[this.currentHeroId];
        if (!hero || !hero.passive) return null;

        const passive = hero.passive;
        if (passive.trigger === 'low_hp') {
            const hpRatio = gameState.lives / (hero.baseStats.maxHp || 20);
            if (hpRatio <= passive.threshold) {
                return passive.effects;
            }
        }
        return null;
    },

    // 获取当前英雄定义
    getHero() {
        return heroDefinitions[this.currentHeroId];
    }
};

// === 技能帧动画更新 (每帧调用, deltaTime 单位 ms) ===
function updateSkillAnimation(deltaTime) {
    if (typeof skillAnim === 'undefined' || !skillAnim.active) return;

    skillAnim.timer += deltaTime;
    if (skillAnim.timer < skillAnim.frameSpeed) return;

    // 推进帧
    skillAnim.timer -= skillAnim.frameSpeed;
    skillAnim.frame++;

    const skill = skillAnim._pendingSkill;

    if (skillAnim.active === 'slash') {
        // 第3帧 (index=2): 判定伤害
        if (skillAnim.frame === 2 && !skillAnim.damageDealt) {
            skillAnim.damageDealt = true;
            if (skill) SkillBehaviors._slashDamageFrame(player, skill);
        }
        // 第4帧结束 (index=4): 动画结束
        if (skillAnim.frame >= 4) {
            skillAnim.active = null;
            skillAnim._pendingSkill = null;
        }
    } else if (skillAnim.active === 'sajiao') {
        // 第2帧 (index=1): 释放技能 + 启动VFX
        if (skillAnim.frame === 1 && !skillAnim.damageDealt) {
            skillAnim.damageDealt = true;
            if (skill) SkillBehaviors._sajiaoDamageFrame(player, skill);
        }
        // 第3帧结束 (index=3): 角色动画结束
        if (skillAnim.frame >= 3) {
            skillAnim.active = null;
            skillAnim._pendingSkill = null;
            // sajiaoVfx 继续独立播放
        }
    } else if (skillAnim.active === 'dodge') {
        // 闪避动画: 3帧后结束
        if (skillAnim.frame >= 3) {
            skillAnim.active = null;
            skillAnim._pendingSkill = null;
        }
    }
}

// === 撒娇VFX更新 (独立于角色动画, 每帧调用) ===
function updateSajiaoVfx(deltaTime) {
    if (typeof skillAnim === 'undefined' || !skillAnim.sajiaoVfx) return;

    const vfx = skillAnim.sajiaoVfx;
    vfx.timer += deltaTime;

    const HEART_SPEED = 130;  // 爱心每帧130ms
    const WAVE_SPEED = 120;   // 波纹每帧120ms
    const HIT_SPEED = 200;    // 命中特效200ms

    if (vfx.phase === 'heart') {
        if (vfx.timer >= HEART_SPEED) {
            vfx.timer -= HEART_SPEED;
            vfx.frame++;
            if (vfx.frame >= 3) { vfx.phase = 'wave'; vfx.frame = 0; vfx.timer = 0; }
        }
    } else if (vfx.phase === 'wave') {
        if (vfx.timer >= WAVE_SPEED) {
            vfx.timer -= WAVE_SPEED;
            vfx.frame++;
            if (vfx.frame >= 2) {
                // 如果有命中目标, 播放命中特效
                if (vfx.hitTargets && vfx.hitTargets.length > 0) {
                    vfx.phase = 'hit'; vfx.frame = 0; vfx.timer = 0;
                } else {
                    skillAnim.sajiaoVfx = null; // VFX结束
                }
            }
        }
    } else if (vfx.phase === 'hit') {
        if (vfx.timer >= HIT_SPEED) {
            skillAnim.sajiaoVfx = null; // VFX结束
        }
    }
}

// === 撒娇VFX渲染 (在 render 中调用, ctx 已经过相机变换) ===
function drawSajiaoVfx(ctx) {
    if (typeof skillAnim === 'undefined' || !skillAnim.sajiaoVfx) return;

    const vfx = skillAnim.sajiaoVfx;
    const cx = vfx.x, cy = vfx.y;

    ctx.save();

    if (vfx.phase === 'heart') {
        // 爱心特效: 聚集(0) → 爆发(1) → 飘散(2)
        const img = (typeof sajiaoHeartFrames !== 'undefined') ? sajiaoHeartFrames[vfx.frame] : null;
        if (img && img.complete && img.naturalWidth > 0) {
            const scale = 0.3 + vfx.frame * 0.1; // 逐帧变大
            const w = img.width * scale, h = img.height * scale;
            ctx.globalAlpha = vfx.frame === 2 ? 0.7 : 1; // 飘散帧半透明
            ctx.drawImage(img, cx - w / 2, cy - h / 2 - 40, w, h);
        }
    } else if (vfx.phase === 'wave') {
        // 范围波纹: 起爆(0) → 扩散(1)
        const isExpanded = (typeof waveUpgradeState !== 'undefined') && waveUpgradeState.active.heart_expand;
        const img = (typeof sajiaoWaveFrames !== 'undefined') ? sajiaoWaveFrames[vfx.frame] : null;
        if (img && img.complete && img.naturalWidth > 0) {
            const baseScale = isExpanded ? 0.45 : 0.25;
            const expandScale = baseScale + vfx.frame * (isExpanded ? 0.25 : 0.15);
            const w = img.width * expandScale, h = img.height * expandScale;
            ctx.globalAlpha = 1 - vfx.frame * 0.3;
            // 爱心扩圈: 画在脚下(cy + offset), 不覆盖角色
            const yOff = isExpanded ? 25 : 0;
            ctx.drawImage(img, cx - w / 2, cy - h / 2 + yOff, w, h);
        }
    } else if (vfx.phase === 'hit') {
        // 命中特效: 在每个被命中的敌人位置渲染
        const img = (typeof sajiaoHitImg !== 'undefined') ? sajiaoHitImg : null;
        if (img && img.complete && img.naturalWidth > 0) {
            const progress = vfx.timer / 200; // 0→1
            const alpha = 1 - progress * 0.7;
            const hitScale = 0.2 + progress * 0.1;
            ctx.globalAlpha = alpha;
            vfx.hitTargets.forEach(t => {
                const w = img.width * hitScale, h = img.height * hitScale;
                ctx.drawImage(img, t.x - w / 2, t.y - h / 2, w, h);
            });
        }
    }

    ctx.restore();
}
