import { test } from 'node:test';
import assert from 'node:assert/strict';

import { statesAt } from '../src/index.js';

const timeline = {
    tickRate: 64,
    players: [{ slot: 0, team: 2 }, { slot: 1, team: 3 }],
    frames: [
        { tick: 0, players: [[0, 0, 0, 90, 500], null] },
        { tick: 64, players: [[640, -64, 0, 90, 450], [10, 10, 0, 0, 600]] }
    ],
    kills: [],
    casts: []
};

test('interpolates positions between sampled frames', () => {
    const [player] = statesAt(timeline, 32);

    assert.deepEqual([player.x, player.y], [320, -32]);
});

test('a player missing from the earlier frame stays hidden until sampled', () => {
    assert.equal(statesAt(timeline, 32)[1], null);
});

test('clamps ticks past the end of the match to the last frame', () => {
    const [player] = statesAt(timeline, 10_000);

    assert.deepEqual([player.x, player.y], [640, -64]);
});
