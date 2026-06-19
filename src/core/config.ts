export const TAU = Math.PI * 2;

export const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(
  navigator.userAgent
);

export const CONFIG = {
  worldSize: 320,
  playerStart: { x: 15.3, y: -1.2, direction: Math.PI * 0.3 },
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
  wallFillProbability: 0.3,
  lampSpawnProbability: 0.08,
  lampPlayerClearRadius: 2,
  animationFps: 8,
  textures: {
    wallBooks: { width: 1024, height: 1024 },
    wallFireAnim: { width: 4096, height: 1024, frames: 4 },
    wallNofire: { width: 1024, height: 1024 },
    wallPainting: { width: 1024, height: 1024 },
    wallControls: { width: 1024, height: 1024 },
    skybox: { width: 4096, height: 1024 },
    weapon: { width: 1200, height: 950 },
    lampstand: { width: 1024, height: 1024 }
  }
} as const;
