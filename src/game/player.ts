import { CONFIG, TAU } from '../core/config';
import { ControlStates } from '../types';
import { Bitmap } from './block';
import { World } from './world/index';

export class Player {
  readonly weapon: Bitmap;
  private _paces = 0;

  get paces(): number {
    return this._paces;
  }

  constructor(
    public x: number,
    public y: number,
    public direction: number,
    weapon: Bitmap
  ) {
    this.weapon = weapon;
  }

  rotate(angle: number): void {
    this.direction = (this.direction + angle + TAU) % TAU;
  }

  walk(distance: number, map: World): void {
    const dx = Math.cos(this.direction) * distance;
    const dy = Math.sin(this.direction) * distance;
    if (map.isOpen(this.x + dx, this.y)) this.x += dx;
    if (map.isOpen(this.x, this.y + dy)) this.y += dy;
    this._paces += distance;
  }

  update(controls: ControlStates, map: World, seconds: number): void {
    if (controls.left) this.rotate(-CONFIG.turnSpeed * seconds);
    if (controls.right) this.rotate(CONFIG.turnSpeed * seconds);
    if (controls.forward) this.walk(CONFIG.walkSpeed * seconds, map);
    if (controls.backward) this.walk(-CONFIG.walkSpeed * seconds, map);
  }
}
