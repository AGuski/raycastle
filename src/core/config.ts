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
  /** First-person held weapon placement (screen space, 0–1). */
  weapon: {
    /** Pivot point on screen; walk bob is applied here. */
    position: { x: 1.1, y: 1.3 },
    /** Pivot within the sprite quad (0–1). Bottom-right suits the mace grip. */
    pivot: { x: 1, y: 1 },
    /** Rotation in radians around the pivot (screen Y-down). */
    rotation: 0,
    /** Sprite size multiplier applied on top of viewport weaponScale. */
    scale: 0.6,
    /** Bob amplitude multiplier; scaled by weaponScale each frame. */
    bobAmplitude: 6,
    swing: {
      duration: 0.35,
      /** Wind-up: raised and slightly clockwise. */
      start: {
        rotation: 0.5,
        translation: { x: 0, y: 0.08 }
      },
      /** Follow-through: dropped and ~90° anticlockwise from the wind-up. */
      end: {
        rotation: 0 - Math.PI / 2,
        translation: { x: -0.5, y: -0.1 }
      }
    }
  },
  fixedTimestep: 1 / 60,
  maxFrameDelta: 0.2,
  debugKey: 'F3',
  animationFps: 8,
  fogStart: 2,
  fogEnd: 12,
  fogColor: [0, 0, 0] as const,
  spriteShadow: {
    enabled: true,
    /** Peak shadow opacity at the feet. */
    alpha: 0.45,
    /** Screen height of the shadow blob as a fraction of sprite height. */
    heightFrac: 0.15,
    /** Bottom slice of the sprite texture used as the shadow silhouette. */
    sampleFrac: 0.35,
    /** Horizontal stretch applied to the shadow quad. */
    stretch: 1.35,
    /** Extra downward offset below the feet, as a fraction of sprite height. */
    offsetYFrac: 0.08,
    /** Soft blur radius in source-texture texels. */
    blurRadius: 40
  },
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
    weapon: { width: 1024, height: 1024 },
    lampstand: { width: 1024, height: 1024 },
    zombie: { width: 3072, height: 512, frames: 6 },
    garrison: { width: 1024, height: 1024 },
    hunterLich: { width: 1024, height: 1024 },
    floorWood: { width: 1024, height: 1024 },
    ceilingWood: { width: 1024, height: 1024 }
  }
} as const;
