import { CONFIG } from '../../core/config';
import { Point } from '../../types';
import { PlayerView } from '../entities/component';

/** Minimal pose needed to project a strike cone: position + facing. */
export interface ConeViewer {
  x: number;
  y: number;
  direction: number;
}

/** True when a point lies in the view-center strike cone. */
export function isInStrikeCone(
  viewer: ConeViewer,
  target: Point,
  range: number = CONFIG.weapon.strike.range,
  halfAngle: number = CONFIG.weapon.strike.halfAngle
): boolean {
  const dx = target.x - viewer.x;
  const dy = target.y - viewer.y;
  const cos = Math.cos(viewer.direction);
  const sin = Math.sin(viewer.direction);
  const forward = dx * cos + dy * sin;
  const lateral = Math.abs(-dx * sin + dy * cos);

  if (forward <= 0.1 || forward > range) return false;

  return lateral / forward <= Math.tan(halfAngle);
}

export function isStrikeActive(
  progress: number,
  strike = CONFIG.weapon.strike
): boolean {
  return progress >= strike.activeStart && progress <= strike.activeEnd;
}

export function isWeaponStrikeFrame(player: PlayerView): boolean {
  if (player.sheathed || player.swingProgress <= 0) return false;
  return isStrikeActive(player.swingProgress);
}
