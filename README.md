# Ray Castle

A browser-based first-person ray casting game built with TypeScript, WebGL2, and GLSL.

The engine is a hybrid: classic CPU ray casting drives visibility and depth (DDA grid traversal, per-column z-buffer), while WebGL2 fragment shaders draw walls, floors, ceilings, sprites, and post effects from that ray data. Inspired by [A first-person engine in 265 lines](http://www.playfuljs.com/a-first-person-engine-in-265-lines/) by PlayfulJS.

**Live demo:** [raycastle.vercel.app](https://raycastle.vercel.app/)

## Features

- Hybrid ray casting + GLSL shader renderer (WebGL2)
- Procedurally generated infinite world with chunk streaming
- Textured walls, animated surfaces, skybox, and fog
- Sprites with animation and shader effects (e.g. dark miasma)
- AI actors with line-of-sight behavior
- Pointer-lock mouse look and touch controls
- FPS overlay via [stats.js](https://github.com/mrdoob/stats.js/)

## Tech stack

- TypeScript 6
- Vite 7
- WebGL2 + GLSL shaders
- ESLint (typescript-eslint)
- Vitest

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm

## Getting started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Vite dev server with hot reload |
| `npm run build` | Build for production to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm run lint` | Run ESLint on `src/` |
| `npm test` | Run tests with Vitest |

## Controls

### Desktop

| Input | Action |
| --- | --- |
| Click canvas | Capture pointer (required for mouse look) |
| Mouse move | Look left / right |
| W / S or ↑ / ↓ | Move forward / backward |
| A / D or ← / → | Strafe left / right |
| F3 | Toggle debug overlay |

### Touch (mobile)

| Input | Action |
| --- | --- |
| Right half of screen | Drag to look |
| Upper left | Move forward |
| Lower left | Strafe left |
| Lower right | Strafe right |

## Project structure

```
src/
  main.ts              Bootstrap: wire systems and start the game loop
  types.ts             Shared TypeScript types
  core/
    config.ts          Game constants (speed, FOV, resolution, etc.)
    debug.ts           Debug overlay toggle state
    input.ts           Keyboard, pointer-lock, and touch controls
  engine/
    assets.ts          Bitmap factory and image preloading
    raycaster.ts       DDA ray casting math
    lineOfSight.ts     Visibility queries for AI
    renderer.ts        Thin wrapper over the GL renderer
    gameLoop.ts        requestAnimationFrame loop
    statsOverlay.ts    FPS overlay setup
    gl/
      glRenderer.ts    Ray cast + multi-pass WebGL2 pipeline
      passes/          Floor/ceiling, walls, sprites, weapon, post
      shaders/         GLSL vertex and fragment shaders
  game/
    block.ts           Wall textures and block definitions
    player.ts          Player movement and state
    spriteSheet.ts     Sprite sheet frame helpers
    world/             Chunk streaming, procedural generation, entities
    entities/          Sprites, animators, and AI actors
  assets/              Texture images
```

## License

Private project.
