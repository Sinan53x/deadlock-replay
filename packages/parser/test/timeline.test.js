import { createReadStream, existsSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseTimeline } from '../src/index.js';

// Match 100576005, build 6679. Fetch with fixtures/fetch.sh (349 MB, not committed).
const FIXTURE = new URL('../../../fixtures/100576005-6679.dem', import.meta.url);
// Lanes span about ±9.3k units on X; the two bases sit near ±11k on Y.
const MAP_BOUND = 12_000;

test('match 100576005 parses into a playable timeline', { skip: !existsSync(FIXTURE) && 'fixture missing, run fixtures/fetch.sh' }, async () => {
    const timeline = await parseTimeline(createReadStream(FIXTURE));

    assert.equal(timeline.tickRate, 64);
    assert.equal(timeline.players.length, 12);
    assert.deepEqual(
        timeline.players.map((player) => player.team).sort(),
        [2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3]
    );

    const states = timeline.frames.flatMap((frame) => frame.players).filter(Boolean);

    assert.ok(timeline.frames.length > 3000);
    assert.ok(states.every(([x, y]) => Math.abs(x) < MAP_BOUND && Math.abs(y) < MAP_BOUND), 'position outside the map');

    // The two bases mirror each other across y = 0, so each team's spawn average lands on opposite sides.
    const spawnY = (team) => {
        const first = timeline.frames.find((frame) => frame.players.every(Boolean));
        const ys = timeline.players.filter((player) => player.team === team).map((player) => first.players[player.slot][1]);

        return ys.reduce((sum, y) => sum + y, 0) / ys.length;
    };

    assert.ok(Math.sign(spawnY(2)) === -Math.sign(spawnY(3)), 'teams do not spawn on opposite sides');

    assert.equal(timeline.kills.length, 82);
    assert.ok(timeline.kills.every(({ victim, attacker }) =>
        attacker === null || attacker === victim || timeline.players[attacker].team !== timeline.players[victim].team
    ), 'teamkill in kill feed');
    assert.ok(timeline.casts.length > 0);
});
