import { CONFIG } from '../../core/config';
import { randomDefaultSeed } from '../../worldgen/seededRng';

export interface GeneratorParams {
  chunkSize: number;
  loadRadius: number;
  unloadRadius: number;
  wallDensity: number;
  lampDensity: number;
  lampPlayerClearRadius: number;
  enemyPlayerClearRadius: number;
  borderPortalCount: { min: number; max: number };
  breakableWallDensity: number;
}

export interface LevelBounds {
  minCx: number;
  maxCx: number;
  minCy: number;
  maxCy: number;
}

export interface SpawnHint {
  x: number;
  y: number;
  direction?: number;
}

export interface LevelRecipe {
  seed: string | number;
  infinityMode?: boolean;
  bounds?: LevelBounds;
  spawn?: SpawnHint;
  generator: GeneratorParams;
}

export function defaultGeneratorParams(): GeneratorParams {
  const { world } = CONFIG;
  return {
    chunkSize: world.chunkSize,
    loadRadius: world.loadRadius,
    unloadRadius: world.unloadRadius,
    wallDensity: world.wallDensity,
    lampDensity: world.lampDensity,
    lampPlayerClearRadius: world.lampPlayerClearRadius,
    enemyPlayerClearRadius: world.enemyPlayerClearRadius,
    borderPortalCount: { ...world.borderPortalCount },
    breakableWallDensity: world.breakableWallDensity
  };
}

export function loadLevelRecipe(): LevelRecipe {
  const seedParam = new URLSearchParams(window.location.search).get('seed');
  const { world, playerStart } = CONFIG;

  const infinityMode = world.infinityMode;

  return {
    seed: seedParam ?? randomDefaultSeed(),
    infinityMode,
    bounds: infinityMode ? undefined : { ...world.finiteBounds },
    spawn: {
      x: playerStart.x,
      y: playerStart.y,
      direction: playerStart.direction
    },
    generator: defaultGeneratorParams()
  };
}
