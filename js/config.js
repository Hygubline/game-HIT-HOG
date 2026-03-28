// ==================== 全局游戏配置 ====================
// 调整这些数值即可快速调平衡，无需在代码中到处搜索
const GAME_CONFIG = {
    // --- 刷怪节奏 ---
    BASE_SPAWN_INTERVAL: 450,       // 敌人生成间隔 (ms)
    MAX_ENEMIES_BASE: 20,           // 初始最大敌人数
    MAX_ENEMIES_SCALING: 3,         // 每N秒增加的敌人上限
    MAX_ENEMIES_INTERVAL: 20,       // 每多少秒增加一次上限
    EARLY_SPAWN_DISTANCE: 300,      // 前30秒敌人生成距离
    NORMAL_SPAWN_DISTANCE: 500,     // 正常敌人生成距离

    // --- 经验/升级 ---
    BASE_XP_TO_LEVEL: 50,          // 首次升级所需经验
    XP_SCALING: 1.2,               // 每级经验需求倍率
    BASE_XP_DROP: 2,               // 普通敌人经验掉落
    ELITE_XP_MULT: 12,             // 精英经验倍率
    BOSS_XP_DROP: 100,             // Boss经验掉落

    // --- 肾上腺素系统 (低血量触发) ---
    ADRENALINE_HP_THRESHOLD: 0.25, // 触发血量比例
    ADRENALINE_SPEED_BONUS: 0.35,  // 移速加成
    ADRENALINE_LIFESTEAL: 0.15,    // 击杀回血概率
    ADRENALINE_DAMAGE_BONUS: 0.2,  // 伤害加成

    // --- 精英死亡爆炸 ---
    ELITE_DEATH_AOE_RANGE: 80,     // 爆炸范围
    ELITE_DEATH_AOE_DAMAGE: 8,     // 爆炸伤害

    // --- 波次脉冲 ---
    PULSE_INTERVAL: 25,            // 每N秒一次脉冲
    PULSE_MAX_TIME: 180,           // 脉冲系统持续到多少秒
    PULSE_BASE_COUNT: 4,           // 基础脉冲敌人数

    // --- 难度曲线 ---
    EARLY_GAME_DURATION: 60,       // "前期"持续秒数（难度减缓期）
    EARLY_GAME_FACTOR: 0.8,        // 前期难度系数

    // --- 角色地面特效 ---
    PLAYER_FOOT_OFFSET_Y: 25,     // 角色脚底偏移（相对于中心点向下）
    BERSERKER_AURA_SCALE: 0.25,   // 狂战光环缩放
    BERSERKER_AURA_OPACITY: 0.9,  // 狂战光环透明度
    BERSERKER_BURST_SCALE: 0.35,  // 狂战爆发缩放
    SHADOW_OFFSET_Y: 25,          // 阴影Y偏移
    SHADOW_RX: 35,                // 阴影X半径
    SHADOW_RY: 15,                // 阴影Y半径

};

// ==================== 流派配置 ====================
const ARCHETYPE = {
    melee:     { label: '🗡️ 近战·吸血', color: '#ff4444', desc: '贴脸高伤，击杀回血' },
    explosion: { label: '💥 爆炸·范围', color: '#ff8800', desc: '范围清屏，连锁爆破' },
    chain:     { label: '⚡ 连锁·控制', color: '#4488ff', desc: '减速扩散，连锁打击' },
};

// === 割草模式配置 ===
const KUOSAO_MODE = {
    enabled: true,
    spawnInterval: GAME_CONFIG.BASE_SPAWN_INTERVAL,
    maxEnemies: 50,
    batchSpawnSize: 3,
    autoAttackEnabled: true,
    xpEnabled: true,
    evolutionEnabled: true
};

// === 对象池系统 ===
const enemyPool = {
    pool: [],
    active: [],
    maxSize: 150,

    acquire() {
        let enemy;
        if (this.pool.length > 0) {
            enemy = this.pool.pop();
        } else if (this.active.length < this.maxSize) {
            enemy = this.createNew();
        } else {
            return null;
        }
        this.active.push(enemy);
        return enemy;
    },

    release(enemy) {
        const idx = this.active.indexOf(enemy);
        if (idx > -1) {
            this.active.splice(idx, 1);
            this.resetEnemy(enemy);
            this.pool.push(enemy);
        }
    },

    createNew() {
        return {
            x: 0, y: 0, vx: 0, vy: 0,
            hp: 1, currentHp: 1, speed: 1, originalSpeed: 1,
            size: 40, points: 100, role: 'normal',
            flying: false, rotation: 0, scale: 1,
            taunted: false, tauntTimer: 0, isBoss: false, isElite: false,
            img: null, imgScale: 0.1, facingRight: true, name: '',
            chargeTimer: 0, isCharging: false,
            shootTimer: 0, explodeCountdown: -1, isExploding: false,
            hitFlash: 0, hitStun: 0, weakened: false, stunned: false, stunTimer: 0,
            active: false
        };
    },

    resetEnemy(enemy) {
        enemy.x = 0; enemy.y = 0; enemy.vx = 0; enemy.vy = 0;
        enemy.flying = false; enemy.rotation = 0; enemy.scale = 1;
        enemy.taunted = false; enemy.tauntTimer = 0;
        enemy.hitFlash = 0; enemy.hitStun = 0;
        enemy.weakened = false; enemy.stunned = false; enemy.stunTimer = 0;
        enemy.isCharging = false; enemy.isExploding = false;
        enemy.active = false;
    },

    reset() {
        this.active.forEach(e => {
            this.resetEnemy(e);
            this.pool.push(e);
        });
        this.active = [];
    }
};

// === 经验宝石对象池 ===
const gemPool = {
    pool: [],
    active: [],
    maxSize: 100,  // 减少最大数量

    spawn(x, y, value) {
        let gem;
        if (this.pool.length > 0) {
            gem = this.pool.pop();
        } else if (this.active.length < this.maxSize) {
            gem = { x: 0, y: 0, value: 1, size: 8, color: '#4fc3f7', bobOffset: 0, magnetSpeed: 0, active: true };
        } else {
            return null;
        }
        gem.x = x;
        gem.y = y;
        gem.value = value;
        gem.bobOffset = Math.random() * Math.PI * 2;
        gem.magnetSpeed = 0;
        gem.active = true;
        // 根据价值设置颜色和大小
        if (value >= 100) { gem.color = '#ffd700'; gem.size = 16; }         // 巨型-金色
        else if (value >= 25) { gem.color = '#ef5350'; gem.size = 14; }     // 大型-红色
        else if (value >= 5) { gem.color = '#66bb6a'; gem.size = 11; }      // 中型-绿色
        else { gem.color = '#4fc3f7'; gem.size = 8; }                       // 小型-蓝色
        this.active.push(gem);
        return gem;
    },

    collect(gem) {
        const idx = this.active.indexOf(gem);
        if (idx > -1) {
            this.active.splice(idx, 1);
            gem.active = false;
            this.pool.push(gem);
            return gem.value;
        }
        return 0;
    },

    reset() {
        this.active.forEach(g => {
            g.active = false;
            this.pool.push(g);
        });
        this.active = [];
    }
};

// === 空间分区 (优化碰撞检测) ===
const spatialGrid = {
    cellSize: 100,
    cells: new Map(),

    getKey(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    },

    clear() {
        this.cells.clear();
    },

    insert(entity) {
        const key = this.getKey(entity.x, entity.y);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key).push(entity);
    },

    query(x, y, radius) {
        const results = [];
        const minCx = Math.floor((x - radius) / this.cellSize);
        const maxCx = Math.floor((x + radius) / this.cellSize);
        const minCy = Math.floor((y - radius) / this.cellSize);
        const maxCy = Math.floor((y + radius) / this.cellSize);

        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const key = `${cx},${cy}`;
                if (this.cells.has(key)) {
                    results.push(...this.cells.get(key));
                }
            }
        }
        return results;
    }
};

// === 经验值系统 ===
let playerXP = {
    current: 0,
    level: 1,
    toNextLevel: GAME_CONFIG.BASE_XP_TO_LEVEL,

    addXP(amount) {
        this.current += amount;
        while (this.current >= this.toNextLevel) {
            this.current -= this.toNextLevel;
            this.levelUp();
        }
        updateXPBar();
    },

    levelUp() {
        this.level++;
        this.toNextLevel = Math.floor(GAME_CONFIG.BASE_XP_TO_LEVEL * Math.pow(GAME_CONFIG.XP_SCALING, this.level - 1));
        playSound('upgrade');
        showKuosaoUpgradePanel();
        spawnFloatingText(player.x, player.y - 80, '⬆️ 升级! Lv.' + this.level, '#ffd700');
    },

    reset() {
        this.current = 0;
        this.level = 1;
        this.toNextLevel = GAME_CONFIG.BASE_XP_TO_LEVEL;
    }
};
