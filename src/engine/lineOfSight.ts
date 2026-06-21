import { cast, RaycastWorld } from './raycaster';
import { isOpenCell, Point } from '../types';

export function hasLineOfSight(
  world: RaycastWorld,
  from: Point,
  to: Point
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return true;

  const angle = Math.atan2(dy, dx);
  const ray = cast(world, from, angle, dist);

  for (let i = 1; i < ray.length; i++) {
    if (!isOpenCell(ray[i].block)) return false;
    if (ray[i].distance >= dist - 0.01) break;
  }

  return true;
}
