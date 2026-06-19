# Canvas ImageData pitfalls (Ray Castle)

Lessons from the floor/ceiling casting bug where left and right halves appeared swapped.

## The bug in one sentence

Writing pixels via `new Uint32Array(imageData.data.buffer)` can target the **wrong bytes**; `putImageData` reads from `imageData.data`, which may start at a non-zero `byteOffset` inside a pooled buffer.

## Do

- **Write through `imageData.data`** (`Uint8ClampedArray`), using row-major indexing:
  `dst = (y * width + x) * 4`
- **Keep stride explicit**: `rowStride = imageData.width * 4` (use `width`, not main-canvas width).
- **Rebind buffer references on resize**: after `new ImageData(w, h)`, set `buffer = imageData.data` again.
- **Use integer canvas dimensions**: `Math.floor(...)` for `canvas.width` / `canvas.height` so buffer size matches loop bounds.
- **Blit low-res ray buffers like walls**: one `drawImage` per column at `left = column * spacing`, not a single stretched blit, so floor columns align with wall rays.
- **If using typed-array views on baked textures**, pass `byteOffset` and `byteLength`:
  `new Uint32Array(data.buffer, data.byteOffset, data.byteLength >> 2)`

## Don't

- Don't create `new Uint32Array(imageData.data.buffer)` without `byteOffset` / length and write assuming it aliases `ImageData` pixels.
- Don't mix **logical ray resolution** (e.g. 640 columns) with **screen pixel width** (e.g. 960) when indexing an offscreen buffer.
- Don't assume `putImageData` and a raw `ArrayBuffer` view share the same origin.

## Symptom checklist

Suspect buffer aliasing when you see:

- A **vertical seam at horizontal center**
- Left/right halves that look **mirrored or swapped**
- Correct wall occlusion but wrong floor/ceiling placement
- Ceiling and floor using the same math but only one looking wrong (often a blit/stride issue, not projection)

## Reference implementation

See `src/engine/renderer.ts`: `fillFloorCeiling()` (byte writes + `rowStride`) and `blitFloor()` (per-column `drawImage`).
