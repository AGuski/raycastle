# Ray Castle

A browser-based ray casting engine playground — a Wolfenstein-style first-person renderer built with TypeScript and HTML Canvas.

Inspired by [A first-person engine in 265 lines](http://www.playfuljs.com/a-first-person-engine-in-265-lines/) by PlayfulJS.

## Features

- Real-time ray casting with textured walls and animated surfaces
- Sprites placed in the world
- Keyboard and touch controls
- FPS overlay via [stats.js](https://github.com/mrdoob/stats.js/)

## Tech stack

- TypeScript 6
- Webpack 5
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
| `npm start` | Start webpack-dev-server with hot reload |
| `npm run build` | Build a production bundle to `dist/` |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |

## Controls

| Input | Action |
| --- | --- |
| Arrow keys | Move and turn |
| Touch (mobile) | Tap upper half to move forward; left/right halves to turn |

## Project structure

```
src/
  index.ts      Entry point, game loop, rendering, and input
  world.ts      Map generation and ray casting
  block.ts      Wall textures and block definitions
  sprite.ts     Sprite entities
  assets/       Texture images
  types.ts      Shared TypeScript types
```

## License

Private project.
