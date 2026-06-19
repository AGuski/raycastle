export class Bitmap {
  readonly image: HTMLImageElement;
  pixelData: Uint32Array | null = null;
  pixelBytes: Uint8ClampedArray | null = null;

  constructor(src: string, public width: number, public height: number) {
    this.image = new Image();
    this.image.src = src;
  }
}

export interface BlockSide {
  texture?: Bitmap;
  color?: string;
  frames?: number;
}

export type BlockSides = [BlockSide, BlockSide, BlockSide, BlockSide];
export type WallDirection = 0 | 1 | 2 | 3;

export class Block {
  constructor(
    public sides: BlockSides,
    public height = 1
  ) {}
}
