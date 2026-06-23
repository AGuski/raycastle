import { Decal } from '../decal';
import { SpriteSheet } from '../spriteSheet';
import { BreakableWall } from './components/breakableWall';
import { CellAnchor } from './components/cellAnchor';
import { Entity } from './entity';

/** Collects wall decals from cell entities that carry a BreakableWall component. */
export function decalsFromCellEntities(
  entities: Iterable<Entity>,
  crackTexture: SpriteSheet
): Decal[] {
  const decals: Decal[] = [];
  for (const entity of entities) {
    const wall = entity.get(BreakableWall);
    const anchor = entity.get(CellAnchor);
    if (!wall || !anchor || wall.destroyed) continue;

    for (const face of wall.faces) {
      decals.push({
        wx: anchor.wx,
        wy: anchor.wy,
        face,
        texture: crackTexture
      });
    }
  }
  return decals;
}
