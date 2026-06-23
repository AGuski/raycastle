import { MAP_EMPTY, MapCell } from '../../../types';
import { Component, ComponentContext } from '../component';
import { Entity } from '../entity';
import { CellAnchor } from './cellAnchor';

/** Opens a wall cell when the player is nearby; closes when they leave. */
export class HiddenDoor implements Component {
  private anchor!: CellAnchor;
  private open = false;

  constructor(
    private readonly solidBlock: MapCell,
    private readonly openRadius: number
  ) {}

  onAttach(entity: Entity): void {
    this.anchor = entity.get(CellAnchor)!;
  }

  update(ctx: ComponentContext): void {
    const setCell = ctx.world.setCell;
    if (!setCell) return;

    const { wx, wy } = this.anchor;
    const dist = Math.hypot(ctx.player.x - (wx + 0.5), ctx.player.y - (wy + 0.5));
    const near = dist < this.openRadius;

    if (near === this.open) return;

    this.open = near;
    setCell.call(ctx.world, wx, wy, near ? MAP_EMPTY : this.solidBlock);
  }
}
