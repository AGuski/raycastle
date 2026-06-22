import { CONFIG } from '../../core/config';
import { hasLineOfSight } from '../../engine/lineOfSight';
import { Point } from '../../types';
import { ComponentContext } from '../entities/component';
import { Entity } from '../entities/entity';
import { Strikeable } from '../entities/components/strikeable';

export interface StrikeViewer {
  x: number;
  y: number;
  direction: number;
  sheathed: boolean;
  swingProgress: number;
  swingId: number;
}

/** True when a point lies in the view-center strike cone. */
export function isInStrikeCone(
  viewer: StrikeViewer,
  target: Point,
  range = CONFIG.weapon.strike.range,
  halfAngle = CONFIG.weapon.strike.halfAngle
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

/** Marks strikeable entities hit by the current swing during its active frames. */
export function resolveWeaponStrike(
  ctx: ComponentContext,
  entities: Iterable<Entity>
): void {
  const { player, time, world } = ctx;
  if (player.sheathed || player.swingProgress <= 0) return;
  if (!isStrikeActive(player.swingProgress)) return;

  for (const entity of entities) {
    const strikeable = entity.get(Strikeable);
    if (!strikeable) continue;
    if (strikeable.wasHitBySwing(player.swingId)) continue;
    if (!isInStrikeCone(player, entity)) continue;
    if (!hasLineOfSight(world, player, entity)) continue;

    applyStrike(strikeable, player.swingId, player, time);
    console.log('[strike] hit actor', { x: entity.x, y: entity.y });
  }
}

function applyStrike(
  strikeable: Strikeable,
  swingId: number,
  from: Point,
  worldTime: number
): void {
  strikeable.markHit(swingId, worldTime);
  strikeable.applyKnockback(from, CONFIG.weapon.strike.knockbackDistance);
}
