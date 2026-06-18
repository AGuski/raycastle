import { Bitmap } from '../block';

export class Sprite {
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
