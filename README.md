# Ray Castle

A browser-based ray casting engine playground — a Wolfenstein-style first-person renderer built with TypeScript and HTML Canvas.

Inspired by [A first-person engine in 265 lines](http://www.playfuljs.com/a-first-person-engine-in-265-lines/) by PlayfulJS.

**Live demo:** [raycastle.vercel.app](https://raycastle.vercel.app/)

## Features

- Real-time ray casting with textured walls and animated surfaces
- Sprites placed in the world
- Keyboard and touch controls
- FPS overlay via [stats.js](https://github.com/mrdoob/stats.js/)

## Tech stack

- TypeScript 6
- Vite 7
- ESLint (typescript-eslint)
- HTML Canvas 2D

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

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Move and turn |
| F3 | Toggle debug overlay |
| Touch (mobile) | Tap upper half to move forward; left/right halves to turn |

## Project structure

```
src/
  main.ts           Bootstrap: wire systems and start the game loop
  types.ts          Shared TypeScript types
  core/
    config.ts       Game constants (speed, FOV, resolution, etc.)
    debug.ts        Debug overlay toggle state
    input.ts        Keyboard and touch controls
  engine/
    assets.ts       Bitmap factory and image preloading
    raycaster.ts    Ray casting math
    renderer.ts     Canvas rendering (walls, sprites, sky)
    gameLoop.ts     requestAnimationFrame loop
    statsOverlay.ts FPS overlay setup
  game/
    block.ts        Wall textures and block definitions
    world.ts        Map data, sprites, and world queries
    player.ts       Player movement and state
    entities/
      sprite.ts     Sprite entities
  assets/           Texture images
```

## License

Private project.
