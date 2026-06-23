import { WallDirection } from './block';
import { SpriteSheet } from './spriteSheet';

/** A texture overlay projected onto a wall face at grid cell (wx, wy). */
export interface Decal {
  wx: number;
  wy: number;
  face: WallDirection;
  texture: SpriteSheet;
}
