# Gameplay overview

> **Status: exploratory draft (June 2026). Non-committal.** Companion to
> [economy-and-items.md](economy-and-items.md). For the engineering view, see
> [technical-architecture.md](technical-architecture.md) — not required reading
> for design feedback.

---

## TL;DR

A **multiplayer exploration-and-extraction game** set in an endless, shared,
persistent world. You venture out to find scarce treasure, bring it home to
player-built outposts, trade it, and survive what's in the dark. Combat is
**self-defense, not farming**. Other real players are present mostly through the
*traces and consequences* of their actions — what they built, claimed, looted, and
wrote — rather than as figures running beside you in real time.

It is deliberately **not** a "grind enemies for loot" dungeon crawler. The fantasy
is closer to a frontier: scavenging, hauling, trading, and laying down roots in a
world other people are shaping at the same time.

---

## The core fantasy

- **An endless, eerie world that is the same for everyone.** The map is infinite
  and procedurally generated, but it is one shared world — the chest you find is
  in the same place for every player, and so is the boss guarding it.
- **Scarcity, not abundance.** Valuable items are rare and *place-based*: guarded
  by bosses, locked behind challenges, or hidden in chests. They don't pour out of
  defeated enemies. Finding something good is an event.
- **Combat is a threat to survive, not a tap to farm.** Enemies make travel
  dangerous and guard what's worth having. You fight because you must, or to claim
  something specific — never to "farm drops."
- **The frontier matters.** The freshest, unlooted ground is where the best finds
  are. Pushing further out is the engine of the game, and it puts you in organic
  competition with other explorers heading the same way.

---

## The core loop

```
explore the frontier  →  find / fight for scarce treasure  →  haul it home
        ↑                                                          │
        └──────  rest, restock, craft, trade at outposts  ←───────┘
```

Everything feeds back: trading and crafting fund better expeditions; better gear
lets you reach more dangerous, more rewarding frontier. The economy that drives
this is detailed in [economy-and-items.md](economy-and-items.md).

---

## The social model

The defining choice: players share **one persistent world** but interact
**asynchronously** — you experience the *results* of each other's actions without
needing to be online together.

- **Strangers, by trace.** Most of the time you encounter other players through
  what they left behind: a tavern someone claimed and stocked, a message scrawled
  on a wall, a door someone unlocked, the ghost of a traveler who died here, the
  treasure that's already gone because someone beat you to it.
- **Friends, by connection.** When friends want to play *together*, they can link
  up and share progress / meet at known places. (The deeper "see each other move
  in real time" layer is designed-for but deferred — see the technical doc.)
- **Why async?** It keeps the world feeling alive and populated without the cost
  and fragility of real-time netcode, and it suits a slow, atmospheric,
  exploration-first game better than twitchy co-op would. The full rationale is in
  the technical doc.

This means the world is **collaboratively and competitively shaped over time** by
a whole population, even though you mostly play it alone.

---

## How permanent is the world?

Player actions persist, but not all at the same strength. Three tiers, tuned for
balance:

| Tier | Examples | Why |
| --- | --- | --- |
| **Permanent** | Unlocking a new area; a famous boss being slain; a structure that becomes a landmark | The world genuinely changes and remembers. These are the "this happened" moments. |
| **Decaying** | Outpost claims, stock, and messages; dropped loot; minor structures | Fades over time / inactivity. Self-balancing: nothing is hoarded forever, the world keeps churning, and abandoned things recycle for new players. |
| **Per-session** | A friend group's live encounter; transient enemy state | Only matters in the moment; nothing to persist. |

The **decay tier doubles as the anti-griefing and anti-stagnation system**: an
outpost a player stops maintaining lapses back to "abandoned" and can be reclaimed,
so early players can't fence off the map and bad actors' marks don't last.

---

## Special locations — the unifying concept

An infinite procedural world has a problem: no landmarks, no reason to go *there*
rather than *anywhere*. The answer is to let **players create the meaningful
places**, and to build them all from one shared idea:

> A **special location** is a spot that (a) exists in the same place for everyone
> and (b) carries persistent, often player-owned state.

The same primitive expresses several features:

- **Claimable outposts (taverns / shops).** Abandoned buildings scattered through
  the world. A player can claim one and turn it into a waypoint where others rest,
  restock, trade, and leave messages. As outposts spread and specialize in what
  they stock, **trade routes form organically** between them. This is the seed of
  the whole economy and the social heart of the game.
- **Resource sites.** Rarer spots — an old mineshaft, a fungal cave — where
  resources can be gathered. Like outposts, they can be contested or shared, and
  they anchor routes.
- **Boss lairs.** Dangerous places holding the best treasure, behind a fight.
- **Gated areas.** Places locked until someone finds the right key-item, which can
  open up whole new regions (see below).

Because they're all the same underlying thing, building one system gives you all
four — and players, by claiming and connecting them, draw the map's structure that
no designer placed.

---

## Competition vs cooperation — and why both

Player encounters split cleanly along *what kind of reward is at stake*:

- **Consumable rewards → competition.** A legendary weapon in a boss lair can only
  be taken once. Hints about it in the world spark an organic **race** — first to
  find it wins. Rivalry is content.
- **Permanent unlocks → cooperation.** A key-item that opens a *new area* benefits
  everyone once it's used — so players have reason to **collaborate** to find it.
  When one player opens the door, it stays open for all.

The catch with cooperative unlocks is the *free-rider problem*: if opening the area
helps everyone equally, why do the hard work yourself? So the **first to open a
shared thing gets a special reward** — a one-time treasure, first claim on the
outposts/resources inside, and lasting recognition (their name on a monument at the
entrance). That recognition doubles as a "deepest explorer / first founder" form of
fame, which is its own incentive to push the frontier.

---

## Open questions (design dials, not decided)

- How visible should other players' live presence be to friends — a dot on a map,
  a meetable figure, full co-op?
- How dangerous should the world feel by default — tense survival, or relaxed
  scavenging with danger spikes?
- How much authored hinting (rumors, murals) vs pure emergent discovery for the
  legendary teasers?

---

## Glossary

- **Async multiplayer** — players share a world and see each other's results, but
  needn't be online at the same time.
- **Special location** — a fixed-position spot with persistent state (outpost,
  resource site, boss lair, gated area).
- **Outpost** — a player-claimed building serving as a waypoint, shop, and message
  board.
- **The frontier** — freshly-reached, unlooted ground; where the best finds and the
  sharpest rivalries are.
- **Trace** — the lingering result of another player's action (a claim, a message,
  a ghost, an emptied chest).
