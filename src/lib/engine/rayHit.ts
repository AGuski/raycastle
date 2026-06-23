import { RayStep } from '../types';

/** Grid cell of the solid wall struck by a ray step. */
export function rayHitWallCell(
  step: RayStep,
  viewer: { x: number; y: number }
): { wx: number; wy: number } {
  if (step.verticalHit) {
    return {
      wx: viewer.x > step.x ? Math.ceil(step.x) - 1 : Math.floor(step.x),
      wy: Math.floor(step.y)
    };
  }
  return {
    wx: Math.floor(step.x),
    wy: viewer.y > step.y ? Math.ceil(step.y) - 1 : Math.floor(step.y)
  };
}
