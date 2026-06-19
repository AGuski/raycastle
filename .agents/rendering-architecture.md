# Rendering architecture

This document explains how Ray Castle draws a frame, and where it sits in the
broader landscape of game rendering engines. It is intentionally
light on code — it describes the *shape* of the system and the *why* behind it,
so that new contributors (human or AI) extend it the right way.

---

## TL;DR — what kind of engine is this?

Ray Castle is a **hybrid 2.5D raycaster**:

- **Geometry and visibility** are computed **on the CPU** with classic
  grid-based ray casting (the Wolfenstein 3D / `playfuljs` technique).
- **Shading, texture sampling, fog, and compositing** happen **on the GPU**
  in WebGL2 fragment shaders.

So no, it is **not a "real" 3D engine**. There is no 3D mesh, no vertex
transform pipeline, no depth buffer in the traditional sense, no camera matrix.
The world is a 2D grid of cells, and "3D" is an illusion produced by drawing
vertical strips at heights derived from distance. What's modern about it is that
the *pixel-filling* work — which a 1990s engine did by hand in a tight CPU loop —
is now done by shaders.

Think of it as **"old-school raycasting math, new-school pixel pipeline."**

---

## The two halves of a frame

Every frame is produced in two distinct stages.

### 1. CPU stage — "where are the walls?"

For each screen column (there are `resolution` columns, e.g. 640), the engine
casts one ray from the player into the 2D grid until it hits a solid cell. From
each ray it records:

- the **perpendicular distance** to the wall (used for sizing and depth),
- **which cell face** was hit (north/south/east/west),
- the **texture offset** along that face (where along the wall the ray landed),
- the **block** that was hit (which carries its per-side textures).

The distances for all columns are stored in a **z-buffer** (one float per
column). The full per-column ray data is cached for the passes that need it.

This stage is pure math and game state. It owns *visibility* — what is in front
of what. Nothing is drawn yet.

### 2. GPU stage — "what color is each pixel?"

The CPU results are handed to WebGL2, and a fixed ordered list of **render
passes** fills the framebuffer. The z-buffer is uploaded to the GPU as a
1-pixel-tall texture so shaders can test occlusion per column.

The passes run in this order (painter's order, back to front):

| Order | Pass | What it draws | How |
| --- | --- | --- | --- |
| 1 | **Floor / Ceiling** | The horizontal planes | One fullscreen quad; a fragment shader reconstructs the world position of every pixel and samples the floor or ceiling texture. |
| 2 | **Walls** | Vertical wall strips | One thin quad per screen column, batched by texture; the shader samples a single texture column. |
| 3 | **Sprites** | Billboarded objects (lamps, etc.) | Column strips like walls, but z-tested against the wall z-buffer and alpha-blended. |
| 4 | **Weapon** | The first-person weapon | A single screen-space quad with bob offset. |
| 5 | **Post** | Vignette | A fullscreen quad blended on top. |

Each pass is self-contained: it owns its shader program, its geometry buffers,
and its uniforms. A pass receives everything it needs for the frame through a
shared **frame context** (canvas size, player, world, z-buffer, ray cache,
timing, etc.).

---

## Why this split?

The original engine did *everything* on the CPU, including the per-pixel
floor/ceiling fill, which is the most expensive part (it touches every pixel of
the lower and upper half of the screen every frame). That loop is what motivated
the move to shaders.

Moving pixel work to the GPU buys us:

- **Hardware texture filtering** — the floor/ceiling use mipmapped, bilinearly
  filtered textures, which removes the shimmering/noise that nearest-neighbor CPU
  sampling produced at distance.
- **Free fog / light fall-off** — distance fog is a couple of shader
  instructions instead of a per-pixel CPU blend.
- **Headroom** — the CPU is freed up for game logic and the raycast itself.

We deliberately **kept the raycast on the CPU** because:

- It is cheap (one ray per column, not per pixel).
- It is the source of truth for game logic (collision, AI line-of-sight, etc.
  can reuse it).
- Porting grid traversal to the GPU would add a lot of complexity for little
  gain at this resolution.

---

## Key design choices worth knowing

- **Columns, not pixels, are the unit of geometry.** Walls and sprites are drawn
  as 1-texel-wide vertical strips stretched horizontally — exactly like the old
  `drawImage(texture, texX, 0, 1, h, ...)` Canvas approach, just expressed as GPU
  quads. Each column samples a *single, constant* texture column, which is what
  keeps walls crisp and stable instead of smeared.
- **The z-buffer is a texture.** Because floor/ceiling and sprite passes run as
  shaders, they read per-column depth by sampling a small GPU texture rather than
  a CPU array.
- **Passes are batched by texture.** Wall columns that share a texture are drawn
  together to minimize state changes. (Grouping must key on the actual texture
  *object*, not a stringified handle — getting this wrong collapses every wall
  onto one texture.)
- **Shaders are imported as strings** via Vite's `?raw` import. Common GLSL (the
  fog function) lives in a shared snippet that is concatenated into the fragment
  shaders that need it. No shader-loader library, no Three.js.
- **One visible canvas, WebGL2 only.** There is no Canvas 2D fallback and no
  hidden compositing canvas. `Renderer` is a thin facade over the WebGL renderer
  so the rest of the game doesn't know about GL.
- **Animated textures are sprite-sheet offsets.** An animated wall (e.g. fire)
  is a horizontal strip of frames; the current frame just shifts which texture
  column is sampled. There is no separate animation system.

---

## How this compares to other engines

| Approach | Geometry | Pixel filling | Examples |
| --- | --- | --- | --- |
| **Classic raycaster** | 2D grid, CPU rays | CPU per-pixel loops | Wolfenstein 3D, `playfuljs`, the *original* Ray Castle |
| **Ray Castle today** | 2D grid, CPU rays | **GPU fragment shaders** | (this hybrid is relatively uncommon) |
| **Real-time rasterizer** | 3D meshes + matrices | GPU, depth-tested triangles | Doom (BSP), Quake onward, virtually all modern games |
| **Ray tracer / path tracer** | 3D scene, GPU rays | GPU, physically-based | RTX titles, offline renderers |

A few things to note about where we land:

- **Common:** Using GPU shaders to fill pixels is completely standard. The
  fullscreen-quad-plus-fragment-shader pattern (our floor/ceiling and post
  passes) is the bread and butter of post-processing in every modern engine.
- **Unusual:** Pairing that GPU pixel pipeline with a **CPU grid raycaster** for
  geometry is not how mainstream engines work. Most raycasters are fully CPU;
  most GPU engines rasterize triangles. This hybrid is a pragmatic middle ground:
  it preserves the retro raycaster look and simplicity while offloading the
  expensive per-pixel work.
- **The "fake 3D" lineage:** Like all grid raycasters, the world is fundamentally
  2D. Walls are always vertical, floors and ceilings are always flat and
  horizontal, and you cannot have room-over-room geometry. These constraints are
  inherent to the technique, not bugs — they're the same limits Wolfenstein had.

If you ever need true 3D (sloped surfaces, arbitrary geometry, vertical look with
real perspective, multiple floors), that would mean replacing the raycaster with
a real rasterized pipeline — a different engine, not an extension of this one.

---

## Where to look in the code

- `engine/renderer.ts` — public facade; the rest of the game talks to this.
- `engine/gl/glRenderer.ts` — owns the WebGL context, runs the raycast, uploads
  the z-buffer, and drives the passes in order.
- `engine/raycaster.ts` — the CPU grid traversal (the "where are the walls?"
  half).
- `engine/gl/passes/` — one file per pass; this is where most rendering changes
  go.
- `engine/gl/shaders/` — the GLSL; `lib/fog.glsl` is shared.
- `engine/gl/renderPass.ts` — the `RenderPass` interface and the frame context
  every pass receives. Start here to add a new pass.

---

## Adding a new render pass (the common extension)

1. Write a fragment (and if needed vertex) shader in `engine/gl/shaders/`.
2. Add a class in `engine/gl/passes/` implementing `RenderPass`
   (`init` / `resize` / `render` / `dispose`).
3. Insert it into the ordered pass list in `glRenderer.ts` at the correct depth
   (remember: back-to-front).
4. Pull any per-frame data you need from the frame context rather than reaching
   into globals.
