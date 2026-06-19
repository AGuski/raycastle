import './style.css';

import { CONFIG } from './core/config';
import { Input } from './core/input';
import { AssetManager } from './engine/assets';
import { GameLoop } from './engine/gameLoop';
import { Renderer } from './engine/renderer';
import { mountStatsOverlay } from './engine/statsOverlay';
import { Player } from './game/player';
import { World } from './game/world';
import weaponKnifeImg from './assets/weapon_knife.png';

function getCanvas(): HTMLCanvasElement {
  const display = document.getElementById('display');
  if (!display || !(display instanceof HTMLCanvasElement)) {
    throw new Error('Canvas element #display not found');
  }
  return display;
}

async function main(): Promise<void> {
  const assets = new AssetManager();
  const { textures, playerStart, worldSize, focalLength, resolution, renderRange } =
    CONFIG;

  const weapon = assets.createBitmap(
    weaponKnifeImg,
    textures.weapon.width,
    textures.weapon.height
  );
  const world = new World(worldSize, assets);

  await assets.preload([weapon, ...world.getBitmaps()]);

  const player = new Player(
    playerStart.x,
    playerStart.y,
    playerStart.direction,
    weapon
  );
  const input = new Input();
  const renderer = new Renderer(getCanvas(), resolution, renderRange, focalLength);
  const stats = mountStatsOverlay();
  const loop = new GameLoop(stats);

  world.randomize();

  loop.start({
    update(dt) {
      world.update(dt);
      player.update(input.states, world, dt);
    },
    render() {
      renderer.render(player, world);
    }
  });
}

main();
