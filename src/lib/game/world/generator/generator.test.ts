import { describe, expect, it } from 'vitest';
import { Block, BlockSide } from '../../block';
import { spriteSheet } from '../../spriteSheet';
import { ChunkManager } from '../chunkManager';
import { EntityManager } from '../entityManager';
import { localIndex } from '../chunk';
import { DecorationAssets, scatterActors } from './decorate';
import { generateChunk } from './generateChunk';
import {
  Edge,
  buildTerrainMask,
  edgeHasPortal,
  getSharedEdgeCells
} from '../../../worldgen/terrain';
import { hashSeed, mixHash, randomDefaultSeed, SeededRng } from '../../../worldgen/seededRng';
import { defaultGeneratorParams } from '../levelRecipe';
import { MAP_EMPTY, MapCell } from '../../../types';

const CHUNK_SIZE = 32;
const WORLD_SEED = hashSeed('test-world');
const PARAMS = { ...defaultGeneratorParams(), chunkSize: CHUNK_SIZE };

function mockBitmap() {
  return {
    image: {} as HTMLImageElement,
    width: 1,
    height: 1
  };
}

function mockDecorationAssets(): DecorationAssets {
  const wallImage = spriteSheet(mockBitmap());
  const painting: BlockSide = { texture: wallImage };
  return {
    wallImage,
    paintings: [painting],
    lampstand: spriteSheet(mockBitmap()),
    zombie: spriteSheet(mockBitmap())
  };
}

function mockBoundaryBlock(): Block {
  const texture = spriteSheet(mockBitmap());
  return new Block([
    { texture },
    { texture },
    { texture },
    { texture }
  ]);
}

function mockEntityManager(): EntityManager {
  return new EntityManager();
}

function cellIsOpen(cell: unknown): boolean {
  return cell === MAP_EMPTY;
}

describe('seededRng', () => {
  it('produces stable hashes for the same inputs', () => {
    expect(hashSeed('raycastle')).toBe(hashSeed('raycastle'));
    expect(mixHash(1, 2, 3)).toBe(mixHash(1, 2, 3));
  });

  it('generates a 16-digit numeric seed', () => {
    const seed = randomDefaultSeed();
    expect(seed).toMatch(/^[1-9]\d{15}$/);
  });
});

describe('generateChunk determinism', () => {
  it('returns identical cells for the same seed and chunk coord', () => {
    const assets = mockDecorationAssets();
    const a = generateChunk(2, -1, WORLD_SEED, PARAMS, assets);
    const b = generateChunk(2, -1, WORLD_SEED, PARAMS, assets);

    expect(a.chunk.cells.length).toBe(b.chunk.cells.length);
    for (let i = 0; i < a.chunk.cells.length; i++) {
      expect(cellIsOpen(a.chunk.cells[i])).toBe(cellIsOpen(b.chunk.cells[i]));
    }
  });
});

describe('scatterActors determinism', () => {
  it('returns the same actor count for the same seed and chunk coord', () => {
    const assets = mockDecorationAssets();
    const config = {
      speed: 1,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true
    };
    const params = {
      enemyDensity: 0.015,
      clearRadius: 4
    };

    const makeCells = () => {
      const cells: MapCell[] = new Array(CHUNK_SIZE * CHUNK_SIZE).fill(MAP_EMPTY);
      return cells;
    };

    const rngA = new SeededRng(12345);
    const rngB = new SeededRng(12345);
    const a = scatterActors(makeCells(), CHUNK_SIZE, 0, 0, rngA, assets, config, params);
    const b = scatterActors(makeCells(), CHUNK_SIZE, 0, 0, rngB, assets, config, params);

    expect(a.length).toBe(b.length);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe('border consistency', () => {
  it('matches shared edge cells regardless of generation order', () => {
    const assets = mockDecorationAssets();

    const first = generateChunk(0, 0, WORLD_SEED, PARAMS, assets);
    const second = generateChunk(1, 0, WORLD_SEED, PARAMS, assets);
    const reversedA = generateChunk(1, 0, WORLD_SEED, PARAMS, assets);
    const reversedB = generateChunk(0, 0, WORLD_SEED, PARAMS, assets);

    const shared = getSharedEdgeCells(CHUNK_SIZE, 0, 0, 1, 0);
    expect(shared.length).toBe(CHUNK_SIZE);

    for (const { lxA, lyA, lxB, lyB } of shared) {
      const idxA = localIndex(lxA, lyA, CHUNK_SIZE);
      const idxB = localIndex(lxB, lyB, CHUNK_SIZE);
      expect(cellIsOpen(first.chunk.cells[idxA])).toBe(cellIsOpen(second.chunk.cells[idxB]));
      expect(cellIsOpen(reversedA.chunk.cells[idxB])).toBe(cellIsOpen(reversedB.chunk.cells[idxA]));
    }
  });
});

describe('border portals', () => {
  it('ensures every chunk edge has at least one opening', () => {
    const mask = buildTerrainMask(
      WORLD_SEED,
      4,
      -3,
      CHUNK_SIZE,
      PARAMS.wallDensity,
      PARAMS.borderPortalCount
    );

    expect(edgeHasPortal(mask, Edge.North)).toBe(true);
    expect(edgeHasPortal(mask, Edge.East)).toBe(true);
    expect(edgeHasPortal(mask, Edge.South)).toBe(true);
    expect(edgeHasPortal(mask, Edge.West)).toBe(true);
  });
});

describe('findSafeSpawn', () => {
  it('never returns a position inside a solid cell', () => {
    const manager = new ChunkManager(
      {
        seed: 'spawn-test',
        infinityMode: true,
        generator: PARAMS
      },
      mockDecorationAssets(),
      mockBoundaryBlock(),
      mockEntityManager()
    );

    const spawn = manager.findSafeSpawn({ x: 0.5, y: 0.5, direction: 0 });
    expect(manager.isOpen(spawn.x, spawn.y)).toBe(true);
  });
});

describe('chunk streaming', () => {
  it('loads a neighborhood and unloads distant chunks', () => {
    const manager = new ChunkManager(
      {
        seed: 'stream-test',
        infinityMode: true,
        generator: { ...PARAMS, loadRadius: 1, unloadRadius: 1 }
      },
      mockDecorationAssets(),
      mockBoundaryBlock(),
      mockEntityManager()
    );

    manager.updateStreaming(0.5, 0.5);
    expect(manager.loadedChunkCount).toBe(9);

    manager.updateStreaming(CHUNK_SIZE * 3 + 0.5, 0.5);
    expect(manager.loadedChunkCount).toBeLessThanOrEqual(9);
    expect(manager.getChunk(0, 0)).toBeUndefined();
    expect(manager.getChunk(3, 0)).toBeDefined();
  });

  it('does not generate chunks outside bounds in finite mode', () => {
    const manager = new ChunkManager(
      {
        seed: 'finite-test',
        infinityMode: false,
        bounds: { minCx: -1, maxCx: 1, minCy: -1, maxCy: 1 },
        generator: { ...PARAMS, loadRadius: 2, unloadRadius: 4 }
      },
      mockDecorationAssets(),
      mockBoundaryBlock(),
      mockEntityManager()
    );

    manager.updateStreaming(0.5, 0.5);
    expect(manager.loadedChunkCount).toBe(9);

    manager.updateStreaming(CHUNK_SIZE * 5 + 0.5, 0.5);
    expect(manager.loadedChunkCount).toBe(9);
    expect(manager.getChunk(5, 0)).toBeUndefined();
    expect(manager.isOpen(CHUNK_SIZE * 5, 0.5)).toBe(false);
  });
});
