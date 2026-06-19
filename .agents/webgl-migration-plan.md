# WebGL migration plan — single canvas, floor/ceiling + fog shader first

Goal: replace the Canvas 2D renderer with a **single visible WebGL2 canvas**. The
**first shader** moves floor + ceiling rendering to the GPU and applies the
distance fog / light fall-off there (hardware texture filtering also fixes the
distant-texture noise that started this whole thread). The architecture must be
**extendable** so walls, sprites, weapon, and post-process effects can each
become their own GPU pass later.

The current CPU fog (`fogAmount`, `applyFogOverlay`, and the inline shading in
`fillFloorCeiling`) is removed for floor/ceiling and re-expressed as a reusable
GLSL fog function.

---

## 1. Current state (what we're replacing)

- Build: **Vite 7** (`vite.config.ts`, root = `src`). Shaders can be imported as
  strings via Vite's native `?raw` suffix — no extra loader/library needed.
- `src/engine/renderer.ts` is one ~490-line class using a single `2d` context.
  Per frame it:
  1. `drawSky` → black fill
  2. `drawColumns` → CPU raycast all columns (`cast`), fill `zBuffer` +
     `rayCache`, run `fillFloorCeiling` (per-pixel CPU sampling + fog into an
     offscreen `ImageData`), `blitFloor` (per-column `drawImage`), then draw wall
     columns (`drawImage` per column).
  3. `drawSprites` → per-column `drawImage`.
  4. `drawWeapon` → single `drawImage`.
- Textures are `Bitmap` (`src/game/block.ts`): an `HTMLImageElement` plus baked
  CPU pixel buffers (`pixelBytes` / `pixelData`) created in
  `src/engine/assets.ts` (`bakePixelData`).
- `World` (`src/game/world/world.ts`) exposes `floorTexture`, `ceilingTexture`,
  `skybox`, `sprites`, `light`, `deltaTime`, `getBlock`, etc.
- Key config (`src/core/config.ts`): `resolution` (640 raycast columns),
  `renderRange` (maxZ), `focalLength` (0.6), `canvasScale` (0.5), `fogStart` (2),
  `fogEnd` (12).

**No new runtime dependency is required.** WebGL2 is native. (Optionally add
`twgl.js` later if buffer/uniform boilerplate gets tedious, but the plan assumes
raw WebGL2.)

---

## 2. Target architecture

One `WebGLRenderingContext` (WebGL2) on the existing `#display` canvas. Rendering
is organised as an ordered list of **passes**, each implementing a small
interface. Frame composition uses the GPU depth/alpha, not Canvas 2D.

```
src/engine/
  renderer.ts                 # thin facade; constructs GlRenderer, same public API
  gl/
    glRenderer.ts             # owns context + passes; runs the frame
    glContext.ts              # create webgl2 ctx, manage size/viewport/DPR
    glUtils.ts                # compile/link, error checks, createTexture helpers
    program.ts                # Program wrapper: cached uniform/attrib locations
    fullscreenQuad.ts         # shared VBO + draw for fullscreen passes
    glTexture.ts              # GLTexture: upload from Image | Canvas | Float32Array
    renderPass.ts             # RenderPass interface + FrameContext type
    passes/
      floorCeilingPass.ts     # PHASE 1 — the first shader
      overlayPass.ts          # PHASE 1 bridge — composite a 2D overlay canvas
      wallPass.ts             # PHASE 2
      spritePass.ts           # PHASE 3
      weaponPass.ts           # PHASE 4
      postPass.ts             # PHASE 4+ — vignette/grade/etc.
    shaders/
      fullscreen.vert.glsl
      floorCeiling.frag.glsl
      overlay.frag.glsl
      lib/fog.glsl            # shared fog/light fall-off chunk (reused by all)
```

### RenderPass interface

```ts
// renderPass.ts
export interface FrameContext {
  gl: WebGL2RenderingContext;
  width: number;            // drawing-buffer pixels
  height: number;
  player: Player;
  world: World;
  zBufferTex: GLTexture;    // resolution x 1, R32F (perp distance per column)
  columns: number;          // CONFIG.resolution
  time: number;             // world.deltaTime
}

export interface RenderPass {
  init(gl: WebGL2RenderingContext): void;
  resize(width: number, height: number): void;
  render(ctx: FrameContext): void;
  dispose(): void;
}
```

`GlRenderer` holds `passes: RenderPass[]` and calls `render` in order. Adding a
new effect later = add a pass to the array. This is the "extendable for other
shaders" requirement.

### Shared fog chunk (the "light fall-off", written once)

```glsl
// shaders/lib/fog.glsl
uniform float uFogStart;
uniform float uFogInvRange;   // 1.0 / (fogEnd - fogStart)
uniform vec3  uFogColor;      // e.g. vec3(0.0)

float fogAmount(float z) {
  return clamp((z - uFogStart) * uFogInvRange, 0.0, 1.0);
}
vec3 applyFog(vec3 color, float z) {
  return mix(color, uFogColor, fogAmount(z));
}
```

Every pass (`floorCeiling`, later `wall`/`sprite`) `#include`s the same logic, so
fog stays consistent across surfaces. (Vite `?raw` + a tiny string concat, or a
manual `\`${fogGlsl}\`` template — see §6.)

---

## 3. PHASE 1 — floor/ceiling + fog as the first shader

This is the deliverable the user asked for. Because it's **one** canvas, walls/
sprites/weapon need somewhere to go during this phase — handled by a temporary
**overlay bridge** (kept until Phases 2–4 move them onto the GPU).

### 3.1 CPU side (unchanged math, kept on CPU)

- Keep `cast()` and the per-column loop that fills `zBuffer` with **perpendicular
  distance** (`perpDistance`). The GPU floor shader needs this to know where a
  wall cuts off the floor for each column.
- Each frame, upload `zBuffer` (Float32Array, length = `resolution`) into a
  `resolution × 1` **R32F** texture (`glTexture.uploadFloats`). Sample it in the
  shader with `texelFetch(uZBuffer, ivec2(column, 0), 0).r` (nearest, no
  filtering needed).

### 3.2 GPU textures for floor/ceiling

- Upload `world.floorTexture.image` and `world.ceilingTexture.image` **once** as
  GL textures (1024² POT) with:
  - `wrapS/T = REPEAT`
  - `minFilter = LINEAR_MIPMAP_LINEAR`, `magFilter = LINEAR`
  - `generateMipmap()` → trilinear filtering ⇒ distant floor/ceiling noise is
    solved on hardware, no CPU gradient sampling.
- These no longer need `bakePixelData` once the CPU `fillFloorCeiling` is gone
  (see §5 cleanup). Keep baking for wall/sprite bitmaps until those phases land.

### 3.3 Fullscreen pass + fragment shader

`fullscreen.vert.glsl`: emits a clip-space triangle/quad, passes `gl_FragCoord`-
based coords (or a varying `vUv`).

`floorCeiling.frag.glsl` (per screen pixel) — direct port of `fillFloorCeiling`:

```glsl
// uniforms: uResolution(vec2), uColumns(float), uPlayerPos(vec2), uDir(float),
//           uFocal(float), uMaxZ(float), uFloorTex, uCeilingTex, uZBuffer
// + fog uniforms from lib/fog.glsl

void main() {
  vec2 frag = gl_FragCoord.xy;                 // origin bottom-left in GL
  float halfH = uResolution.y * 0.5;

  float nx = frag.x / uResolution.x;
  float camX = nx - 0.5;
  float angle = atan(camX, uFocal);            // matches atan2(camX, focal)
  float cosA = cos(angle);
  if (abs(cosA) < 0.001) discard;

  // GL y is bottom-up; CPU y was top-down. Convert: yTop = height - frag.y.
  float yTop = uResolution.y - frag.y;
  bool isFloor = yTop > halfH;

  float z = isFloor ? halfH / (yTop - halfH)
                    : halfH / (halfH - yTop);

  int col = int(clamp(nx * uColumns, 0.0, uColumns - 1.0));
  float zLimit = texelFetch(uZBuffer, ivec2(col, 0), 0).r;
  if (z > uMaxZ || z >= zLimit) discard;       // wall/overlay shows instead

  float invCos = 1.0 / cosA;
  vec2 world = uPlayerPos
             + z * vec2(cos(uDir + angle), sin(uDir + angle)) * invCos;
  vec2 uv = fract(world);

  vec3 col3 = isFloor ? texture(uFloorTex, uv).rgb
                      : texture(uCeilingTex, uv).rgb;
  outColor = vec4(applyFog(col3, z), 1.0);
}
```

Notes:
- Watch the **Y flip** (GL bottom-left vs Canvas top-left). Either flip in shader
  (as above) or set up the viewport/quad accordingly. Pick one and document it.
- `discard` where a wall is closer (`z >= zLimit`) so the overlay/wall pass fills
  those pixels. Background (sky) stays the clear color for now.
- This replaces the entire CPU `fillFloorCeiling` + `blitFloor`.

### 3.4 Overlay bridge for walls/sprites/weapon (temporary)

So the single WebGL canvas still shows walls/sprites this phase:

- Create an **offscreen 2D canvas** (`overlayCanvas`) sized to the GL drawing
  buffer, transparent background.
- Reuse the existing wall/sprite/weapon draw code (moved into the overlay), with
  **floor/ceiling code deleted**. Walls keep their current Canvas-2D fog overlay
  (`applyFogOverlay` for walls only) so wall fog still matches — sprite fog stays
  removed as it is today.
- `overlayPass`: `texImage2D` the overlay canvas into a GL texture and draw it as
  a fullscreen quad with `ONE, ONE_MINUS_SRC_ALPHA` (premultiplied) or
  `SRC_ALPHA, ONE_MINUS_SRC_ALPHA` blending, on top of the floor/ceiling result.
- One `texImage2D(canvas)` per frame is acceptable as a bridge. It disappears in
  Phases 2–4.

> Alternative if you'd rather not keep any Canvas 2D: jump straight to Phase 2/3
> and port walls+sprites to GPU in the same change. The overlay bridge exists so
> Phase 1 stays small and shippable.

### 3.5 Frame order (Phase 1)

```
GlRenderer.render():
  1. CPU raycast → fill zBuffer (existing loop, kept)
  2. upload zBuffer → R32F texture
  3. clear color buffer (sky/black)
  4. floorCeilingPass.render()      # GPU floor + ceiling + fog
  5. (overlay) draw walls/sprites/weapon to 2D canvas, upload, overlayPass
```

### 3.6 Config changes

- Add `fogColor: [0, 0, 0]` (or a bluish dusk tone) to `CONFIG`.
- Keep `fogStart`, `fogEnd`. Derive `fogInvRange = 1/(fogEnd-fogStart)` in JS and
  pass as a uniform.
- Consider a `glPixelRatio` / keep `canvasScale` for the drawing-buffer size.

---

## 4. Later phases (designed for now, built later)

- **Phase 2 — Wall pass (GPU).** Build per-column textured quads (or instanced
  quads) from `rayCache`: position/height from `project()`, `texX`/offset from the
  hit. Sample the wall atlas; apply the **shared fog chunk** using each column's
  perp distance. Removes wall code + fog from the overlay. Handles animated
  frames via a `uFrame`/UV offset uniform.
- **Phase 3 — Sprite pass (GPU).** Billboards as camera-facing quads; depth-test
  per column against the same `zBuffer` texture (or a real depth buffer); alpha
  from the texture; per-pixel fog (fixes the old sprite-fog rectangle properly).
- **Phase 4 — Weapon pass + post FX.** Weapon as a screen-space quad with bob.
  Add a `postPass` slot for vignette, color grading, scanlines, etc. Once Phases
  2–4 land, the overlay bridge and the entire Canvas-2D path are deleted.

When all surfaces are on the GPU, the overlay/`texImage2D` bridge is removed and
fog is fully per-pixel everywhere via `lib/fog.glsl`.

---

## 5. Cleanup / removals

- Delete from `renderer.ts` (moved to GPU): `fillFloorCeiling`, `blitFloor`,
  `floorCanvas`/`floorCtx`/`floorImageData`/`floorBuffer`, `fogAmount`, and the
  floor/ceiling branch of `drawColumns`.
- Keep `applyFogOverlay` only while walls live in the overlay bridge; remove in
  Phase 2.
- In `assets.ts`: stop baking `pixelBytes`/`pixelData` for floor/ceiling once the
  CPU path is gone (keep for still-CPU bitmaps until their phase). Add a GL upload
  helper, or upload directly from `Bitmap.image` in `glTexture.ts`.
- `Renderer`'s public surface (`new Renderer(canvas, resolution, renderRange,
  focalLength)` + `render(player, world)`) stays identical so `main.ts` is
  untouched.

---

## 6. Shaders with Vite (no extra library)

Two clean options — pick one and be consistent:

1. **`?raw` import** (recommended): `import frag from './floorCeiling.frag.glsl?raw'`.
   Vite returns the file as a string. For the shared `lib/fog.glsl`, import it
   `?raw` too and prepend it to passes that need it (simple `#include` via string
   concat, or a tiny `resolveIncludes()` helper).
2. **TS template strings**: `export const floorFrag = \`...\`;` — zero tooling,
   but no GLSL syntax highlighting.

Optional later: `vite-plugin-glsl` for real `#include` support if shader count
grows. Not needed for Phase 1.

---

## 7. Risks / gotchas

- **Y-axis flip** (GL bottom-left vs Canvas top-left) — the #1 source of mirrored
  floor/ceiling. Decide the convention in the vertex shader and document it.
- **Column mapping**: screen pixels (width) vs raycast columns (`resolution`).
  Map with `int(nx * uColumns)` and `texelFetch`; keep `resolution` as the
  zBuffer width.
- **R32F sampling**: WebGL2 core, but float textures are not lin-filterable
  without `OES_texture_float_linear`. Use **nearest** + `texelFetch` (we only
  need exact per-column lookups) so no extension is required.
- **Context loss**: add a `webglcontextlost`/`restored` handler that re-inits
  passes and re-uploads static textures.
- **DPR / resize**: size the drawing buffer from `window.inner* * canvasScale`
  (matches today) and call `gl.viewport` + `pass.resize` on resize.
- **Premultiplied alpha** on the overlay upload — set
  `UNPACK_PREMULTIPLY_ALPHA_WEBGL` consistently to avoid dark sprite fringes.

---

## 8. Execution checklist

Phase 1 (first shader — the requested scope):
- [x] `gl/glContext.ts`, `gl/glUtils.ts`, `gl/program.ts`, `gl/fullscreenQuad.ts`,
      `gl/glTexture.ts`, `gl/renderPass.ts`, `gl/glRenderer.ts`.
- [x] `shaders/fullscreen.vert.glsl`, `shaders/floorCeiling.frag.glsl`,
      `shaders/lib/fog.glsl`.
- [x] Upload floor/ceiling textures with mipmaps; per-frame zBuffer → R32F.
- [x] `floorCeilingPass` renders floor+ceiling+fog; verify no Y-flip/seam bugs.
- [x] Rewire `renderer.ts` to delegate to `GlRenderer`; keep public API.
- [x] Add `fogColor` to `CONFIG`; remove CPU floor/ceiling fog.

Later (implemented in same pass — no overlay bridge):
- [x] Phase 2 wall pass, [x] Phase 3 sprite pass, [x] Phase 4 weapon + post FX.
- [x] Deleted overlay bridge and remaining Canvas-2D rendering code.
