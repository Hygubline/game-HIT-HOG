const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let gamePhase = 'menu';
const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 800;

// ==================== 音效系统 ====================
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        // 添加滤波器让声音更柔和
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, audioCtx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        switch(type) {
            case 'kick': // 踢击 - 柔和的低音
                osc.type = 'sine';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
                break;
            case 'slash': // 剑气 - 柔和的挥砍音
                osc.type = 'triangle';
                filter.frequency.setValueAtTime(1500, now);
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
                break;
            case 'sajiao': // 撒娇 - 可爱柔和上升音
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);
                osc.frequency.exponentialRampToValueAtTime(700, now + 0.25);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
                break;
            case 'dash': // 冲刺 - 柔和的风声
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.06);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
                osc.start(now); osc.stop(now + 0.06);
                break;
            case 'maserati': { // 玛莎拉蒂发动机 - 柔和低沉
                osc.type = 'sine';
                filter.frequency.setValueAtTime(200, now);
                osc.frequency.setValueAtTime(50, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.setValueAtTime(0.15, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc.start(now); osc.stop(now + 0.35);
                break;
            }
            case 'hit': // 受伤 - 柔和提示音
                osc.type = 'sine';
                filter.frequency.setValueAtTime(800, now);
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.setValueAtTime(120, now + 0.08);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now); osc.stop(now + 0.12);
                break;
            case 'kill': // 击杀 - 柔和的确认音
                osc.type = 'sine';
                osc.frequency.setValueAtTime(90, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
                break;
            case 'combo': // 连击 - 柔和上升音
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400 + Math.min(gameState.combo * 30, 300), now);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
                break;
            case 'boss': // Boss出场 - 低沉警示
                osc.type = 'sine';
                filter.frequency.setValueAtTime(500, now);
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.setValueAtTime(200, now + 0.2);
                osc.frequency.setValueAtTime(150, now + 0.4);
                osc.frequency.setValueAtTime(200, now + 0.6);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.setValueAtTime(0.1, now + 0.6);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
                osc.start(now); osc.stop(now + 0.7);
                break;
            case 'upgrade': // 升级 - 清脆和弦
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523, now); // C5
                osc.frequency.setValueAtTime(659, now + 0.1); // E5
                osc.frequency.setValueAtTime(784, now + 0.2); // G5
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc.start(now); osc.stop(now + 0.35);
                break;
            case 'gameover': // 游戏结束 - 柔和下降
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now); osc.stop(now + 0.5);
                break;
            case 'jump': // 跳跃 - 轻快
                osc.type = 'sine';
                osc.frequency.setValueAtTime(250, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
                break;
            case 'pickup': // 拾取道具 - 清脆
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.setValueAtTime(650, now + 0.04);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
                break;
            case 'impact': // 重击音 - 柔和低音
                osc.type = 'sine';
                filter.frequency.setValueAtTime(300, now);
                osc.frequency.setValueAtTime(70, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
                break;
            case 'execution': // 处决音 - 柔和有力
                osc.type = 'sine';
                filter.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
                break;
            case 'chain': // 连锁音 - 柔和上升
                osc.type = 'sine';
                osc.frequency.setValueAtTime(350, now);
                osc.frequency.exponentialRampToValueAtTime(550, now + 0.06);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
                break;
            case 'gem': // 经验宝石收集音 - 轻柔叮当
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600 + Math.random() * 200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
                osc.start(now); osc.stop(now + 0.06);
                break;
            case 'levelup': // 升级音 - 悦耳和弦
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(554, now + 0.1);
                osc.frequency.setValueAtTime(659, now + 0.2);
                osc.frequency.setValueAtTime(880, now + 0.3);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
                osc.start(now); osc.stop(now + 0.45);
                break;
            case 'chest': // 宝箱音 - 神秘音效
                osc.type = 'sine';
                osc.frequency.setValueAtTime(350, now);
                osc.frequency.setValueAtTime(450, now + 0.1);
                osc.frequency.setValueAtTime(550, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
                break;
            case 'shoot': // 射击音 - 柔和嗖声
                osc.type = 'sine';
                filter.frequency.setValueAtTime(1000, now);
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now); osc.stop(now + 0.05);
                break;
            case 'knife': // 飞刀投掷 - 轻快嗖声
                osc.type = 'triangle';
                filter.frequency.setValueAtTime(1500, now);
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
                osc.start(now); osc.stop(now + 0.04);
                break;
            case 'fireball': // 火球发射 - 柔和低音
                osc.type = 'sine';
                filter.frequency.setValueAtTime(500, now);
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now); osc.stop(now + 0.12);
                break;
            case 'lightning': // 闪电劈击 - 柔和电击
                osc.type = 'sine';
                filter.frequency.setValueAtTime(1200, now);
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.setValueAtTime(200, now + 0.03);
                osc.frequency.setValueAtTime(600, now + 0.05);
                osc.frequency.setValueAtTime(150, now + 0.08);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
                break;
            case 'frost': // 冰锥 - 清脆柔和
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1000, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
                break;
            case 'boomerang': // 回旋骨头 - 柔和旋转
                osc.type = 'sine';
                osc.frequency.setValueAtTime(250, now);
                osc.frequency.setValueAtTime(320, now + 0.04);
                osc.frequency.setValueAtTime(280, now + 0.08);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
                break;
            case 'danger': // 危险警报 - 柔和提示
                osc.type = 'sine';
                filter.frequency.setValueAtTime(600, now);
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.setValueAtTime(250, now + 0.12);
                osc.frequency.setValueAtTime(300, now + 0.24);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.setValueAtTime(0.1, now + 0.24);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
                break;
            case 'run': // 跑步脚步声 - 轻柔
                osc.type = 'sine';
                filter.frequency.setValueAtTime(300, now);
                osc.frequency.setValueAtTime(60 + Math.random() * 15, now);
                gain.gain.setValueAtTime(0.02, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
                osc.start(now); osc.stop(now + 0.03);
                break;
            case 'death': // 死亡倒地音 - 柔和下降
                osc.type = 'sine';
                filter.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
                break;
            case 'explosion': // 爆炸音 - 柔和
                osc.type = 'sine';
                filter.frequency.setValueAtTime(300, now);
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
                break;
        }
    } catch(e) {}
}

// 点击页面时初始化音频
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('touchstart', initAudio, { once: true });

// === 背景音乐系统 ===
let bgmEnabled = true;
let bgmGainNode = null;
let bgmOscillators = [];

function startBGM() {
    if (!audioCtx || !bgmEnabled || bgmOscillators.length > 0) return;

    // 创建主增益节点 - 降低整体音量
    bgmGainNode = audioCtx.createGain();
    bgmGainNode.gain.setValueAtTime(0.03, audioCtx.currentTime); // 降低音量

    // 添加低通滤波器让声音更柔和
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, audioCtx.currentTime);
    filter.Q.setValueAtTime(0.5, audioCtx.currentTime);

    bgmGainNode.connect(filter);
    filter.connect(audioCtx.destination);

    // 柔和的环境音乐 - 使用纯正弦波
    const notes = [55.00, 82.41, 110.00]; // A1, E2, A2 (简单五度音程，更和谐)
    const now = audioCtx.currentTime;

    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine'; // 全部使用正弦波，更柔和

        osc.frequency.setValueAtTime(freq, now);

        // 更缓慢的LFO，轻微调制
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.setValueAtTime(0.05 + i * 0.02, now); // 更慢的调制
        lfoGain.gain.setValueAtTime(freq * 0.008, now); // 更轻微的调制幅度
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        // 音量渐变，更自然
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08 - i * 0.02, now + 2); // 2秒淡入

        osc.connect(gain);
        gain.connect(bgmGainNode);
        osc.start();

        bgmOscillators.push({ osc, gain, lfo, lfoGain, filter });
    });
}

function stopBGM() {
    bgmOscillators.forEach(({ osc, lfo }) => {
        try { osc.stop(); lfo.stop(); } catch(e) {}
    });
    bgmOscillators = [];
}

function toggleBGM() {
    bgmEnabled = !bgmEnabled;
    if (bgmEnabled) startBGM();
    else stopBGM();
}

// === 受击视觉反馈 ===
let damageVignetteAlpha = 0;

function triggerDamageVignette() {
    damageVignetteAlpha = 0.6;
}

function updateDamageVignette() {
    if (damageVignetteAlpha > 0) {
        damageVignetteAlpha -= 0.05;
    }
}

function renderDamageVignette(ctx) {
    if (damageVignetteAlpha <= 0) return;

    ctx.save();
    const gradient = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, canvas.height * 0.3,
        canvas.width/2, canvas.height/2, canvas.height * 0.8
    );
    gradient.addColorStop(0, 'rgba(255,0,0,0)');
    gradient.addColorStop(1, `rgba(180,0,0,${damageVignetteAlpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// 图片