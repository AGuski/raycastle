import './style.css';

import { CONFIG } from './core/config';
import { Input } from './core/input';
import { AssetManager } from './engine/assets';
import { GameLoop } from './engine/gameLoop';
import { Renderer } from './engine/renderer';
import { mountStatsOverlay } from './engine/statsOverlay';
import { Player } from './game/player';
import { World, loadLevelRecipe } from './game/world';
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
  const { textures, focalLength, resolution, renderRange } = CONFIG;
  const recipe = loadLevelRecipe();

  const weapon = assets.createBitmap(
    weaponKnifeImg,
    textures.weapon.width,
    textures.weapon.height
  );
  const world = new World(recipe, assets);

  await assets.preload([weapon, ...world.getBitmaps()]);

  const spawn = world.findSafeSpawn();
  const player = new Player(spawn.x, spawn.y, spawn.direction, weapon);
  world.ensureAround(player.x, player.y, { x: player.x, y: player.y });

  const canvas = getCanvas();
  const input = new Input(canvas);
  const renderer = new Renderer(canvas, resolution, renderRange, focalLength);
  const stats = mountStatsOverlay();
  const loop = new GameLoop(stats);

  loop.start({
    update(dt) {
      world.ensureAround(player.x, player.y);
      world.update(dt, player.x, player.y);
      player.update(input.states, world, dt, input.consumeTurnDelta());
    },
    render() {
      renderer.render(player, world);
    }
  });
}

main();
