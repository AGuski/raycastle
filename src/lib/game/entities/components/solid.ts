import { Component } from '../component';

/**
 * Marks an actor as a physical obstacle the player cannot walk through, within
 * `radius` world units of its center. Heavies (the Warden) use this to body-block
 * corridors so they can't simply be run past; light skirmishers stay non-solid
 * so swarms remain wade-through-able.
 */
export class Solid implements Component {
  constructor(readonly radius = 0.5) {}

  // Pure-data component; no per-tick behavior. Present to satisfy Component.
  onAttach(): void {}
}
