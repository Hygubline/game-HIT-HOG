// === 玩家血条系统 ===
let maxPlayerLives = 20;
let lastDisplayedLives = 20;

function initPlayerHealthBar() {
    maxPlayerLives = gameState.lives;
    lastDisplayedLives = gameState.lives;
    updatePlayerHealthBar(false);
    buildHpSegments();
}

function buildHpSegments() {
    const container = document.getElementById('hpSegments');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < maxPlayerLives; i++) {
        const seg = document.createElement('div');
        seg.className = 'hp-segment';
        container.appendChild(seg);
    }
}

function updatePlayerHealthBar(animate = true) {
    const current = gameState.lives;
    const max = maxPlayerLives;
    const percent = Math.max(0, (current / max) * 100);

    // Update text
    document.getElementById('hpCurrent').textContent = current;
    document.getElementById('hpMax').textContent = max;
    document.getElementById('lives').textContent = current;

    // Update fill bar
    const fill = document.getElementById('hpFill');
    const chip = document.getElementById('hpChip');
    const hpText = document.querySelector('.hp-text');
    const hpBar = document.getElementById('playerHealthBar');

    fill.style.width = percent + '%';

    // Chip bar (delayed damage indicator)
    if (animate && current < lastDisplayedLives) {
        // Keep chip at old value briefly
        setTimeout(() => {
            chip.style.width = percent + '%';
        }, 200);
    } else {
        chip.style.width = percent + '%';
    }

    // Low health states
    fill.classList.remove('low', 'critical');
    hpText.classList.remove('low');
    hpBar.classList.remove('low-health');

    if (current <= 1) {
        fill.classList.add('critical');
        hpText.classList.add('low');
        hpBar.classList.add('low-health');
    } else if (current <= 2) {
        fill.classList.add('low');
        hpText.classList.add('low');
        hpBar.classList.add('low-health');
    }

    // Damage animation
    if (animate && current < lastDisplayedLives) {
        hpBar.classList.remove('damaged');
        void hpBar.offsetWidth; // Force reflow
        hpBar.classList.add('damaged');
    }

    lastDisplayedLives = current;
}

function showPlayerHealthBar() {
    document.getElementById('playerHealthBar').style.display = 'block';
}

function hidePlayerHealthBar() {
    document.getElementById('playerHealthBar').style.display = 'none';
}

function getSurvivalSeconds() {
    return selectedMode === 'endless' ? gameStats.survivalTime : Math.max(0, 60 - gameState.time);
}

function claimOneTimeMetaReward(id, goldDogTags, text, bucket = 'claimedMetaRewards') {
    if (!outGameProgress[bucket]) outGameProgress[bucket] = {};
    if (outGameProgress[bucket][id]) return null;
    outGameProgress[bucket][id] = true;
    return { goldDogTags, text };
}

function collectAchievementRewards() {
    normalizeOutGameProgress();
    let bones = 0;
    const breakdown = [];
    achievements.forEach(a => {
        if (!saveData.achievements[a.id] && a.check()) {
            saveData.achievements[a.id] = true;
            bones += a.reward;
            breakdown.push(`成就 ${a.name} +${a.reward}`);
        }
    });
    return { bones, breakdown };
}

function calculateRunRewards() {
    normalizeOutGameProgress();
    const survivalTime = getSurvivalSeconds();
    const endlessTierBones = selectedMode === 'endless'
        ? (survivalTime >= 480 ? 36 : survivalTime >= 300 ? 20 : survivalTime >= 180 ? 10 : 0)
        : 0;
    const survivalBones = Math.floor(survivalTime / 20) * 6 + endlessTierBones;
    const killBones = Math.floor(gameStats.killCount / 4) * 2;
    const bossBones = gameStats.bossKilled * (22 + (playerBuffs.extraBossBones || 0));
    const comboBones = Math.floor(gameStats.maxCombo / 8) * 6;
    const modeBones = selectedMode === 'endless'
        ? 12 + Math.floor(survivalTime / 90) * 4
        : selectedMode === 'wave' ? 14 : 8;
    const bonusBones = gameStats.bonusBones || 0;
    const achievementRewards = collectAchievementRewards();
    const boneMultiplier = 1 + ((outGameProgress.purchasedUpgrades.boneBroker || 0) * 0.06);
    const achievementBones = achievementRewards.bones;
    const rawBones = survivalBones + killBones + bossBones + comboBones + modeBones + bonusBones + achievementBones;
    const bones = Math.max(12, Math.floor(rawBones * boneMultiplier));

    const breakdown = [
        `存活补贴 +${survivalBones}`,
        `击杀奖金 +${killBones}`,
        `Boss酬劳 +${bossBones}`,
        `连击红包 +${comboBones}`,
        `模式津贴 +${modeBones}`
    ];
    if (endlessTierBones > 0) breakdown.push(`无尽台阶奖金 +${endlessTierBones}`);
    if (bonusBones > 0) breakdown.push(`额外补贴 +${bonusBones}`);
    if (achievementBones > 0) breakdown.push(`成就补贴 +${achievementBones}`);
    achievementRewards.breakdown.forEach(text => breakdown.push(text));
    if (boneMultiplier > 1) breakdown.push(`吃币高手 x${boneMultiplier.toFixed(2)}`);

    let goldDogTags = gameStats.bonusGoldTags || 0;
    if (gameStats.bonusGoldTags > 0) breakdown.push(`局内额外金狗牌 +${gameStats.bonusGoldTags}`);

    milestoneRewards.forEach(reward => {
        if (survivalTime >= reward.seconds && !outGameProgress.claimedMilestones[reward.id]) {
            outGameProgress.claimedMilestones[reward.id] = true;
            goldDogTags += reward.goldDogTags;
            breakdown.push(`${reward.name} +${reward.goldDogTags}金狗牌`);
        }
    });

    const metaRewards = [
        selectedMode === 'endless' && survivalTime >= 420 ? claimOneTimeMetaReward('endless_420', 2, '无尽活过7分钟') : null,
        gameStats.maxCombo >= 20 ? claimOneTimeMetaReward('combo_20', 1, '首次20连击') : null,
        gameState.lives >= maxPlayerLives && gameStats.bossKilled > 0 ? claimOneTimeMetaReward('perfect_boss', 2, '满血斩Boss') : null,
        selectedMode === 'wave' && waveState.current >= waveState.totalWaves ? claimOneTimeMetaReward('wave_clear', 3, '波次通关') : null
    ].filter(Boolean);

    metaRewards.forEach(reward => {
        goldDogTags += reward.goldDogTags;
        breakdown.push(`${reward.text} +${reward.goldDogTags}金狗牌`);
    });

    return {
        survivalBones,
        killBones,
        bossBones,
        comboBones,
        modeBones,
        bonusBones,
        achievementBones,
        boneMultiplier,
        bones,
        goldDogTags,
        breakdown
    };
}

function grantRunRewards() {
    const rewards = calculateRunRewards();
    outGameProgress.bones += rewards.bones;
    outGameProgress.goldDogTags += rewards.goldDogTags;
    outGameProgress.lastRunRewards = rewards;
    saveData.currency = outGameProgress.bones;
    saveData.totalCurrency += rewards.bones;
    saveGame();
    updateCurrencyDisplay();
    document.getElementById('earnedBones').textContent = rewards.bones;
    document.getElementById('earnedGoldTags').textContent = rewards.goldDogTags;
    document.getElementById('totalBonesAfterRun').textContent = outGameProgress.bones;
    document.getElementById('totalGoldTagsAfterRun').textContent = outGameProgress.goldDogTags;
    document.getElementById('rewardBreakdown').innerHTML = rewards.breakdown.map(text => `<div>${text}</div>`).join('');
    return rewards;
}

function earnCurrency() {
    const survivalTime = getSurvivalSeconds();
    saveData.totalKills += gameStats.killCount;
    saveData.totalBossKills += gameStats.bossKilled;
    saveData.gamesPlayed++;
    if (gameState.score > saveData.highScore) saveData.highScore = gameState.score;
    if (gameStats.maxCombo > saveData.maxCombo) saveData.maxCombo = gameStats.maxCombo;
    if (survivalTime > saveData.maxSurvivalTime) saveData.maxSurvivalTime = survivalTime;
    if (gameStats.noHitTimer > saveData.maxNoHitTime) saveData.maxNoHitTime = gameStats.noHitTimer;
    // 记录本局使用的武器数量
    const weaponsUsedCount = Object.keys(playerWeapons).length;
    if (weaponsUsedCount > saveData.maxWeaponsUsed) saveData.maxWeaponsUsed = weaponsUsedCount;
    grantRunRewards();
}
