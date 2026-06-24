import { RaycastWorld } from '../../engine/raycaster';
import { MapCell } from '../../types';

/** Read-only player snapshot passed to components each tick. */
export interface PlayerView {
  x: number;
  y: number;
  direction: number;
  sheathed: boolean;
  swingProgress: number;
  swingId: number;
}

/** Collision and spatial queries available to components. */
export interface GameWorld extends RaycastWorld {
  isOpen(x: number, y: number): boolean;
  /** Mutate a grid cell in place (smart cells only). */
  setCell?(wx: number, wy: number, cell: MapCell): void;
  /** Remove a smart-cell entity after it is destroyed. */
  removeCellEntity?(entity: Entity): void;
  /** Remove a dynamic actor entity (e.g. after death dissolve). */
  removeEntity?(entity: Entity): void;
  /** Apply damage to the player from an enemy attack. */
  damagePlayer?(amount: number): void;
}

/** Per-tick context shared by all components and systems. */
export interface ComponentContext {
  /** Seconds since last tick. */
  dt: number;
  /** Accumulated world time in seconds (for flash/animation timing). */
  time: number;
  /** Collision queries, cell access, and entity queries. */
  world: GameWorld;
  /** Read-only snapshot of the player. */
  player: PlayerView;
}

export interface Component {
  /** Wire up references to the host entity / siblings. */
  onAttach?(entity: Entity): void;
  /** Per-frame tick. Omit for pure-data or render-only components. */
  update?(ctx: ComponentContext): void;
  /** Release GPU/timer resources, unregister, etc. */
  dispose?(): void;
}

/** Constructor type used for type-safe component lookup. */
export type ComponentClass<T extends Component> = abstract new (
  ...args: never[]
) => T;

// Forward declaration — implemented in entity.ts.
export interface Entity {
  x: number;
  y: number;
  add(component: Component): Entity;
  get<T extends Component>(type: ComponentClass<T>): T | undefined;
  has(type: ComponentClass<Component>): boolean;
  update(ctx: ComponentContext): void;
  dispose(): void;
}
