import { SpriteSheet } from '../spriteSheet';
import { SpriteAnimator } from './spriteAnimator';

export interface Sprite {
  texture: SpriteSheet;
  x: number;
  y: number;
  /** Seconds of animation playback; defaults to world time when omitted. */
  animationTime?: number;
  /** Optional procedural transform applied to the rendered billboard. */
  animator?: SpriteAnimator;
}

export class StaticSprite implements Sprite {
  public timesHit = 0;

  constructor(
    public texture: SpriteSheet,
    public x: number,
    public y: number
  ) {}

  put(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}
