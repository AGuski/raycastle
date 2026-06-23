import { Block } from '../block';
import { Entity } from '../entities/entity';
import { PlayerView, GameWorld } from '../entities/component';
import { isOpenCell, MapCell } from '../../types';
import {
  Chunk,
  chunkKey,
  localIndex,
  worldToChunk,
  worldToLocal
} from './chunk';
import { EntityManager } from './entityManager';
import { DecorationAssets } from './generator/decorate';
import { generateChunk } from './generator/generateChunk';
import { carveOpenPad, buildTerrainMask } from '../../worldgen/terrain';
import { hashSeed } from '../../worldgen/seededRng';
import { applyTerrainToCells } from './generator/decorate';
import { LevelRecipe, SpawnHint } from './levelRecipe';
import { SeededRng, chunkSeed } from '../../worldgen/seededRng';

export class ChunkManager {
  private readonly chunks = new Map<string, Chunk>();
  private readonly worldSeed: number;
  private readonly boundaryBlock: Block;
  private playerChunkCx = 0;
  private playerChunkCy = 0;
  private initialized = false;

  constructor(
    private readonly recipe: LevelRecipe,
    private readonly assets: DecorationAssets,
    boundaryBlock: Block,
    private readonly entityManager: EntityManager
  ) {
    this.worldSeed = hashSeed(recipe.seed);
    this.boundaryBlock = boundaryBlock;
  }

  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  getChunk(cx: number, cy: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cy));
  }

  private isWithinBounds(cx: number, cy: number): boolean {
    if (this.recipe.infinityMode !== false) return true;
    const bounds = this.recipe.bounds;
    if (!bounds) return false;
    return (
      cx >= bounds.minCx &&
      cx <= bounds.maxCx &&
      cy >= bounds.minCy &&
      cy <= bounds.maxCy
    );
  }

  private loadChunk(cx: number, cy: number, spawnExclude?: { x: number; y: number }): Chunk {
    if (!this.isWithinBounds(cx, cy)) {
      throw new Error(`Cannot load chunk (${cx}, ${cy}) outside finite bounds`);
    }

    const key = chunkKey(cx, cy);
    const existing = this.chunks.get(key);
    if (existing) return existing;

    const { chunk, entities } = generateChunk(
      cx,
      cy,
      this.worldSeed,
      this.recipe.generator,
      this.assets,
      spawnExclude
    );
    this.chunks.set(key, chunk);
    this.entityManager.addChunkEntities(cx, cy, entities);
    return chunk;
  }

  ensureNeighborhood(
    cx: number,
    cy: number,
    radius?: number,
    spawnExclude?: { x: number; y: number }
  ): void {
    const r = radius ?? this.recipe.generator.loadRadius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const ncx = cx + dx;
        const ncy = cy + dy;
        if (this.isWithinBounds(ncx, ncy)) {
          this.loadChunk(ncx, ncy, spawnExclude);
        }
      }
    }
  }

  private unloadDistantChunks(cx: number, cy: number): void {
    const unloadRadius = this.recipe.generator.unloadRadius;
    for (const [key, chunk] of this.chunks) {
      const dx = Math.abs(chunk.cx - cx);
      const dy = Math.abs(chunk.cy - cy);
      if (dx > unloadRadius || dy > unloadRadius) {
        this.chunks.delete(key);
      }
    }
  }

  updateStreaming(playerX: number, playerY: number): void {
    const { chunkSize } = this.recipe.generator;
    const { cx, cy } = worldToChunk(playerX, playerY, chunkSize);

    if (this.recipe.infinityMode === false) {
      if (!this.initialized) {
        this.ensureAllBoundedChunks();
        this.initialized = true;
      }
      return;
    }

    if (!this.initialized || cx !== this.playerChunkCx || cy !== this.playerChunkCy) {
      this.ensureNeighborhood(cx, cy);
      this.unloadDistantChunks(cx, cy);
      this.playerChunkCx = cx;
      this.playerChunkCy = cy;
      this.initialized = true;
    }
  }

  private ensureAllBoundedChunks(): void {
    const bounds = this.recipe.bounds;
    if (!bounds) return;

    for (let cy = bounds.minCy; cy <= bounds.maxCy; cy++) {
      for (let cx = bounds.minCx; cx <= bounds.maxCx; cx++) {
        this.loadChunk(cx, cy);
      }
    }
  }

  ensureAround(
    playerX: number,
    playerY: number,
    spawnExclude?: { x: number; y: number }
  ): void {
    if (this.recipe.infinityMode === false) {
      this.ensureAllBoundedChunks();
      return;
    }

    const { chunkSize, loadRadius } = this.recipe.generator;
    const { cx, cy } = worldToChunk(playerX, playerY, chunkSize);
    this.ensureNeighborhood(cx, cy, loadRadius, spawnExclude);
  }

  getCell(wx: number, wy: number): MapCell {
    wx = Math.floor(wx);
    wy = Math.floor(wy);

    const { chunkSize } = this.recipe.generator;
    const { cx, cy, lx, ly } = worldToLocal(wx, wy, chunkSize);

    if (!this.isWithinBounds(cx, cy)) {
      return this.boundaryBlock;
    }

    const chunk = this.loadChunk(cx, cy);
    return chunk.cells[localIndex(lx, ly, chunkSize)];
  }

  isOpen(wx: number, wy: number): boolean {
    return isOpenCell(this.getCell(wx, wy));
  }

  getStaticEntities(): Entity[] {
    const entities: Entity[] = [];
    for (const chunk of this.chunks.values()) {
      entities.push(...chunk.entities);
    }
    return entities;
  }

  updateCellEntities(
    seconds: number,
    player: PlayerView,
    world: GameWorld & { deltaTime: number }
  ): void {
    const ctx = {
      dt: seconds,
      time: world.deltaTime,
      world,
      player
    };

    for (const chunk of this.chunks.values()) {
      for (const entity of chunk.cellEntities) {
        entity.update(ctx);
      }
    }
  }

  setCell(wx: number, wy: number, cell: MapCell): void {
    wx = Math.floor(wx);
    wy = Math.floor(wy);

    const { chunkSize } = this.recipe.generator;
    const { cx, cy, lx, ly } = worldToLocal(wx, wy, chunkSize);

    if (!this.isWithinBounds(cx, cy)) return;

    const chunk = this.loadChunk(cx, cy);
    chunk.cells[localIndex(lx, ly, chunkSize)] = cell;
  }

  private carveSpawnPad(cx: number, cy: number, centerLx: number, centerLy: number): void {
    const { chunkSize, wallDensity, borderPortalCount } = this.recipe.generator;
    const mask = buildTerrainMask(
      this.worldSeed,
      cx,
      cy,
      chunkSize,
      wallDensity,
      borderPortalCount
    );
    carveOpenPad(mask, centerLx, centerLy, 1);

    const rng = new SeededRng(chunkSeed(this.worldSeed, cx, cy));
    const cells = applyTerrainToCells(mask, chunkSize, this.assets, rng);
    const chunk = new Chunk(cx, cy, cells, []);
    this.chunks.set(chunkKey(cx, cy), chunk);
  }

  findSafeSpawn(hint?: SpawnHint): { x: number; y: number; direction: number } {
    const spawn = hint ?? this.recipe.spawn ?? { x: 0.5, y: 0.5, direction: 0 };
    const direction = spawn.direction ?? 0;
    const { chunkSize } = this.recipe.generator;
    const spawnExclude = { x: spawn.x, y: spawn.y };

    const px = Math.floor(spawn.x);
    const py = Math.floor(spawn.y);
    this.ensureAround(spawn.x, spawn.y, spawnExclude);

    if (this.isOpen(px, py)) {
      return { x: spawn.x, y: spawn.y, direction };
    }

    for (let radius = 1; radius <= chunkSize; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const wx = px + dx;
          const wy = py + dy;
          this.ensureAround(wx + 0.5, wy + 0.5, spawnExclude);
          if (this.isOpen(wx, wy)) {
            return { x: wx + 0.5, y: wy + 0.5, direction };
          }
        }
      }
    }

    const { cx, cy, lx, ly } = worldToLocal(px, py, chunkSize);
    this.carveSpawnPad(cx, cy, lx, ly);
    return { x: spawn.x, y: spawn.y, direction };
  }
}
