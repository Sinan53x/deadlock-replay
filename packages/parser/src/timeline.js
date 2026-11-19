import { EntityOperation, InterceptorStage, MessagePacketType, Parser, ParserConfiguration } from 'deadem';

import { cellToWorld, handleToIndex } from './coords.js';

const PAWN = 'CCitadelPlayerPawn';
const CONTROLLER = 'CCitadelPlayerController';
const PLAYER_TEAMS = new Set([2, 3]);

/**
 * @typedef {{ slot: number, name: string, heroId: number, team: number }} TimelinePlayer
 * @typedef {[x: number, y: number, z: number, yaw: number, health: number]} PlayerState
 * @typedef {{ tick: number, players: (PlayerState | null)[] }} Frame
 * @typedef {{ tick: number, victim: number, attacker: number | null, assisters: number[] }} Kill
 * @typedef {{ tick: number, caster: number, ability: string }} Cast
 * @typedef {{
 *   version: 1,
 *   tickRate: number,
 *   lastTick: number,
 *   sampleEvery: number,
 *   players: TimelinePlayer[],
 *   frames: Frame[],
 *   kills: Kill[],
 *   casts: Cast[]
 * }} Timeline
 */

/**
 * Parses a Deadlock .dem stream into a timeline that both the 2D and 3D views render from.
 *
 * @param {import('node:stream').Readable | ReadableStream} readable
 * @param {{ sampleEvery?: number }} [options] keep one frame every N ticks
 * @returns {Promise<Timeline>}
 */
export async function parseTimeline(readable, { sampleEvery = 32 } = {}) {
    const parser = new Parser(new ParserConfiguration({
        messagePacketTypes: [
            MessagePacketType.SVC_PACKET_ENTITIES,
            MessagePacketType.CITADEL_USER_MESSAGE_HERO_KILLED,
            MessagePacketType.CITADEL_USER_MESSAGE_IMPORTANT_ABILITY_USED
        ]
    }));

    const controllers = new Map(); // controller entity index -> controller entity
    const pawns = new Map();       // pawn entity index -> pawn entity
    const frames = [];
    const kills = [];
    const casts = [];
    let lastTick = 0;
    let nextSample = 0;

    parser.registerPostInterceptor(InterceptorStage.ENTITY_PACKET, (demoPacket, messagePacket, events) => {
        for (const { entity, operation } of events) {
            const map = entity.class.name === PAWN ? pawns : entity.class.name === CONTROLLER ? controllers : null;

            if (map === null) continue;

            if (operation === EntityOperation.DELETE) {
                map.delete(entity.index);
            } else {
                map.set(entity.index, entity);
            }
        }

        lastTick = demoPacket.tick;

        if (demoPacket.tick >= nextSample) {
            nextSample = demoPacket.tick + sampleEvery;
            frames.push({ tick: demoPacket.tick, states: snapshotPawns(pawns) });
        }
    });

    parser.registerPostInterceptor(InterceptorStage.MESSAGE_PACKET, (demoPacket, messagePacket) => {
        const { data } = messagePacket;

        if (messagePacket.type === MessagePacketType.CITADEL_USER_MESSAGE_HERO_KILLED) {
            kills.push({
                tick: demoPacket.tick,
                victim: data.entindexVictim,
                attacker: data.entindexAttacker ?? null,
                assisters: data.entindexAssisters ?? []
            });
        } else if (messagePacket.type === MessagePacketType.CITADEL_USER_MESSAGE_IMPORTANT_ABILITY_USED) {
            casts.push({ tick: demoPacket.tick, caster: handleToIndex(data.caster), ability: data.abilityName });
        }
    });

    await parser.parse(readable);

    const tickRate = Math.round(1 / parser.getDemo().server.tickInterval);

    await parser.dispose();

    return buildTimeline({ controllers, frames, kills, casts, lastTick, sampleEvery, tickRate });
}

function snapshotPawns(pawns) {
    const states = new Map();

    for (const [index, pawn] of pawns) {
        const health = pawn.getField('m_iHealth');
        const cellX = pawn.getField('CBodyComponent.m_cellX');

        if (cellX === undefined) continue;

        states.set(index, [
            round(cellToWorld(cellX, pawn.getField('CBodyComponent.m_vecX'))),
            round(cellToWorld(pawn.getField('CBodyComponent.m_cellY'), pawn.getField('CBodyComponent.m_vecY'))),
            round(cellToWorld(pawn.getField('CBodyComponent.m_cellZ'), pawn.getField('CBodyComponent.m_vecZ'))),
            round(pawn.getField('m_angEyeAngles')?.[1] ?? 0),
            health ?? 0
        ]);
    }

    return states;
}

// Resolves entity indices to stable player slots once the final controller state is known.
function buildTimeline({ controllers, frames, kills, casts, lastTick, sampleEvery, tickRate }) {
    const players = [];
    const slotByPawn = new Map();

    for (const controller of [...controllers.values()].sort((a, b) => a.index - b.index)) {
        const team = controller.getField('m_iTeamNum');

        if (!PLAYER_TEAMS.has(team)) continue;

        const slot = players.length;

        players.push({ slot, name: controller.getField('m_iszPlayerName'), heroId: controller.getField('m_nHeroID'), team });
        slotByPawn.set(handleToIndex(controller.getField('m_hHeroPawn')), slot);
    }

    const toSlot = (index) => slotByPawn.get(index) ?? null;

    return {
        version: 1,
        tickRate,
        lastTick,
        sampleEvery,
        players,
        frames: frames.map(({ tick, states }) => {
            const row = players.map(() => null);

            for (const [index, state] of states) {
                const slot = toSlot(index);

                if (slot !== null) row[slot] = state;
            }

            return { tick, players: row };
        }),
        kills: kills
            .map((kill) => ({
                tick: kill.tick,
                victim: toSlot(kill.victim),
                attacker: toSlot(kill.attacker),
                assisters: kill.assisters.map(toSlot).filter((slot) => slot !== null)
            }))
            .filter((kill) => kill.victim !== null),
        casts: casts
            .map((cast) => ({ ...cast, caster: toSlot(cast.caster) }))
            .filter((cast) => cast.caster !== null)
    };
}

const round = (value) => Math.round(value * 10) / 10;
