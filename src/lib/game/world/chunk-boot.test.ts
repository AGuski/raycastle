import { describe, it, expect } from 'vitest';
import { Block, BlockSide } from '../block';
import { spriteSheet } from '../spriteSheet';
import { ChunkManager } from './chunkManager';
import { EntityManager } from './entityManager';
import { defaultGeneratorParams } from './levelRecipe';

const PARAMS = defaultGeneratorParams();

function mockBitmap() {
  return {
    image: {} as HTMLImageElement,
    width: 1,
    height: 1
  };
}

function mockAssets() {
  const w = spriteSheet(mockBitmap());
  return {
    wallImage: w,
    paintings: [{ texture: w } as BlockSide],
    lampstand: w,
    zombie: w,
    crackDecal: w
  };
}

function mockBoundary() {
  const t = spriteSheet(mockBitmap());
  return new Block([
    { texture: t },
    { texture: t },
    { texture: t },
    { texture: t }
  ]);
}

describe('boot', () => {
  it('findSafeSpawn loads neighborhood', () => {
    const m = new ChunkManager(
      { seed: 'x', infinityMode: true, generator: PARAMS },
      mockAssets(),
      mockBoundary(),
      new EntityManager()
    );
    m.findSafeSpawn({ x: 0.5, y: 0.5 });
    expect(m.loadedChunkCount).toBeGreaterThanOrEqual(25);
  });
});
