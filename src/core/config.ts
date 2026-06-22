export const TAU = Math.PI * 2;

export const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(
  navigator.userAgent
);

export const CONFIG = {
  playerStart: { x: 0.5, y: 0.5, direction: Math.PI * 0.3 },
  walkSpeed: 3,
  /** Radians turned per pixel of horizontal mouse or touch drag. */
  lookSensitivity: 0.0025,
  /**
   * Vertical half-FOV tangent and uniform zoom. The horizontal FOV is derived
   * from the viewport aspect ratio so on-screen pixels stay square at any size
   * (larger values widen the view on both axes; 0.5 ~= 53 deg vertical FOV).
   */
  focalLength: 0.5,
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
    enemyDensity: 0.015,
    enemyPlayerClearRadius: 4,
    garrisonDensity: 0.002,
    hunterLichDensity: 0.008,
    borderPortalCount: { min: 1, max: 3 }
  },
  actors: {
    zombie: {
      speed: 0.65,
      sightRange: 18,
      proximityRadius: 1.5,
      chaseOnSight: true,
      animationSpeed: 0.7
    },
    garrison: {
      speed: 0.9,
      sightRange: 18,
      proximityRadius: 1.5,
      chaseOnSight: true,
      animationSpeed: 1,
      bounceWalk: {
        frequency: 1.6,
        swayAngle: 0.1,
        bobHeight: 0.05
      }
    },
    hunterLich: {
      speed: 0.65,
      sightRange: 18,
      proximityRadius: 1.5,
      chaseOnSight: true,
      animationSpeed: 1,
      spriteEffect: 'darkMiasma',
      hover: {
        frequency: 0.7,
        amplitude: 0.04
      }
    }
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
    zombie: { width: 3072, height: 512, frames: 6 },
    garrison: { width: 1024, height: 1024 },
    hunterLich: { width: 1024, height: 1024 },
    floorWood: { width: 1024, height: 1024 },
    ceilingWood: { width: 1024, height: 1024 }
  }
} as const;
