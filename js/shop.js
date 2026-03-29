// 统计
let gameStats = { killCount: 0, maxCombo: 0, bossKilled: 0, skillUsage: { kick: 0, slash: 0, sajiao: 0, taunt: 0 }, eventCount: 0, noHitTimer: 0 };

// 状态
let gameState = { score: 0, lives: 20, time: 60, combo: 0, comboTimer: 0, gameOver: false, screenShake: 0, slowMo: false, slowMoTimer: 0, lastHitSlowMo: false, globalScale: 1, deathReason: '被打死了', bossSpawned45: false, bossSpawned30: false, upgradeShown15: false, upgradeShown30: false, upgradeShown45: false, isPaused: false, hitStop: 0 };

// === HITSTOP SYSTEM ===
function triggerHitStop(frames) {
    gameState.hitStop = Math.max(gameState.hitStop, frames);
}
const HIT_STOP = { LIGHT: 2, MEDIUM: 4, HEAVY: 6, EXECUTION: 8 };
let cooldowns = { slash: 0, sajiao: 0, taunt: 0, block: 0 };

// 强化
let playerBuffs = { kickDamage: 1, kickRange: 80, kickKnockback: 15, kickPierce: false, kickStun: false, kickLifesteal: false, slashCD: 120, slashWidth: 100, slashDouble: false, slashDamage: 5, sajiaoCD: 900, sajiaoBossDmg: 10, sajiaoInvincible: false, sajiaoHeal: false, sajiaoFear: false, tauntDuration: 180, invincibleTime: 90, comboKeep: 120, scoreMultiplier: 1, speedMult: 1, gamblerMode: false, extraChoice: false, bossDmgBonus: 1, speedBonus: 1, damageReduce: 0, regenRate: 0 };
const upgradePool = [
    // ==================== 通用升级（6个） ====================
    { id: 'extraLife', name: '续命', icon: '❤️', desc: '+1命', apply: () => { gameState.lives++; maxPlayerLives = Math.max(maxPlayerLives, gameState.lives); buildHpSegments(); updatePlayerHealthBar(false); } },
    { id: 'tankUp', name: '铁布衫', icon: '🛡️', desc: '受伤-15%（最多叠3次）', apply: () => { playerBuffs.damageReduce = Math.min(playerBuffs.damageReduce + 0.15, 0.45); runBuildTags.survival += 2; } },
    { id: 'regen', name: '回春术', icon: '🌿', desc: '每5秒回复少量生命', apply: () => { playerBuffs.regenRate = 1; runBuildTags.survival += 2; } },
    { id: 'gemMagnet', name: '经验黑洞', icon: '🕳️', desc: '拾取范围+50%', apply: () => { playerBuffs.xpMagnetRange = (playerBuffs.xpMagnetRange || 50) * 1.5; runBuildTags.utility += 2; } },
    { id: 'bigGem', name: '大宝石', icon: '💎', desc: '经验获取+30%', apply: () => { playerBuffs.xpMultiplier = (playerBuffs.xpMultiplier || 1) * 1.3; runBuildTags.utility += 2; } },
    { id: 'speedDemon', name: '疾速恶魔', icon: '👿', desc: '移速+20%，受伤+10%', apply: () => { playerBuffs.speedMult *= 1.2; playerBuffs.damageReduce -= 0.1; runBuildTags.speed += 3; } },

    // ==================== 🗡️ 近战/收割升级（4个） ====================
    { id: 'kickDmg', name: '铁腿功', icon: '🦵', desc: '近战伤害+2，攻速+10%', archetype: 'melee',
      apply: () => { playerBuffs.kickDamage += 2; autoAttackConfig.kick.interval *= 0.9; runBuildTags.damage += 2; } },
    { id: 'kickPierce', name: '穿透腿', icon: '🔱', desc: '踢击可穿透敌人', archetype: 'melee',
      apply: () => { playerBuffs.kickPierce = true; runBuildTags.damage += 2; } },
    { id: 'kickVamp', name: '吸血腿', icon: '🩸', desc: '击杀回复少量生命', archetype: 'melee',
      apply: () => { playerBuffs.kickLifesteal = true; runBuildTags.vampire += 3; } },
    { id: 'suitPressure', name: '处决者', icon: '🤵', desc: '对低于30%生命敌人伤害+35%', archetype: 'melee',
      apply: () => { playerBuffs.executeDmg = 1.35; runBuildTags.damage += 3; } },

    // ==================== 💥 爆炸/火焰升级（4个） ====================
    { id: 'aoeKing', name: '范围之王', icon: '👑', desc: '所有范围攻击半径+25%', archetype: 'explosion',
      apply: () => { playerBuffs.kickRange *= 1.25; playerBuffs.slashWidth *= 1.25; runBuildTags.aoe += 3; } },
    { id: 'socialDog', name: '灼烧气场', icon: '☀️', desc: '周围敌人持续受到微量灼烧', archetype: 'explosion',
      apply: () => { playerBuffs.damageAura = 2; runBuildTags.aoe += 3; } },
    { id: 'chainExplosion', name: '连锁爆裂', icon: '💣', desc: '击杀敌人后小范围爆炸', archetype: 'explosion',
      apply: () => { playerBuffs.chainExplosion = true; runBuildTags.aoe += 3; runBuildTags.damage += 2; } },
    { id: 'burnGround', name: '焚烧大地', icon: '🔥', desc: '火焰技能留下短暂燃烧地面', archetype: 'explosion',
      apply: () => { playerBuffs.burnGround = true; runBuildTags.aoe += 2; runBuildTags.damage += 1; } },

    // ==================== ⚡ 闪电/控制升级（4个） ====================
    { id: 'lightningStorm', name: '闪电风暴', icon: '⚡', desc: '闪电额外连锁1个目标', archetype: 'chain',
      apply: () => { playerBuffs.extraChain = (playerBuffs.extraChain || 0) + 1; runBuildTags.damage += 2; } },
    { id: 'frostSlow', name: '极寒领域', icon: '❄️', desc: '被电敌人减速35%，持续时间略延长', archetype: 'chain',
      apply: () => { playerBuffs.extraSlow = 0.35; runBuildTags.utility += 2; } },
    { id: 'slowDmg', name: '冻伤加深', icon: '🥶', desc: '被减速敌人额外受到+20%伤害', archetype: 'chain',
      apply: () => { playerBuffs.slowDamageBonus = 0.2; runBuildTags.damage += 2; runBuildTags.utility += 1; } },
    { id: 'shockSpread', name: '感电扩散', icon: '💫', desc: '感电敌人死亡时对周围释放小电弧', archetype: 'chain',
      apply: () => { playerBuffs.shockSpread = true; runBuildTags.aoe += 2; runBuildTags.damage += 1; } },

    // ==================== 特殊升级（3个） ====================
    { id: 'lucky8', name: '幸运8', icon: '🎱', desc: '暴击时8%概率造成300%额外伤害（Boss无秒杀）', apply: () => { playerBuffs.critKillChance = 0.08; runBuildTags.damage += 3; } },
    { id: 'dogLife', name: '狗命续上', icon: '🐕', desc: '本局首次致命伤保留1点生命+1秒无敌', apply: () => { playerBuffs.deathSave = 1.0; playerBuffs.deathSaveUsed = false; runBuildTags.survival += 3; } },
    { id: 'showMaster', name: '整活专家', icon: '🎪', desc: '攻击时低概率触发随机小效果（爆炸/吸血/加速）', apply: () => { playerBuffs.chaosMode = true; runBuildTags.utility += 2; runBuildTags.damage += 1; } },
];
let selectedUpgrades = [];
let selectedMode = 'wave_battle';
let playerRelics = [];
let pendingRelic = null;
let selectedTalent = null;

// === 波次系统 ===
let waveState = { current: 0, totalWaves: 10, waveTimer: 0, inWave: false, enemiesInWave: 0 };

// === 成就系统 ===
const achievements = [
    // 击杀成就
    { id: 'kill100', name: '初级杀手', desc: '累计击杀100敌人', icon: '💀', reward: 50, check: () => saveData.totalKills >= 100 },
    { id: 'kill500', name: '屠夫', desc: '累计击杀500敌人', icon: '☠️', reward: 200, check: () => saveData.totalKills >= 500 },
    { id: 'kill1000', name: '千人斩', desc: '累计击杀1000敌人', icon: '⚔️', reward: 500, check: () => saveData.totalKills >= 1000 },
    { id: 'kill2500', name: '修罗', desc: '累计击杀2500敌人', icon: '👹', reward: 1000, check: () => saveData.totalKills >= 2500 },
    { id: 'kill5000', name: '死神', desc: '累计击杀5000敌人', icon: '💀', reward: 2000, check: () => saveData.totalKills >= 5000 },
    { id: 'kill10000', name: '灭世者', desc: '累计击杀10000敌人', icon: '🌑', reward: 5000, check: () => saveData.totalKills >= 10000 },

    // Boss成就
    { id: 'boss5', name: 'Boss猎人', desc: '累计击杀5个Boss', icon: '👑', reward: 100, check: () => saveData.totalBossKills >= 5 },
    { id: 'boss15', name: 'Boss克星', desc: '累计击杀15个Boss', icon: '🏆', reward: 300, check: () => saveData.totalBossKills >= 15 },
    { id: 'boss30', name: 'Boss终结者', desc: '累计击杀30个Boss', icon: '💎', reward: 800, check: () => saveData.totalBossKills >= 30 },
    { id: 'boss50', name: 'Boss屠夫', desc: '累计击杀50个Boss', icon: '🔱', reward: 1500, check: () => saveData.totalBossKills >= 50 },
    { id: 'boss100', name: 'Boss噩梦', desc: '累计击杀100个Boss', icon: '👿', reward: 3000, check: () => saveData.totalBossKills >= 100 },

    // 连击成就
    { id: 'combo10', name: '连击新手', desc: '达成10连击', icon: '🔥', reward: 30, check: () => saveData.maxCombo >= 10 },
    { id: 'combo20', name: '连击达人', desc: '达成20连击', icon: '🔥', reward: 80, check: () => saveData.maxCombo >= 20 },
    { id: 'combo35', name: '连击大师', desc: '达成35连击', icon: '💥', reward: 200, check: () => saveData.maxCombo >= 35 },
    { id: 'combo50', name: '连击宗师', desc: '达成50连击', icon: '⚡', reward: 500, check: () => saveData.maxCombo >= 50 },
    { id: 'combo75', name: '连击传说', desc: '达成75连击', icon: '🌟', reward: 1000, check: () => saveData.maxCombo >= 75 },
    { id: 'combo100', name: '连击之神', desc: '达成100连击', icon: '✨', reward: 2000, check: () => saveData.maxCombo >= 100 },

    // 分数成就
    { id: 'score10k', name: '万分狗', desc: '单局得分超10000', icon: '⭐', reward: 80, check: () => saveData.highScore >= 10000 },
    { id: 'score25k', name: '分数猎人', desc: '单局得分超25000', icon: '⭐', reward: 200, check: () => saveData.highScore >= 25000 },
    { id: 'score50k', name: '高分选手', desc: '单局得分超50000', icon: '🌟', reward: 500, check: () => saveData.highScore >= 50000 },
    { id: 'score100k', name: '十万大关', desc: '单局得分超100000', icon: '💫', reward: 1000, check: () => saveData.highScore >= 100000 },
    { id: 'score250k', name: '分数大师', desc: '单局得分超250000', icon: '🏅', reward: 2500, check: () => saveData.highScore >= 250000 },
    { id: 'score500k', name: '分数传说', desc: '单局得分超500000', icon: '🎖️', reward: 5000, check: () => saveData.highScore >= 500000 },
    { id: 'score1m', name: '百万富翁', desc: '单局得分超1000000', icon: '👑', reward: 10000, check: () => saveData.highScore >= 1000000 },

    // 游玩次数成就
    { id: 'play10', name: '常客', desc: '游玩10局', icon: '🎮', reward: 50, check: () => saveData.gamesPlayed >= 10 },
    { id: 'play25', name: '老玩家', desc: '游玩25局', icon: '🎮', reward: 150, check: () => saveData.gamesPlayed >= 25 },
    { id: 'play50', name: '资深玩家', desc: '游玩50局', icon: '🕹️', reward: 300, check: () => saveData.gamesPlayed >= 50 },
    { id: 'play100', name: '骨灰级', desc: '游玩100局', icon: '🏆', reward: 600, check: () => saveData.gamesPlayed >= 100 },
    { id: 'play200', name: '肝帝', desc: '游玩200局', icon: '💪', reward: 1200, check: () => saveData.gamesPlayed >= 200 },
    { id: 'play500', name: '不朽传说', desc: '游玩500局', icon: '🌟', reward: 3000, check: () => saveData.gamesPlayed >= 500 },

    // 连锁成就
    { id: 'chain3', name: '台球新手', desc: '单次连锁击杀3人', icon: '🎱', reward: 50, check: () => saveData.maxChain >= 3 },
    { id: 'chain5', name: '台球高手', desc: '单次连锁击杀5人', icon: '🎱', reward: 150, check: () => saveData.maxChain >= 5 },
    { id: 'chain8', name: '人体保龄球', desc: '单次连锁击杀8人', icon: '🎳', reward: 400, check: () => saveData.maxChain >= 8 },
    { id: 'chain12', name: '连锁大师', desc: '单次连锁击杀12人', icon: '💥', reward: 800, check: () => saveData.maxChain >= 12 },
    { id: 'chain15', name: '多米诺', desc: '单次连锁击杀15人', icon: '🔗', reward: 1500, check: () => saveData.maxChain >= 15 },

    // 存活时间成就
    { id: 'survive60', name: '一分钟', desc: '单局存活超过60秒', icon: '⏱️', reward: 30, check: () => saveData.maxSurvivalTime >= 60 },
    { id: 'survive180', name: '三分钟', desc: '单局存活超过180秒', icon: '⏰', reward: 100, check: () => saveData.maxSurvivalTime >= 180 },
    { id: 'survive300', name: '五分钟', desc: '单局存活超过300秒', icon: '🕐', reward: 250, check: () => saveData.maxSurvivalTime >= 300 },
    { id: 'survive600', name: '十分钟', desc: '单局存活超过600秒', icon: '🕰️', reward: 600, check: () => saveData.maxSurvivalTime >= 600 },
    { id: 'survive900', name: '持久战', desc: '单局存活超过900秒', icon: '⌛', reward: 1200, check: () => saveData.maxSurvivalTime >= 900 },

    // 特殊成就
    { id: 'currency1000', name: '小康之家', desc: '累计获得1000骨头币', icon: '🦴', reward: 100, check: () => saveData.totalCurrency >= 1000 },
    { id: 'currency5000', name: '富甲一方', desc: '累计获得5000骨头币', icon: '💰', reward: 300, check: () => saveData.totalCurrency >= 5000 },
    { id: 'currency20000', name: '骨头大亨', desc: '累计获得20000骨头币', icon: '💎', reward: 1000, check: () => saveData.totalCurrency >= 20000 },
    { id: 'perfectBoss', name: '完美击杀', desc: '满血击败Boss', icon: '✨', reward: 500, check: () => saveData.perfectBossKills >= 1 },
    { id: 'perfectBoss5', name: '完美主义', desc: '满血击败5个Boss', icon: '🌟', reward: 1500, check: () => saveData.perfectBossKills >= 5 },
    { id: 'noHit30', name: '无伤30秒', desc: '30秒内不受伤害', icon: '🛡️', reward: 200, check: () => saveData.maxNoHitTime >= 30 },
    { id: 'noHit60', name: '无伤60秒', desc: '60秒内不受伤害', icon: '🛡️', reward: 500, check: () => saveData.maxNoHitTime >= 60 },

    // 新手成就
    { id: 'firstGame', name: '初出茅庐', desc: '完成第一局游戏', icon: '🐕', reward: 20, check: () => saveData.gamesPlayed >= 1 },
    { id: 'tutorialDone', name: '好学生', desc: '完成新手教程', icon: '📖', reward: 30, check: () => saveData.tutorialCompleted === true },
    { id: 'firstKill', name: '开张大吉', desc: '首次击杀敌人', icon: '🎯', reward: 10, check: () => saveData.totalKills >= 1 },

    // 难度挑战成就
    { id: 'survive120', name: '热身完毕', desc: '存活超过120秒', icon: '🔥', reward: 80, check: () => saveData.maxSurvivalTime >= 120 },
    { id: 'survive420', name: '七分钟', desc: '单局存活超过420秒', icon: '⏳', reward: 400, check: () => saveData.maxSurvivalTime >= 420 },
    { id: 'hellSurvivor', name: '地狱幸存者', desc: '存活到地狱难度阶段', icon: '🔥', reward: 800, check: () => saveData.maxSurvivalTime >= 360 },
    { id: 'abyssSurvivor', name: '深渊行者', desc: '存活到绝望深渊阶段', icon: '🌑', reward: 2000, check: () => saveData.maxSurvivalTime >= 600 },

    // 武器大师成就
    { id: 'weaponMaster', name: '武器大师', desc: '单局使用3种以上武器', icon: '⚔️', reward: 150, check: () => saveData.maxWeaponsUsed >= 3 },
    { id: 'arsenalKing', name: '军火库之王', desc: '单局使用5种以上武器', icon: '👑', reward: 500, check: () => saveData.maxWeaponsUsed >= 5 }
];

function checkAchievements() {
    normalizeOutGameProgress();
    achievements.forEach(a => {
        if (!saveData.achievements[a.id] && a.check()) {
            saveData.achievements[a.id] = true;
            outGameProgress.bones += a.reward;
            saveData.currency = outGameProgress.bones;
        }
    });
}

function showAchieve() {
    document.getElementById('achieveScreen').style.display = 'flex';
    const list = document.getElementById('achieveList');
    list.innerHTML = '';
    achievements.forEach(a => {
        const unlocked = saveData.achievements[a.id];
        const div = document.createElement('div');
        div.className = 'achieve-item' + (unlocked ? ' unlocked' : '');
        div.innerHTML = `<div class="icon">${a.icon}</div><div class="info"><div class="name">${a.name}</div><div class="desc">${a.desc}</div></div><div class="reward">🦴 ${a.reward}</div>`;
        list.appendChild(div);
    });
}

function hideAchieve() { document.getElementById('achieveScreen').style.display = 'none'; }

// === 局外成长 + 商店系统 ===
const milestoneRewards = [
    { id: 'survive_180', seconds: 180, goldDogTags: 1, name: '活过3分钟', desc: '第一次没被一波带走' },
    { id: 'survive_300', seconds: 300, goldDogTags: 2, name: '活过5分钟', desc: '开始有点像回事了' },
    { id: 'survive_480', seconds: 480, goldDogTags: 3, name: '活过8分钟', desc: '战场老油条认证' },
    { id: 'survive_600', seconds: 600, goldDogTags: 4, name: '活过10分钟', desc: '冥府都快记住你车牌了' }
];

const shopItems = [
    { id: 'biteTraining', name: '咬合强化', category: 'basic', currencyType: 'bones', baseCost: 45, costScaling: 1.36, maxLevel: 10, rarity: 'common', icon: '🦷', description: '牙口硬一点，见面先咬掉一层皮。', effectType: 'attack', effectValue: 0.04 },
    { id: 'dogLifeHard', name: '狗命更硬', category: 'basic', currencyType: 'bones', baseCost: 60, costScaling: 1.42, maxLevel: 8, rarity: 'rare', icon: '❤️', description: '每级 +1 最大生命，主打一个更难死。', effectType: 'maxLife', effectValue: 1 },
    { id: 'socialSteps', name: '社会步伐', category: 'basic', currencyType: 'bones', baseCost: 50, costScaling: 1.34, maxLevel: 8, rarity: 'common', icon: '👞', description: '步子别停，场面就不会难看。', effectType: 'moveSpeed', effectValue: 0.03 },
    { id: 'luckyPaw', name: '幸运爪印', category: 'basic', currencyType: 'bones', baseCost: 85, costScaling: 1.48, maxLevel: 6, rarity: 'epic', icon: '🐾', description: '每级多一点暴击狗运。', effectType: 'critChance', effectValue: 0.02 },
    { id: 'xpNose', name: '经验嗅觉', category: 'basic', currencyType: 'bones', baseCost: 75, costScaling: 1.38, maxLevel: 8, rarity: 'rare', icon: '👃', description: '闻哪里肥，经验就往哪里捡。', effectType: 'xpGain', effectValue: 0.05 },
    { id: 'boneBroker', name: '吃币高手', category: 'basic', currencyType: 'bones', baseCost: 80, costScaling: 1.4, maxLevel: 8, rarity: 'rare', icon: '💰', description: '这把不一定赢，但一定要多结算。', effectType: 'boneBonus', effectValue: 0.06 },
    { id: 'magnetCollar', name: '磁力项圈', category: 'basic', currencyType: 'bones', baseCost: 70, costScaling: 1.36, maxLevel: 6, rarity: 'rare', icon: '🧲', description: '宝石会自己凑过来，像欠你钱。', effectType: 'magnetRange', effectValue: 0.12 },

    { id: 'revivePermit', name: '续命许可证', category: 'survival', currencyType: 'goldDogTags', baseCost: 3, costScaling: 1, maxLevel: 1, rarity: 'legendary', icon: '📜', description: '每局第一次致死时强留 1 血。', effectType: 'deathSave', effectValue: 1 },
    { id: 'bossRecovery', name: '打完再说', category: 'survival', currencyType: 'bones', baseCost: 130, costScaling: 1.55, maxLevel: 5, rarity: 'rare', icon: '🍖', description: 'Boss 倒下后顺嘴补一口血。', effectType: 'bossHeal', effectValue: 1 },
    { id: 'toughTraining', name: '抗揍训练', category: 'survival', currencyType: 'bones', baseCost: 110, costScaling: 1.5, maxLevel: 5, rarity: 'rare', icon: '🛡️', description: '挨完打别立刻继续挨。', effectType: 'invincibleFrames', effectValue: 15 },
    { id: 'lastStand', name: '绝境本能', category: 'survival', currencyType: 'bones', baseCost: 135, costScaling: 1.55, maxLevel: 5, rarity: 'epic', icon: '⚠️', description: '低血量时更不容易被一波带走。', effectType: 'lowHpGuard', effectValue: 0.08 },

    { id: 'rareLuck', name: '欧皇狗命', category: 'utility', currencyType: 'goldDogTags', baseCost: 2, costScaling: 1.5, maxLevel: 5, rarity: 'legendary', icon: '🎲', description: '更容易刷出稀有升级牌。', effectType: 'rareUpgrade', effectValue: 0.08 },
    { id: 'hotStart', name: '临场发挥', category: 'utility', currencyType: 'goldDogTags', baseCost: 4, costScaling: 1, maxLevel: 1, rarity: 'legendary', icon: '🎬', description: '开局随机送一个小强化。', effectType: 'openingBuff', effectValue: 1 },
    { id: 'eliteBonus', name: '越打越富', category: 'utility', currencyType: 'bones', baseCost: 120, costScaling: 1.52, maxLevel: 5, rarity: 'rare', icon: '🦴', description: '精英怪会吐出更多局后骨头币。', effectType: 'eliteBones', effectValue: 4 },
    { id: 'eventHunter', name: '老练猎手', category: 'utility', currencyType: 'goldDogTags', baseCost: 2, costScaling: 1.8, maxLevel: 3, rarity: 'epic', icon: '🎯', description: '危险事件活下来，额外多拿一份。', effectType: 'dangerBonus', effectValue: 16 },
    { id: 'relicSniffer', name: '遗物嗅觉', category: 'utility', currencyType: 'goldDogTags', baseCost: 2, costScaling: 1.6, maxLevel: 5, rarity: 'epic', icon: '👑', description: '更容易闻到遗物味。', effectType: 'relicRate', effectValue: 0.025 },

    { id: 'unlock_new_role', name: '新角色', category: 'unlock', currencyType: 'goldDogTags', baseCost: 6, costScaling: 1, maxLevel: 1, rarity: 'legendary', icon: '🎭', description: '预留角色栏位，给以后整新活。', effectType: 'unlock', effectValue: 1, isUnlockContent: true, unlockType: 'newRole', statusText: '已记录购买状态，玩法预留中' },
    { id: 'unlock_new_skin', name: '新皮肤', category: 'unlock', currencyType: 'goldDogTags', baseCost: 5, costScaling: 1, maxLevel: 1, rarity: 'legendary', icon: '✨', description: '解锁金闪闪狗皮，出场更像主角。', effectType: 'unlock', effectValue: 1, isUnlockContent: true, unlockType: 'newSkin', statusText: '已接入金色皮肤光环' },
    { id: 'unlock_starter_weapon', name: '新初始武器', category: 'unlock', currencyType: 'goldDogTags', baseCost: 6, costScaling: 1, maxLevel: 1, rarity: 'legendary', icon: '🗡️', description: '下局开场自带一把飞刀。', effectType: 'unlock', effectValue: 1, isUnlockContent: true, unlockType: 'starterWeapon', statusText: '已接入开局飞刀' },
    { id: 'unlock_new_event', name: '新事件', category: 'unlock', currencyType: 'goldDogTags', baseCost: 6, costScaling: 1, maxLevel: 1, rarity: 'legendary', icon: '🌪️', description: '解锁黄金狗潮事件，收益和场面一起失控。', effectType: 'unlock', effectValue: 1, isUnlockContent: true, unlockType: 'newEvent', statusText: '已接入黄金狗潮事件', unlockCondition: '需要至少活过 5 分钟', unlockCheck: () => (saveData.maxSurvivalTime || 0) >= 300 },
    { id: 'unlock_boss_layer', name: 'Boss悬赏层', category: 'unlock', currencyType: 'goldDogTags', baseCost: 8, costScaling: 1, maxLevel: 1, rarity: 'legendary', icon: '👑', description: 'Boss 结算额外加层，长期打本更值。', effectType: 'unlock', effectValue: 1, isUnlockContent: true, unlockType: 'bossRewardLayer', statusText: '已接入Boss额外悬赏', unlockCondition: '需要累计击败 15 个 Boss', unlockCheck: () => (saveData.totalBossKills || 0) >= 15 }
];

let shopCurrentCategory = 'basic';
let shopBgAnimId = null;
let shopParticleAnimId = null;

// 商店流光线条类
class ShopFlowLine {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }
    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = this.canvas.height + 50;
        this.length = 80 + Math.random() * 150;
        this.speed = 1 + Math.random() * 2;
        this.width = 1 + Math.random() * 2;
        this.hue = 260 + Math.random() * 40;
    }
    update() {
        this.y -= this.speed;
        if (this.y + this.length < 0) this.reset();
    }
    draw(ctx) {
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.length);
        gradient.addColorStop(0, `hsla(${this.hue}, 70%, 60%, 0.8)`);
        gradient.addColorStop(0.5, `hsla(${this.hue}, 60%, 40%, 0.4)`);
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.width;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.stroke();
    }
}

// 商店横向流光类
class ShopHorizontalGlow {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }
    reset() {
        this.y = Math.random() * this.canvas.height;
        this.x = -200;
        this.width = 100 + Math.random() * 80;
        this.speed = 2 + Math.random() * 2;
        this.alpha = 0.1 + Math.random() * 0.15;
    }
    update() {
        this.x += this.speed;
        if (this.x > this.canvas.width + 200) this.reset();
    }
    draw(ctx) {
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, `rgba(147, 112, 219, ${this.alpha})`);
        gradient.addColorStop(0.5, `rgba(212, 175, 55, ${this.alpha * 0.5})`);
        gradient.addColorStop(0.7, `rgba(147, 112, 219, ${this.alpha})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y - 2, this.width, 4);
    }
}

// 商店粒子类
class ShopParticle {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }
    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = -Math.random() * 0.4 - 0.1;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.hue = Math.random() > 0.7 ? 45 : 270;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity -= 0.002;
        if (this.opacity <= 0 || this.y < -10) this.reset();
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 70%, 60%, ${this.opacity})`;
        ctx.fill();
    }
}

let shopFlowLines = [];
let shopHGlows = [];
let shopParticles = [];

function initShopCanvas() {
    const bgCanvas = document.getElementById('shopBgCanvas');
    const particleCanvas = document.getElementById('shopParticleCanvas');
    if (!bgCanvas || !particleCanvas) return;

    const container = document.getElementById('shopScreen');
    bgCanvas.width = container.offsetWidth;
    bgCanvas.height = container.offsetHeight;
    particleCanvas.width = container.offsetWidth;
    particleCanvas.height = container.offsetHeight;

    shopFlowLines = Array.from({ length: 12 }, () => new ShopFlowLine(bgCanvas));
    shopHGlows = Array.from({ length: 4 }, () => new ShopHorizontalGlow(bgCanvas));
    shopParticles = Array.from({ length: 40 }, () => new ShopParticle(particleCanvas));
}

function animateShopBg() {
    const canvas = document.getElementById('shopBgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 深紫色渐变背景
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#0a0612');
    bgGradient.addColorStop(0.3, '#1a0f2e');
    bgGradient.addColorStop(0.6, '#2d1b4e');
    bgGradient.addColorStop(1, '#0a0612');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    shopFlowLines.forEach(line => { line.update(); line.draw(ctx); });
    shopHGlows.forEach(glow => { glow.update(); glow.draw(ctx); });

    shopBgAnimId = requestAnimationFrame(animateShopBg);
}

function animateShopParticles() {
    const canvas = document.getElementById('shopParticleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shopParticles.forEach(p => { p.update(); p.draw(ctx); });
    shopParticleAnimId = requestAnimationFrame(animateShopParticles);
}

function showShop() {
    normalizeOutGameProgress();
    document.getElementById('shopScreen').style.display = 'flex';
    document.getElementById('shopCurrencyNum').textContent = outGameProgress.bones;
    document.getElementById('shopGoldNum').textContent = outGameProgress.goldDogTags;
    shopCurrentCategory = 'basic';
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.shop-tab[data-category="basic"]').classList.add('active');
    renderShop();
    setTimeout(() => {
        initShopCanvas();
        animateShopBg();
        animateShopParticles();
    }, 50);
}

function hideShop() {
    document.getElementById('shopScreen').style.display = 'none';
    if (shopBgAnimId) { cancelAnimationFrame(shopBgAnimId); shopBgAnimId = null; }
    if (shopParticleAnimId) { cancelAnimationFrame(shopParticleAnimId); shopParticleAnimId = null; }
}

function getRarityText(rarity) {
    const texts = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
    return texts[rarity] || '';
}

function showShopPurchaseEffect(name) {
    const effect = document.getElementById('shopPurchaseEffect');
    effect.textContent = `获得 ${name}!`;
    effect.classList.remove('show');
    void effect.offsetWidth;
    effect.classList.add('show');
}

function normalizeOutGameProgress() {
    if (!outGameProgress || typeof outGameProgress !== 'object') {
        outGameProgress = JSON.parse(JSON.stringify(defaultOutGameProgress));
    }
    outGameProgress.purchasedUpgrades = outGameProgress.purchasedUpgrades || {};
    outGameProgress.unlockedContent = outGameProgress.unlockedContent || {};
    outGameProgress.claimedMilestones = outGameProgress.claimedMilestones || {};
    outGameProgress.claimedBossRewards = outGameProgress.claimedBossRewards || {};
    outGameProgress.claimedMetaRewards = outGameProgress.claimedMetaRewards || {};
    outGameProgress.claimedAchievementRewards = outGameProgress.claimedAchievementRewards || {};
    outGameProgress.lastRunRewards = outGameProgress.lastRunRewards || { bones: 0, goldDogTags: 0, breakdown: [] };

    // 兼容旧存档
    if (!outGameProgress._legacyMigrated) {
        const legacy = saveData.permUpgrades || {};
        outGameProgress.purchasedUpgrades.biteTraining = Math.max(outGameProgress.purchasedUpgrades.biteTraining || 0, legacy.atkBonus || 0);
        outGameProgress.purchasedUpgrades.dogLifeHard = Math.max(outGameProgress.purchasedUpgrades.dogLifeHard || 0, legacy.maxHp || 0);
        outGameProgress.purchasedUpgrades.socialSteps = Math.max(outGameProgress.purchasedUpgrades.socialSteps || 0, legacy.speedBonus || 0);
        outGameProgress.purchasedUpgrades.toughTraining = Math.max(outGameProgress.purchasedUpgrades.toughTraining || 0, Math.min(legacy.cdBonus || 0, 5));
        outGameProgress.purchasedUpgrades.revivePermit = Math.max(outGameProgress.purchasedUpgrades.revivePermit || 0, outGameProgress.purchasedUpgrades.licenseToLive || 0);
        outGameProgress.purchasedUpgrades.bossRecovery = Math.max(outGameProgress.purchasedUpgrades.bossRecovery || 0, outGameProgress.purchasedUpgrades.bossAfterparty || 0);
        outGameProgress.purchasedUpgrades.lastStand = Math.max(outGameProgress.purchasedUpgrades.lastStand || 0, outGameProgress.purchasedUpgrades.lastStandInstinct || 0);
        outGameProgress.purchasedUpgrades.rareLuck = Math.max(outGameProgress.purchasedUpgrades.rareLuck || 0, outGameProgress.purchasedUpgrades.luckyDogLife || 0);
        outGameProgress.purchasedUpgrades.hotStart = Math.max(outGameProgress.purchasedUpgrades.hotStart || 0, outGameProgress.purchasedUpgrades.openingAct || 0);
        outGameProgress.purchasedUpgrades.eliteBonus = Math.max(outGameProgress.purchasedUpgrades.eliteBonus || 0, outGameProgress.purchasedUpgrades.elitePayroll || 0);
        outGameProgress.purchasedUpgrades.eventHunter = Math.max(outGameProgress.purchasedUpgrades.eventHunter || 0, outGameProgress.purchasedUpgrades.hunterBonus || 0);
        outGameProgress.purchasedUpgrades.relicSniffer = Math.max(outGameProgress.purchasedUpgrades.relicSniffer || 0, outGameProgress.purchasedUpgrades.blackMarketNose || 0);
        if (saveData.ownsMaserati) outGameProgress.unlockedContent.newSkin = true;
        outGameProgress._legacyMigrated = true;
    }

    outGameProgress.bones = Math.max(outGameProgress.bones || 0, saveData.currency || 0);
    metaProgress = outGameProgress;
    syncLegacyProgressFields();
}

function getShopItemCurrentLevel(itemId) {
    normalizeOutGameProgress();
    const item = shopItems.find(entry => entry.id === itemId);
    if (!item) return 0;
    if (item.isUnlockContent) return outGameProgress.unlockedContent[item.unlockType] ? 1 : 0;
    return outGameProgress.purchasedUpgrades[item.id] || 0;
}

function getShopItemCost(item) {
    const currentLevel = getShopItemCurrentLevel(item.id);
    if (currentLevel >= item.maxLevel) return 0;
    return Math.round(item.baseCost * Math.pow(item.costScaling || 1, currentLevel));
}

function canPurchaseShopItem(item) {
    normalizeOutGameProgress();
    const currentLevel = getShopItemCurrentLevel(item.id);
    const maxed = currentLevel >= item.maxLevel;
    const wallet = item.currencyType === 'goldDogTags' ? outGameProgress.goldDogTags : outGameProgress.bones;
    const cost = getShopItemCost(item);
    const unlockable = !item.unlockCheck || item.unlockCheck();
    return {
        currentLevel,
        cost,
        maxed,
        unlockable,
        cantAfford: !maxed && wallet < cost,
        reason: maxed ? '已满级' : (!unlockable ? (item.unlockCondition || '未满足解锁条件') : (wallet < cost ? (item.currencyType === 'goldDogTags' ? '金狗牌不足' : '骨头不够') : ''))
    };
}

function getShopItemState(item) {
    const state = canPurchaseShopItem(item);
    return {
        currentLevel: state.currentLevel,
        maxed: state.maxed,
        nextCost: state.cost,
        cantAfford: state.cantAfford || !state.unlockable,
        unlockable: state.unlockable,
        reason: state.reason
    };
}

function getCurrencyLabel(currencyType) {
    return currencyType === 'goldDogTags' ? '🏅 金狗牌' : '🦴 骨头币';
}

function getShopMeta(item, currentLevel) {
    if (item.category === 'unlock') {
        return item.statusText || '已预留结构';
    }
    switch (item.effectType) {
        case 'attack': return `当前加成 ${Math.round(currentLevel * item.effectValue * 100)}%`;
        case 'moveSpeed': return `当前加成 ${Math.round(currentLevel * item.effectValue * 100)}%`;
        case 'critChance': return `当前暴击 ${Math.round(currentLevel * item.effectValue * 100)}%`;
        case 'xpGain': return `当前经验 ${Math.round(currentLevel * item.effectValue * 100)}%`;
        case 'boneBonus': return `当前结算 ${Math.round(currentLevel * item.effectValue * 100)}%`;
        case 'magnetRange': return `当前吸附范围 x${(1 + currentLevel * item.effectValue).toFixed(2)}`;
        case 'invincibleFrames': return `当前额外无敌 ${currentLevel * item.effectValue} 帧`;
        case 'lowHpGuard': return `当前低血减伤 ${Math.round(currentLevel * item.effectValue * 100)}%`;
        case 'rareUpgrade': return `当前稀有权重 ${Math.round(currentLevel * item.effectValue * 100)}%`;
        case 'eliteBones': return `当前精英补贴 +${currentLevel * item.effectValue}`;
        case 'dangerBonus': return `当前危机补贴 +${currentLevel * item.effectValue}`;
        case 'relicRate': return `当前遗物掉率 +${Math.round(currentLevel * item.effectValue * 100)}%`;
        case 'bossHeal': return `当前回血 +${currentLevel * item.effectValue}`;
        case 'maxLife': return `当前生命 +${currentLevel * item.effectValue}`;
        case 'deathSave': return currentLevel > 0 ? '当前效果: 每局首死保 1 血' : '未解锁';
        case 'openingBuff': return currentLevel > 0 ? '已解锁开局随机强化' : '未解锁';
        default: return item.description;
    }
}

function getShopNextEffectText(item, currentLevel) {
    if (currentLevel >= item.maxLevel) return '已满级';
    const nextLevel = currentLevel + 1;
    switch (item.effectType) {
        case 'attack': return `下级效果: 伤害 ${Math.round(nextLevel * item.effectValue * 100)}%`;
        case 'moveSpeed': return `下级效果: 移速 ${Math.round(nextLevel * item.effectValue * 100)}%`;
        case 'critChance': return `下级效果: 暴击 ${Math.round(nextLevel * item.effectValue * 100)}%`;
        case 'xpGain': return `下级效果: 经验 ${Math.round(nextLevel * item.effectValue * 100)}%`;
        case 'boneBonus': return `下级效果: 结算 ${Math.round(nextLevel * item.effectValue * 100)}%`;
        case 'magnetRange': return `下级效果: 吸附 x${(1 + nextLevel * item.effectValue).toFixed(2)}`;
        case 'bossHeal': return `下级效果: Boss回血 +${nextLevel * item.effectValue}`;
        case 'invincibleFrames': return `下级效果: 无敌 +${nextLevel * item.effectValue}帧`;
        case 'lowHpGuard': return `下级效果: 低血减伤 ${Math.round(nextLevel * item.effectValue * 100)}%`;
        case 'rareUpgrade': return `下级效果: 稀有权重 ${Math.round(nextLevel * item.effectValue * 100)}%`;
        case 'eliteBones': return `下级效果: 精英补贴 +${nextLevel * item.effectValue}`;
        case 'dangerBonus': return `下级效果: 危机补贴 +${nextLevel * item.effectValue}`;
        case 'relicRate': return `下级效果: 遗物掉率 +${Math.round(nextLevel * item.effectValue * 100)}%`;
        case 'openingBuff': return '解锁后: 开局随机小强化';
        case 'deathSave': return '解锁后: 每局第一次致死保 1 血';
        case 'unlock': return item.unlockCondition || '一次性解锁';
        default: return item.description;
    }
}

function renderShop() {
    normalizeOutGameProgress();
    const grid = document.getElementById('shopGrid');
    grid.innerHTML = '';
    document.getElementById('shopCurrencyNum').textContent = outGameProgress.bones;
    document.getElementById('shopGoldNum').textContent = outGameProgress.goldDogTags;

    shopItems.filter(item => item.category === shopCurrentCategory).forEach(item => {
        const { currentLevel, maxed, nextCost, cantAfford, reason } = getShopItemState(item);
        const unlockHint = maxed ? '' : (reason || getShopNextEffectText(item, currentLevel));
        const div = document.createElement('div');
        const classes = ['shop-item'];
        if (maxed) classes.push('maxed');
        if (cantAfford) classes.push('cant-afford');
        if (item.category === 'unlock') classes.push('special');
        if (item.category === 'unlock' && !maxed) classes.push('locked');
        div.className = classes.join(' ');
        div.innerHTML = `
            <canvas class="item-glow-canvas"></canvas>
            <span class="rarity rarity-${item.rarity}">${getRarityText(item.rarity)}</span>
            <div class="icon">${item.icon}</div>
            <div class="name">${item.name}</div>
            <div class="desc">${item.description}</div>
            <div class="level">Lv.${currentLevel} / ${item.maxLevel}</div>
            <div class="meta">${getShopMeta(item, currentLevel)}</div>
            <div class="cost">${maxed ? '已满级' : `${getCurrencyLabel(item.currencyType)} ${nextCost}`}</div>
            <div class="unlock-hint">${unlockHint}</div>
            <button class="buy-btn" ${maxed || cantAfford ? 'disabled' : ''}>${maxed ? '已满级' : cantAfford ? reason : item.category === 'unlock' ? '解锁' : '购买'}</button>
        `;
        if (!maxed && !cantAfford) {
            div.querySelector('.buy-btn').onclick = (e) => {
                e.stopPropagation();
                purchaseShopItem(item.id);
            };
        }
        grid.appendChild(div);
    });

    // 初始化卡片流光效果
    document.querySelectorAll('.shop-item .item-glow-canvas').forEach(canvas => {
        setTimeout(() => initItemGlow(canvas), 100);
    });
}

function initItemGlow(canvas) {
    if (!canvas.offsetWidth) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    let offset = 0;

    function animate() {
        if (!document.getElementById('shopScreen').style.display || document.getElementById('shopScreen').style.display === 'none') return;
        ctx.clearRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(offset % (width * 2) - width, 0, offset % (width * 2), height);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.4, 'rgba(147, 112, 219, 0.25)');
        gradient.addColorStop(0.5, 'rgba(212, 175, 55, 0.4)');
        gradient.addColorStop(0.6, 'rgba(147, 112, 219, 0.25)');
        gradient.addColorStop(1, 'transparent');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        offset += 1.5;
        requestAnimationFrame(animate);
    }
    animate();
}

// 商店分类切换
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            shopCurrentCategory = tab.dataset.category;
            renderShop();
        });
    });
});

// === 主页背景动画系统 ===
let menuBgAnimId = null;
let menuParticleAnimId = null;
let menuFlowLines = [];
let menuHGlows = [];
let menuParticles = [];

class MenuFlowLine {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }
    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = this.canvas.height + 50;
        this.length = 100 + Math.random() * 180;
        this.speed = 0.8 + Math.random() * 1.5;
        this.width = 1 + Math.random() * 2.5;
        this.hue = 260 + Math.random() * 40;
    }
    update() {
        this.y -= this.speed;
        if (this.y + this.length < 0) this.reset();
    }
    draw(ctx) {
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.length);
        gradient.addColorStop(0, `hsla(${this.hue}, 70%, 60%, 0.7)`);
        gradient.addColorStop(0.5, `hsla(${this.hue}, 60%, 40%, 0.35)`);
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.width;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.stroke();
    }
}

class MenuHGlow {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }
    reset() {
        this.y = Math.random() * this.canvas.height;
        this.x = -250;
        this.width = 120 + Math.random() * 100;
        this.speed = 1.5 + Math.random() * 2;
        this.alpha = 0.08 + Math.random() * 0.12;
    }
    update() {
        this.x += this.speed;
        if (this.x > this.canvas.width + 250) this.reset();
    }
    draw(ctx) {
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, `rgba(147, 112, 219, ${this.alpha})`);
        gradient.addColorStop(0.5, `rgba(212, 175, 55, ${this.alpha * 0.6})`);
        gradient.addColorStop(0.7, `rgba(147, 112, 219, ${this.alpha})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y - 3, this.width, 6);
    }
}

class MenuParticle {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }
    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.size = Math.random() * 3 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = -Math.random() * 0.3 - 0.1;
        this.opacity = Math.random() * 0.5 + 0.15;
        this.hue = Math.random() > 0.6 ? 45 : 270;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity -= 0.0015;
        if (this.opacity <= 0 || this.y < -10) this.reset();
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 70%, 60%, ${this.opacity})`;
        ctx.fill();
    }
}

function initMenuBgCanvas() {
    const bgCanvas = document.getElementById('menuBgCanvas');
    const particleCanvas = document.getElementById('menuParticleCanvas');
    const panelGlow = document.getElementById('menuPanelGlow');
    const container = document.getElementById('startScreen');
    if (!bgCanvas || !container) return;

    bgCanvas.width = container.offsetWidth;
    bgCanvas.height = container.offsetHeight;
    particleCanvas.width = container.offsetWidth;
    particleCanvas.height = container.offsetHeight;

    menuFlowLines = Array.from({ length: 15 }, () => new MenuFlowLine(bgCanvas));
    menuHGlows = Array.from({ length: 5 }, () => new MenuHGlow(bgCanvas));
    menuParticles = Array.from({ length: 50 }, () => new MenuParticle(particleCanvas));

    // 初始化面板流光
    if (panelGlow) {
        const panel = panelGlow.parentElement;
        panelGlow.width = panel.offsetWidth;
        panelGlow.height = panel.offsetHeight;
        initMenuPanelGlow(panelGlow);
    }
}

function animateMenuBg() {
    const canvas = document.getElementById('menuBgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 深紫色渐变背景
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#0a0612');
    bgGradient.addColorStop(0.3, '#1a0f2e');
    bgGradient.addColorStop(0.5, '#2d1b4e');
    bgGradient.addColorStop(0.7, '#1a0f2e');
    bgGradient.addColorStop(1, '#0a0612');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    menuFlowLines.forEach(line => { line.update(); line.draw(ctx); });
    menuHGlows.forEach(glow => { glow.update(); glow.draw(ctx); });

    menuBgAnimId = requestAnimationFrame(animateMenuBg);
}

function animateMenuParticles() {
    const canvas = document.getElementById('menuParticleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    menuParticles.forEach(p => { p.update(); p.draw(ctx); });
    menuParticleAnimId = requestAnimationFrame(animateMenuParticles);
}

function initMenuPanelGlow(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    let offset = 0;

    function animate() {
        ctx.clearRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(offset % (width * 2) - width, 0, offset % (width * 2), height);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, 'rgba(147, 112, 219, 0.15)');
        gradient.addColorStop(0.5, 'rgba(212, 175, 55, 0.25)');
        gradient.addColorStop(0.7, 'rgba(147, 112, 219, 0.15)');
        gradient.addColorStop(1, 'transparent');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, width - 10, height - 10);
        offset += 1.2;
        requestAnimationFrame(animate);
    }
    animate();
}

// 启动主页背景动画
function startMenuAnimations() {
    setTimeout(() => {
        initMenuBgCanvas();
        animateMenuBg();
        animateMenuParticles();
    }, 100);
}

// 页面加载后启动
window.addEventListener('load', startMenuAnimations);
window.addEventListener('resize', () => {
    if (document.getElementById('startScreen').style.display !== 'none') {
        initMenuBgCanvas();
    }
});

function purchaseShopItem(itemId) {
    normalizeOutGameProgress();
    const item = shopItems.find(entry => entry.id === itemId);
    if (!item) return;
    const state = canPurchaseShopItem(item);
    if (state.maxed || !state.unlockable) return;

    const walletKey = item.currencyType === 'goldDogTags' ? 'goldDogTags' : 'bones';
    if (outGameProgress[walletKey] < state.cost) return;

    outGameProgress[walletKey] -= state.cost;
    if (item.category === 'unlock') {
        outGameProgress.unlockedContent[item.unlockType] = true;
    } else {
        outGameProgress.purchasedUpgrades[item.id] = state.currentLevel + 1;
    }

    syncLegacyProgressFields();
    saveGame();
    updateCurrencyDisplay();
    showShopPurchaseEffect(item.name);
    renderShop();
    showEvent(`${item.name} 已到账`);
}

function buyShopItem(itemId) {
    purchaseShopItem(itemId);
}

function grantOpeningBuff() {
    const openingLevel = outGameProgress.purchasedUpgrades.hotStart || 0;
    if (!openingLevel) return;
    const openingBuffs = [
        { text: '临场发挥: 脚风更猛', apply: () => { playerBuffs.kickDamage += 1; playerBuffs.slashDamage += 1; } },
        { text: '临场发挥: 步子更浪', apply: () => { playerBuffs.speedMult *= 1.06; } },
        { text: '临场发挥: 多一口气', apply: () => { gameState.lives++; maxPlayerLives = gameState.lives; } }
    ];
    const buff = openingBuffs[Math.floor(Math.random() * openingBuffs.length)];
    buff.apply();
    setTimeout(() => showEvent(buff.text), 300);
}

function applyMetaProgressToRun() {
    normalizeOutGameProgress();
    const p = outGameProgress.purchasedUpgrades;

    const extraLives = (p.dogLifeHard || 0);
    const attackBonus = 1 + (p.biteTraining || 0) * 0.04;
    const moveBonus = 1 + (p.socialSteps || 0) * 0.03;
    const critChance = (p.luckyPaw || 0) * 0.02;
    const xpBonus = 1 + (p.xpNose || 0) * 0.05;
    const magnetBonus = 1 + (p.magnetCollar || 0) * 0.12;

    maxPlayerLives = 20 + extraLives;
    gameState.lives = maxPlayerLives;
    playerBuffs.globalAttackMult = attackBonus;
    playerBuffs.kickDamage = 1 * attackBonus;
    playerBuffs.slashDamage = 5 * attackBonus;
    playerBuffs.speedMult *= moveBonus;
    playerBuffs.critChance = critChance;
    playerBuffs.critMultiplier = 1.55;
    playerBuffs.xpMultiplier = (playerBuffs.xpMultiplier || 1) * xpBonus;
    playerBuffs.xpMagnetRange = Math.round((playerBuffs.xpMagnetRange || 50) * magnetBonus);
    playerBuffs.boneRewardBonus = (p.boneBroker || 0) * 0.06;
    playerBuffs.oneTimeRevive = p.revivePermit || 0;
    playerBuffs.bossHealOnKill = p.bossRecovery || 0;
    playerBuffs.invincibleTime += (p.toughTraining || 0) * 15;
    playerBuffs.lowHpGuard = (p.lastStand || 0) * 0.08;
    playerBuffs.rareUpgradeChance = (p.rareLuck || 0) * 0.08;
    playerBuffs.extraEliteBones = (p.eliteBonus || 0) * 4;
    playerBuffs.dangerRewardBonus = (p.eventHunter || 0) * 16;
    playerBuffs.relicDropBonus = (p.relicSniffer || 0) * 0.025;
    playerBuffs.openingBuff = p.hotStart || 0;
    gameState.deathSaveUsed = false;

    if (outGameProgress.unlockedContent.newSkin) {
        playerBuffs.goldenSkin = true;
    }
    if (outGameProgress.unlockedContent.starterWeapon) {
        addWeapon('knife');
    }
    if (outGameProgress.unlockedContent.newEvent) {
        playerBuffs.unlockGoldenEvent = true;
    }
    if (outGameProgress.unlockedContent.bossRewardLayer) {
        playerBuffs.extraBossBones = 12;
    }

    grantOpeningBuff();
    document.getElementById('lives').textContent = gameState.lives;
}

function applyPermUpgrades() {
    applyMetaProgressToRun();
}

// === 天赋系统 ===
const talents = [
    { id: 'balanced', name: '均衡型', icon: '🐕', buff: '无加成', debuff: '无惩罚', apply: () => { /* 默认，无特殊效果 */ } },
    { id: 'power', name: '力量型', icon: '💪', buff: '伤害+20%', debuff: '移速-10%', apply: () => { playerBuffs.kickDamage *= 1.2; playerBuffs.slashDamage *= 1.2; playerBuffs.speedMult = 0.9; } },
    { id: 'speed', name: '速度型', icon: '⚡', buff: '移速+25%', debuff: '生命-1', apply: () => { playerBuffs.speedMult = 1.25; gameState.lives--; document.getElementById('lives').textContent = gameState.lives; } },
    { id: 'tank', name: '肉盾型', icon: '🛡️', buff: '生命+2', debuff: '伤害-15%', apply: () => { gameState.lives += 2; document.getElementById('lives').textContent = gameState.lives; playerBuffs.kickDamage *= 0.85; playerBuffs.slashDamage *= 0.85; } },
    { id: 'chaos', name: '混沌型', icon: '🎰', buff: '升级多1个随机选项', debuff: '选项质量波动', apply: () => { playerBuffs.gamblerMode = true; } }
];

function showTalentScreen() {
    const grid = document.getElementById('talentGrid');
    grid.innerHTML = '';
    talents.forEach(t => {
        const card = document.createElement('div');
        card.className = 'talent-card';
        card.innerHTML = `<div class="icon">${t.icon}</div><div class="name">${t.name}</div><div class="buff">✓ ${t.buff}</div><div class="debuff">✗ ${t.debuff}</div>`;
        card.onclick = () => selectTalent(t);
        grid.appendChild(card);
    });
    document.getElementById('talentScreen').style.display = 'flex';
}

function selectTalent(talent) {
    selectedTalent = talent;
    document.getElementById('talentScreen').style.display = 'none';
    talent.apply();
    // Update health bar after talent changes lives
    maxPlayerLives = Math.max(maxPlayerLives, gameState.lives);
    buildHpSegments();
    updatePlayerHealthBar(false);
    spawnFloatingText(player.x, player.y - 60, talent.icon + ' ' + talent.name, '#ffd700');
    gameState.isPaused = false;
}

// === 遗物系统 ===
const relicTypes = [
    { id: 'glove', name: '拳击手套', icon: '🥊', desc: '踢击+30%', apply: () => playerBuffs.kickDamage *= 1.3 },
    { id: 'star', name: '幸运星', icon: '💫', desc: '升级多1选项', apply: () => playerBuffs.extraChoice = true },
    { id: 'crown', name: '王冠', icon: '👑', desc: 'Boss伤害+50%', apply: () => playerBuffs.bossDmgBonus = 1.5 },
    { id: 'boot', name: '疾风靴', icon: '👢', desc: '移速+20%', apply: () => playerBuffs.speedBonus = 1.2 },
    { id: 'heart', name: '生命宝石', icon: '💎', desc: '+1命', apply: () => { gameState.lives++; maxPlayerLives = Math.max(maxPlayerLives, gameState.lives); buildHpSegments(); updatePlayerHealthBar(false); } }
];

function spawnRelic(x, y) {
    if (playerRelics.length >= 3) return;
    const available = relicTypes.filter(r => !playerRelics.find(pr => pr.id === r.id));
    if (available.length === 0) return;
    const relic = available[Math.floor(Math.random() * available.length)];
    items.push({ x, y, isRelic: true, ...relic, bobOffset: Math.random() * Math.PI * 2 });
}

function pickupRelic(relic) {
    pendingRelic = relic;
    gameState.isPaused = true;
    document.getElementById('relicIcon').textContent = relic.icon;
    document.getElementById('relicName').textContent = relic.name;
    document.getElementById('relicDesc').textContent = relic.desc;
    document.getElementById('relicPickup').style.display = 'block';
}

function confirmRelic() {
    if (!pendingRelic) return;
    playerRelics.push(pendingRelic);
    pendingRelic.apply();
    updateRelicBar();
    pendingRelic = null;
    document.getElementById('relicPickup').style.display = 'none';
    gameState.isPaused = false;
}

// === 增强版遗物栏系统 ===
// 已获得的遗物数据（用于UI和状态追踪）
let acquiredRelics = [];

function updateRelicBar() {
    const bar = document.getElementById('relicBar');
    if (acquiredRelics.length === 0 && playerRelics.length === 0) {
        bar.style.display = 'none';
        return;
    }

    // 合并旧系统和新系统的遗物
    const allRelics = [...playerRelics, ...acquiredRelics];

    bar.innerHTML = allRelics.map((r, i) => {
        const tierClass = r.tier === 'legendary' ? 'legendary' : (r.tier === 'epic' ? 'epic' : '');
        const readyClass = getRelicReadyState(r) ? 'ready' : '';
        const stackCount = getRelicStackCount(r);
        const cooldownPercent = getRelicCooldownPercent(r);

        let extraHTML = '';
        if (stackCount > 0) {
            extraHTML += `<span class="stack-count">${stackCount}</span>`;
        }
        if (cooldownPercent > 0 && cooldownPercent < 100) {
            extraHTML += `<span class="cooldown-overlay">${Math.floor(cooldownPercent)}%</span>`;
        }

        return `<div class="relic-slot ${tierClass} ${readyClass}" data-relic-index="${i}" data-relic-id="${r.id || r.name}">
            <span class="relic-icon">${r.icon}</span>
            ${extraHTML}
        </div>`;
    }).join('');

    bar.style.display = 'flex';

    // 绑定悬浮事件
    bar.querySelectorAll('.relic-slot').forEach(slot => {
        slot.addEventListener('mouseenter', showRelicTooltip);
        slot.addEventListener('mouseleave', hideRelicTooltip);
    });
}

function getRelicStackCount(relic) {
    if (!relic.id) return 0;
    switch (relic.id) {
        case 'soulReaper': return relicState.souls;
        case 'shadowClone': return relicState.shadowCombo;
        case 'timeWarp': return relicState.attackCombo;
        case 'goldHunter': return relicState.killStreak;
        default: return 0;
    }
}

function getRelicCooldownPercent(relic) {
    if (!relic.id) return 0;
    switch (relic.id) {
        case 'doomSlayer':
            if (relicState.doomReady) return 100;
            return Math.floor((relicState.doomChargeTimer / 300) * 100);
        default: return 0;
    }
}

function getRelicReadyState(relic) {
    if (!relic.id) return false;
    switch (relic.id) {
        case 'doomSlayer': return relicState.doomReady;
        case 'soulReaper': return relicState.souls >= 20;
        case 'berserkerHeart': return gameState.lives <= 2;
        default: return false;
    }
}

function showRelicTooltip(e) {
    const slot = e.currentTarget;
    const index = parseInt(slot.dataset.relicIndex);
    const allRelics = [...playerRelics, ...acquiredRelics];
    const relic = allRelics[index];
    if (!relic) return;

    const tooltip = document.getElementById('relicTooltip');
    tooltip.querySelector('.tooltip-icon').textContent = relic.icon;
    tooltip.querySelector('.tooltip-name').textContent = relic.name;

    const tierEl = tooltip.querySelector('.tooltip-tier');
    if (relic.tier === 'legendary') {
        tierEl.textContent = '传奇';
        tierEl.className = 'tooltip-tier legendary';
    } else if (relic.tier === 'epic') {
        tierEl.textContent = '史诗';
        tierEl.className = 'tooltip-tier epic';
    } else {
        tierEl.textContent = '普通';
        tierEl.className = 'tooltip-tier';
    }

    tooltip.querySelector('.tooltip-desc').textContent = relic.desc;
    tooltip.querySelector('.tooltip-playstyle').textContent = relic.playstyle ? `💡 ${relic.playstyle}` : '';

    // 状态信息
    let statusText = '';
    if (relic.id === 'doomSlayer') {
        statusText = relicState.doomReady ? '⚡ 已就绪!' : `充能中: ${Math.floor((relicState.doomChargeTimer / 300) * 100)}%`;
    } else if (relic.id === 'soulReaper') {
        statusText = `灵魂: ${relicState.souls}/20`;
    } else if (relic.id === 'berserkerHeart') {
        statusText = gameState.lives <= 2 ? '💢 狂战激活中!' : '血量≤2时激活';
    } else if (relic.id === 'timeWarp') {
        statusText = `连击: ${relicState.attackCombo}/10`;
    } else if (relic.id === 'shadowClone') {
        statusText = `残影: ${relicState.shadowCombo}/5`;
    }
    tooltip.querySelector('.tooltip-status').textContent = statusText;

    // 定位
    const slotRect = slot.getBoundingClientRect();
    const barRect = document.getElementById('relicBar').getBoundingClientRect();
    tooltip.style.top = (slot.offsetTop) + 'px';

    tooltip.classList.add('visible');
}

function hideRelicTooltip() {
    document.getElementById('relicTooltip').classList.remove('visible');
}

// === 遗物触发高亮 ===
function triggerRelicHighlight(relicId) {
    const bar = document.getElementById('relicBar');
    const slot = bar.querySelector(`[data-relic-id="${relicId}"]`);
    if (slot) {
        slot.classList.remove('triggered');
        void slot.offsetWidth; // 强制重绘
        slot.classList.add('triggered');
        setTimeout(() => slot.classList.remove('triggered'), 500);
    }
}

// === 遗物获得演出系统 ===
function showRelicAcquireAnimation(relic, tier = 'epic') {
    const overlay = document.getElementById('relicAcquireOverlay');
    const content = overlay.querySelector('.relic-acquire-content');
    const particles = overlay.querySelector('.acquire-particles');

    // 设置内容
    overlay.querySelector('.relic-acquire-icon').textContent = relic.icon;
    overlay.querySelector('.relic-acquire-icon').style.color = tier === 'legendary' ? '#ffd700' : '#ab47bc';

    const titleEl = overlay.querySelector('.relic-acquire-title');
    titleEl.textContent = tier === 'legendary' ? '⭐ 传奇遗物 ⭐' : '✨ 史诗遗物 ✨';
    titleEl.className = `relic-acquire-title ${tier}`;

    overlay.querySelector('.relic-acquire-name').textContent = relic.name;
    overlay.querySelector('.relic-acquire-desc').textContent = relic.desc;
    overlay.querySelector('.relic-acquire-playstyle').textContent = relic.playstyle ? `💡 适合: ${relic.playstyle}` : '';

    // 设置背景
    overlay.className = 'active';
    overlay.classList.add(tier === 'legendary' ? 'legendary-bg' : 'epic-bg');

    // 生成粒子
    particles.innerHTML = '';
    const particleCount = tier === 'legendary' ? 30 : 20;
    const particleColor = tier === 'legendary' ? '#ffd700' : '#ab47bc';
    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.className = 'acquire-particle';
        p.style.background = particleColor;
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 150 + Math.random() * 100;
        p.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        p.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
        p.style.animationDelay = `${Math.random() * 0.3}s`;
        particles.appendChild(p);
    }

    // 暂停游戏
    gameState.isPaused = true;

    // 屏幕震动
    gameState.screenShake = tier === 'legendary' ? 25 : 15;

    // 播放音效
    playSound('upgrade');

    // 触发时停
    gameState.hitStop = tier === 'legendary' ? 30 : 20;

    // 点击关闭
    const closeHandler = () => {
        overlay.classList.remove('active', 'legendary-bg', 'epic-bg');
        gameState.isPaused = false;
        overlay.removeEventListener('click', closeHandler);
    };

    // 延迟后才能点击关闭
    setTimeout(() => {
        overlay.addEventListener('click', closeHandler);
    }, 500);

    // 自动关闭（3秒）
    setTimeout(() => {
        if (overlay.classList.contains('active')) {
            closeHandler();
        }
    }, 3000);
}

// === 简化版遗物获得（普通/稀有） ===
function showSimpleRelicAcquire(relic) {
    // 短暂时停
    gameState.hitStop = 8;
    gameState.screenShake = 8;

    // 弹出动画
    spawnFloatingText(player.x, player.y - 80, relic.icon + ' ' + relic.name, '#ffd700', { size: 28, isCrit: true, life: 80 });

    // 光环粒子
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        particles.push({
            x: player.x, y: player.y,
            vx: Math.cos(angle) * 5,
            vy: Math.sin(angle) * 5,
            life: 30, color: '#ffd700', size: 4
        });
    }

    playSound('pickup');
}

// === 将遗物添加到已获得列表 ===
function addAcquiredRelic(relic, tier = 'epic') {
    const relicData = {
        ...relic,
        tier,
        acquiredAt: Date.now()
    };
    acquiredRelics.push(relicData);

    // 根据稀有度显示不同演出
    if (tier === 'legendary' || tier === 'epic') {
        showRelicAcquireAnimation(relic, tier);
    } else {
        showSimpleRelicAcquire(relic);
    }

    updateRelicBar();
}
