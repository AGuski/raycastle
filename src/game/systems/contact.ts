import { ContactSensor } from '../entities/components/contactSensor';
import { Entity } from '../entities/entity';

/** Logs when an entity with a ContactSensor first touches the player. */
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
