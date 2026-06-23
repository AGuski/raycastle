import { CONFIG } from '../core/config';

/** Swing offset applied on top of the idle weapon pose. */
export interface WeaponSwingTransform {
  /** Added to the base weapon rotation (radians, screen Y-down). */
  rotation: number;
  /** Offset as fractions of sprite width (x) and height (y); positive y lifts up. */
  translation: { x: number; y: number };
}

export type WeaponSwingPose = WeaponSwingTransform;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Interpolates from the wind-up pose to the follow-through over progress 0–1. */
export function swingTransformAt(progress: number): WeaponSwingTransform {
  const { start, end } = CONFIG.weapon.swing;
  const t = smoothstep(progress);

  return {
    rotation: lerp(start.rotation, end.rotation, t),
    translation: {
      x: lerp(start.translation.x, end.translation.x, t),
      y: lerp(start.translation.y, end.translation.y, t)
    }
  };
}
