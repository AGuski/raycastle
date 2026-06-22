import { CONFIG, TAU } from '../core/config';
import { ControlStates } from '../types';
import { Bitmap } from './block';
import { World } from './world/index';

export class Player {
  readonly weapon: Bitmap;
  private _paces = 0;
  private _swingTime = 0;
  private _sheathed = false;

  get paces(): number {
    return this._paces;
  }

  get sheathed(): boolean {
    return this._sheathed;
  }

  /** 0 when idle; 0–1 while a swing is playing. */
  get swingProgress(): number {
    if (this._swingTime <= 0) return 0;
    return Math.min(1, this._swingTime / CONFIG.weapon.swing.duration);
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

  private move(dx: number, dy: number, map: World): void {
    if (dx === 0 && dy === 0) return;
    if (map.isOpen(this.x + dx, this.y)) this.x += dx;
    if (map.isOpen(this.x, this.y + dy)) this.y += dy;
    this._paces += Math.hypot(dx, dy);
  }

  update(
    controls: ControlStates,
    map: World,
    seconds: number,
    turnDelta = 0,
    attack = false,
    sheathToggle = false
  ): void {
    if (turnDelta !== 0) this.rotate(turnDelta);

    if (sheathToggle) {
      this._sheathed = !this._sheathed;
      if (this._sheathed) {
        this._swingTime = 0;
      }
    }

    if (attack && !this._sheathed && this._swingTime <= 0) {
      this._swingTime = Number.EPSILON;
    }
    if (this._swingTime > 0) {
      this._swingTime += seconds;
      if (this._swingTime >= CONFIG.weapon.swing.duration) {
        this._swingTime = 0;
      }
    }

    let forward = 0;
    if (controls.forward) forward += 1;
    if (controls.backward) forward -= 1;

    let strafe = 0;
    if (controls.right) strafe += 1;
    if (controls.left) strafe -= 1;

    const len = Math.hypot(forward, strafe);
    if (len === 0) return;

    forward /= len;
    strafe /= len;

    const distance = CONFIG.walkSpeed * seconds;
    const cos = Math.cos(this.direction);
    const sin = Math.sin(this.direction);
    this.move((cos * forward - sin * strafe) * distance, (sin * forward + cos * strafe) * distance, map);
  }
}
