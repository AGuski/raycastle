import { ComponentContext } from '../entities/component';
import { Entity } from '../entities/entity';
import { resolveContactEvents } from './contact';
import { resolveWeaponStrike } from './weaponStrike';

/** Cross-entity passes that run after component ticks. */
export function runSystems(
  ctx: ComponentContext,
  entities: Iterable<Entity>
): void {
  resolveContactEvents(entities);
  resolveWeaponStrike(ctx, entities);
}
