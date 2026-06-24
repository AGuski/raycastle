/**
 * Logs when an entity with a ContactSensor first touches the player.
 *
 * OWNERSHIP NOTE: this system's only job is to detect the cross-entity event
 * (sensor entered contact) and dispatch it. The *response* to contact — damage,
 * pickups, triggers, etc. — belongs on the component that owns that behavior,
 * not here. Sustained contact attacks live on Attacker; keep this system a thin
 * detect-and-dispatch pass for one-shot contact events.
 */
export function resolveContactEvents(): void {
  // Contact damage is handled by Attacker.update while ContactSensor.inContact.
}
