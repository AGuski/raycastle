import { CONFIG, TAU } from '../core/config';
import { ControlStates } from '../types';
import { Bitmap } from './block';
import { World } from './world/index';

export class Player {
  readonly weapon: Bitmap;
  readonly maxHealth = CONFIG.player.maxHealth;
  health: number;
  /** 0–1 screen hurt vignette intensity. */
  hurtVignette = 0;
  private _paces = 0;
  private _swingTime = 0;
  private _swingId = 0;
  private _sheathed = false;
  private _hurtVignetteAge = 0;
  private _hurtActive = false;

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

  /** Increments each time a new swing begins. */
  get swingId(): number {
    return this._swingId;
  }

  constructor(
    public x: number,
    public y: number,
    public direction: number,
    weapon: Bitmap
  ) {
    this.weapon = weapon;
    this.health = CONFIG.player.maxHealth;
  }

  takeDamage(amount: number): void {
    this.health -= amount;
    this._hurtVignetteAge = 0;
    this._hurtActive = true;
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

  private updateHurtVignette(seconds: number): void {
    if (!this._hurtActive) return;

    this._hurtVignetteAge += seconds;
    const { fadeIn, fadeOut } = CONFIG.player.hurtVignette;

    if (this._hurtVignetteAge <= fadeIn) {
      this.hurtVignette = this._hurtVignetteAge / fadeIn;
      return;
    }

    const decayT = (this._hurtVignetteAge - fadeIn) / fadeOut;
    if (decayT >= 1) {
      this.hurtVignette = 0;
      this._hurtActive = false;
      return;
    }

    const easeOut = 1 - decayT * decayT;
    this.hurtVignette = easeOut;
  }

  update(
    controls: ControlStates,
    map: World,
    seconds: number,
    turnDelta = 0,
    attack = false,
    sheathToggle = false
  ): void {
    this.updateHurtVignette(seconds);

    if (turnDelta !== 0) this.rotate(turnDelta);

    if (sheathToggle) {
      this._sheathed = !this._sheathed;
      if (this._sheathed) {
        this._swingTime = 0;
      }
    }

    if (attack && !this._sheathed && this._swingTime <= 0) {
      this._swingId += 1;
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

