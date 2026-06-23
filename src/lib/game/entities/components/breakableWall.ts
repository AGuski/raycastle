import { CONFIG } from '../../../core/config';
import { cast } from '../../../engine/raycaster';
import { rayHitWallCell } from '../../../engine/rayHit';
import { WallDirection } from '../../block';
import { isOpenCell, MAP_EMPTY, MapCell } from '../../../types';
import { Component, ComponentContext, PlayerView } from '../component';
import { Entity } from '../entity';
import { CellAnchor } from './cellAnchor';

/** Wall cell that can be destroyed with a weapon strike, revealing the passage. */
export class BreakableWall implements Component {
  private anchor!: CellAnchor;
  private entity!: Entity;
  destroyed = false;

  constructor(
    private readonly solidBlock: MapCell,
    public readonly faces: [WallDirection, WallDirection]
  ) {}

  onAttach(entity: Entity): void {
    this.entity = entity;
    this.anchor = entity.get(CellAnchor)!;
  }

  anchoredAt(wx: number, wy: number): boolean {
    return this.anchor.wx === wx && this.anchor.wy === wy;
  }

  destroy(ctx: ComponentContext): void {
    if (this.destroyed) return;
    this.destroyed = true;

    const setCell = ctx.world.setCell;
    if (setCell) {
      setCell.call(ctx.world, this.anchor.wx, this.anchor.wy, MAP_EMPTY);
    }

    const removeCellEntity = ctx.world.removeCellEntity;
    if (removeCellEntity) {
      removeCellEntity.call(ctx.world, this.entity);
    }
  }
}

/** Grid cell of the first solid wall along the player's strike ray, if any. */
export function strikeRayWallCell(
  player: PlayerView,
  world: ComponentContext['world']
): { wx: number; wy: number } | null {
  const ray = cast(world, player, player.direction, CONFIG.weapon.strike.range);

  let hit = -1;
  while (++hit < ray.length && isOpenCell(ray[hit].block));

  if (hit >= ray.length) return null;

  return rayHitWallCell(ray[hit], player);
}

/**
 * If the player's strike ray hits a breakable wall, destroy it.
 * Returns whether a wall consumed the strike.
 */
export function resolveBreakableWallWeaponStrike(
  ctx: ComponentContext,
  entities: Iterable<Entity>
): boolean {
  const cell = strikeRayWallCell(ctx.player, ctx.world);
  if (!cell) return false;

  for (const entity of entities) {
    const wall = entity.get(BreakableWall);
    if (!wall || wall.destroyed || !wall.anchoredAt(cell.wx, cell.wy)) continue;

    wall.destroy(ctx);
    console.log('[strike] broke wall', { wx: cell.wx, wy: cell.wy });
    return true;
  }

  return false;
}
