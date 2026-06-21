import { Bitmap } from '../block';

export interface Sprite {
  texture: Bitmap;
  x: number;
  y: number;
}

export class StaticSprite implements Sprite {
  public timesHit = 0;

  constructor(
    public texture: Bitmap,
    public x: number,
    public y: number
  ) {}

  put(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}
