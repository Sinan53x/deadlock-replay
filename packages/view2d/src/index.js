const TEAM_COLORS = { 2: '#f2a93b', 3: '#4f8cff' };
const WORLD_EXTENT = 11_500;

/**
 * Interpolated player states at an arbitrary tick, so playback stays smooth between sampled frames.
 *
 * @param {import('@deadlock-replay/parser').Timeline} timeline
 * @param {number} tick
 * @returns {({ x: number, y: number, yaw: number, health: number } | null)[]}
 */
export function statesAt(timeline, tick) {
    const { frames } = timeline;
    const index = Math.max(0, Math.min(frames.length - 2, upperBound(frames, tick) - 1));
    const a = frames[index];
    const b = frames[index + 1];
    const t = Math.max(0, Math.min(1, (tick - a.tick) / (b.tick - a.tick)));

    return a.players.map((from, slot) => {
        const to = b.players[slot];

        if (from === null) return null;
        if (to === null) return { x: from[0], y: from[1], yaw: from[3], health: from[4] };

        return {
            x: from[0] + (to[0] - from[0]) * t,
            y: from[1] + (to[1] - from[1]) * t,
            yaw: from[3],
            health: from[4]
        };
    });
}

/**
 * Every position the match visited, drawn faintly. Without shipping Valve's map art, this traces the lanes.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('@deadlock-replay/parser').Timeline} timeline
 */
export function drawFootprint(ctx, timeline) {
    const project = projector(ctx.canvas);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';

    for (const frame of timeline.frames) {
        for (const state of frame.players) {
            if (state === null) continue;

            const [px, py] = project(state[0], state[1]);

            ctx.fillRect(px, py, 2, 2);
        }
    }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('@deadlock-replay/parser').Timeline} timeline
 * @param {number} tick
 * @param {{ footprint?: CanvasImageSource, killWindow?: number }} [options]
 */
export function drawFrame(ctx, timeline, tick, { footprint, killWindow = timeline.tickRate * 4 } = {}) {
    const { width, height } = ctx.canvas;
    const project = projector(ctx.canvas);

    ctx.clearRect(0, 0, width, height);

    if (footprint) ctx.drawImage(footprint, 0, 0, width, height);

    for (const kill of timeline.kills) {
        const age = tick - kill.tick;

        if (age < 0 || age > killWindow) continue;

        const victim = statesAt(timeline, kill.tick)[kill.victim];

        if (victim === null) continue;

        const [px, py] = project(victim.x, victim.y);

        ctx.strokeStyle = `rgba(255, 70, 70, ${1 - age / killWindow})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - 7, py - 7);
        ctx.lineTo(px + 7, py + 7);
        ctx.moveTo(px + 7, py - 7);
        ctx.lineTo(px - 7, py + 7);
        ctx.stroke();
    }

    statesAt(timeline, tick).forEach((state, slot) => {
        if (state === null || state.health <= 0) return;

        const [px, py] = project(state.x, state.y);
        const yaw = (state.yaw * Math.PI) / 180;

        ctx.fillStyle = TEAM_COLORS[timeline.players[slot].team] ?? '#ccc';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(yaw) * 12, py - Math.sin(yaw) * 12);
        ctx.stroke();
    });
}

// World units to canvas pixels, +y pointing up the screen.
function projector(canvas) {
    const scale = Math.min(canvas.width, canvas.height) / (WORLD_EXTENT * 2);

    return (x, y) => [canvas.width / 2 + x * scale, canvas.height / 2 - y * scale];
}

function upperBound(frames, tick) {
    let lo = 0;
    let hi = frames.length;

    while (lo < hi) {
        const mid = (lo + hi) >> 1;

        if (frames[mid].tick <= tick) lo = mid + 1;
        else hi = mid;
    }

    return lo;
}
