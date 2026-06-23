import { ContactSensor } from '../entities/components/contactSensor';
import { Entity } from '../entities/entity';

/**
 * Logs when an entity with a ContactSensor first touches the player.
 *
 * OWNERSHIP NOTE: this system's only job is to detect the cross-entity event
 * (sensor entered contact) and dispatch it. The *response* to contact — damage,
 * pickups, triggers, etc. — belongs on the component that owns that behavior,
 * not here. When real logic replaces the console.log, add a method to the
 * relevant component (e.g. `entity.get(Damageable)?.onContact(ctx)`) and call
 * it from this loop, the same way weapon-strike resolution lives on Strikeable
 * and BreakableWall rather than in the strike system. Keep this system a thin
 * detect-and-dispatch pass; do not grow per-component branches inside it.
 */
export function resolveContactEvents(entities: Iterable<Entity>): void {
  for (const entity of entities) {
    const sensor = entity.get(ContactSensor);
    if (!sensor?.enteredContact) continue;
    console.log('[contact] actor touching player', {
      x: entity.x,
      y: entity.y
    });
  }
}
