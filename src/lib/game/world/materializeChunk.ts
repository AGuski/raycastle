import { CONFIG } from '../../core/config';
import { Block, BlockSides } from '../block';
import { ActorSpawnConfig, createStrikeableActor } from '../entities/spawnActor';
import { Entity } from '../entities/entity';
import { spawnBreakableWall } from '../entities/spawnBreakableWall';
import { spawnStaticSprite } from '../entities/staticSprite';
import { SpriteSheet } from '../spriteSheet';
import { MAP_EMPTY, MapCell } from '../../types';
import type { ChunkData, EntityKind, WallDecor } from '../../worldgen';
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

function actorConfigFor(kind: EntityKind): ActorSpawnConfig {
  switch (kind) {
    case 'zombie':
      return CONFIG.actors.zombie;
    case 'garrison':
      return CONFIG.actors.garrison;
    case 'hunterLich':
      return CONFIG.actors.hunterLich;
    default:
      throw new Error(`Not an actor kind: ${kind}`);
  }
}

function actorTextureFor(kind: EntityKind, assets: DecorationAssets): SpriteSheet {
  switch (kind) {
    case 'zombie':
      return assets.zombie;
    case 'garrison':
      return assets.garrison ?? assets.zombie;
    case 'hunterLich':
      return assets.hunterLich ?? assets.zombie;
    default:
      throw new Error(`Not an actor kind: ${kind}`);
  }
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
          spawnBreakableWall(wx, wy, cell, spec.faces)
        );
        break;
      }
      case 'zombie':
      case 'garrison':
      case 'hunterLich':
        entities.push(
          createStrikeableActor(
            actorTextureFor(spec.kind, assets),
            spec.wx,
            spec.wy,
            actorConfigFor(spec.kind)
          )
        );
        break;
    }
  }

  return {
    chunk: new Chunk(cx, cy, cells, staticEntities, cellEntities),
    entities
  };
}
