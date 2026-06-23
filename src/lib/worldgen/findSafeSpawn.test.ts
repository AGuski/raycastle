import { describe, expect, it } from 'vitest';
import { CONFIG } from '../core/config';
import { Block } from '../game/block';
import { spriteSheet } from '../game/spriteSheet';
import { ChunkManager } from '../game/world/chunkManager';
import { EntityManager } from '../game/world/entityManager';
import { DecorationAssets } from '../game/world/generator/decorate';
import { defaultGeneratorParams } from '../game/world/levelRecipe';
import { findSafeSpawn } from './findSafeSpawn';
import { hashSeed } from './seededRng';
import { Tile } from './types';
import { generateChunkData } from './generateChunkData';

const PARAMS = { ...defaultGeneratorParams(), paintingVariantCount: 4 };
const SPAWN = { x: CONFIG.playerStart.x, y: CONFIG.playerStart.y, direction: CONFIG.playerStart.direction };

function mockBitmap() {
  return { image: {} as HTMLImageElement, width: 1, height: 1 };
}

function mockDecorationAssets(): DecorationAssets {
  const wallImage = spriteSheet(mockBitmap());
  const painting = { texture: wallImage };
  return {
    wallImage,
    paintings: [painting],
    lampstand: spriteSheet(mockBitmap()),
    zombie: spriteSheet(mockBitmap()),
    crackDecal: spriteSheet(mockBitmap())
  };
}

function mockBoundaryBlock(): Block {
  const texture = spriteSheet(mockBitmap());
  return new Block([{ texture }, { texture }, { texture }, { texture }]);
}

function mockEntityManager(): EntityManager {
  return new EntityManager();
}

describe('findSafeSpawn', () => {
  it('matches ChunkManager for the default player start', () => {
    const seed = '123456789012345';
    const worldSeed = hashSeed(seed);
    const pure = findSafeSpawn(worldSeed, PARAMS, SPAWN, { x: SPAWN.x, y: SPAWN.y });

    const manager = new ChunkManager(
      { seed, infinityMode: true, generator: defaultGeneratorParams(), spawn: SPAWN },
      mockDecorationAssets(),
      mockBoundaryBlock(),
      mockEntityManager()
    );
    const game = manager.findSafeSpawn(SPAWN);

    expect(pure).toEqual(game);
  });

  it('moves off a walled hint cell onto the nearest open ring cell', () => {
    const worldSeed = hashSeed('walled-spawn-hint');
    const hint = { x: 0.5, y: 0.5, direction: 0 };
    const spawn = findSafeSpawn(worldSeed, PARAMS, hint, { x: hint.x, y: hint.y });
    const cell = generateChunkData(0, 0, worldSeed, PARAMS, { x: hint.x, y: hint.y });
    const hintedOpen = cell.tiles[0] === Tile.Open;

    if (!hintedOpen) {
      expect(spawn).not.toEqual({ x: 0.5, y: 0.5, direction: 0 });
    }

    const wx = Math.floor(spawn.x);
    const wy = Math.floor(spawn.y);
    const cx = Math.floor(wx / PARAMS.chunkSize);
    const cy = Math.floor(wy / PARAMS.chunkSize);
    const chunk = generateChunkData(cx, cy, worldSeed, PARAMS, { x: hint.x, y: hint.y });
    const lx = wx - cx * PARAMS.chunkSize;
    const ly = wy - cy * PARAMS.chunkSize;
    expect(chunk.tiles[ly * PARAMS.chunkSize + lx]).toBe(Tile.Open);
  });

  it('keeps the hinted centre when that cell is already open', () => {
    const worldSeed = hashSeed('open-spawn-hint');
    const hint = { x: 0.5, y: 0.5, direction: 0 };
    const cell = generateChunkData(0, 0, worldSeed, PARAMS, { x: hint.x, y: hint.y });
    if (cell.tiles[0] !== Tile.Open) return;

    expect(findSafeSpawn(worldSeed, PARAMS, hint, { x: hint.x, y: hint.y })).toEqual({
      x: 0.5,
      y: 0.5,
      direction: 0
    });
  });
});
