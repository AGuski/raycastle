import { Bitmap } from './block';

export class SpriteSheet {
  constructor(
    public readonly bitmap: Bitmap,
    public readonly frames: number = 1
  ) {}

  get frameWidth(): number {
    return this.bitmap.width / this.frames;
  }

  get frameHeight(): number {
    return this.bitmap.height;
  }

  get aspectRatio(): number {
    return this.frameWidth / this.frameHeight;
  }

  frameColumn(localColumn: number, time: number, fps: number): number {
    const col = Math.floor(localColumn);
    if (this.frames <= 1) {
      return Math.min(this.bitmap.width - 1, Math.max(0, col));
    }

    const currentFrame = Math.floor((time * fps) % this.frames);
    return Math.min(
      this.bitmap.width - 1,
      Math.max(0, Math.floor(currentFrame * this.frameWidth + col))
    );
  }
}

export function spriteSheet(bitmap: Bitmap, frames = 1): SpriteSheet {
  return new SpriteSheet(bitmap, frames);
}
