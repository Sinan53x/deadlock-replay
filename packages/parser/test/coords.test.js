import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cellToWorld } from '../src/index.js';

// Consecutive samples of one pawn in match 100576005, 8 ticks apart, crossing cell boundaries.
// A wrong cell size shows up as a jump of hundreds of units at each crossing.
const TRACK = [
    [32, 988.0],
    [34, 40.9],
    [34, 1012.8],
    [36, 52.8]
];

test('positions stay continuous across cell boundaries', () => {
    const xs = TRACK.map(([cell, offset]) => cellToWorld(cell, offset));

    assert.ok(Math.abs(xs[1] - xs[0]) < 100, `jump of ${xs[1] - xs[0]}`);
    assert.ok(Math.abs(xs[3] - xs[2]) < 100, `jump of ${xs[3] - xs[2]}`);
});

