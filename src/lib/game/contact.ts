import { Point } from '../types';
import { CONFIG } from '../core/config';

export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** True when two points are within the given touch radius (world units). */
export function isInContact(a: Point, b: Point, radius: number): boolean {
  return distanceBetween(a, b) <= radius;
}

/** Touch-sensor radius: slightly larger than where chase movement stops. */
export function contactDetectRadius(
  contact = CONFIG.contact
): number {
  return contact.stopRadius + contact.detectMargin;
}
