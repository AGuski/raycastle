# Entity composition architecture

This document describes Ray Castle's **low-complexity, composable component model**
for game entities — moving actors, static props, and interactive grid cells. Like
the rendering doc, it explains the *shape* of the system and the *why*, so
contributors (human or AI) extend it consistently instead of growing one-off flags
and subclasses.

---

## TL;DR

A **GameObject + Component** model (the pragmatic middle ground used by Unity's
`MonoBehaviour`s, Godot nodes, and most indie engines) — **not** a full
data-oriented ECS.

- An **Entity** is a thin container: a world position plus a typed bag of
  **components**.
- A **Component** is one isolated, reusable piece of state + behavior. You
  compose an entity by *adding* the components it needs at spawn time.
- **Systems** are plain functions that query entities by component and implement
  cross-entity logic (strikes, contact reactions, interactions).
- The **renderer stays decoupled**: it reads a structural render view; a render
  component produces that view from entity state and sibling components.

Everything is extended the same way: "add a component" or "add a system," not
"add another flag to a config" or "add another subclass."

---

## Why this model

- **Composition over configuration flags.** Movement, hit response, contact
  sensing, and visual effects are separate components composed at spawn time,
  not optional fields on a shared class with growing `if` chains.
- **One pattern for every entity kind.** Hostile actors, static props, and smart
  grid cells all use the same Entity + Component + System shape.
- **Behaviors are independently testable.** Each component and system is a small
  unit with a narrow public API.
- **Pay for what you use.** A plain wall cell stays a primitive grid value; only
  cells or objects that need behavior get an entity overlay.

---

## Design goals & non-goals

**Goals**

- One consistent way to add behavior to any entity kind.
- Components are reusable and do not know each other's internals.
- Minimal framework: no archetypes, bitsets, or codegen.
- Renderer reads a flat render view, never gameplay component types.
- Tuning data lives in centralized config; components hold runtime state.

**Non-goals**

- **Not** a data-oriented / archetype ECS. Entity counts are modest; packed
  component arrays would add complexity without measurable benefit.
- **Not** a message bus or event framework. Sibling coordination uses typed
  optional queries on the same entity.
- **Not** wrapping every grid cell in an object. The collision grid stays
  primitive; only interactive cells get a sparse entity overlay.

---

## Core concepts

### Entity

A position (`x`, `y`) and a typed map of components. The entity owns no behavior
itself — it stores components and ticks them in insertion order.

Each component type may appear at most once per entity. Lookup is by constructor:
`entity.get(SomeComponent)`.

### Component

One responsibility, optional lifecycle hooks:

- `onAttach(entity)` — wire up references to the host or siblings
- `update(ctx)` — per-frame tick (omit for pure-data or view-only components)
- `dispose()` — cleanup when the entity is removed

Components expose a small intention-revealing API (e.g. `applyKnockback`,
`getHitFlash`). They are the unit of reuse and the unit of testing.

### ComponentContext

A stable per-tick object passed to every component and system:

| Field | Role |
| --- | --- |
| `dt` | Seconds since last tick |
| `time` | Accumulated world time (flash, animation timing) |
| `world` | Collision queries, cell access, optional cell mutation |
| `player` | Read-only player snapshot (position, swing state, …) |

New shared per-frame data is added here — not by changing every signature.

### Sibling queries

Components may *read* siblings on the same entity via `entity.get(...)`, but never
construct siblings or assume they exist. Soft dependencies use optional chaining:

```ts
update(ctx) {
  if (this.entity.get(Knockback)?.isActive()) return;
  // …movement logic…
}
```

**Component order matters.** Components tick in the order they were added. When
one behavior must run before another in the same tick (e.g. knockback displacement
before movement reads position), add it first and document the order at the spawn
site.

### Systems

Behavior that spans many entities, or that originates outside an entity (e.g. the
player's weapon), is a **system**: a plain function over an entity collection that
filters by component.

```ts
function resolveHits(ctx: ComponentContext, entities: Iterable<Entity>) {
  for (const entity of entities) {
    const hittable = entity.get(Hittable);
    if (!hittable) continue;
    if (!inRange(ctx.player, entity)) continue;
    hittable.applyHit(ctx.time);
  }
}
```

Rule of thumb: **per-entity behavior → component; relationships between entities
→ system.**

Sensors (contact, proximity) update state on the component during the entity tick;
systems *react* to that state (logging, damage, UI) in a separate pass.

---

## Entity kinds

| Kind | Storage | Typical composition |
| --- | --- | --- |
| Moving actor | Dynamic entity list | Render + movement + optional hit/contact components |
| Static prop | Per-chunk entity list | Render only; add collectible/destructible later |
| Smart grid cell | Sparse per-chunk overlay | Cell anchor + door/trigger component |
| Plain wall / floor | Primitive grid cell | None |

### Moving actors

Spawn recipes compose components from config — movement, render, hit response,
contact sensing — rather than a monolithic actor class:

```ts
new Entity(x, y)
  .add(new HitResponse())
  .add(new ChaseMovement({ speed, sightRange }))
  .add(new ContactSensor(proximityRadius))
  .add(new Renderable(texture, animator));  // often last: reads final position
```

Friendly NPCs omit hit-response components; they simply won't match strike
systems.

### Static props

A lamp is an entity with a render component only. Making it breakable is purely
additive — attach a destructible or hit-response component and reuse the same
strike system as actors.

### Smart grid cells

The map grid is a flat array of cell values because the raycaster reads it
constantly. Interactive cells use a **sparse overlay**: a small list of entities
per chunk, each anchored to a grid coordinate.

Smart-cell components **mutate the grid in place** (e.g. toggle between solid and
empty). The raycaster sees the cell change; it never learns about "doors" or
"triggers."

```ts
update(ctx) {
  const near = distance(ctx.player, this.cellCenter) < openRadius;
  if (near !== this.open) {
    this.open = near;
    ctx.world.setCell?.(wx, wy, near ? EMPTY : this.solidCell);
  }
}
```

---

## Rendering boundary

The renderer consumes a structural **render view** (texture, position, animation
time, optional effects). A render component *produces* that view and pulls visual
modifiers from siblings:

```ts
get view() {
  return {
    texture: this.texture,
    get x() { return this.entity.x; },
    get y() { return this.entity.y; },
    getHitFlash: (t) => this.entity.get(Hittable)?.flashAt(t) ?? 0
  };
}
```

The world collects render views from all entities that carry a render component.
Render passes never import gameplay component types.

---

## Per-frame flow

```
1. Stream / load chunks
2. Tick smart-cell entities (doors, triggers)
3. Tick dynamic entities (components update in insertion order)
4. Apply player input
5. Run systems (contact events, weapon strike, …)
6. Render: collect render views → draw
```

Components handle *self* behavior in steps 2–3; systems handle *relationships*
in step 5; rendering reads a flat view in step 6. Each layer only knows its own
contract.

---

## Conventions

- **One responsibility per component.** If the name needs "and," split it. Hit
  response and health/death are separate concerns.
- **Tuning in config, state in components.** Constructor receives config knobs;
  component holds runtime state.
- **Soft sibling dependencies only.** `entity.get(Sibling)?.method()` — never
  assume a sibling exists.
- **Cross-entity rules are systems.** Two entities (or player + entity) deciding
  something together → system, not component.
- **Renderer never imports components.** Only the render view interface.
- **Prefer composition over new subclasses or config flags.** Those are the
  smells this model exists to prevent.

---

## When NOT to use a component

- **Pure rendering variation** (fog, shader effects) → render pass or material
  variant, not a gameplay component.
- **Static, never-interactive geometry** → leave it a primitive grid cell.
- **One-off glue with no state and no reuse** → a plain function is fine.

---

## Code organization (general)

| Area | Responsibility |
| --- | --- |
| Entity primitives | Container, component interface, shared context types |
| Components | One file per component; grouped in a components directory |
| Spawn recipes | Functions that compose entities for a specific purpose |
| Systems | Cross-entity logic; grouped in a systems directory |
| World | Owns entity collections, ticks components, runs systems, exposes render views |

Follow existing naming and file layout in the codebase when adding new components
or systems — the exact filenames will evolve; the responsibilities above will
not.

---

## Glossary

- **Entity** — position + a typed set of components. Owns no behavior itself.
- **Component** — one reusable unit of state + behavior attached to an entity.
- **System** — a function over many entities that implements relationships.
- **Spawn recipe** — a function that composes an entity for a specific purpose.
- **Render view** — the structural data the renderer consumes; produced by a
  render component.
- **Smart cell** — a grid cell with an entity overlay for behavior; plain cells
  remain primitive values.
