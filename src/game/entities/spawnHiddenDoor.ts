import { Block } from '../block';
import { HiddenDoor } from './components/hiddenDoor';
import { CellAnchor } from './components/cellAnchor';
import { Entity } from './entity';

/** Smart cell that reveals a passage when the player approaches. */
export function spawnHiddenDoor(
  wx: number,
  wy: number,
  solidBlock: Block,
  openRadius: number
): Entity {
  return new Entity(wx + 0.5, wy + 0.5)
    .add(new CellAnchor(wx, wy))
    .add(new HiddenDoor(solidBlock, openRadius));
}
