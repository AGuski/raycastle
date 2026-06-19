export const TAU = Math.PI * 2;

export const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(
  navigator.userAgent
);

export const CONFIG = {
  playerStart: { x: 0.5, y: 0.5, direction: Math.PI * 0.3 },
  walkSpeed: 3,
  turnSpeed: Math.PI,
  focalLength: 0.6,
  resolution: IS_MOBILE ? 160 : 640,
  renderRange: IS_MOBILE ? 8 : 30,
  canvasScale: 0.5,
  weaponScaleDivisor: 1200,
  fixedTimestep: 1 / 60,
  maxFrameDelta: 0.2,
  debugKey: 'F3',
  animationFps: 8,
  fogStart: 2,
  fogEnd: 12,
  fogColor: [0, 0, 0] as const,
  world: {
    infinityMode: true,
    /** Chunk coords included when infinityMode is false (inclusive). */
    finiteBounds: { minCx: -1, maxCx: 1, minCy: -1, maxCy: 1 },
    chunkSize: 32,
    loadRadius: 2,
    unloadRadius: 4,
    wallDensity: 0.45,
    lampDensity: 0.07,
    lampPlayerClearRadius: 2,
    borderPortalCount: { min: 1, max: 3 }
  },
  textures: {
    wallBooks: { width: 1024, height: 1024 },
    wallFireAnim: { width: 4096, height: 1024, frames: 4 },
    wallNofire: { width: 1024, height: 1024 },
    wallPainting: { width: 1024, height: 1024 },
    wallControls: { width: 1024, height: 1024 },
    skybox: { width: 4096, height: 1024 },
    weapon: { width: 1200, height: 950 },
    lampstand: { width: 1024, height: 1024 },
    floorWood: { width: 1024, height: 1024 },
    ceilingWood: { width: 1024, height: 1024 }
  }
} as const;
