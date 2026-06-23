# Ray Castle — design exploration

> **Status: exploratory draft (June 2026). Non-committal.**
> These documents capture a brainstorm about turning Ray Castle from a tech demo
> into a game. Nothing here is decided or scheduled. They exist so the thinking
> survives outside a chat log and can be critiqued. Expect ideas to be cut.

Ray Castle today is a strong **engine** (hybrid CPU raycaster + WebGL2 shaders,
infinite procedural world, entity-component model) with no gameplay loop yet. The
open question is *what kind of game it should become*. The current direction under
discussion is a **multiplayer extraction economy in a shared, persistent, infinite
world** — explored asynchronously by strangers, optionally live with friends.

---

## How to read this

The docs are split so gameplay can be reviewed **without** wading through
architecture.

| Doc | Audience | What it covers |
| --- | --- | --- |
| [gameplay-overview.md](gameplay-overview.md) | Anyone giving design feedback | The fantasy, the core loop, the social model, persistence, and the "special locations" concept. **Start here.** |
| [economy-and-items.md](economy-and-items.md) | Anyone giving design feedback | Resources, crafting, gear tiers, consumables, unique-item design (curses, teasers, keys), and economic balance. |
| [technical-architecture.md](technical-architecture.md) | Engineers | Why async over realtime multiplayer, the authority / anti-cheat boundary, serverless approach, and how "instant" world changes are made to feel smooth. |
| [ideas-backlog.md](ideas-backlog.md) | Anyone | A growable parking lot for ideas **not** in the current proposal. Unsorted, uncommitted; capture-only. |

**For gameplay feedback:** read the two gameplay docs and ignore the technical one.
Plain-language summaries throughout; no engine knowledge assumed.

---

## One-paragraph pitch

You wake in an endless, decaying castle-world that is **the same world for every
player**. You explore outward, scavenging scarce, often strange treasures —
guarded by bosses, locked behind challenges, or hidden in the dark. Fighting is
about *survival*, not farming. You haul what you find back toward player-claimed
taverns and outposts to rest, restock, trade, and leave word for the next
traveler. The frontier is where the best loot is and where rivals race you for it.
Over time, the things players build and unlock reshape the world for everyone who
comes after.

---

## Open threads (not yet resolved)

- Loot consistency tier: which items are per-player vs globally scarce (see economy doc).
- Death-loss severity — how much you drop when you die (see economy doc).
- Whether **gold** exists early, or resources *are* the currency (see economy doc).
- The friend-connection (live) layer — designed-for, deferred (see technical doc).
