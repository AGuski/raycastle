import { describe, it, expect } from 'vitest';
import { Block, BlockSide } from '../block';
import { ChunkManager } from './chunkManager';
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
  const w = mockBitmap();
  return { wallImage: w, paintings: [{ texture: w } as BlockSide], lampstand: w };
}

function mockBoundary() {
  const t = mockBitmap();
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
      mockBoundary()
    );
    m.findSafeSpawn({ x: 0.5, y: 0.5 });
    expect(m.loadedChunkCount).toBeGreaterThanOrEqual(25);
  });
});
