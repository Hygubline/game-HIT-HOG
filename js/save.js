// === 存档系统 ===
const defaultSaveData = {
    currency: 0, totalKills: 0, totalBossKills: 0, highScore: 0, gamesPlayed: 0,
    permUpgrades: { maxHp: 0, atkBonus: 0, speedBonus: 0, cdBonus: 0 },
    achievements: {}, maxCombo: 0,
    maxChain: 0,
    maxSurvivalTime: 0,
    totalCurrency: 0,
    perfectBossKills: 0,
    maxNoHitTime: 0,
    ownsMaserati: false,
    tutorialCompleted: false,
    maxWeaponsUsed: 0
};

const defaultOutGameProgress = {
    bones: 0,
    goldDogTags: 0,
    purchasedUpgrades: {},
    unlockedContent: {},
    claimedMilestones: {},
    claimedBossRewards: {},
    claimedMetaRewards: {},
    claimedAchievementRewards: {},
    lastRunRewards: { bones: 0, goldDogTags: 0, breakdown: [] }
};

let saveData = JSON.parse(JSON.stringify(defaultSaveData));
let outGameProgress = JSON.parse(JSON.stringify(defaultOutGameProgress));
let metaProgress = outGameProgress;

function syncLegacyProgressFields() {
    saveData.currency = outGameProgress.bones;
    saveData.totalCurrency = Math.max(saveData.totalCurrency || 0, outGameProgress.bones);
    saveData.permUpgrades = saveData.permUpgrades || {};
}

function saveGame() {
    syncLegacyProgressFields();
    try {
        localStorage.setItem('dogGame_save', JSON.stringify({
            ...saveData,
            outGameProgress
        }));
    } catch (e) {}
}

function loadGame() {
    try {
        const data = localStorage.getItem('dogGame_save');
        if (!data) {
            updateCurrencyDisplay();
            return;
        }
        const parsed = JSON.parse(data);
        saveData = { ...defaultSaveData, ...parsed };
        outGameProgress = {
            ...defaultOutGameProgress,
            ...(parsed.outGameProgress || {})
        };
        if (!parsed.outGameProgress) {
            outGameProgress.bones = saveData.currency || 0;
            outGameProgress.purchasedUpgrades = { ...(outGameProgress.purchasedUpgrades || {}) };
            outGameProgress.unlockedContent = { ...(outGameProgress.unlockedContent || {}) };
        }
        metaProgress = outGameProgress;
        syncLegacyProgressFields();
        updateCurrencyDisplay();
    } catch (e) {}
}

// === SUPABASE LEADERBOARD ===
const SUPABASE_URL = 'https://nfbgzrxtzwlbjffsjjci.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYmd6cnh0endsYmpmZnNqamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjQwNDIsImV4cCI6MjA4OTYwMDA0Mn0.PXOvmsx1B9ipCsEs8eCwpm5xf1TIiz1V7H0KBa_F0s8';

let supabase = null;
let currentLbMode = 'speed';

function initSupabase() {
    try {
        const sb = window.supabase;
        let createFn = null;

        // Try different ways to access createClient
        if (sb) {
            if (typeof sb.createClient === 'function') {
                createFn = sb.createClient;
            } else if (sb.default && typeof sb.default.createClient === 'function') {
                createFn = sb.default.createClient;
            } else if (typeof sb === 'function') {
                createFn = sb;
            }
        }

        if (createFn) {
            supabase = createFn(SUPABASE_URL, SUPABASE_KEY);
            console.log('Supabase initialized successfully');
        } else {
            console.warn('Supabase createClient not found');
        }
    } catch (e) {
        console.error('Supabase init error:', e);
        supabase = null;
    }
}

async function submitScore() {
    if (!supabase) {
        showSubmitStatus('排行榜未配置', 'error');
        return;
    }

    const nameInput = document.getElementById('playerName');
    const name = (nameInput.value.trim() || '无名狗').substring(0, 12);
    const btn = document.getElementById('submitBtn');
    const newScore = gameState.score;

    // 检查分数是否有效
    if (newScore <= 0) {
        showSubmitStatus('分数无效', 'error');
        return;
    }

    btn.disabled = true;
    showSubmitStatus('提交中... (模式: ' + (selectedMode === 'endless' ? '无尽' : '速战') + ')', '');

    try {
        const modeName = selectedMode === 'endless' ? '无尽模式' : '速战模式';
        const survivalTime = selectedMode === 'endless' ? gameStats.survivalTime : Math.max(0, 60 - gameState.time);

        // 先检查是否有旧记录
        const { data: existing } = await supabase
            .from('leaderboard_scores')
            .select('id, score')
            .eq('name', name)
            .eq('mode', selectedMode);

        let oldScore = 0;

        // 删除所有同名同模式的旧记录
        if (existing && existing.length > 0) {
            oldScore = Math.max(...existing.map(e => e.score));

            // 如果新分数没有超越，不提交
            if (newScore <= oldScore) {
                showSubmitStatus(`未超越记录 (最高: ${formatScore(oldScore)})`, 'error');
                btn.disabled = false;
                return;
            }

            // 删除所有旧记录
            for (const record of existing) {
                await supabase
                    .from('leaderboard_scores')
                    .delete()
                    .eq('id', record.id);
            }
        }

        // 插入新记录
        const { error } = await supabase.from('leaderboard_scores').insert({
            name: name,
            mode: selectedMode,
            score: newScore,
            kills: gameStats.killCount,
            max_combo: gameStats.maxCombo,
            survival_time: survivalTime
        });

        if (error) throw error;

        if (oldScore > 0) {
            showSubmitStatus(`新纪录! ${formatScore(oldScore)} → ${formatScore(newScore)} (${modeName}) 🎉`, 'success');
        } else {
            showSubmitStatus(`提交成功! ${formatScore(newScore)}分 (${modeName}) 🎉`, 'success');
        }

        // 刷新排行榜缓存
        setTimeout(() => loadLeaderboard(selectedMode), 1000);

        // Save name for next time
        try { localStorage.setItem('dogGame_playerName', name); } catch(e) {}
    } catch (e) {
        console.error('Submit error:', e);
        showSubmitStatus('提交失败: ' + (e.message || '网络错误') + ' - 请重试', 'error');
        btn.disabled = false;
    }
}

// 调试：检查提交状态
function debugLeaderboard() {
    console.log('Selected Mode:', selectedMode);
    console.log('Current Score:', gameState.score);
    console.log('Supabase configured:', !!supabase);
}

function showSubmitStatus(msg, type) {
    const el = document.getElementById('submitStatus');
    el.textContent = msg;
    el.className = type;
}

async function loadLeaderboard(mode) {
    currentLbMode = mode;
    const content = document.getElementById('lbContent');
    content.innerHTML = '<div class="lb-loading">加载中...</div>';

    // Update tab UI
    document.querySelectorAll('.lb-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    if (!supabase) {
        content.innerHTML = '<div class="lb-empty">排行榜未配置<br><small>请设置 Supabase 凭据</small></div>';
        return;
    }

    try {
        // 获取排行榜数据（强制刷新，不使用缓存）
        const { data, error } = await supabase
            .from('leaderboard_scores')
            .select('name, score, kills, max_combo, survival_time, created_at')
            .eq('mode', mode)
            .order('score', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (!data || data.length === 0) {
            content.innerHTML = '<div class="lb-empty">暂无记录<br><small>成为第一个上榜的玩家!</small></div>';
            return;
        }

        // 获取当前玩家昵称
        let playerName = '';
        try { playerName = localStorage.getItem('dogGame_playerName') || ''; } catch(e) {}

        content.innerHTML = data.map((row, i) => {
            const isPlayer = playerName && row.name === playerName;
            return `
            <div class="lb-row ${isPlayer ? 'is-player' : ''}">
                <div class="lb-rank">${i + 1}</div>
                <div class="lb-name">${escapeHtml(row.name)}${isPlayer ? ' ⭐' : ''}</div>
                <div class="lb-score">${formatScore(row.score)}</div>
                <div class="lb-kills">${row.kills}</div>
                <div class="lb-combo">${row.max_combo}</div>
                <div class="lb-time">${row.survival_time}s</div>
            </div>
        `}).join('');
    } catch (e) {
        console.error('Load leaderboard error:', e);
        content.innerHTML = '<div class="lb-empty">加载失败<br><small>' + (e.message || '网络错误') + '</small></div>';
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatScore(score) {
    if (score === null || score === undefined || isNaN(score)) return '0';
    return Number(score).toLocaleString();
}

function showLeaderboard() {
    document.getElementById('leaderboardScreen').style.display = 'flex';
    loadLeaderboard(currentLbMode);
}

function hideLeaderboard() {
    document.getElementById('leaderboardScreen').style.display = 'none';
}

function updateCurrencyDisplay() {
    normalizeOutGameProgress();
    const el = document.getElementById('totalCurrency');
    const goldEl = document.getElementById('totalGoldDogTags');
    if (el) el.textContent = outGameProgress.bones;
    if (goldEl) goldEl.textContent = outGameProgress.goldDogTags;
    // Update menu stats
    const highScore = document.getElementById('menuHighScore');
    const gamesPlayed = document.getElementById('menuGamesPlayed');
    const totalKills = document.getElementById('menuTotalKills');
    if (highScore) highScore.textContent = saveData.highScore || 0;
    if (gamesPlayed) gamesPlayed.textContent = saveData.gamesPlayed || 0;
    if (totalKills) totalKills.textContent = saveData.totalKills || 0;
}
