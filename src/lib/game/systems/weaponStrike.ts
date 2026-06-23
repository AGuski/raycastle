import { CONFIG } from '../../core/config';
import { hasLineOfSight } from '../../engine/lineOfSight';
import { Point } from '../../types';
import { ComponentContext, PlayerView } from '../entities/component';
import { Entity } from '../entities/entity';
import { Strikeable } from '../entities/components/strikeable';

/** True when a point lies in the view-center strike cone. */
export function isInStrikeCone(
  viewer: PlayerView,
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

export function isWeaponStrikeFrame(player: PlayerView): boolean {
  if (player.sheathed || player.swingProgress <= 0) return false;
  return isStrikeActive(player.swingProgress);
}

/** Marks strikeable actors hit by the current swing during its active frames. */
export function resolveActorWeaponStrike(
  ctx: ComponentContext,
  entities: Iterable<Entity>
): void {
  const { player, time, world } = ctx;

  for (const entity of entities) {
    const strikeable = entity.get(Strikeable);
    if (!strikeable) continue;
    if (strikeable.wasHitBySwing(player.swingId)) continue;
    if (!isInStrikeCone(player, entity)) continue;
    if (!hasLineOfSight(world, player, entity)) continue;

    strikeable.markHit(player.swingId, time);
    strikeable.applyKnockback(player, CONFIG.weapon.strike.knockbackDistance);
    console.log('[strike] hit actor', { x: entity.x, y: entity.y });
  }
}
