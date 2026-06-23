import { describe, expect, it } from 'vitest';
import { CONFIG } from '../core/config';
import { defaultGeneratorParams } from '../game/world/levelRecipe';
import { hashSeed } from './seededRng';
import { generateChunkData } from './generateChunkData';
import { sampleArea } from './sampleArea';

const SEED = hashSeed('123456789012345');
const PARAMS = { ...defaultGeneratorParams(), paintingVariantCount: 4 };
const SPAWN = { x: CONFIG.playerStart.x, y: CONFIG.playerStart.y };

function hiddenDoorsAt(
  centerWx: number,
  centerWy: number,
  spawnExclude?: { x: number; y: number }
) {
  return sampleArea(SEED, PARAMS, centerWx, centerWy, 7, new Map(), spawnExclude)
    .entities.filter((e) => e.kind === 'hiddenDoor')
    .map((d) => [d.wx, d.wy] as const);
}

describe('sampleArea spawn exclusion', () => {
  it('only shows hidden doors that survive spawn exclusion in chunk data', () => {
    const doors = hiddenDoorsAt(-2, -2, SPAWN);
    for (const [wx, wy] of doors) {
      const cx = Math.floor(wx / PARAMS.chunkSize);
      const cy = Math.floor(wy / PARAMS.chunkSize);
      const chunkDoors = generateChunkData(cx, cy, SEED, PARAMS, SPAWN).entities.filter(
        (e) => e.kind === 'hiddenDoor'
      );
      expect(chunkDoors.some((d) => d.wx === wx && d.wy === wy)).toBe(true);
    }
  });

  it('does not place hidden doors near spawn when exclusion is enabled', () => {
    expect(hiddenDoorsAt(-2, -2, SPAWN).some(([wx, wy]) => wx === -2 && wy === -2)).toBe(
      false
    );
  });

  it('can still show spawn-adjacent doors when exclusion is omitted', () => {
    expect(hiddenDoorsAt(-2, -2).some(([wx, wy]) => wx === -2 && wy === -2)).toBe(true);
  });
});
