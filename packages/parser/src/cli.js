#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { parseTimeline } from './timeline.js';

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        out: { type: 'string', short: 'o' },
        'sample-every': { type: 'string', default: '32' },
        anonymize: { type: 'boolean', default: false }
    }
});

const [demoPath] = positionals;

if (!demoPath) {
    console.error('usage: dr-timeline <match.dem> [-o timeline.json] [--sample-every 32] [--anonymize]');
    process.exit(1);
}

const started = performance.now();
const timeline = await parseTimeline(createReadStream(demoPath), { sampleEvery: Number(values['sample-every']) });

if (values.anonymize) {
    for (const player of timeline.players) player.name = `player ${player.slot + 1}`;
}

const json = JSON.stringify(timeline);

if (values.out) {
    await writeFile(values.out, json);
} else {
    process.stdout.write(json);
}

console.error(`${timeline.players.length} players, ${timeline.frames.length} frames, ${timeline.kills.length} kills, ${timeline.casts.length} casts in ${Math.round(performance.now() - started)} ms`);
