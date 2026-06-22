import { CONFIG } from '../core/config';
import { hasLineOfSight } from '../engine/lineOfSight';
import { Point } from '../types';
import { ActorEntity, ActorWorld } from './entities/actorEntity';
import { Strikeable } from './entities/strikeable';
import { Player } from './player';

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

/** Marks strikeable actors hit by the current swing during its active frames. */
export function resolveWeaponStrike(
  player: Player,
  actors: readonly ActorEntity[],
  world: ActorWorld,
  worldTime: number
): void {
  if (player.sheathed || player.swingProgress <= 0) return;
  if (!isStrikeActive(player.swingProgress)) return;

  for (const actor of actors) {
    const strikeable = actor.strikeable;
    if (!strikeable) continue;
    if (strikeable.wasHitBySwing(player.swingId)) continue;
    if (!isInStrikeCone(player, actor)) continue;
    if (!hasLineOfSight(world, player, actor)) continue;

    applyStrike(strikeable, player.swingId, player, worldTime);
    console.log('[strike] hit actor', { x: actor.x, y: actor.y });
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
