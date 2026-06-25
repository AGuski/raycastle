import { CONFIG } from '../../core/config';
import { Block, BlockSides } from '../block';
import { ActorSpawnConfig, createStrikeableActor } from '../entities/spawnActor';
import { Entity } from '../entities/entity';
import { spawnBreakableWall } from '../entities/spawnBreakableWall';
import { spawnStaticSprite } from '../entities/staticSprite';
import { SpriteSheet } from '../spriteSheet';
import { MAP_EMPTY, MapCell } from '../../types';
import type { ActorKind, ChunkData, EntityKind, WallDecor } from '../../worldgen';
import { Tile } from '../../worldgen';
import { Chunk, localIndex } from './chunk';
import { DecorationAssets } from './generator/decorate';

export interface MaterializeChunkResult {
  chunk: Chunk;
  entities: Entity[];
}

function makeWallBlock(decor: WallDecor | null, assets: DecorationAssets): Block {
  const sides: BlockSides = [
    { texture: assets.wallImage },
    { texture: assets.wallImage },
    { texture: assets.wallImage },
    { texture: assets.wallImage }
  ];
  if (decor) {
    sides[decor.paintingSide] = assets.paintings[decor.paintingIndex];
  }
  return new Block(sides);
}

/**
 * Single source of truth binding each actor kind to its tuning config and
 * sprite sheet. Keyed by ActorKind so adding an enemy is a compile-checked,
 * one-line change here (plus the pack registry) — no scattered switch cases.
 */
const ACTOR_BINDINGS: Record<
  ActorKind,
  { config: () => ActorSpawnConfig; texture: (a: DecorationAssets) => SpriteSheet }
> = {
  zombie: { config: () => CONFIG.actors.zombie, texture: (a) => a.zombie },
  garrison: { config: () => CONFIG.actors.garrison, texture: (a) => a.garrison ?? a.zombie },
  hunterLich: { config: () => CONFIG.actors.hunterLich, texture: (a) => a.hunterLich ?? a.zombie },
  warden: { config: () => CONFIG.actors.warden, texture: (a) => a.warden ?? a.zombie },
  skitterling: { config: () => CONFIG.actors.skitterling, texture: (a) => a.skitterling ?? a.zombie }
};

function actorBindingFor(kind: Exclude<EntityKind, 'lamp' | 'breakableWall'>) {
  return ACTOR_BINDINGS[kind];
}

/**
 * Turn pure chunk data into engine objects. NO randomness here — every choice
 * was already made (and recorded) by `generateChunkData`. Buckets match the
 * original generator: lamps are static props, breakable walls are smart cells,
 * actors are dynamic entities returned to the entity manager.
 */
export function materializeChunk(
  data: ChunkData,
  assets: DecorationAssets
): MaterializeChunkResult {
  const { cx, cy, chunkSize, tiles, wallDecor } = data;

  const cells: MapCell[] = new Array(chunkSize * chunkSize);
  for (let i = 0; i < tiles.length; i++) {
    cells[i] = tiles[i] === Tile.Open ? MAP_EMPTY : makeWallBlock(wallDecor[i], assets);
  }

  const staticEntities: Entity[] = [];
  const cellEntities: Entity[] = [];
  const entities: Entity[] = [];

  for (const spec of data.entities) {
    switch (spec.kind) {
      case 'lamp':
        staticEntities.push(spawnStaticSprite(assets.lampstand, spec.wx, spec.wy));
        break;
      case 'breakableWall': {
        const wx = spec.wx;
        const wy = spec.wy;
        const cell = cells[localIndex(wx - cx * chunkSize, wy - cy * chunkSize, chunkSize)];
        if (cell === MAP_EMPTY || !(cell instanceof Block)) break;
        if (!spec.faces) break;
        cellEntities.push(
          spawnBreakableWall(wx, wy, cell, spec.faces, assets.crackDecal)
        );
        break;
      }
      case 'zombie':
      case 'garrison':
      case 'hunterLich':
      case 'warden':
      case 'skitterling': {
        const binding = actorBindingFor(spec.kind);
        entities.push(
          createStrikeableActor(
            binding.texture(assets),
            spec.wx,
            spec.wy,
            binding.config()
          )
        );
        break;
      }
    }
  }

  return {
    chunk: new Chunk(cx, cy, cells, staticEntities, cellEntities),
    entities
  };
}
