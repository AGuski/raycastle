import { Block, WallDirection } from '../block';
import { SpriteSheet } from '../spriteSheet';
import { BreakableWall } from './components/breakableWall';
import { CellAnchor } from './components/cellAnchor';
import { Entity } from './entity';

/** Smart cell that opens when struck, leaving a clear passage. */
export function spawnBreakableWall(
  wx: number,
  wy: number,
  solidBlock: Block,
  faces: [WallDirection, WallDirection],
  crackTexture: SpriteSheet
): Entity {
  return new Entity(wx + 0.5, wy + 0.5)
    .add(new CellAnchor(wx, wy))
    .add(new BreakableWall(solidBlock, faces, crackTexture));
}
