import { CONFIG } from './core/config';
import { Input } from './core/input';
import { AssetManager } from './engine/assets';
import { GameLoop } from './engine/gameLoop';
import { Renderer } from './engine/renderer';
import { mountStatsOverlay } from './engine/statsOverlay';
import { publishHud } from './game/hudState';
import { Player } from './game/player';
import { World, loadLevelRecipe } from './game/world';
import weaponMaceImg from './assets/mace_weapon_1.png';

function playerView(player: Player) {
  return {
    x: player.x,
    y: player.y,
    direction: player.direction,
    sheathed: player.sheathed,
    swingProgress: player.swingProgress,
    swingId: player.swingId
  };
}

export async function startGame(canvas: HTMLCanvasElement): Promise<void> {
  const assets = new AssetManager();
  const { textures, focalLength, renderRange } = CONFIG;
  const recipe = loadLevelRecipe();

  const weapon = assets.createBitmap(
    weaponMaceImg,
    textures.weapon.width,
    textures.weapon.height
  );
  const world = new World(recipe, assets);

  await assets.preload([weapon, ...world.getBitmaps()]);

  const spawn = world.findSafeSpawn();
  const player = new Player(spawn.x, spawn.y, spawn.direction, weapon);
  world.damagePlayer = (amount) => player.takeDamage(amount);
  world.ensureAround(player.x, player.y, { x: player.x, y: player.y });

  const input = new Input(canvas);
  const renderer = new Renderer(canvas, renderRange, focalLength);
  const stats = mountStatsOverlay();
  const loop = new GameLoop(stats);

  loop.start({
    update(dt) {
      world.ensureAround(player.x, player.y);
      world.update(dt, playerView(player));
      player.update(
        input.states,
        world,
        dt,
        input.consumeTurnDelta(),
        input.consumeAttack(),
        input.consumeSheathToggle()
      );
      world.runSystems(playerView(player));
      publishHud(player);
    },
    render() {
      renderer.render(player, world);
    }
  });
}
