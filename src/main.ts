import './style.css';

import { CONFIG } from './core/config';
import { Input } from './core/input';
import { AssetManager } from './engine/assets';
import { GameLoop } from './engine/gameLoop';
import { Renderer } from './engine/renderer';
import { mountStatsOverlay } from './engine/statsOverlay';
import { Sprite } from './game/entities/sprite';
import { Player } from './game/player';
import { World } from './game/world';
import lampstandImg from './assets/lampstand_1_large.png';
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
  const { textures, playerStart, lampstandSpawn, worldSize, focalLength, resolution, renderRange } =
    CONFIG;

  const weapon = assets.createBitmap(
    weaponKnifeImg,
    textures.weapon.width,
    textures.weapon.height
  );
  const world = new World(worldSize, assets);
  const lampstand = assets.createBitmap(
    lampstandImg,
    textures.lampstand.width,
    textures.lampstand.height
  );

  await assets.preload([weapon, lampstand, ...world.getBitmaps()]);

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
  world.addSprite(new Sprite(lampstand, lampstandSpawn.x, lampstandSpawn.y));

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
