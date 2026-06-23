import { resolveBreakableWallWeaponStrike } from '../entities/components/breakableWall';
import { resolveActorWeaponStrike } from '../entities/components/strikeable';
import { ComponentContext } from '../entities/component';
import { Entity } from '../entities/entity';
import { resolveContactEvents } from './contact';
import { isWeaponStrikeFrame } from './weaponStrike';

/** Cross-entity passes that run after component ticks. */
export function runSystems(
  ctx: ComponentContext,
  entities: Iterable<Entity>
): void {
  resolveContactEvents(entities);

  if (!isWeaponStrikeFrame(ctx.player)) return;

  if (resolveBreakableWallWeaponStrike(ctx, entities)) return;

  resolveActorWeaponStrike(ctx, entities);
}
