# Economy and items

> **Status: exploratory draft (June 2026). Non-committal.** Companion to
> [gameplay-overview.md](gameplay-overview.md). Item *integrity* and anti-cheat
> are covered in [technical-architecture.md](technical-architecture.md).

---

## TL;DR

A small, elegant resource economy designed to **avoid the loot-grind trap**. Three
resources map to three crafting domains. Items are scarce and place-based. The
system is deliberately balanced with real **sinks** (things that consume goods), so
the economy circulates instead of inflating. Powerful items are kept in check not
by weak stats but by **costs, curses, and trade-offs** — which turn rewards into
interesting decisions rather than power-creep.

---

## Resources

Three resources, each with one clear purpose. Orthogonality keeps it simple to
value and reason about.

| Resource | Where it comes from | What it's for |
| --- | --- | --- |
| **Ore** | Mined from old mineshafts and caves | Craft and repair common gear; bulk ingredient in unique gear |
| **Fungi** (and other organics) | Farmed from caves and similar | Craft food (restores health) and potions |
| **Gems** | Found in chests; recovered by melting unique gear | Craft unique gear and magic items |

---

## Items

| Item type | Source | Decay | Notes |
| --- | --- | --- | --- |
| **Common gear** (armor/weapons) | Crafted from ore, bought at outposts, looted from player corpses | Wears with use; **very durable**, repairable, eventually breaks | The everyday tier; the durability sink keeps ore in demand |
| **Unique gear** | Crafted from ore + gems (rare recipes), found in boss lairs and special places | None | Doesn't decay; can be **melted back** into ore and gems |
| **Magic items** | Crafted mainly from gems | None | The "spend gems" luxury tier, like unique gear |
| **Consumable potions** | Crafted from fungi | n/a (used up) | Different fungi → different effect combinations |
| **Consumable food** | Crafted from fungi / organics | n/a (used up) | Restores health |

Everything can also be traded — for resources, for other items, and (if/when it
exists) for **gold**. See the note on gold below.

---

## Why this avoids the grind trap

The reason "kill enemies for drops" feels like a grind is that it's a **faucet with
no sink**: loot piles up, value inflates, and the only response is more grinding.
This economy deliberately has matching sinks, so goods *circulate and get consumed*
rather than accumulate.

| Resource | Faucet (in) | Sink (out) | Inflation risk | Watch out for |
| --- | --- | --- | --- | --- |
| **Ore** | Mining (renewable, abundant) | Crafting + repair | **High** | Very durable gear means little repair demand → ore oversupplies. Make unique recipes consume *a lot* of ore (or split common/rare ore). |
| **Fungi** | Farming | Consumables — **destroyed on use** | **Low** | The healthiest part of the economy. But too much fungi + strong healing removes combat tension; tie fungi scarcity to difficulty. |
| **Gems** | Chests + recycled unique gear | Unique/magic crafting | **Low** | Nearly closed loop; net supply gated by *exploration*. Protect this — don't add a cheap gem faucet. |

**Two consequences worth designing around:**

1. **Consumables should anchor the early economy.** They're the only thing that
   vanishes on use, so they self-balance, and they directly support survival
   combat (fight → spend potions → need more fungi).
2. **Ore is the oversupply risk**, precisely because durable gear is desirable. The
   fix is to make ore the bulk ingredient in expensive high-end crafting so demand
   soaks up the surplus.

---

## Two big balance dials

### Gold and inflation

"Everything trades for gold at shops" is the most dangerous line in the design. If
an NPC shop prints gold for anything you sell, that's an infinite money faucet →
runaway inflation → late joiners priced out. Options, in order of preference:

1. **Defer gold entirely at first.** Let ore/gems *be* the currency. An abstract
   money layer only earns its complexity once there's a real player market.
2. If gold exists, make it primarily **player-to-player** (a closed, zero-sum
   medium) rather than something NPCs mint.
3. Give gold **strong recurring sinks** — the best being **outpost upkeep**, which
   also powers the claim-decay loop. Repair/craft fees and fast-travel are
   secondary sinks.

### Death and loss severity

This single dial defines the whole feel of the game. When you die, how much do you
lose?

| Setting | Feel | Risk |
| --- | --- | --- |
| Drop everything | Maximum stakes | Rage-inducing; corpse-camping |
| **Drop common gear + carried loot; equipped uniques get a recovery window** | High stakes, still fair | *Recommended starting point* |
| Keep everything | Cozy exploration | Low tension |

Recommended: common gear and un-equipped carried loot drop onto your corpse (where
others can find them — a real sink and a faucet for someone else); equipped unique
gear has a short window to be recovered at your corpse before anyone else can take
it. Keeps the unique-item chase thrilling without making one bad fight a disaster.

---

## Unique items: power kept interesting

Unique gear should range from *slightly cool* to *absurdly powerful and expensive*,
so players can spend a long time hunting or crafting for them. The trick to having
crazy-powerful items **without breaking the game** is to make power come with
*cost, risk, or strangeness* — the danger does the balancing, so you don't have to
tune raw stats perfectly.

- **Beyond combat buffs.** Items can do unexpected things: move faster, "ping"
  nearby loot or secrets, see in the dark, etc. — not just +damage.
- **Trade-offs.** Speed boots that cost armor; a loot-sense ring that also alerts
  nearby enemies; a hungry blade that slowly drains health (and so must be fed with
  food — coupling a powerful item to an ongoing resource cost).
- **Curses.** Picking up a mighty sword might **curse** you — e.g. mark you to be
  hunted by a vicious lich until you deal with it. A reward becomes an *event*.
  Curses can even be **passed to another player** by trading the item — emergent
  social comedy ("here, hold this").
- **Teasers and races.** The most powerful items are *hinted at* in the world
  (rumors, murals, clues), creating an organic competition between players to find
  them first.
- **Keys to more.** Some unique items have a **secondary purpose** — opening a
  specific locked door, or unlocking a whole new area. These invite *cooperation*
  (see the competitive-vs-cooperative split in the gameplay overview), because
  unlocking an area benefits everyone.

### Ideas to deepen items cheaply

- **Provenance / history.** Since items persist and circulate, attach a short
  history to each: who forged it, which boss it came from, who died holding it. A
  sword that killed a famous player is worth more for its *story* than its stats.
  Nearly free to store; huge for emergent value and attachment.
- **Combinatorial sockets.** Rather than a bespoke recipe per item, let players
  slot **gems into gear** (and combine **fungi types into potions**). A small set
  of components × slots produces a large effect space — depth without content
  bloat. This is the most "simple and elegant" path to variety, and it reuses the
  same combinatorial idea across both gems and fungi.
- **Attunement / binding.** A unique item used heavily can bind to a player —
  stronger, but no longer tradeable. Players choose between *power* (keep) and
  *liquidity* (trade), which also throttles how fast top items flood the market.

---

## Balancing watch-list (summary)

- Ore oversupply (durable gear → low repair demand). Counter with heavy high-end
  ore costs.
- Gold inflation. Counter by deferring gold, keeping it player-to-player, or adding
  strong sinks (outpost upkeep).
- Healing abundance vs combat tension. Tie fungi scarcity to difficulty.
- Death severity. The master dial for the game's whole risk feel.
- Top-tier item flooding. Counter with attunement, curses, melt-sinks, and
  exploration-gated gem supply.

---

## What to build first (keep it simple)

The danger with a design this rich is building the whole matrix before any of it is
fun. The minimal loop that proves the concept:

> **Fungi → food/potions → heal**, layered on survival combat, plus **ore →
> repair** for gear durability.

That's one renewable resource feeding consumables (the healthiest economy) and one
feeding upkeep: *gather, craft, fight, sustain.* Validate that this is fun before
adding gems, gold, magic items, recipes, and (much later) automated supply chains.

The one "advanced" thing worth pulling forward early is the **cursed-item-spawns-a-
hunter** beat — it reuses an existing enemy and delivers a lot of delight for little
effort.

---

## Far-future note

Long-term, players setting up **automated, steampunk-themed supply chains** (a
machine that works a claimed resource site over time) is an appealing north star.
It stays cheap to reach *if* resources are modeled as typed quantities and crafting
as data-driven recipes from the start. Designing that layer cleanly now keeps the
door open; retrofitting it later is the painful path. Not a near-term goal.
