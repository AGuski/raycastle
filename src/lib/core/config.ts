export const TAU = Math.PI * 2;

export const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(
  navigator.userAgent
);

export const CONFIG = {
  playerStart: { x: 0.5, y: 0.5, direction: Math.PI * 0.3 },
  walkSpeed: 3,
  /** Player health and hurt feedback. */
  player: {
    maxHealth: 100,
    /** Move-speed multiplier while the weapon is drawn (1 = full run speed). */
    drawnMoveScale: 0.85, // probably should be lower
    hurtVignette: {
      /** Seconds to reach full intensity after a hit. */
      fadeIn: 0.08,
      /** Seconds to ease back to zero. */
      fadeOut: 1.8
    }
  },
  combat: {
    /** Seconds the death dissolve plays before an entity is removed. */
    deathDissolveDuration: 0.6,
    /** Default luck spread for enemy attacks. */
    defaultDamageLuck: 0.15
  },
  /** Player contact sensor; detect radius is stopRadius + detectMargin. */
  contact: {
    /** Chase movement halts when closer than this (world units). */
    stopRadius: 0.3,
    /** Extra reach for the touch sensor beyond stopRadius. */
    detectMargin: 0.05
  },
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
    },
    strike: {
      /** Max forward reach along the view center (world units). */
      range: 0.75,
      /** Half-angle of the strike cone in radians. */
      halfAngle: 0.45,
      /** Swing progress window where hits are checked (0–1). */
      activeStart: 0.2,
      activeEnd: 0.75,
      /** Seconds the hit flash stays visible. */
      hitFlashDuration: 0.25,
      /** Player weapon knockback output (world units at resistance 0). */
      knockbackStrength: 0.5,
      /** Seconds over which knockback distance is applied (ease-out). */
      knockbackDuration: 0.12,
      /** Average weapon damage per hit. */
      baseDamage: 10,
      /** Luck spread: multiplier in [1 - luck, 1 + luck]. */
      damageLuck: 0.25,
      /**
       * Max distinct enemies one swing may strike (closest first). The weapon's
       * crowd-control cap: low = single-target pokes, high = wide sweeps.
       */
      maxTargets: 3
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
    // Encounter frequency and pack mix now live in the biome spawn tables
    // (src/lib/worldgen/spawn/biomes.ts); only the player-spawn clearance is a
    // global rule.
    enemyPlayerClearRadius: 4,
    borderPortalCount: { min: 1, max: 3 },
    /** Per-candidate probability of placing a breakable wall in a chunk. */
    breakableWallDensity: 0.2
  },
  actors: {
    /** ± fraction applied to chase speed when a moving actor spawns. */
    movementSpeedSpread: 0.25,
    zombie: {
      speed: 0.65,
      sightRange: 18,
      proximityRadius: 1.5,
      chaseOnSight: true,
      animationSpeed: 0.7,
      knockbackResistance: 0.35,
      combat: {
        maxHealth: 35,
        damage: 8,
        attackInterval: 1.6,
        attack: {
          range: 0.7,
          halfAngle: 0.5,
          windup: 0.25,
          strikeDuration: 0.12,
          recovery: 0.27,
          lunge: 0.15,
          interruptible: true
        }
      }
    },
    garrison: {
      speed: 0.9,
      sightRange: 18,
      proximityRadius: 1.5,
      chaseOnSight: true,
      animationSpeed: 1,
      knockbackResistance: 0.1,
      bounceWalk: {
        frequency: 1.6,
        swayAngle: 0.1,
        bobHeight: 0.05
      },
      combat: {
        maxHealth: 35,
        damage: 8,
        attackInterval: 1.6,
        attack: {
          range: 0.7,
          halfAngle: 0.5,
          windup: 0.3,
          strikeDuration: 0.12,
          recovery: 0.5,
          lunge: 0.2,
          interruptible: true
        }
      }
    },
    hunterLich: {
      speed: 0.65,
      sightRange: 18,
      proximityRadius: 1.5,
      chaseOnSight: true,
      animationSpeed: 1,
      knockbackResistance: 0.2,
      spriteEffect: 'darkMiasma',
      hover: {
        frequency: 0.7,
        amplitude: 0.04
      },
      combat: {
        maxHealth: 90,
        damage: 18,
        attackInterval: 1.1,
        attack: {
          range: 0.95,
          halfAngle: 0.4,
          windup: 0.4,
          strikeDuration: 0.1,
          recovery: 0.4,
          lunge: 0.45,
          interruptible: true
        }
      }
    },
    warden: {
      speed: 0.45,
      sightRange: 18,
      proximityRadius: 1.5,
      chaseOnSight: true,
      animationSpeed: 0.45,
      knockbackResistance: 0.95,
      /** Heavy body-block: the player cannot walk through the Warden. */
      blockRadius: 0.45,
      combat: {
        maxHealth: 120,
        damage: 22,
        attackInterval: 2.4,
        attack: {
          range: 1.3,
          halfAngle: 0.6,
          windup: 1.0,
          strikeDuration: 0.16,
          recovery: 0.8,
          lunge: 0.35,
          interruptible: false
        }
      }
    },
    skitterling: {
      speed: 2,
      sightRange: 14,
      proximityRadius: 1.5,
      chaseOnSight: true,
      animationSpeed: 1.35,
      knockbackResistance: -2,
      combat: {
        maxHealth: 10,
        damage: 3,
        attackInterval: 0.45,
        attack: {
          range: 1.2,
          halfAngle: 0.55,
          windup: 0.15,
          strikeDuration: 0.1,
          recovery: 0.3,
          lunge: 0.75,
          interruptible: true
        }
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
    warden: { width: 1024, height: 256, frames: 4 },
    skitterling: { width: 768, height: 256, frames: 3 },
    floorWood: { width: 1024, height: 1024 },
    ceilingWood: { width: 1024, height: 1024 },
    wallCracksDecal: { width: 1024, height: 1024 }
  }
} as const;
