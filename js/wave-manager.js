// ==================== 波次战斗管理器 (新主循环) ====================
// 替代旧的 setInterval 刷怪 + 时间制模式
// 核心流程: wave_start -> in_wave -> wave_cleared -> upgrade_select -> 下一波 -> boss -> victory

const WaveManager = {
    // === 战斗状态机 ===
    state: 'idle', // idle | wave_start | in_wave | wave_cleared | upgrade_select | boss_wave | victory | game_over
    currentWave: 0,
    totalWaves: 10,

    // 当前波次运行数据
    spawnedCount: 0,       // 本波已生成数量
    killedCount: 0,        // 本波已击杀数量
    spawnTimer: 0,         // 生成计时器(帧)
    transitionTimer: 0,    // 状态切换倒计时(帧)
    waveStartTime: 0,      // 本波开始时间

    // === 波次配置表 ===
    // 每波只有一种主怪类型, 通过参数控制难度递进
    waveConfigs: [
        // Wave 1: 教学波 - 基础近战怪, 慢速少量
        {
            waveIndex: 0,
            name: '幽灵前哨',
            enemyType: 'ghost_basic',
            totalSpawn: 8,
            spawnInterval: 50,    // 帧间隔 (~0.83秒)
            maxAlive: 5,
            eliteCount: 0,
            rewardType: 'upgrade',
            note: '教学波: 学习移动和基础攻击',
            difficultyTag: 'easy',
            // 怪物属性
            enemyStats: { hp: 5, speed: 1.2, size: 45, damage: 1, color: '#88ccff', imgKey: 'ghostEnemy', imgScale: 0.12 }
        },
        // Wave 2: 高速贴脸怪 - 考验走位
        {
            waveIndex: 1,
            name: '鬼火突袭',
            enemyType: 'charger',
            totalSpawn: 10,
            spawnInterval: 45,
            maxAlive: 6,
            eliteCount: 0,
            rewardType: 'upgrade',
            note: '高速冲锋怪, 考验走位',
            difficultyTag: 'easy',
            enemyStats: { hp: 4, speed: 2.2, size: 40, damage: 1.5, color: '#ff6644', imgKey: 'fireEnemy', imgScale: 0.11, role: 'charger', chargeSpeed: 10, chargeDelay: 40 }
        },
        // Wave 3: 厚血慢压怪 - 考验持续输出
        {
            waveIndex: 2,
            name: '黑雾压境',
            enemyType: 'tank',
            totalSpawn: 6,
            spawnInterval: 70,
            maxAlive: 4,
            eliteCount: 0,
            rewardType: 'upgrade',
            note: '高血量慢速怪, 考验持续输出',
            difficultyTag: 'normal',
            enemyStats: { hp: 18, speed: 0.6, size: 65, damage: 2, color: '#333366', imgKey: 'fogEnemy', imgScale: 0.15, role: 'tank', damageReduction: 0.3 }
        },
        // Wave 4: 远程骚扰怪 - 逼迫接近
        {
            waveIndex: 3,
            name: '邪眼狙击',
            enemyType: 'shooter',
            totalSpawn: 8,
            spawnInterval: 55,
            maxAlive: 5,
            eliteCount: 0,
            rewardType: 'upgrade',
            note: '远程射击怪, 逼迫玩家接近',
            difficultyTag: 'normal',
            enemyStats: { hp: 6, speed: 0.8, size: 50, damage: 2, color: '#aa44ff', imgKey: 'eyeEnemy', imgScale: 0.13, role: 'shooter', shootCD: 90, keepDistance: 200 }
        },
        // Wave 5: 第一次精英波
        {
            waveIndex: 4,
            name: '精英入侵',
            enemyType: 'ghost_strong',
            totalSpawn: 10,
            spawnInterval: 40,
            maxAlive: 7,
            eliteCount: 2,
            rewardType: 'upgrade',
            note: '混合强度, 含精英',
            difficultyTag: 'hard',
            enemyStats: { hp: 8, speed: 1.5, size: 50, damage: 1.5, color: '#66bbff', imgKey: 'ghostEnemy', imgScale: 0.14 }
        },
        // Wave 6: 自爆怪潮 - 高压力
        {
            waveIndex: 5,
            name: '幽焰爆破',
            enemyType: 'bomber',
            totalSpawn: 12,
            spawnInterval: 35,
            maxAlive: 6,
            eliteCount: 1,
            rewardType: 'upgrade',
            note: '自爆怪, 高压力需快速击杀',
            difficultyTag: 'hard',
            enemyStats: { hp: 3, speed: 2.5, size: 38, damage: 3, color: '#ffaa00', imgKey: 'fireEnemy', imgScale: 0.10, role: 'bomber', explodeTimer: 45, explodeRadius: 120 }
        },
        // Wave 7: 大量冲锋怪
        {
            waveIndex: 6,
            name: '狂潮涌动',
            enemyType: 'charger_swarm',
            totalSpawn: 18,
            spawnInterval: 25,
            maxAlive: 10,
            eliteCount: 2,
            rewardType: 'upgrade',
            note: '大量快速怪, 考验AOE和走位',
            difficultyTag: 'hard',
            enemyStats: { hp: 6, speed: 2.0, size: 42, damage: 1.5, color: '#ff8844', imgKey: 'fireEnemy', imgScale: 0.11, role: 'charger', chargeSpeed: 12, chargeDelay: 35 }
        },
        // Wave 8: 混合重甲
        {
            waveIndex: 7,
            name: '铁壁方阵',
            enemyType: 'heavy_tank',
            totalSpawn: 8,
            spawnInterval: 60,
            maxAlive: 5,
            eliteCount: 2,
            rewardType: 'upgrade',
            note: '强化坦克波, 精英变体',
            difficultyTag: 'very_hard',
            enemyStats: { hp: 30, speed: 0.5, size: 70, damage: 3, color: '#224466', imgKey: 'fogEnemy', imgScale: 0.17, role: 'tank', damageReduction: 0.4 }
        },
        // Wave 9: 远程+高速混合(以远程为主)
        {
            waveIndex: 8,
            name: '万眼注视',
            enemyType: 'shooter_elite',
            totalSpawn: 14,
            spawnInterval: 30,
            maxAlive: 8,
            eliteCount: 3,
            rewardType: 'upgrade',
            note: '大量远程精英, 高压力',
            difficultyTag: 'very_hard',
            enemyStats: { hp: 10, speed: 1.0, size: 52, damage: 2.5, color: '#cc55ff', imgKey: 'eyeEnemy', imgScale: 0.14, role: 'shooter', shootCD: 70, keepDistance: 180 }
        },
        // Wave 10: Boss波
        {
            waveIndex: 9,
            name: 'BOSS: 八重宿敌',
            enemyType: 'boss',
            totalSpawn: 0,       // Boss单独生成
            spawnInterval: 0,
            maxAlive: 0,
            eliteCount: 0,
            rewardType: 'victory',
            note: 'Boss战',
            difficultyTag: 'boss',
            isBossWave: true,
            enemyStats: null     // Boss用专门逻辑
        }
    ],

    // === 初始化 ===
    init() {
        this.state = 'idle';
        this.currentWave = 0;
        this.spawnedCount = 0;
        this.killedCount = 0;
        this.spawnTimer = 0;
        this.transitionTimer = 0;
        this.waveStartTime = 0;
    },

    // === 开始波次战斗 ===
    startBattle() {
        this.currentWave = 0;
        this.beginWave();
    },

    // === 开始当前波 ===
    beginWave() {
        const config = this.waveConfigs[this.currentWave];
        if (!config) {
            this.state = 'victory';
            return;
        }

        this.state = 'wave_start';
        this.spawnedCount = 0;
        this.killedCount = 0;
        this.spawnTimer = 0;
        this.transitionTimer = 90; // 1.5秒显示波次信息
        this.waveStartTime = Date.now();

        // 显示波次开始UI
        const waveNum = this.currentWave + 1;
        if (config.isBossWave) {
            showBigEvent('BOSS WARNING', config.name, '#ff0000');
            if (typeof playSound === 'function') playSound('boss');
        } else {
            showBigEvent('WAVE ' + waveNum, config.name, '#ffd700');
            if (typeof playSound === 'function') playSound('danger');
        }

        // 更新波次UI
        this.updateWaveUI();
    },

    // === 每帧更新 ===
    update() {
        if (this.state === 'idle' || this.state === 'victory' || this.state === 'game_over') return;

        switch (this.state) {
            case 'wave_start':
                this.transitionTimer--;
                if (this.transitionTimer <= 0) {
                    const config = this.waveConfigs[this.currentWave];
                    if (config.isBossWave) {
                        this.state = 'boss_wave';
                        // 使用现有Boss生成
                        if (typeof spawnBoss === 'function') spawnBoss();
                    } else {
                        this.state = 'in_wave';
                    }
                }
                break;

            case 'in_wave':
                this.updateSpawning();
                this.checkWaveClear();
                break;

            case 'boss_wave':
                // Boss波: 检查Boss是否被击杀
                this.checkBossClear();
                break;

            case 'wave_cleared':
                this.transitionTimer--;
                if (this.transitionTimer <= 0) {
                    // 进入升级选择
                    this.state = 'upgrade_select';
                    if (typeof showUpgradePanel === 'function') {
                        gameState.isPaused = true;
                        showUpgradePanel('wave_clear');
                    }
                }
                break;

            case 'upgrade_select':
                // 等待玩家选择升级 (由 selectUpgradeOption 回调切换状态)
                break;
        }
    },

    // === 刷怪逻辑 ===
    updateSpawning() {
        const config = this.waveConfigs[this.currentWave];
        if (!config) return;

        // 已全部生成则不再生成
        if (this.spawnedCount >= config.totalSpawn) return;

        // 场上存活数限制
        const aliveCount = this.getAliveEnemyCount();
        if (aliveCount >= config.maxAlive) return;

        // 计时器
        this.spawnTimer++;
        if (this.spawnTimer >= config.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnWaveEnemy(config);
            this.spawnedCount++;
        }
    },

    // === 生成波次怪物 ===
    spawnWaveEnemy(config) {
        const stats = config.enemyStats;
        if (!stats) return;

        // 判断是否为精英
        const isElite = this.spawnedCount >= (config.totalSpawn - config.eliteCount);
        const eliteMult = isElite ? { hp: 2.5, size: 1.3, speed: 1.15, damage: 1.5 } : { hp: 1, size: 1, speed: 1, damage: 1 };

        // 波次难度缩放 (越后面的波, 基础属性越高)
        const waveScale = 1 + this.currentWave * 0.08;

        // 生成位置: 玩家周围屏幕外
        const spawnPos = this.getSpawnPosition();

        const enemy = {
            x: spawnPos.x,
            y: spawnPos.y,
            vx: 0, vy: 0,
            hp: Math.ceil(stats.hp * eliteMult.hp * waveScale),
            currentHp: Math.ceil(stats.hp * eliteMult.hp * waveScale),
            speed: stats.speed * eliteMult.speed,
            originalSpeed: stats.speed * eliteMult.speed,
            size: stats.size * eliteMult.size,
            points: Math.ceil(100 * (1 + this.currentWave * 0.2) * (isElite ? 3 : 1)),
            damage: stats.damage * eliteMult.damage * waveScale,
            color: stats.color,
            img: stats.imgKey,
            imgScale: stats.imgScale * eliteMult.size,
            role: stats.role || 'normal',
            name: isElite ? '精英' + config.name : config.name,
            facingRight: spawnPos.x < player.x,
            isElite: isElite,
            isBoss: false,
            flying: false,
            rotation: 0,
            scale: 1,
            taunted: false,
            tauntTimer: 0,
            hitFlash: 0,
            hitStun: 0,
            weakened: false,
            stunned: false,
            stunTimer: 0,
            // 特殊行为属性
            chargeTimer: stats.chargeDelay || 0,
            isCharging: false,
            chargeSpeed: stats.chargeSpeed || 0,
            shootTimer: stats.shootCD || 0,
            shootCD: stats.shootCD || 0,
            keepDistance: stats.keepDistance || 0,
            explodeCountdown: -1,
            isExploding: false,
            explodeTimer: stats.explodeTimer || 0,
            explodeRadius: stats.explodeRadius || 0,
            damageReduction: stats.damageReduction || 0,
            // 标记来自波次系统
            _waveSpawned: true,
            _waveIndex: this.currentWave
        };

        enemies.push(enemy);
    },

    // === 获取生成位置 ===
    getSpawnPosition() {
        const dir = Math.floor(Math.random() * 4);
        const dist = 400;
        let x, y;

        switch (dir) {
            case 0: x = player.x - dist; y = player.y + (Math.random() - 0.5) * canvas.height; break;
            case 1: x = player.x + dist; y = player.y + (Math.random() - 0.5) * canvas.height; break;
            case 2: x = player.x + (Math.random() - 0.5) * canvas.width; y = player.y - dist; break;
            case 3: x = player.x + (Math.random() - 0.5) * canvas.width; y = player.y + dist; break;
        }

        // 世界边界
        x = Math.max(50, Math.min(world.width - 50, x));
        y = Math.max(50, Math.min(world.height - 50, y));
        return { x, y };
    },

    // === 获取场上存活敌人数 (非Boss, 非飞行) ===
    getAliveEnemyCount() {
        return enemies.filter(e => !e.isBoss && !e.flying && e.currentHp > 0).length;
    },

    // === 检查清波 ===
    checkWaveClear() {
        const config = this.waveConfigs[this.currentWave];
        if (!config) return;

        // 条件: 所有怪已生成 + 场上无存活敌人(非Boss)
        if (this.spawnedCount >= config.totalSpawn && this.getAliveEnemyCount() === 0) {
            this.onWaveCleared();
        }
    },

    // === 检查Boss波清除 ===
    checkBossClear() {
        const hasBoss = enemies.some(e => e.isBoss && !e.flying && e.currentHp > 0);
        if (!hasBoss) {
            // Boss已被击杀
            this.onWaveCleared();
        }
    },

    // === 波次清除回调 ===
    onWaveCleared() {
        const config = this.waveConfigs[this.currentWave];

        this.state = 'wave_cleared';
        this.transitionTimer = 90; // 1.5秒过渡

        if (config && config.isBossWave) {
            // Boss波清除 = 胜利
            this.state = 'victory';
            showBigEvent('VICTORY!', '所有波次已清除!', '#ffd700');
            if (typeof playSound === 'function') playSound('upgrade');
            return;
        }

        // 升级: 波次喘息 (每波回2血)
        if (typeof waveUpgradeState !== 'undefined' && waveUpgradeState.active.wave_rest) {
            gameState.lives = Math.min(gameState.lives + 2, maxPlayerLives);
            if (typeof updatePlayerHealthBar === 'function') updatePlayerHealthBar(false);
            if (typeof spawnFloatingText === 'function') {
                spawnFloatingText(player.x, player.y - 40, '🌿 +2', '#4ade80');
            }
        }

        showBigEvent('WAVE CLEAR!', '准备下一波...', '#4ade80');
        if (typeof playSound === 'function') playSound('pickup');
    },

    // === 升级选择完成后调用 ===
    onUpgradeSelected() {
        if (this.state !== 'upgrade_select') return;

        this.currentWave++;
        if (this.currentWave >= this.totalWaves) {
            this.state = 'victory';
            return;
        }

        // 开始下一波
        this.beginWave();
    },

    // === 记录击杀 ===
    onEnemyKilled(enemy) {
        if (enemy._waveSpawned && enemy._waveIndex === this.currentWave) {
            this.killedCount++;
        }
    },

    // === 更新波次UI ===
    updateWaveUI() {
        const waveIndicator = document.getElementById('waveIndicator');
        if (waveIndicator) {
            const config = this.waveConfigs[this.currentWave];
            const waveNum = this.currentWave + 1;
            waveIndicator.textContent = config
                ? `WAVE ${waveNum}/${this.totalWaves} - ${config.name}`
                : `WAVE ${waveNum}/${this.totalWaves}`;
            waveIndicator.style.display = 'block';
        }
    },

    // === 获取当前波次配置 ===
    getCurrentConfig() {
        return this.waveConfigs[this.currentWave] || null;
    },

    // === 是否在战斗中 (需要更新游戏逻辑) ===
    isInCombat() {
        return this.state === 'in_wave' || this.state === 'boss_wave' || this.state === 'wave_start';
    },

    // === 是否暂停中 (升级选择等) ===
    isPausedForUI() {
        return this.state === 'upgrade_select' || this.state === 'wave_cleared';
    }
};
