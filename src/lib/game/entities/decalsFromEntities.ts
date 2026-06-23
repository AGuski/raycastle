import { Decal } from '../decal';
import { BreakableWall } from './components/breakableWall';
import { Entity } from './entity';

/** Collects wall decals from cell entities that own a BreakableWall component. */
export function decalsFromCellEntities(entities: Iterable<Entity>): Decal[] {
  const decals: Decal[] = [];
  for (const entity of entities) {
    const wall = entity.get(BreakableWall);
    if (wall) decals.push(...wall.decals);
  }
  return decals;
}
