# Ideas backlog (parking lot)

> **Status: unsorted backlog (June 2026).** A growable list of ideas that are
> *not* part of the current proposal. Nothing here is evaluated, prioritized, or
> committed — it's a place to capture thoughts so they aren't lost. Promote an item
> into [gameplay-overview.md](gameplay-overview.md),
> [economy-and-items.md](economy-and-items.md), or
> [technical-architecture.md](technical-architecture.md) only when it's been
> thought through.

**Entry convention:** one short heading, a sentence or two, and a *Relates to:*
line pointing at the concept it would extend. Keep it light. Add freely.

---

## Tavern-scoped chat rooms

Players who are in the same tavern at the same time share a chat room. A low-key
synchronous social touch layered on an otherwise async game, naturally scoped to a
place rather than global.

*Relates to:* outposts as the social/rendezvous hub; the (deferred) friend-connection
layer. Note: this is real-time-ish, but tightly scoped and optional, so it needn't
pull in full realtime architecture.

---

## Dynamic danger ratings for areas / chunks

Each area carries a danger rating that *players change over time*. Areas overrun by
monsters can be made more **secure** through player action (slaying monsters,
establishing outposts), while **abandoned** areas drift back toward danger. The map
becomes a living difficulty landscape shaped by the population, not by the
generator.

*Relates to:* the decay/persistence tiers; special locations; the "frontier"
concept. Pairs well with outpost upkeep (a maintained area stays safe; a neglected
one rots).

---

## Player-set spawn points / room renting

The world starts with one central spawn. Players can set their **own** claimed
taverns as spawn points, or **rent a room** (recurring cost) in another player's
tavern to spawn there. Rent gives a tavern owner income to cover **upkeep** — so a
well-placed, popular tavern can sustain itself on tenants.

*Relates to:* the outpost economy; gold sinks and outpost upkeep (closes a real
economic loop — owners earn, renters pay, upkeep drains); fast-travel / convenience
as a paid service.

---

## World building — barring and reopening passages

Players can bar off a passage (and later open it again), reshaping how the world is
traversed. A persistent, reversible structural change.

*Relates to:* the smart-cell overlay and persisted world deltas; collaborative
world-building; trade-route formation (barring a passage reroutes traffic).

---

## Unstable chunks — the unpredictable castle

The infinite castle is mysterious and not fully stable. Chunks can occasionally
become **unstable** and temporarily take on weird conditions — pitch dark, poison
gas, etc. — that make them dangerous, but also offer **extra rewards** during the
instability. A risk/reward weather system for places.

*Relates to:* the "mysterious, impermanent world" flavor that already justifies the
contention-smoothing grammar; risk/reward loot; visually a natural fit for the
post-process / shader passes (darkness, haze).
