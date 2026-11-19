import { drawFootprint, drawFrame } from '@deadlock-replay/view2d';

const MATCH_ID = '100576005';

const canvas = document.querySelector('#map');
const ctx = canvas.getContext('2d');
const scrub = document.querySelector('#scrub');
const clock = document.querySelector('#clock');
const playButton = document.querySelector('#play');
const speed = document.querySelector('#speed');

const timeline = await (await fetch(`${import.meta.env.BASE_URL}sample/${MATCH_ID}.json`)).json();

document.querySelector('#match').textContent = `match ${MATCH_ID} · ${timeline.players.length} players · ${timeline.kills.length} kills`;

const footprint = new OffscreenCanvas(canvas.width, canvas.height);
drawFootprint(footprint.getContext('2d'), timeline);

const firstTick = timeline.frames[0].tick;
scrub.min = firstTick;
scrub.max = timeline.lastTick;

let playing = false;
let tick;
let lastTime = 0;

const formatTick = (value) => {
    const seconds = Math.floor((value - firstTick) / timeline.tickRate);

    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

function render() {
    drawFrame(ctx, timeline, tick, { footprint });
    scrub.value = tick;
    clock.textContent = formatTick(tick);
}

function loop(time) {
    if (playing) {
        tick = Math.min(timeline.lastTick, tick + ((time - lastTime) / 1000) * timeline.tickRate * Number(speed.value));
        if (tick >= timeline.lastTick) setPlaying(false);
        render();
    }

    lastTime = time;
    requestAnimationFrame(loop);
}

// Shareable moments: ?t=14:32 opens the replay paused at that match time.
function tickFromUrl() {
    const match = /^(\d+):(\d{2})$/.exec(new URLSearchParams(location.search).get('t') ?? '');

    return match ? firstTick + (Number(match[1]) * 60 + Number(match[2])) * timeline.tickRate : firstTick;
}

function syncUrl() {
    const url = new URL(location.href);

    url.searchParams.set('t', formatTick(tick));
    history.replaceState(null, '', url);
}

function setPlaying(value) {
    playing = value;
    if (!playing) syncUrl();
    playButton.textContent = playing ? '❚❚' : '▶';
    playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}

function seek(value) {
    tick = value;
    render();
    if (!playing) syncUrl();
}

playButton.addEventListener('click', () => setPlaying(!playing));
scrub.addEventListener('input', () => seek(Number(scrub.value)));
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault();
        setPlaying(!playing);
    }
});

const kills = document.querySelector('#kills');

for (const kill of timeline.kills) {
    const victim = timeline.players[kill.victim];
    const attacker = kill.attacker === null ? null : timeline.players[kill.attacker];
    const item = document.createElement('li');
    const button = document.createElement('button');

    button.innerHTML = `<time>${formatTick(kill.tick)}</time>`
        + (attacker ? `<span class="t${attacker.team}">hero ${attacker.heroId}</span> → ` : '')
        + `<span class="t${victim.team}">hero ${victim.heroId}</span>`;
    // Jump a few seconds early so the fight leading up to the kill is visible.
    button.addEventListener('click', () => seek(Math.max(firstTick, kill.tick - timeline.tickRate * 3)));
    item.append(button);
    kills.append(item);
}

tick = Math.min(timeline.lastTick, tickFromUrl());
render();
requestAnimationFrame(loop);
