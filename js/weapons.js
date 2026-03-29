// === 武器系统 (4武器×5级) ===
const weaponDefinitions = {
    kick: {
        name: '踢击', icon: '🦵', maxLevel: 5,
        levelDesc: {
            1: '单次踢击（伤害15）',
            2: '踢击范围扩大，附带小击退（伤害18）',
            3: '360°旋风踢（伤害20）',
            4: '连环踢2次',
            5: '觉醒：冲击踢，前方贯穿冲击波（伤害30）'
        },
        desc: '近身踢击敌人',
        levelBonus: (lv) => ({
            interval: Math.max(600, 1000 - lv * 80),
            damage: [15, 18, 20, 20, 30][lv - 1] || 15,
            range: lv >= 2 ? 100 : 80,
            aoe: lv >= 3,          // Lv3: 360°
            doubleHit: lv >= 4,    // Lv4: 踢2下
            shockwave: lv >= 5     // Lv5: 前方贯穿冲击波
        })
    },
    dagger: {
        name: '匕首', icon: '🗡️', maxLevel: 5,
        levelDesc: {
            1: '投掷1把匕首（伤害12）',
            2: '追加近身补刀匕首',
            3: '扇形投掷3把（单把伤害16）',
            4: '匕首命中后可弹射1次',
            5: '觉醒：风暴匕首，连续投掷锁定最近敌人（单把伤害22）'
        },
        desc: '投掷匕首攻击敌人',
        levelBonus: (lv) => ({
            interval: Math.max(800, 1400 - lv * 100),
            damage: [12, 12, 16, 16, 22][lv - 1] || 12,
            count: lv >= 5 ? 5 : (lv >= 3 ? 3 : 1),
            melee: lv >= 2,        // Lv2: 近身补刀
            bounce: lv >= 4 ? 1 : 0, // Lv4: 弹射1次
            storm: lv >= 5         // Lv5: 连续投掷锁定最近敌人
        })
    },
    lightning: {
        name: '闪电', icon: '⚡', maxLevel: 5,
        levelDesc: {
            1: '单体落雷（伤害20）',
            2: '命中后小范围溅电',
            3: '链式弹射2个目标',
            4: '同时降下2道闪电',
            5: '觉醒：雷暴，连续5道天雷优先攻击密集区域（单次伤害32）'
        },
        desc: '召唤闪电打击敌人',
        levelBonus: (lv) => ({
            interval: Math.max(1000, 2200 - lv * 200),
            damage: [20, 20, 24, 24, 32][lv - 1] || 20,
            aoeRadius: lv >= 2 ? 60 + lv * 10 : 0,
            chain: lv >= 3 ? 2 : 0,
            boltCount: lv >= 5 ? 5 : (lv >= 4 ? 2 : 1),
            storm: lv >= 5         // Lv5: 优先密集区域
        })
    },
    fire: {
        name: '火焰魔法', icon: '🔥', maxLevel: 5,
        levelDesc: {
            1: '小火球爆炸（伤害16）',
            2: '附加灼烧DOT（持续2秒）',
            3: '扇形火焰喷射',
            4: '追加第2枚火球',
            5: '觉醒：陨火，降下火雨并留下燃烧地面（单次伤害28）'
        },
        desc: '发射火球灼烧敌人',
        levelBonus: (lv) => ({
            interval: Math.max(1200, 2800 - lv * 250),
            damage: [16, 16, 20, 20, 28][lv - 1] || 16,
            radius: 50 + lv * 12,
            burn: lv >= 2,         // Lv2: 灼烧DOT
            spray: lv >= 3,        // Lv3: 扇形喷射
            count: lv >= 4 ? 2 : 1,
            fireRain: lv >= 5      // Lv5: 陨火
        })
    }
};

// 玩家当前武器
let playerWeapons = {};
let weaponProjectiles = [];
let shieldOrbs = []; // 保留兼容
let burningEnemies = []; // 燃烧DOT追踪
let fireRainZones = []; // 火雨区域

// 初始化武器系统
function initWeaponSystem() {
    playerWeapons = {};
    weaponProjectiles = [];
    shieldOrbs = [];
    burningEnemies = [];
    fireRainZones = [];
}

// 添加武器
function addWeapon(weaponId) {
    if (playerWeapons[weaponId]) {
        if (playerWeapons[weaponId].level < weaponDefinitions[weaponId].maxLevel) {
            playerWeapons[weaponId].level++;
        }
    } else {
        playerWeapons[weaponId] = { level: 1, lastTime: 0 };
    }
    playSound('upgrade');
}

// 更新武器系统
function updateWeapons() {
    if (player.isDead || gameState.isPaused) return;
    const now = Date.now();

    // 找最近敌人
    let nearestEnemy = null;
    let nearestDist = Infinity;
    enemies.forEach(e => {
        const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
        if (dist < nearestDist) { nearestDist = dist; nearestEnemy = e; }
    });

    // 自动朝向最近敌人
    if (nearestEnemy) player.facingRight = nearestEnemy.x > player.x;

    // 更新每个武器
    Object.keys(playerWeapons).forEach(weaponId => {
        const weapon = playerWeapons[weaponId];
        const def = weaponDefinitions[weaponId];
        const stats = def.levelBonus(weapon.level);
        if (now - weapon.lastTime < stats.interval) return;

        switch(weaponId) {
            // === 踢击 ===
            case 'kick': {
                if (enemies.length === 0) return;
                weapon.lastTime = now;
                const kickLv = weapon.level;

                // === 施放阶段特效 (按等级) ===
                spawnKickFXByLevel(kickLv, 'cast');

                if (stats.shockwave) {
                    // Lv5: 冲击波踢 - 全屏穿透
                    const waveCount = 24;
                    for (let i = 0; i < waveCount; i++) {
                        const a = (i / waveCount) * Math.PI * 2;
                        weaponProjectiles.push({
                            type: 'kick_shockwave', x: player.x, y: player.y,
                            vx: Math.cos(a) * 6, vy: Math.sin(a) * 6,
                            damage: stats.damage * 1.5, pierce: 999, hit: [],
                            life: 80, maxLife: 80
                        });
                    }
                    gameState.screenShake = Math.min(gameState.screenShake + 12, 20);
                    playSound('explosion');
                } else if (stats.aoe) {
                    // Lv3/4: 旋风踢 360°
                    const hitCount = stats.doubleHit ? 2 : 1;
                    for (let h = 0; h < hitCount; h++) {
                        enemies.forEach(e => {
                            const d = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
                            if (d < stats.range + 30) {
                                setTimeout(() => {
                                    if (e.hp > 0) {
                                        dealDamageToEnemy(e, stats.damage);
                                        spawnHitEffect(e.x, e.y, 1.5);
                                        // 命中特效 (按等级)
                                        spawnKickFXByLevel(kickLv, 'hit', e.x, e.y, false);
                                    }
                                }, h * 150);
                            }
                        });
                    }
                    // 旋风特效
                    weaponProjectiles.push({
                        type: 'kick_whirlwind', x: player.x, y: player.y,
                        vx: 0, vy: 0, damage: 0, life: 20, maxLife: 20, radius: stats.range + 30
                    });
                    gameState.screenShake = Math.min(gameState.screenShake + 5, 10);
                    playSound('knife');
                } else {
                    // Lv1/2: 单次踢击
                    const kickTargets = enemies.filter(e => Math.sqrt((e.x - player.x)**2 + (e.y - player.y)**2) < stats.range + 20);
                    if (kickTargets.length > 0) {
                        const t = kickTargets.sort((a,b) => Math.sqrt((a.x-player.x)**2+(a.y-player.y)**2) - Math.sqrt((b.x-player.x)**2+(b.y-player.y)**2))[0];
                        dealDamageToEnemy(t, stats.damage);
                        spawnHitEffect(t.x, t.y, 1.2);
                        const knockAngle = Math.atan2(t.y - player.y, t.x - player.x);
                        t.x += Math.cos(knockAngle) * 15;
                        t.y += Math.sin(knockAngle) * 15;
                        // 命中特效 (按等级)
                        spawnKickFXByLevel(kickLv, 'hit', t.x, t.y, false);
                        gameState.screenShake = Math.min(gameState.screenShake + 3, 8);
                        playSound('knife');
                    }
                }
                break;
            }

            // === 匕首 ===
            case 'dagger': {
                if (!nearestEnemy) return;
                weapon.lastTime = now;

                if (stats.storm) {
                    // Lv5: 刀刃风暴 - 8把全方向
                    for (let i = 0; i < 8; i++) {
                        const a = (i / 8) * Math.PI * 2;
                        weaponProjectiles.push({
                            type: 'dagger', x: player.x, y: player.y,
                            vx: Math.cos(a) * 8, vy: Math.sin(a) * 8,
                            damage: stats.damage * 1.3, pierce: 2, hit: [], bounce: 0,
                            life: 60, maxLife: 60
                        });
                    }
                    // 风暴特效
                    for (let i = 0; i < 12; i++) {
                        const a = Math.random() * Math.PI * 2;
                        particles.push({ x: player.x, y: player.y, vx: Math.cos(a)*5, vy: Math.sin(a)*5, life: 15, color: '#cccccc', size: 2 });
                    }
                    gameState.screenShake = Math.min(gameState.screenShake + 6, 12);
                    playSound('knife');
                } else {
                    const count = stats.count;
                    if (count >= 3) {
                        // Lv3/4: 扇形投掷3把
                        const baseAngle = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
                        for (let i = 0; i < count; i++) {
                            const spread = (i - (count-1)/2) * 0.3;
                            const a = baseAngle + spread;
                            weaponProjectiles.push({
                                type: 'dagger', x: player.x, y: player.y,
                                vx: Math.cos(a) * 8, vy: Math.sin(a) * 8,
                                damage: stats.damage, pierce: 0, hit: [],
                                bounce: stats.bounce || 0,
                                life: 50, maxLife: 50
                            });
                        }
                    } else {
                        // Lv1/2: 单发直线
                        const a = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
                        weaponProjectiles.push({
                            type: 'dagger', x: player.x, y: player.y,
                            vx: Math.cos(a) * 8, vy: Math.sin(a) * 8,
                            damage: stats.damage, pierce: 0, hit: [],
                            bounce: stats.bounce || 0,
                            life: 50, maxLife: 50
                        });
                    }
                    // Lv2+: 近身补刀
                    if (stats.melee && nearestDist < 100) {
                        dealDamageToEnemy(nearestEnemy, stats.damage * 0.7);
                        spawnHitEffect(nearestEnemy.x, nearestEnemy.y, 1.0);
                        for (let p = 0; p < 3; p++) { particles.push({ x: nearestEnemy.x, y: nearestEnemy.y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life: 8, color: '#dddddd', size: 2 }); }
                    }
                    playSound('knife');
                }
                break;
            }

            // === 闪电 ===
            case 'lightning': {
                if (enemies.length === 0) return;
                weapon.lastTime = now;

                if (stats.storm) {
                    // Lv5: 雷暴 - 全屏随机8道天雷
                    for (let i = 0; i < 8; i++) {
                        const tx = player.x + (Math.random() - 0.5) * canvas.width * 1.5;
                        const ty = player.y + (Math.random() - 0.5) * canvas.height * 1.5;
                        setTimeout(() => {
                            const hitEnemies = enemies.filter(e => Math.sqrt((e.x - tx)**2 + (e.y - ty)**2) < 100);
                            hitEnemies.forEach(e => dealDamageToEnemy(e, stats.damage));
                            // 雷暴视觉
                            weaponProjectiles.push({ type: 'lightning_bolt', x: tx, y: ty, vx: 0, vy: 0, damage: 0, life: 20, maxLife: 20, radius: 100 });
                            for (let j = 0; j < 10; j++) { particles.push({ x: tx, y: ty, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 18, color: ['#ffff00','#ffffff','#88ccff'][Math.floor(Math.random()*3)], size: 4+Math.random()*3 }); }
                        }, i * 80);
                    }
                    gameState.screenShake = Math.min(gameState.screenShake + 10, 18);
                    playSound('lightning');
                } else {
                    // 获取可攻击目标
                    const range = stats.storm ? 9999 : 450;
                    const targets = enemies.filter(e => Math.sqrt((e.x - player.x)**2 + (e.y - player.y)**2) < range);
                    if (targets.length === 0) return;

                    const boltCount = stats.boltCount;
                    const usedTargets = [];

                    for (let b = 0; b < Math.min(boltCount, targets.length); b++) {
                        // 优先选不同目标
                        let t = null;
                        for (const candidate of targets) {
                            if (!usedTargets.includes(candidate)) { t = candidate; break; }
                        }
                        if (!t) t = targets[Math.floor(Math.random() * targets.length)];
                        usedTargets.push(t);

                        // 主雷击
                        dealDamageToEnemy(t, stats.damage);
                        weaponProjectiles.push({ type: 'lightning_bolt', x: t.x, y: t.y, vx: 0, vy: 0, damage: 0, life: 18, maxLife: 18, radius: 30 });
                        gameState.screenShake = Math.min(gameState.screenShake + 3, 10);
                        for (let j = 0; j < 8; j++) { particles.push({ x: t.x, y: t.y, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 15, color: '#ffff00', size: 4 }); }

                        // Lv2+: 范围电击
                        if (stats.aoeRadius > 0) {
                            enemies.forEach(e => {
                                if (e !== t && Math.sqrt((e.x - t.x)**2 + (e.y - t.y)**2) < stats.aoeRadius) {
                                    dealDamageToEnemy(e, stats.damage * 0.4);
                                    for (let p = 0; p < 3; p++) { particles.push({ x: e.x, y: e.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 8, color: '#ffff88', size: 2 }); }
                                }
                            });
                        }

                        // Lv3+: 链式闪电
                        if (stats.chain > 0) {
                            let chainSource = t;
                            const chained = [t];
                            for (let c = 0; c < stats.chain; c++) {
                                const chainTargets = enemies.filter(e => !chained.includes(e) && Math.sqrt((e.x - chainSource.x)**2 + (e.y - chainSource.y)**2) < 200);
                                if (chainTargets.length === 0) break;
                                const next = chainTargets[0];
                                chained.push(next);
                                dealDamageToEnemy(next, stats.damage * 0.5);
                                // 链式闪电视觉线
                                weaponProjectiles.push({ type: 'lightning_chain', x: chainSource.x, y: chainSource.y, tx: next.x, ty: next.y, vx: 0, vy: 0, damage: 0, life: 12, maxLife: 12 });
                                for (let p = 0; p < 4; p++) { particles.push({ x: next.x, y: next.y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life: 10, color: '#ffff00', size: 3 }); }
                                chainSource = next;
                            }
                        }
                    }
                    playSound('lightning');
                }
                break;
            }

            // === 火焰魔法 ===
            case 'fire': {
                if (enemies.length === 0) return;
                weapon.lastTime = now;

                if (stats.fireRain) {
                    // Lv5: 火雨 - 全场从天而降持续燃烧
                    for (let i = 0; i < 6; i++) {
                        const rx = player.x + (Math.random() - 0.5) * canvas.width * 1.2;
                        const ry = player.y + (Math.random() - 0.5) * canvas.height * 1.2;
                        setTimeout(() => {
                            // 落点伤害
                            enemies.forEach(e => {
                                if (Math.sqrt((e.x - rx)**2 + (e.y - ry)**2) < 80) {
                                    dealDamageToEnemy(e, stats.damage);
                                    applyBurn(e, stats.damage);
                                }
                            });
                            // 火雨燃烧区域
                            fireRainZones.push({ x: rx, y: ry, radius: 80, damage: stats.damage * 0.3, life: 120, maxLife: 120 });
                            // 大型爆炸粒子
                            for (let j = 0; j < 15; j++) {
                                particles.push({ x: rx, y: ry, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8 - 3, life: 25, color: ['#ffffff','#ffcc00','#ff6600','#ff2200'][Math.floor(Math.random()*4)], size: 5+Math.random()*5 });
                            }
                        }, i * 120);
                    }
                    gameState.screenShake = Math.min(gameState.screenShake + 10, 18);
                    playSound('explosion');
                } else if (stats.spray) {
                    // Lv3/4: 火焰喷射扇形
                    const baseAngle = nearestEnemy ? Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x) : 0;
                    const sprayCount = stats.count >= 2 ? 10 : 6;
                    for (let i = 0; i < sprayCount; i++) {
                        const spread = (i - (sprayCount-1)/2) * 0.15;
                        const a = baseAngle + spread;
                        const speed = 5 + Math.random() * 3;
                        weaponProjectiles.push({
                            type: 'fire_spray', x: player.x, y: player.y,
                            vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
                            damage: stats.damage * 0.5, burn: stats.burn,
                            burnDamage: stats.damage, radius: stats.radius,
                            life: 25, maxLife: 25, hit: []
                        });
                    }
                    playSound('fireball');
                } else {
                    // Lv1/2: 发射火球
                    if (!nearestEnemy) return;
                    const fireCount = stats.count;
                    for (let i = 0; i < fireCount; i++) {
                        const a = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x) + (i - (fireCount-1)/2) * 0.4;
                        const sizeScale = weapon.level >= 2 ? 1.3 : 1.0;
                        weaponProjectiles.push({
                            type: 'fireball', x: player.x, y: player.y,
                            vx: Math.cos(a) * 5, vy: Math.sin(a) * 5,
                            damage: stats.damage, radius: stats.radius,
                            burn: stats.burn, burnDamage: stats.damage,
                            sizeScale: sizeScale,
                            life: 60, maxLife: 60
                        });
                    }
                    playSound('fireball');
                }
                break;
            }
        }
    });

    // 更新弹幕
    updateWeaponProjectiles();
    // 更新燃烧DOT
    updateBurning(now);
    // 更新火雨区域
    updateFireRainZones();
}

// 对敌人施加燃烧
function applyBurn(enemy, baseDamage) {
    const existing = burningEnemies.find(b => b.enemy === enemy);
    if (existing) {
        existing.duration = 180; // 刷新持续时间
        existing.damage = Math.max(existing.damage, baseDamage * 0.15);
    } else {
        burningEnemies.push({ enemy: enemy, damage: baseDamage * 0.15, duration: 180, tickTimer: 0 });
    }
}

// 更新燃烧DOT
function updateBurning(now) {
    for (let i = burningEnemies.length - 1; i >= 0; i--) {
        const b = burningEnemies[i];
        b.duration--;
        b.tickTimer++;
        if (b.enemy.hp <= 0 || b.duration <= 0) {
            burningEnemies.splice(i, 1);
            continue;
        }
        // 每30帧(~0.5秒)烧一次
        if (b.tickTimer >= 30) {
            b.tickTimer = 0;
            dealDamageToEnemy(b.enemy, b.damage);
            // 小火焰粒子
            for (let p = 0; p < 3; p++) {
                particles.push({
                    x: b.enemy.x + (Math.random()-0.5)*20,
                    y: b.enemy.y + (Math.random()-0.5)*20,
                    vx: (Math.random()-0.5)*2,
                    vy: -1 - Math.random()*2,
                    life: 15, color: ['#ff4400','#ff8800','#ffcc00'][Math.floor(Math.random()*3)], size: 3
                });
            }
            spawnFloatingText(b.enemy.x, b.enemy.y - 30, '🔥' + Math.round(b.damage), '#ff6600');
        }
    }
}

// 更新火雨区域
function updateFireRainZones() {
    for (let i = fireRainZones.length - 1; i >= 0; i--) {
        const z = fireRainZones[i];
        z.life--;
        if (z.life <= 0) { fireRainZones.splice(i, 1); continue; }
        // 每20帧对区域内敌人造成伤害
        if (z.life % 20 === 0) {
            enemies.forEach(e => {
                if (Math.sqrt((e.x - z.x)**2 + (e.y - z.y)**2) < z.radius) {
                    dealDamageToEnemy(e, z.damage);
                    applyBurn(e, z.damage * 2);
                }
            });
        }
        // 持续火焰粒子
        if (z.life % 5 === 0) {
            particles.push({
                x: z.x + (Math.random()-0.5) * z.radius,
                y: z.y + (Math.random()-0.5) * z.radius,
                vx: (Math.random()-0.5)*2, vy: -1-Math.random()*2,
                life: 12, color: ['#ff4400','#ff8800','#ffcc00'][Math.floor(Math.random()*3)], size: 3+Math.random()*3
            });
        }
    }
}

// 更新武器弹幕
function updateWeaponProjectiles() {
    for (let i = weaponProjectiles.length - 1; i >= 0; i--) {
        const p = weaponProjectiles[i];

        // 生命周期
        if (p.life !== undefined) {
            p.life--;
            if (p.life <= 0) { weaponProjectiles.splice(i, 1); continue; }
        }

        // 纯视觉效果不需要碰撞
        if (p.type === 'kick_whirlwind' || p.type === 'lightning_bolt' || p.type === 'lightning_chain') continue;

        p.x += p.vx * frameDeltaScale;
        p.y += p.vy * frameDeltaScale;

        // 边界检查
        if (p.x < -100 || p.x > world.width + 100 || p.y < -100 || p.y > world.height + 100) {
            weaponProjectiles.splice(i, 1);
            continue;
        }

        // 碰撞检测
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const dist = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);

            if (dist < 30 + (e.radius || 20)) {
                if (p.hit && p.hit.includes(j)) continue;

                dealDamageToEnemy(e, p.damage);
                spawnHitEffect(e.x, e.y, 1.5);
                gameState.screenShake = Math.min(gameState.screenShake + 2, 8);

                // 火球爆炸
                if (p.type === 'fireball') {
                    enemies.forEach(ae => {
                        const aDist = Math.sqrt((ae.x - p.x) ** 2 + (ae.y - p.y) ** 2);
                        if (aDist < p.radius && ae !== e) {
                            dealDamageToEnemy(ae, p.damage * 0.6);
                            if (p.burn) applyBurn(ae, p.burnDamage);
                        }
                    });
                    if (p.burn) applyBurn(e, p.burnDamage);
                    // 爆炸特效 - 等级越高粒子越多越亮
                    const pCount = p.sizeScale > 1 ? 20 : 12;
                    for (let k = 0; k < pCount; k++) {
                        particles.push({
                            x: p.x, y: p.y,
                            vx: (Math.random() - 0.5) * 10,
                            vy: (Math.random() - 0.5) * 10,
                            life: 22,
                            color: p.sizeScale > 1 ? ['#ffffff','#ffcc00','#ff8800','#ff4400'][Math.floor(Math.random()*4)] : ['#ff4400','#ff8800','#ffcc00'][Math.floor(Math.random()*3)],
                            size: (5 + Math.random() * 4) * (p.sizeScale || 1)
                        });
                    }
                    weaponProjectiles.splice(i, 1);
                    playSound('explosion');
                    gameState.screenShake = Math.min(gameState.screenShake + 8, 15);
                    break;
                }

                // 火焰喷射命中
                if (p.type === 'fire_spray') {
                    if (p.burn) applyBurn(e, p.burnDamage || p.damage * 2);
                    p.hit = p.hit || [];
                    p.hit.push(j);
                    continue;
                }

                // 匕首反弹
                if (p.type === 'dagger' && p.bounce > 0) {
                    p.bounce--;
                    p.hit = p.hit || [];
                    p.hit.push(j);
                    // 找下一个目标
                    const nextTarget = enemies.find((ne, ni) => ne !== e && ne.hp > 0 && !p.hit.includes(ni));
                    if (nextTarget) {
                        const a = Math.atan2(nextTarget.y - p.y, nextTarget.x - p.x);
                        p.vx = Math.cos(a) * 8;
                        p.vy = Math.sin(a) * 8;
                    }
                    continue;
                }

                // 穿透处理
                if (p.pierce && p.pierce > 0) {
                    p.hit = p.hit || [];
                    p.hit.push(j);
                    if (p.pierce !== 999) p.pierce--;
                } else {
                    weaponProjectiles.splice(i, 1);
                    break;
                }
            }
        }
    }
}

// 绘制武器效果 (使用世界坐标)
function drawWeapons(ctx) {
    // 绘制火雨燃烧区域
    fireRainZones.forEach(z => {
        const alpha = Math.min(z.life / z.maxLife, 0.5);
        const grad = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.radius);
        grad.addColorStop(0, `rgba(255, 100, 0, ${alpha * 0.6})`);
        grad.addColorStop(0.7, `rgba(255, 50, 0, ${alpha * 0.3})`);
        grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // 绘制燃烧敌人标记
    burningEnemies.forEach(b => {
        if (b.enemy.hp > 0) {
            ctx.save();
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🔥', b.enemy.x, b.enemy.y - (b.enemy.radius || 20) - 5);
            ctx.restore();
        }
    });

    // 绘制弹幕
    weaponProjectiles.forEach(p => {
        ctx.save();

        switch(p.type) {
            case 'dagger': {
                ctx.translate(p.x, p.y);
                const dAngle = Math.atan2(p.vy, p.vx) + Math.PI / 2;
                ctx.rotate(dAngle);
                // 匕首形状
                ctx.fillStyle = '#ddd';
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, -14);
                ctx.lineTo(-4, 2);
                ctx.lineTo(-2, 4);
                ctx.lineTo(0, 2);
                ctx.lineTo(2, 4);
                ctx.lineTo(4, 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // 刀柄
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(-2, 4, 4, 6);
                break;
            }

            case 'fireball': {
                ctx.translate(p.x, p.y);
                const size = 12 * (p.sizeScale || 1);
                ctx.rotate(Date.now() / 100);
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
                if (p.sizeScale > 1) {
                    grad.addColorStop(0, '#ffffff');
                    grad.addColorStop(0.3, '#ffee88');
                    grad.addColorStop(0.6, '#ff8800');
                    grad.addColorStop(1, '#ff2200');
                } else {
                    grad.addColorStop(0, '#ffff00');
                    grad.addColorStop(0.5, '#ff8800');
                    grad.addColorStop(1, '#ff4400');
                }
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.fill();
                // 外焰光晕
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
                ctx.fillStyle = p.sizeScale > 1 ? 'rgba(255,200,100,0.3)' : 'rgba(255,100,0,0.3)';
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }

            case 'fire_spray': {
                ctx.translate(p.x, p.y);
                const alpha = p.life / p.maxLife;
                const sz = 6 + (1 - alpha) * 8;
                const grad2 = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
                grad2.addColorStop(0, `rgba(255, 200, 50, ${alpha})`);
                grad2.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.7})`);
                grad2.addColorStop(1, `rgba(255, 0, 0, 0)`);
                ctx.fillStyle = grad2;
                ctx.beginPath();
                ctx.arc(0, 0, sz, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'kick_shockwave': {
                ctx.translate(p.x, p.y);
                const alpha = p.life / p.maxLife;
                const sz = 8 + (1 - alpha) * 10;
                ctx.globalAlpha = alpha * 0.8;
                const grad3 = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
                grad3.addColorStop(0, '#ffffff');
                grad3.addColorStop(0.5, '#88ccff');
                grad3.addColorStop(1, 'rgba(100,180,255,0)');
                ctx.fillStyle = grad3;
                ctx.beginPath();
                ctx.arc(0, 0, sz, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }

            case 'kick_whirlwind': {
                ctx.translate(p.x, p.y);
                const alpha = p.life / p.maxLife;
                const r = p.radius * (1 - alpha * 0.3);
                ctx.globalAlpha = alpha * 0.4;
                ctx.strokeStyle = '#88ccff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.stroke();
                // 旋风弧线
                for (let a = 0; a < 4; a++) {
                    const startAngle = (Date.now() / 50) + a * Math.PI / 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.7, startAngle, startAngle + Math.PI / 3);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                break;
            }

            case 'lightning_bolt': {
                ctx.translate(p.x, p.y);
                const alpha = p.life / p.maxLife;
                // 闪电柱
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 3 + Math.random() * 2;
                ctx.beginPath();
                ctx.moveTo(0, -200);
                let ly = -200;
                while (ly < 0) {
                    ly += 15;
                    ctx.lineTo((Math.random()-0.5) * 30, ly);
                }
                ctx.stroke();
                // 电击圈
                if (p.radius > 30) {
                    ctx.strokeStyle = `rgba(255, 255, 100, ${alpha * 0.5})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
                // 中心亮点
                const g4 = ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
                g4.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                g4.addColorStop(1, `rgba(255, 255, 100, 0)`);
                ctx.fillStyle = g4;
                ctx.beginPath();
                ctx.arc(0, 0, 25, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }

            case 'lightning_chain': {
                const alpha = p.life / p.maxLife;
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                const dx = p.tx - p.x, dy = p.ty - p.y;
                const steps = 6;
                for (let s = 1; s <= steps; s++) {
                    const t = s / steps;
                    ctx.lineTo(p.x + dx * t + (Math.random()-0.5)*20, p.y + dy * t + (Math.random()-0.5)*20);
                }
                ctx.stroke();
                ctx.globalAlpha = 1;
                break;
            }

            // === 英雄系统投射物 (通用渲染) ===
            default: {
                ctx.translate(p.x, p.y);
                const alpha = p.life / (p.maxLife || 60);
                ctx.globalAlpha = alpha;
                const angle = Math.atan2(p.vy, p.vx);
                ctx.rotate(angle);

                // 根据类型选择形状
                if (p.type === 'slash_wave') {
                    // 剑气波
                    ctx.fillStyle = p.color || '#ffd700';
                    ctx.beginPath();
                    ctx.moveTo(-(p.size || 10), 0);
                    ctx.lineTo(0, -(p.size || 10));
                    ctx.lineTo((p.size || 10) * 2, 0);
                    ctx.lineTo(0, (p.size || 10));
                    ctx.closePath();
                    ctx.fill();
                    // 光晕
                    ctx.globalAlpha = alpha * 0.3;
                    ctx.fillStyle = p.color || '#ffd700';
                    ctx.beginPath();
                    ctx.arc(0, 0, (p.size || 10) * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'kick_shockwave') {
                    // 冲击波
                    ctx.fillStyle = p.color || '#ff8844';
                    ctx.beginPath();
                    ctx.arc(0, 0, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = alpha * 0.4;
                    ctx.beginPath();
                    ctx.arc(0, 0, 12, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'slash_aftershock') {
                    // 斩击余波 — 使用提供的图片资源
                    const afImg = (typeof upgradeImages !== 'undefined')
                        ? (p.life > 10 ? upgradeImages.slash_aftershock1 : upgradeImages.slash_aftershock2)
                        : null;
                    if (afImg && afImg.complete && afImg.naturalWidth > 0) {
                        const scale = 0.15 * (1 + (1 - p.life / (p.maxLife || 20)) * 0.3);
                        const w = afImg.width * scale, h = afImg.height * scale;
                        ctx.drawImage(afImg, -w / 2, -h / 2, w, h);
                    } else {
                        // fallback: 扇形
                        ctx.fillStyle = '#ffaa44';
                        ctx.beginPath();
                        ctx.arc(0, 0, p.size || 20, -0.4, 0.4);
                        ctx.lineTo(0, 0);
                        ctx.fill();
                    }
                } else {
                    // 通用球形投射物
                    const size = p.size || 8;
                    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
                    grad.addColorStop(0, '#fff');
                    grad.addColorStop(0.5, p.color || '#ffaa00');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                break;
            }
        }

        ctx.restore();
    });

    // 绘制闪电特效 (保留原系统兼容)
    lightnings.forEach(l => {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        let ly = l.y;
        while (ly < l.targetY) { ly += 18; ctx.lineTo(l.x + (Math.random()-0.5)*25, ly); }
        ctx.stroke();
    });
}

// === 自动攻击系统 (兼容非无尽模式) ===
const autoAttackConfig = {
    kick: { interval: 600, lastTime: 0, enabled: true },
    slash: { interval: 1200, lastTime: 0, enabled: true },
    sajiao: { interval: 6000, lastTime: 0, enabled: true },
    block: { interval: 5000, lastTime: 0, enabled: true }
};

function updateAutoAttack() {
    // 无尽模式只用武器系统，禁用原有攻击
    if (selectedMode === 'endless') return;
    if (player.isDead || gameState.isPaused) return;

    const now = Date.now();
    let nearestEnemy = null;
    let nearestDist = Infinity;
    enemies.forEach(e => {
        if (e.flying) return;
        const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
        if (dist < nearestDist) { nearestDist = dist; nearestEnemy = e; }
    });
    if (!nearestEnemy) return;
    player.facingRight = nearestEnemy.x > player.x;
    const nearbyEnemies = enemies.filter(e => !e.flying && Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2) < 150).length;
    const berserkerSpeedMult = (playerBuffs.berserkerHeart && gameState.lives <= 2) ? 0.67 : 1;

    if (autoAttackConfig.kick.enabled && nearestDist < 100) {
        if (now - autoAttackConfig.kick.lastTime > autoAttackConfig.kick.interval * berserkerSpeedMult) {
            if (!player.kicking && !player.slashing && !player.blocking) {
                performKick();
                autoAttackConfig.kick.lastTime = now;
            }
        }
    }
    if (autoAttackConfig.slash.enabled && nearestDist < 300) {
        if (now - autoAttackConfig.slash.lastTime > autoAttackConfig.slash.interval * berserkerSpeedMult) {
            if (cooldowns.slash <= 0 && !player.blocking) {
                performSlash();
                autoAttackConfig.slash.lastTime = now;
            }
        }
    }
    if (autoAttackConfig.sajiao.enabled && nearbyEnemies >= 4) {
        if (now - autoAttackConfig.sajiao.lastTime > autoAttackConfig.sajiao.interval) {
            if (cooldowns.sajiao <= 0 && !player.blocking) {
                performSajiao();
                autoAttackConfig.sajiao.lastTime = now;
            }
        }
    }
    if (autoAttackConfig.block.enabled && nearbyEnemies >= 3 && nearestDist < 80) {
        if (now - autoAttackConfig.block.lastTime > autoAttackConfig.block.interval) {
            if (cooldowns.block <= 0 && !player.kicking && !player.slashing && !player.blocking) {
                performBlock();
                autoAttackConfig.block.lastTime = now;
            }
        }
    }
}

// === 武器进化系统 (保留框架，觉醒通过Lv5实现) ===
const evolutionRecipes = [];

let evolvedSkills = [];
let pendingEvolution = null;

function checkEvolution() {
    if (!KUOSAO_MODE.evolutionEnabled) return;

    for (const recipe of evolutionRecipes) {
        if (evolvedSkills.includes(recipe.evolved)) continue;

        // 检查是否有对应遗物
        const hasRelic = playerRelics.find(r => r.id === recipe.relic);
        // 检查是否技能升级足够 (通过selectedUpgrades判断)
        const skillUpgraded = selectedUpgrades.some(u => u.includes(recipe.baseSkill));

        if (hasRelic && skillUpgraded) {
            triggerEvolution(recipe);
            return;
        }
    }
}

function triggerEvolution(recipe) {
    pendingEvolution = recipe;
    gameState.isPaused = true;
    showEvolutionPanel(recipe);
}

function showEvolutionPanel(recipe) {
    const panel = document.getElementById('upgradePanel');
    const optionsDiv = document.getElementById('upgradeOptions');
    panel.querySelector('h2').textContent = '⚡ 武器进化!';
    optionsDiv.innerHTML = `
        <div class="upgrade-card" style="border-color: #ffd700; background: linear-gradient(135deg, #2a2a4e, #3a2a5e);" onclick="confirmEvolution()">
            <div class="icon" style="font-size: 48px;">${recipe.icon}</div>
            <div class="name" style="color: #ffd700;">${recipe.name}</div>
            <div class="desc">${recipe.desc}</div>
        </div>
    `;
    panel.style.display = 'flex';
    playSound('boss');
}

function confirmEvolution() {
    if (!pendingEvolution) return;

    pendingEvolution.effect();
    evolvedSkills.push(pendingEvolution.evolved);
    spawnFloatingText(player.x, player.y - 100, pendingEvolution.icon + ' ' + pendingEvolution.name + ' 进化!', '#ffd700');

    // 减少进化特效
    if (particles.length < 20) {
        for (let i = 0; i < 8; i++) {
            particles.push({
                x: player.x, y: player.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 25, color: '#ffd700', size: 4
            });
        }
    }
    gameState.screenShake = 15;

    pendingEvolution = null;
    document.getElementById('upgradePanel').style.display = 'none';
    document.getElementById('upgradePanel').querySelector('h2').textContent = '🎁 选择强化!';
    gameState.isPaused = false;
}
