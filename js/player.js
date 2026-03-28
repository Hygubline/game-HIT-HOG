const images = { main: new Image(), attack: new Image(), dead: new Image(), sajiao: new Image(), kick: new Image(), dash: new Image(), newmap: new Image(), monster1: new Image(), monster2: new Image(), monster3: new Image(), monster4: new Image(), boss1: new Image(), boss2: new Image(), maserati: new Image(), maseratiDash: new Image(), idleBreath: new Image(), idleBlink: new Image(), idleGlasses: new Image(), idleSuit: new Image(), ghostEnemy: new Image(), eyeEnemy: new Image(), fireEnemy: new Image(), fogEnemy: new Image() };
images.main.src = 'images/character/main chararter.png'; images.attack.src = 'images/character/atteck.png'; images.dead.src = 'images/character/dead.png';
images.maserati.src = 'images/vehicle/人车.png'; images.maseratiDash.src = 'images/vehicle/发动.png';
images.sajiao.src = 'images/character/sajiao.png'; images.kick.src = 'images/character/kick.png'; images.dash.src = 'images/character/冲刺.png';
images.newmap.src = 'images/maps/newmap.png';
images.monster1.src = 'images/monsters/moster1.png'; images.monster2.src = 'images/monsters/moster2.png'; images.monster3.src = 'images/monsters/moster3.png'; images.monster4.src = 'images/monsters/moster4.png';
images.ghostEnemy.src = 'images/monsters/幽灵怪.png'; images.eyeEnemy.src = 'images/monsters/眼球怪.png'; images.fireEnemy.src = 'images/monsters/鬼火怪.png'; images.fogEnemy.src = 'images/monsters/黑雾怪.png';

// === 踢击特效图片 (按角色分组加载) ===
const kickImg = {};
// ① 基础前挥 — 小角度扫击，轻
const _ki = (id, src) => { kickImg[id] = new Image(); kickImg[id].src = 'images/effects/踢击/' + src; };
_ki('swingA',     '踢击_5.png');   // 基础前挥 (较轻)
_ki('swingB',     '踢击_6.png');   // 基础前挥 alt (稍密)
// ② 强化前挥 — 大金色爆发
_ki('strongA',    '踢击_1.png');   // 大金色横向爆发
_ki('strongB',    '踢击_2.png');   // 中金色爆发
// ③ 直线前冲 / 贯穿
_ki('thrustA',    '踢击_3.png');   // 斜向金色冲击线
_ki('thrustB',    '踢击_12 +.png');// 暗金弧形贯穿
// ④ 环形旋风踢
_ki('ringA',      '踢击_7.png');   // 金色旋涡环 (侧视)
_ki('ringB',      '踢击_8.png');   // 金色旋涡环 (紧)
_ki('ringClean',  '踢击_11.png');  // 干净金色圆环 (俯视)
// ⑤ 强化旋风圈
_ki('ringFlame',  '踢击_9.png');   // 火焰翼旋涡 (最强)
// ⑥ 命中爆点
_ki('spark',      '踢击_10.png');  // 星芒放射
// ⑦ 地面冲击圈
_ki('groundSlam', '踢击_ 4.png');  // 俯视地面震波环
// ⑧ 强命中爆点
_ki('darkBurst',  '踢击_12.png'); // 暗金爆裂
// ⑨ 高级主踢 (带弧线)
_ki('arcKick',    '踢击_攻击瞬间前冲.png'); // 前冲+弧线旋涡

// 踢击特效实例数组
let kickEffects = [];
// 延迟生成队列 (Lv4双段用)
let kickFXQueue = [];

// 获取当前踢击武器等级
function getKickLevel() {
    return playerWeapons['kick'] ? playerWeapons['kick'].level : 0;
}

// ── 底层：生成一个踢击特效实例 ──
function spawnKickEffect(imgKey, x, y, opts = {}) {
    if (kickEffects.length > 12) return;
    const img = kickImg[imgKey];
    if (!img) return;
    kickEffects.push({
        img,
        x, y,
        life:       opts.life || 15,
        maxLife:     opts.life || 15,
        scale:      opts.scale || 0.06,
        scaleGrow:  opts.scaleGrow || 0,
        rotation:   opts.rotation || 0,
        rotSpeed:   opts.rotSpeed || 0,
        alpha:      opts.alpha || 1,
        alphaBase:  opts.alpha || 1,
        facingRight: opts.facingRight !== undefined ? opts.facingRight : player.facingRight,
        isRing:     opts.isRing || false,   // 环形图不做水平翻转
        vx: opts.vx || 0,
        vy: opts.vy || 0,
    });
}

// ══════════════════════════════════════
// 按等级生成踢击特效 (唯一入口)
// phase: 'cast' = 发动, 'hit' = 命中敌人
// ══════════════════════════════════════
function spawnKickFXByLevel(level, phase, hitX, hitY, isExecution) {
    const dir = player.facingRight ? 1 : -1;
    const fr  = player.facingRight;
    const px  = player.x;
    const py  = player.y;

    // ────────── 施放阶段 ──────────
    if (phase === 'cast') {

        if (level === 1) {
            // ▸ Lv1: 一脚打出去 — 小前挥，短促
            spawnKickEffect('swingA', px + dir * 45, py, {
                scale: 0.1, life: 8, facingRight: fr
            });
        }

        else if (level === 2) {
            // ▸ Lv2: 更大的一脚 — 换强化前挥图，明显更大
            spawnKickEffect('strongA', px + dir * 50, py - 5, {
                scale: 0.2, life: 11, facingRight: fr
            });
        }

        else if (level === 3) {
            // ▸ Lv3: 整圈扫出去 — 只有环，没有方向踢
            spawnKickEffect('ringA', px, py + 8, {
                scale: 0.2, life: 22, isRing: true,
                rotSpeed: 0.15, scaleGrow: 0.002
            });
        }

        else if (level === 4) {
            // ▸ Lv4: 连续两脚 — 第一脚立即，第二脚延迟8帧
            spawnKickEffect('swingB', px + dir * 40, py, {
                scale: 0.13, life: 8, facingRight: fr
            });
            kickFXQueue.push({ delay: 8, fn: () => {
                spawnKickEffect('strongA', px + dir * 55, py - 5, {
                    scale: 0.22, life: 11, facingRight: fr
                });
            }});
        }

        else if (level === 5) {
            // ▸ Lv5: 终结技 — 最大弧线主踢 + 脚下地面冲击环
            spawnKickEffect('arcKick', px + dir * 55, py - 10, {
                scale: 0.28, life: 16, facingRight: fr
            });
            spawnKickEffect('groundSlam', px, py + 15, {
                scale: 0.18, life: 24, alpha: 0.6, isRing: true,
                rotSpeed: 0.1, scaleGrow: 0.003
            });
        }
    }

    // ────────── 命中阶段 ──────────
    if (phase === 'hit' && hitX !== undefined) {

        if (level === 1) {
            // Lv1: 小星芒
            spawnKickEffect('spark', hitX, hitY, {
                scale: isExecution ? 0.1 : 0.07, life: 8,
                scaleGrow: 0.005
            });
        }

        else if (level === 2) {
            // Lv2: 大星芒
            spawnKickEffect('spark', hitX, hitY, {
                scale: isExecution ? 0.15 : 0.11, life: 10,
                scaleGrow: 0.006
            });
        }

        else if (level === 3) {
            // Lv3: 弱星芒 (环已经很抢眼了)
            spawnKickEffect('spark', hitX, hitY, {
                scale: 0.07, life: 7, alpha: 0.5,
                scaleGrow: 0.003
            });
        }

        else if (level === 4) {
            // Lv4: 两段命中 — 先小星芒，后大暗金爆裂
            spawnKickEffect('spark', hitX, hitY, {
                scale: 0.08, life: 8, scaleGrow: 0.004
            });
            kickFXQueue.push({ delay: 8, fn: () => {
                spawnKickEffect('darkBurst', hitX + dir * 12, hitY, {
                    scale: 0.15, life: 11, scaleGrow: 0.005
                });
            }});
        }

        else if (level === 5) {
            // Lv5: 暗金大爆裂
            spawnKickEffect('darkBurst', hitX, hitY, {
                scale: 0.18, life: 13, scaleGrow: 0.006
            });
        }
    }
}

// 更新踢击特效
function updateKickEffects(ts) {
    // 处理延迟队列
    for (let i = kickFXQueue.length - 1; i >= 0; i--) {
        kickFXQueue[i].delay--;
        if (kickFXQueue[i].delay <= 0) {
            kickFXQueue[i].fn();
            kickFXQueue.splice(i, 1);
        }
    }
    // 更新活跃特效
    for (let i = kickEffects.length - 1; i >= 0; i--) {
        const fx = kickEffects[i];
        fx.life--;
        fx.rotation += fx.rotSpeed * ts;
        fx.scale += fx.scaleGrow * ts;
        fx.x += fx.vx * ts;
        fx.y += fx.vy * ts;
        // 后30%生命淡出
        const fadeRatio = fx.life / (fx.maxLife * 0.3);
        fx.alpha = Math.min(fx.alphaBase, fadeRatio);
        if (fx.life <= 0) kickEffects.splice(i, 1);
    }
}

// 渲染踢击特效
function renderKickEffects(ctx) {
    kickEffects.forEach(fx => {
        if (!fx.img || !fx.img.complete || !fx.img.naturalWidth) return;
        const w = fx.img.width * fx.scale;
        const h = fx.img.height * fx.scale;

        if (fx.isRing) {
            // ── 环形图：图片不转，用扫光弧裁剪模拟纹理流动 ──
            const sweepAngle = fx.rotation; // rotation 当作扫光角度驱动
            const halfW = w / 2;
            const halfH = h / 2;
            const clipR = Math.max(halfW, halfH) + 5; // 裁剪圆半径

            // 层1: 底层环 (低透明度，完整显示)
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.globalAlpha = Math.max(0, fx.alpha * 0.35);
            ctx.drawImage(fx.img, -halfW, -halfH, w, h);
            ctx.restore();

            // 层2: 扫光高亮 (用扇形裁剪，只露出120°弧段)
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.globalAlpha = Math.max(0, fx.alpha);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, clipR, sweepAngle, sweepAngle + Math.PI * 0.67);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(fx.img, -halfW, -halfH, w, h);
            ctx.restore();
        } else {
            // ── 非环形图：正常渲染 ──
            ctx.save();
            ctx.translate(fx.x, fx.y);
            ctx.globalAlpha = Math.max(0, fx.alpha);
            ctx.rotate(fx.rotation);
            if (!fx.facingRight) ctx.scale(-1, 1);
            ctx.drawImage(fx.img, -w / 2, -h / 2, w, h);
            ctx.restore();
        }
    });
    ctx.globalAlpha = 1;
}

// === 宝箱图片 ===
images.chestNormal = new Image(); images.chestNormal.src = 'images/items/木箱.png';
images.chestRare = new Image(); images.chestRare.src = 'images/items/初级箱子.png';
images.chestEpic = new Image(); images.chestEpic.src = 'images/items/中级箱子.png';
images.chestBoss = new Image(); images.chestBoss.src = 'images/items/Boss 箱子.png';

// === 胜利动画图片 ===
images.victory1 = new Image(); images.victory1.src = 'images/ui/胜利结算.png';
images.victory2 = new Image(); images.victory2.src = 'images/ui/胜利结算2.png';

// === 跑步动画 (5帧) ===
const runFrames = [];
for (let i = 0; i < 5; i++) {
    runFrames[i] = new Image();
    runFrames[i].src = i === 0 ? 'images/character/run.png' : `images/character/run${i + 1}.png`;
}

// === 死亡动画 (5帧) ===
const deathFrames = [];
for (let i = 0; i < 5; i++) {
    deathFrames[i] = new Image();
    deathFrames[i].src = i === 0 ? 'images/character/death.png' : `images/character/death${i}.png`;
}

// === 武器效果图片 (新武器系统使用Canvas绘制，无需外部图片) ===
const weaponImages = {};

// === 狂战之心图片 ===
const berserkerImages = {
    // 光环 (3帧循环，永久显示)
    aura: [new Image(), new Image(), new Image()],
    // 爆发 (3帧序列，触发时显示)
    burst: [new Image(), new Image(), new Image()]
};
berserkerImages.aura[0].src = 'images/effects/狂战光环1.png';
berserkerImages.aura[1].src = 'images/effects/狂战光环2.png';
berserkerImages.aura[2].src = 'images/effects/狂战光环3.png';
berserkerImages.burst[0].src = 'images/effects/狂战之心.png';
berserkerImages.burst[1].src = 'images/effects/狂战之心2.png';
berserkerImages.burst[2].src = 'images/effects/狂战之心3.png';

// === 狂战动画状态 ===
const berserkerAnim = {
    // 光环动画 (持续循环)
    auraFrame: 0,
    auraTimer: 0,
    auraSpeed: 150,      // 每帧150ms

    // 爆发动画 (触发时播放一次)
    burstActive: false,
    burstFrame: 0,
    burstTimer: 0,
    burstSpeed: 100,     // 爆发每帧100ms

    // 记录上一次的状态，用于检测触发
    wasActivated: false
};

// 更新狂战动画
function updateBerserkerAnimation(deltaTime) {
    const isActive = playerBuffs.berserkerHeart && gameState.lives <= 2;

    // 检测是否刚刚触发
    if (isActive && !berserkerAnim.wasActivated) {
        // 触发爆发动画
        berserkerAnim.burstActive = true;
        berserkerAnim.burstFrame = 0;
        berserkerAnim.burstTimer = 0;
    }
    berserkerAnim.wasActivated = isActive;

    if (!isActive) return;

    // 更新光环动画 (循环)
    berserkerAnim.auraTimer += deltaTime;
    if (berserkerAnim.auraTimer >= berserkerAnim.auraSpeed) {
        berserkerAnim.auraTimer = 0;
        berserkerAnim.auraFrame = (berserkerAnim.auraFrame + 1) % 3;
    }

    // 更新爆发动画 (单次播放)
    if (berserkerAnim.burstActive) {
        berserkerAnim.burstTimer += deltaTime;
        if (berserkerAnim.burstTimer >= berserkerAnim.burstSpeed) {
            berserkerAnim.burstTimer = 0;
            berserkerAnim.burstFrame++;
            if (berserkerAnim.burstFrame >= 3) {
                berserkerAnim.burstActive = false;
                berserkerAnim.burstFrame = 0;
            }
        }
    }
}

// === 跑步/死亡动画状态 ===
const playerAnim = {
    runFrame: 0,
    runTimer: 0,
    runSpeed: 100,      // 每帧100ms
    deathFrame: 0,
    deathTimer: 0,
    deathSpeed: 150,    // 死亡动画每帧150ms
    deathPlaying: false
};
images.boss1.src = 'images/boss/boss1.png'; images.boss2.src = 'images/boss/boss2.png';
// 待机动画图片
images.idleBreath.src = 'images/character/基础呼吸待机.png';
images.idleBlink.src = 'images/character/眨眼 + 耳朵抖动.png';
images.idleGlasses.src = 'images/character/推眼镜待机.png';
images.idleSuit.src = 'images/character/整理西装待机.png';

// === 待机动画系统 ===
const idleAnim = {
    // 呼吸动画 (4帧循环)
    breathFrame: 0,          // 当前帧 0-3
    breathTimer: 0,          // 帧计时器
    breathSpeed: 250,        // 每帧持续时间(ms)

    // 眨眼动画
    blinkTimer: 0,           // 距离下次眨眼的计时
    blinkInterval: 3000,     // 眨眼间隔基础值(ms)
    isBlinking: false,       // 是否正在眨眼
    blinkFrame: 0,           // 眨眼帧
    blinkDuration: 400,      // 眨眼持续时间

    // 推眼镜动画 (久不动触发)
    idleTime: 0,             // 无动作时间累计
    glassesThreshold: 5000,  // 触发推眼镜的阈值(5秒)
    isGlasses: false,        // 是否正在推眼镜
    glassesFrame: 0,
    glassesDuration: 800,    // 推眼镜动画持续时间

    // 当前播放的动画类型
    currentAnim: 'breath'    // 'breath' | 'blink' | 'glasses'
};

// 更新待机动画
function updateIdleAnimation(deltaTime) {
    // 如果玩家在做其他动作，重置待机时间
    if (player.kicking || player.slashing || player.blocking ||
        player.currentState === 'sajiao' || player.isDead ||
        Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1) {
        idleAnim.idleTime = 0;
        idleAnim.isGlasses = false;
        idleAnim.currentAnim = 'breath';
        return;
    }

    // 累计无动作时间
    idleAnim.idleTime += deltaTime;

    // === 推眼镜检测 (久不动触发) ===
    if (!idleAnim.isGlasses && !idleAnim.isBlinking && idleAnim.idleTime > idleAnim.glassesThreshold) {
        idleAnim.isGlasses = true;
        idleAnim.glassesFrame = 0;
        idleAnim.currentAnim = 'glasses';
        idleAnim.idleTime = 0; // 重置计时
    }

    // 推眼镜动画进行中
    if (idleAnim.isGlasses) {
        idleAnim.glassesFrame += deltaTime;
        if (idleAnim.glassesFrame >= idleAnim.glassesDuration) {
            idleAnim.isGlasses = false;
            idleAnim.currentAnim = 'breath';
        }
        return;
    }

    // === 眨眼检测 (随机触发) ===
    idleAnim.blinkTimer += deltaTime;
    if (!idleAnim.isBlinking && idleAnim.blinkTimer > idleAnim.blinkInterval + Math.random() * 2000) {
        idleAnim.isBlinking = true;
        idleAnim.blinkFrame = 0;
        idleAnim.blinkTimer = 0;
        idleAnim.currentAnim = 'blink';
    }

    // 眨眼动画进行中
    if (idleAnim.isBlinking) {
        idleAnim.blinkFrame += deltaTime;
        if (idleAnim.blinkFrame >= idleAnim.blinkDuration) {
            idleAnim.isBlinking = false;
            idleAnim.currentAnim = 'breath';
        }
        return;
    }

    // === 呼吸动画 (默认循环) ===
    idleAnim.breathTimer += deltaTime;
    if (idleAnim.breathTimer >= idleAnim.breathSpeed) {
        idleAnim.breathTimer = 0;
        idleAnim.breathFrame = (idleAnim.breathFrame + 1) % 4;
    }
}

// 获取当前待机图片
function getIdleImage() {
    switch (idleAnim.currentAnim) {
        case 'blink':
            return images.idleBlink;
        case 'glasses':
            return images.idleGlasses;
        case 'breath':
        default:
            return images.idleBreath;
    }
}
