import { SpriteSheet } from './spriteSheet';

export class Bitmap {
  readonly image: HTMLImageElement;

  constructor(src: string, public width: number, public height: number) {
    this.image = new Image();
    this.image.src = src;
  }
}

export interface BlockSide {
  texture?: SpriteSheet;
  color?: string;
}

export type BlockSides = [BlockSide, BlockSide, BlockSide, BlockSide];
export type WallDirection = 0 | 1 | 2 | 3;

export class Block {
  constructor(
    public sides: BlockSides,
    public height = 1
  ) {}
}
