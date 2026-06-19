import {
  GridStep,
  MAP_EMPTY,
  MapCell,
  Point,
  RayStep
} from '../types';

export interface RaycastWorld {
  getBlock(x: number, y: number): MapCell;
}

export function cast(
  world: RaycastWorld,
  point: Point,
  angle: number,
  range: number
): RayStep[] {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const noWall: GridStep = { x: 0, y: 0, length2: Infinity };
  const steps: RayStep[] = [];

  let current: RayStep = {
    x: point.x,
    y: point.y,
    block: MAP_EMPTY,
    distance: 0,
    length2: 0,
    shading: 0,
    offset: 0
  };
  steps.push(current);

  const step = (
    rise: number,
    run: number,
    x: number,
    y: number,
    inverted = false
  ): GridStep => {
    if (run === 0) return noWall;
    const dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x;
    const dy = dx * (rise / run);
    return {
      x: inverted ? y + dy : x + dx,
      y: inverted ? x + dx : y + dy,
      length2: dx * dx + dy * dy
    };
  };

  const inspect = (
    gridStep: GridStep,
    shiftX: number,
    shiftY: number,
    distance: number,
    offset: number
  ): RayStep => {
    const dx = cos < 0 ? shiftX : 0;
    const dy = sin < 0 ? shiftY : 0;
    const cellX = gridStep.x - dx;
    const cellY = gridStep.y - dy;
    return {
      x: gridStep.x,
      y: gridStep.y,
      block: world.getBlock(cellX, cellY),
      distance: distance + Math.sqrt(gridStep.length2),
      length2: gridStep.length2,
      shading: shiftX ? (cos < 0 ? 2 : 0) : sin < 0 ? 2 : 1,
      offset: offset - Math.floor(offset)
    };
  };

  while (current.distance <= range) {
    const stepX = step(sin, cos, current.x, current.y);
    const stepY = step(cos, sin, current.y, current.x, true);
    const nextStep =
      stepX.length2 < stepY.length2
        ? inspect(stepX, 1, 0, current.distance, stepX.y)
        : inspect(stepY, 0, 1, current.distance, stepY.x);

    if (nextStep.distance > range) break;

    steps.push(nextStep);
    current = nextStep;
  }

  return steps;
}
