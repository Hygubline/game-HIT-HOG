// ==================== 敌人管理器 (波次制) ====================
// 负责敌人AI更新、碰撞检测、死亡处理
// 与 WaveManager 配合, 替代旧的 setInterval 刷怪

const EnemyManager = {

    // === 更新所有敌人AI ===
    updateEnemies(ts) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.flying) continue; // 飞行状态由其他逻辑处理

            // 死亡检测
            if (e.currentHp <= 0 && !e.flying) {
                this.onEnemyDeath(e, i);
                continue;
            }

            // 受击闪烁
            if (e.hitFlash > 0) e.hitFlash--;
            if (e.hitStun > 0) { e.hitStun--; continue; }
            if (e.stunned && e.stunTimer > 0) { e.stunTimer--; if (e.stunTimer <= 0) e.stunned = false; continue; }

            // AI行为 (根据role)
            this.updateEnemyBehavior(e, ts);

            // 世界边界
            e.x = Math.max(20, Math.min(world.width - 20, e.x));
            e.y = Math.max(20, Math.min(world.height - 20, e.y));

            // 朝向
            e.facingRight = e.x < player.x;
        }
    },

    // === 敌人行为AI ===
    updateEnemyBehavior(e, ts) {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dirX = dist > 0 ? dx / dist : 0;
        const dirY = dist > 0 ? dy / dist : 0;

        switch (e.role) {
            case 'charger':
                this.updateCharger(e, dx, dy, dist, dirX, dirY, ts);
                break;
            case 'shooter':
                this.updateShooter(e, dx, dy, dist, dirX, dirY, ts);
                break;
            case 'bomber':
                this.updateBomber(e, dx, dy, dist, dirX, dirY, ts);
                break;
            case 'tank':
                this.updateTank(e, dirX, dirY, ts);
                break;
            default:
                // 普通怪: 直接朝玩家移动
                this.updateNormal(e, dirX, dirY, ts);
                break;
        }
    },

    // --- 普通追踪 ---
    updateNormal(e, dirX, dirY, ts) {
        e.x += dirX * e.speed * ts;
        e.y += dirY * e.speed * ts;
    },

    // --- 冲锋怪 ---
    updateCharger(e, dx, dy, dist, dirX, dirY, ts) {
        if (e.isCharging) {
            // 冲锋中
            e.x += e.vx * ts;
            e.y += e.vy * ts;
            e.chargeTimer--;
            if (e.chargeTimer <= 0) {
                e.isCharging = false;
                e.chargeTimer = e.chargeSpeed ? 50 : 35;
            }
        } else {
            // 接近阶段
            e.x += dirX * e.speed * ts;
            e.y += dirY * e.speed * ts;
            e.chargeTimer--;
            if (e.chargeTimer <= 0 && dist < 300) {
                // 发起冲锋
                e.isCharging = true;
                const speed = e.chargeSpeed || 10;
                e.vx = dirX * speed;
                e.vy = dirY * speed;
                e.chargeTimer = 20; // 冲锋持续帧数
            }
        }
    },

    // --- 射击怪 ---
    updateShooter(e, dx, dy, dist, dirX, dirY, ts) {
        const keepDist = e.keepDistance || 200;

        if (dist < keepDist - 30) {
            // 太近了, 后退
            e.x -= dirX * e.speed * 0.8 * ts;
            e.y -= dirY * e.speed * 0.8 * ts;
        } else if (dist > keepDist + 50) {
            // 太远了, 靠近
            e.x += dirX * e.speed * ts;
            e.y += dirY * e.speed * ts;
        }

        // 射击
        e.shootTimer--;
        if (e.shootTimer <= 0 && dist < 400) {
            e.shootTimer = e.shootCD || 80;
            // 发射弹幕
            projectiles.push({
                x: e.x, y: e.y,
                vx: dirX * 5, vy: dirY * 5,
                size: 6, color: '#aa44ff',
                damage: e.damage || 2,
                life: 120, isEnemy: true
            });
        }
    },

    // --- 自爆怪 ---
    updateBomber(e, dx, dy, dist, dirX, dirY, ts) {
        // 快速冲向玩家
        e.x += dirX * e.speed * ts;
        e.y += dirY * e.speed * ts;

        // 接近时开始倒计时
        if (dist < 60 && e.explodeCountdown < 0) {
            e.explodeCountdown = e.explodeTimer || 40;
            e.isExploding = true;
        }

        if (e.explodeCountdown > 0) {
            e.explodeCountdown--;
            // 闪烁效果
            e.hitFlash = e.explodeCountdown % 4 < 2 ? 3 : 0;

            if (e.explodeCountdown <= 0) {
                // 爆炸!
                this.doExplosion(e);
                e.currentHp = 0; // 自毁
            }
        }
    },

    // --- 坦克怪 ---
    updateTank(e, dirX, dirY, ts) {
        // 缓慢但坚定地推进
        e.x += dirX * e.speed * ts;
        e.y += dirY * e.speed * ts;
    },

    // === 爆炸处理 ===
    doExplosion(e) {
        const radius = e.explodeRadius || 120;

        // 对玩家造成伤害
        const distToPlayer = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
        if (distToPlayer < radius && !player.invincible) {
            // 玩家受伤逻辑由外部处理
            if (typeof playerTakeDamage === 'function') {
                playerTakeDamage(e.damage || 3, e);
            }
        }

        // 爆炸特效
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 / 15) * i;
            particles.push({
                x: e.x + Math.cos(angle) * 20,
                y: e.y + Math.sin(angle) * 20,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                life: 20, color: '#ff6600', size: 5
            });
        }

        gameState.screenShake = Math.min(gameState.screenShake + 10, 18);
        if (typeof playSound === 'function') playSound('explosion');
        if (typeof spawnFloatingText === 'function') {
            spawnFloatingText(e.x, e.y - 20, '💥', '#ff4400');
        }
    },

    // === 敌人死亡处理 ===
    onEnemyDeath(e, index) {
        // 飞出效果
        const flyAngle = Math.atan2(e.y - player.y, e.x - player.x);
        e.flying = true;
        e.vx = Math.cos(flyAngle) * 12;
        e.vy = -8;
        e.rotation = (Math.random() - 0.5) * 0.3;

        // 使用现有的 handleEnemyKill (包含分数/连击/经验等全部逻辑)
        if (typeof handleEnemyKill === 'function') {
            handleEnemyKill(e);
        }

        // 经验宝石 (波次战斗模式减少经验)
        if (typeof gemPool !== 'undefined') {
            let xpValue = e.isElite ? GAME_CONFIG.BASE_XP_DROP * GAME_CONFIG.ELITE_XP_MULT :
                         e.isBoss ? GAME_CONFIG.BOSS_XP_DROP :
                         GAME_CONFIG.BASE_XP_DROP;
            if (typeof selectedMode !== 'undefined' && selectedMode === 'wave_battle') {
                xpValue *= 0.4; // 波次模式经验减少60%
            }
            gemPool.spawn(e.x, e.y, xpValue);
        }
    },

    // === 敌人-玩家碰撞检测 ===
    checkPlayerCollision() {
        if (player.isDead) return;

        // 完美闪避: 闪避无敌帧中被攻击触发奖励
        if (player.invincible && player._dodgeActive) {
            if (typeof waveUpgradeState !== 'undefined' && waveUpgradeState.active.perfect_dodge) {
                for (const e of enemies) {
                    if (e.flying || e.currentHp <= 0) continue;
                    const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
                    const hitDist = (e.size || 40) * 0.5 + 25;
                    if (dist < hitDist && !e._perfectDodged) {
                        e._perfectDodged = true; // 同一敌人不重复判定
                        if (typeof triggerPerfectDodge === 'function') triggerPerfectDodge();
                        break; // 一次闪避只触发一次
                    }
                }
            }
            return; // 无敌中不受伤
        }

        if (player.invincible) return;

        for (const e of enemies) {
            if (e.flying || e.currentHp <= 0) continue;

            const dist = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
            const hitDist = (e.size || 40) * 0.5 + 25;

            if (dist < hitDist) {
                // 碰撞伤害
                if (typeof playerTakeDamage === 'function') {
                    playerTakeDamage(e.damage || 1, e);
                }
                break; // 每帧只受一次碰撞伤害
            }
        }
    },

    // === 清理飞出的敌人 ===
    cleanupFlying(ts) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (!e.flying) continue;

            e.x += e.vx * ts;
            e.y += e.vy * ts;
            e.vy += 0.5 * ts; // 重力
            e.rotation += (e.rotation > 0 ? 0.1 : -0.1) * ts;

            // 超出边界移除
            if (e.y > world.height + 200 || e.x < -200 || e.x > world.width + 200) {
                enemies.splice(i, 1);
            }
        }
    }
};
