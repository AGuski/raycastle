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
- SvelteKit (Svelte 5, runes) + Vite 8
- WebGL2 + GLSL shaders
- Tailwind CSS 4
- ESLint (typescript-eslint, eslint-plugin-svelte)
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
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to play.

A top-down **world inspector** for debugging generation is served at
[http://localhost:5173/admin](http://localhost:5173/admin) — adjust the seed, center, and zoom to preview chunks, walls and entities without loading the game.

## Scripts


| Command           | Description                                                                    |
| ----------------- | ------------------------------------------------------------------------------ |
| `npm run dev`     | Start the SvelteKit dev server with hot reload (alias: `npm start`)            |
| `npm run build`   | Build for production                                                           |
| `npm run preview` | Preview the production build locally                                           |
| `npm run check`   | Type-check Svelte + TypeScript via `svelte-check` (alias: `npm run typecheck`) |
| `npm run lint`    | Run ESLint                                                                     |
| `npm test`        | Run tests with Vitest                                                          |


## Controls

### Desktop


| Input          | Action                                    |
| -------------- | ----------------------------------------- |
| Click canvas   | Capture pointer (required for mouse look) |
| Mouse move     | Look left / right                         |
| W / S or ↑ / ↓ | Move forward / backward                   |
| A / D or ← / → | Strafe left / right                       |
| F3             | Toggle debug overlay                      |


### Touch (mobile)


| Input                | Action       |
| -------------------- | ------------ |
| Right half of screen | Drag to look |
| Upper left           | Move forward |
| Lower left           | Strafe left  |
| Lower right          | Strafe right |


## Project structure

```
src/
  routes/       SvelteKit pages (game canvas, admin world inspector)
  lib/
    components/ Svelte UI
    core/       Config, input, debug
    engine/     Ray casting, game loop, WebGL renderer and shaders
    worldgen/   Pure procedural generation (no DOM or assets)
    game/       World streaming, entities, systems, player
    assets/     Texture images
```

## License

Private project.