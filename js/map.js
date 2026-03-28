// 地图
const mapThemes = [
    { name: '村庄广场', bgImage: 'newmap', bgTop: '#3d5a27', bgBottom: '#2d4a17', ground: '#5a7a47', groundLine: '#8b7355', decorColor: 'rgba(139,115,85,0.1)' }
];
let currentMap = 0;

// === 世界和摄像机系统 ===
const world = {
    width: 2700,   // 世界宽度（地图放大3倍）
    height: 1500   // 世界高度
};

const camera = {
    x: 0,
    y: 0,
    smoothing: 0.08,  // 摄像机平滑跟随系数

    // 更新摄像机位置（跟随玩家）
    update() {
        // 目标位置：玩家在屏幕中心
        const targetX = player.x - canvas.width / 2;
        const targetY = player.y - canvas.height / 2;

        // 平滑跟随
        this.x += (targetX - this.x) * this.smoothing;
        this.y += (targetY - this.y) * this.smoothing;

        // 限制摄像机边界
        this.x = Math.max(0, Math.min(world.width - canvas.width, this.x));
        this.y = Math.max(0, Math.min(world.height - canvas.height, this.y));
    },

    // 世界坐标转屏幕坐标
    worldToScreen(wx, wy) {
        return { x: wx - this.x, y: wy - this.y };
    },

    // 屏幕坐标转世界坐标
    screenToWorld(sx, sy) {
        return { x: sx + this.x, y: sy + this.y };
    },

    // 检查对象是否在屏幕可见范围内
    isVisible(x, y, margin = 100) {
        return x > this.x - margin && x < this.x + canvas.width + margin &&
               y > this.y - margin && y < this.y + canvas.height + margin;
    }
};

// === 地图碰撞系统 ===
// 碰撞体积定义（像素坐标，基于1800x1000世界尺寸）
// 根据草图设计：红色=不可通行，黄色=建筑，蓝色=池塘
const mapColliders = {
    0: [] // 无碰撞体积
};

// 碰撞检测函数（使用世界像素坐标）
function checkMapCollision(x, y, radius = 20) {
    const colliders = mapColliders[currentMap];
    if (!colliders) return null;

    for (const col of colliders) {
        if (col.type === 'circle') {
            const dist = Math.sqrt((x - col.x) ** 2 + (y - col.y) ** 2);
            if (dist < col.r + radius) {
                const pushDist = dist || 1;
                return { collider: col, pushX: (x - col.x) / pushDist, pushY: (y - col.y) / pushDist, overlap: col.r + radius - dist };
            }
        } else if (col.type === 'ellipse') {
            const nx = (x - col.x) / col.rx;
            const ny = (y - col.y) / col.ry;
            const dist = Math.sqrt(nx * nx + ny * ny);
            if (dist < 1 + radius / Math.min(col.rx, col.ry)) {
                const angle = Math.atan2(y - col.y, x - col.x);
                return { collider: col, pushX: Math.cos(angle), pushY: Math.sin(angle), overlap: (1 - dist) * Math.min(col.rx, col.ry) + radius };
            }
        } else if (col.type === 'rect') {
            const closestX = Math.max(col.x, Math.min(x, col.x + col.w));
            const closestY = Math.max(col.y, Math.min(y, col.y + col.h));
            const dist = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
            if (dist < radius) {
                let pushX = 0, pushY = 0;
                if (dist > 0) {
                    pushX = (x - closestX) / dist;
                    pushY = (y - closestY) / dist;
                } else {
                    const toLeft = x - col.x, toRight = col.x + col.w - x;
                    const toTop = y - col.y, toBottom = col.y + col.h - y;
                    const minDist = Math.min(toLeft, toRight, toTop, toBottom);
                    if (minDist === toLeft) pushX = -1;
                    else if (minDist === toRight) pushX = 1;
                    else if (minDist === toTop) pushY = -1;
                    else pushY = 1;
                }
                return { collider: col, pushX, pushY, overlap: radius - dist };
            }
        }
    }
    return null;
}

// 应用碰撞推出
function applyMapCollision(entity, radius = 20) {
    const collision = checkMapCollision(entity.x, entity.y, radius);
    if (collision) {
        const pushStrength = collision.overlap + 1;
        entity.x += collision.pushX * pushStrength;
        entity.y += collision.pushY * pushStrength;
        return true;
    }
    return false;
}

// 获取安全的随机位置（避开碰撞区域，基于玩家周围）
function getSafeRandomPosition(margin = 60, radius = 15, maxTries = 10) {
    for (let i = 0; i < maxTries; i++) {
        // 在玩家周围生成
        const x = player.x + (Math.random() - 0.5) * canvas.width;
        const y = player.y + (Math.random() - 0.5) * canvas.height;
        // 确保在世界边界内
        const clampedX = Math.max(margin, Math.min(world.width - margin, x));
        const clampedY = Math.max(margin, Math.min(world.height - margin, y));
        if (!checkMapCollision(clampedX, clampedY, radius)) {
            return { x: clampedX, y: clampedY };
        }
    }
    // 如果多次尝试都失败，返回世界中心附近
    return { x: world.width / 2 + (Math.random() - 0.5) * 100, y: world.height / 2 + (Math.random() - 0.5) * 100 };
}
