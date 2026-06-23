# Technical architecture — multiplayer

> **Status: exploratory draft (June 2026). Non-committal.** The engineering view of
> the gameplay described in [gameplay-overview.md](gameplay-overview.md) and
> [economy-and-items.md](economy-and-items.md).

---

## TL;DR

Ship **asynchronous** multiplayer, not realtime. The world is a pure function of a
**seed**, so a shared world costs essentially nothing to store — clients regenerate
identical geometry locally and only sync *deltas from that baseline*. A small
**authoritative transaction boundary** (serverless functions + a transactional DB)
governs the few consequential, contested mutations — minting unique items, claiming
outposts, opening permanent unlocks, trades — which makes item duplication and
illegitimate items impossible without running an authoritative simulation. "Instant"
contested changes are made to **feel** smooth by decoupling authoritative resolution
from client presentation and wrapping it in the world's own visual grammar. The whole
thing — game client, UI/menus, the authoritative endpoints, and admin tooling — ships
as a **single SvelteKit app on Vercel**; the 60fps simulation deliberately stays out
of the reactive UI layer.

---

## Why async over realtime

| | Async (chosen) | Realtime co-op |
| --- | --- | --- |
| World feeling alive | High (traces, builds, ghosts) | High |
| Netcode complexity | Low — discrete events | High — continuous state sync |
| Hosting | Effectively serverless (DB + edge functions) | Stateful server / managed actors |
| Art cost | Low — others appear as traces / simple avatars | High — directional avatars, remote-monster facing |
| Fit for a slow, atmospheric explorer | Strong | Weaker (built for fast co-op) |

Async delivers most of the "other people are here" payoff at a fraction of the cost
and fragility, and it suits the game's pace. Realtime is **designed-for but
deferred** (see "The friend-connection layer").

---

## Application topology & stack

**One app, not two.** The whole system ships as a single **SvelteKit app on Vercel**
that serves the game client, the UI/menus, the authoritative serverless endpoints,
and the admin tooling. The "server" in async multiplayer is just **stateless HTTP
endpoints + a database**, which colocate naturally with the client — there is no
separate server application and no long-lived game server.

**Why SvelteKit:**

- **Svelte is the chosen UI framework** for menus, HUD, inventory, shop, and
  crafting screens — its transition/animation primitives suit game-like UI, and the
  screen is free for DOM UI since the Canvas-2D path was removed (WebGL canvas only).
- It **unifies** the client, the endpoints (`+server.ts` / form actions), and the
  admin routes in one Vercel deploy.
- It runs on **Vite** under the hood, so the existing build tooling carries over.

**The hard rule — keep the simulation non-reactive.** The game loop mutates entity
and world state ~60×/second; routing that through Svelte reactivity (runes/stores)
is a performance footgun.

- The **simulation stays plain mutable TS**, ticked imperatively in the loop exactly
  as today. `engine/` and `game/` remain framework-agnostic and import nothing from
  Svelte.
- **Reactive state (runes/stores) is for the UI layer only:** menu state, the HP/gold
  shown in the HUD, inventory contents, dialogs.
- **Bridge at the boundary.** The game owns truth; a thin adapter pushes UI-relevant
  *snapshots* into Svelte state only when they change (HP changed, item acquired), at
  UI cadence — never the raw per-frame stream. One-shot events (toasts, "you were
  cursed") go through a small event emitter the UI subscribes to.

**Client-only game component.** WebGL cannot SSR — the canvas and loop mount in
`onMount` / behind a `browser` guard. SSR serves the menus, admin, and community
pages; the game itself is client-side.

**Migration note.** The game core (`engine/`, `game/`) ports as-is; only the
bootstrap (`main.ts` → a Svelte component that owns the canvas + loop lifecycle) and
the build config change. Do it deliberately when the first real menu lands.

---

## Foundation: the deterministic world

The world is generated from a seed: `chunkSeed(worldSeed, cx, cy)` feeding
`SeededRng` through `generateChunk` produces terrain, props, **and** enemy/loot
placement. This is the lever that makes everything cheap:

- **A shared world costs $0 of world storage.** Every client regenerates identical
  geometry from the shared seed. Nothing about the base world is transmitted or
  stored.
- **You only ever persist *deltas* from the procedural baseline** — claimed,
  looted, opened, built, written. A sparse override table keyed by world
  coordinate, applied at chunk-generation time. (This is exactly the mechanism the
  existing smart-cell overlay — `HiddenDoor` / `CellAnchor` / `world.setCell` —
  already uses; persisted player changes are the same shape.)
- **The generator is also the server-side validator.** Because generation is a pure
  function, the server can recompute "is a chest/boss/legendary *supposed* to be at
  (wx, wy)?" by running the same code — no world database required. Keep the
  generator isomorphic (pure TS, runs in Node and the browser).

The one place determinism works *against* you: **unique loot.** If a legendary is a
pure function of the seed, every player finds the same one → infinite duplication.
So unique loot is **deterministic in placement but persisted-as-consumed**: the
chest location is free (seed-derived), but *whether it's been looted* is a persisted
delta. First to reach it wins; others find it empty. This is what makes the frontier
valuable and rivalries real (see gameplay overview).

---

## Authority and anti-cheat boundary

We do **not** run an authoritative simulation. We put an authoritative *transaction
boundary* on the handful of consequential, contested mutations. Everything else is
client-side.

| Client-authoritative (no server) | Server-authoritative (validated) |
| --- | --- |
| Movement, look, rendering | Minting / granting a unique item |
| Combat vs your own enemy instances | Claiming an outpost or resource site |
| Consuming your own potions | Opening a permanent world-unlock |
| Picking up common loot | Trades / ownership transfers |
| Reading messages, seeing ghosts | Gold / resource balances; death-drop records |

The right column is all **infrequent, discrete events** — ideal for stateless
serverless functions + a transactional DB.

**Principles:**

- **Never trust the client's claimed outcome.** The client *requests* an action
  ("I looted X at (wx,wy)"); the server validates (does the generator say a chest is
  there? is it unlooted in the DB? is the player plausibly eligible?) and *decides*.
- **The server is the sole minter of unique items.** Each carries a server-generated
  signed identity + provenance; the DB is the only writer of "item X owned by player
  Y"; trades are atomic ownership swaps. A client therefore **cannot fabricate or
  duplicate** a unique item. Economy integrity is solid by construction.
- **Hot contested keys** (a specific chest, a specific outpost) resolve via an atomic
  compare-and-swap / conditional write (or a per-key Durable Object) so it is strict
  first-writer-wins.

**Honest limitation:** because position is client-reported in async, you cannot
fully prevent *movement* cheating (claiming you reached something implausibly fast).
Mitigate — don't eliminate — with rate limits and plausibility checks on
time/distance between a player's successive authenticated actions. This is
acceptable: the threat model is mild (mostly cooperative, no real-money PvP), and
the thing that actually matters — minting yourself items you didn't earn — is
impossible because the server owns minting.

**Stack sketch:** a single **SvelteKit app on Vercel** (client + UI + endpoints +
admin — see *Application topology & stack*) backed by a transactional store (e.g.
Postgres/Supabase; Durable Objects / a row-lock for hot keys). The endpoints are
stateless serverless functions; no long-lived game server.

---

## The friend-connection layer (deferred)

"Friends can play together live" is the one feature that needs more than async. It
does **not** require rebuilding as a server-authoritative sim:

- Small invited sessions, **client-authoritative**, via a managed realtime actor
  service (PartyKit / Cloudflare Durable Objects / Colyseus) — "serverless realtime"
  in the sense of *not managing boxes*.
- Because the world is just a seed, you **sync only player avatars and the few
  enemies near the group** — never the world.
- Remote players can start as a simple billboard + nameplate (raycaster sprites
  always face the camera, so no rear-view art is needed); directional sheets are
  optional later polish. Rendering remote players/ghosts through the existing
  `darkMiasma` sprite effect gives a free "this is a phantom/visitor" read.

Outposts are the natural rendezvous: a known coordinate to meet at, meaningful in
both async (leave messages) and live (gather there) modes.

---

## Making "instant" changes feel smooth

Contested async changes (someone grabs the legendary a beat before you; an outpost
is claimed while you watch) must not feel like a glitchy pop. The principle:

> **Authoritative truth flips instantly server-side; the client never renders it as
> a snap — it plays an authored transition. And the world's visual grammar of
> impermanence is established from minute one, so contested change is already
> legible.**

Toolbox:

1. **Reframe — most witnessed changes aren't losses.** An outpost being claimed in
   front of you *gains* you a waypoint. Present it as a pleasant event (lights come
   on, a banner unfurls, a bell, a toast: "Traveler Vesh claimed the Old Tavern").
2. **For a true loss, show the rival.** Reach the chest a beat late → see a fading
   **phantom of the winner** taking it (reuses the async ghost system). The empty
   chest now has a *visible cause* — rivalry, not bug.
3. **Transition, never snap.** The item shimmers and dissolves (via the
   `darkMiasma` effect) rather than blinking out. If relics are established early as
   "unstable, half-phased echoes," phasing away *is* the world's language.
4. **Soft reservation with a short TTL.** Entering interaction range requests a
   brief server lock (cheap CAS/TTL key), collapsing "we grabbed at the same
   millisecond" into "first to *approach* wins." True simultaneity is rare in an
   infinite world, so the richer graceful path fires seldom and is affordable.
5. **Avoid mutating the foveal view** when a change needn't land *right now* — swap
   visuals on next-enter-view or behind a fade.

**Lore wrappers** (the in-game justification) fall out of the async identity:

- Relics are unstable echoes "contested by fate"; claimed by another, they "collapse
  into that traveler's thread."
- The world is haunted by other travelers' ghosts, so a phantom beating you to a
  chest is established texture, not intrusion.
- Outposts "wake up" when claimed — lit windows, smoke, a bell.

The elegance: the ghost system, the `darkMiasma` shimmer, and the impermanence
grammar are all things the async design wants *anyway*. The smoothing is the game's
own visual language doing double duty, not a band-aid bolted on.

---

## How this maps to the current engine

| Need | Existing system to reuse |
| --- | --- |
| Shared world, no storage | `chunkSeed` / `SeededRng` / `generateChunk` determinism |
| Persisted player changes (claims, builds, opened doors) | Smart-cell overlay: `HiddenDoor` / `CellAnchor` / `world.setCell` |
| Server-side validation of world contents | Run the same (isomorphic) generator in Node |
| Spatial sharding / "only nearby matters" | Chunk streaming `loadRadius` / `unloadRadius` |
| Phantoms, visitors, dissolving relics | `spriteEffect` / `darkMiasma` shader; billboarded sprites |
| Curse-hunter on item pickup | The existing `hunterLich` actor |

---

## Admin, tooling & live tuning

Because the server's authoritative state lives behind the same data/service layer the
game uses, an admin interface is largely *another client of that layer* — SvelteKit
`/admin/*` routes rendered server-side against the same DB. Its purpose: inspect and
manage stateful data (unique items, economy, claims), debug without going through the
game client (e.g. verify that resource distribution across the map is correct), and
tweak balance parameters.

**Principles / requirements:**

- **Privileged surface — gate it server-side.** Real auth plus a server-enforced role
  check (never a client-side `isAdmin` flag), enforced in `+layout.server.ts` / hooks
  so the *data* is gated, not just the UI. Keep it in its own route group.
- **Audit every mutation.** Log who changed what, when — you'll want this for
  debugging economy anomalies regardless.
- **Server-tunable vs build-time constants.** Today all tuning lives in `CONFIG`
  (`config.ts`), baked into the client at build. Split it: **economy/balance knobs**
  (loot/resource densities, upkeep costs, decay timers, drop rates) move to a
  **DB/server config** so they can change without a redeploy; **client feel constants**
  (FOV, fog, weapon bob, animation speed) stay in code. Don't DB-drive everything —
  draw the line at "economy/balance = server-tunable, rendering/feel = code."
- **Start read-only.** Inspection (query an item, view a player, heatmap a region) is
  low-risk and high-value. Mutation and tuning — where the security and audit burden
  lives — come second.

**The generator distribution debugger.** An admin view that runs the generator over a
region and visualizes resource/loot/enemy distribution (a heatmap over chunk coords)
both validates world balance *and* only works because the generator is the pure
isomorphic module the server can run headless. It is therefore the twin of the live
anti-cheat validator (same module), and a forcing function for extracting that module
early. It is valuable even in single-player, so it's worth building **before the
generator is frozen**.

---

## Open questions

- Loot consistency tiering: which item classes are per-player-instanced (simple, no
  contention) vs globally-consumed (scarce, transactional). Likely both, with the
  line as a balance dial.
- Choice of DB / hot-key consistency primitive.
- Identity/auth for players and friend graphs.
- Exactly which mutations need strict atomicity vs eventual consistency.
