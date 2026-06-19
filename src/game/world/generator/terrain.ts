import { mixHash, SeededRng, hash01 } from './seededRng';

export const enum Edge {
  North = 0,
  East = 1,
  South = 2,
  West = 3
}

export interface PortalCount {
  min: number;
  max: number;
}

export function canonicalWx(wx: number, chunkSize: number): number {
  const rem = ((wx % chunkSize) + chunkSize) % chunkSize;
  if (rem === 0 && wx !== 0) {
    return wx - 1;
  }
  return wx;
}

export function canonicalWy(wy: number, chunkSize: number): number {
  const rem = ((wy % chunkSize) + chunkSize) % chunkSize;
  if (rem === 0 && wy !== 0) {
    return wy - 1;
  }
  return wy;
}

export function baseSolid(
  wx: number,
  wy: number,
  chunkSize: number,
  seed: number,
  wallDensity: number
): boolean {
  const cx = canonicalWx(wx, chunkSize);
  const cy = canonicalWy(wy, chunkSize);
  return hash01(seed, cx, cy) < wallDensity;
}

function canonicalEdge(
  cx: number,
  cy: number,
  edge: Edge
): { cx: number; cy: number; edge: Edge } {
  switch (edge) {
    case Edge.West:
      return { cx: cx - 1, cy, edge: Edge.East };
    case Edge.North:
      return { cx, cy: cy - 1, edge: Edge.South };
    default:
      return { cx, cy, edge };
  }
}

export function getEdgePortalPositions(
  seed: number,
  cx: number,
  cy: number,
  edge: Edge,
  chunkSize: number,
  portalCount: PortalCount
): number[] {
  const canonical = canonicalEdge(cx, cy, edge);
  const rng = new SeededRng(mixHash(seed, canonical.cx, canonical.cy, canonical.edge));
  const span = portalCount.max - portalCount.min + 1;
  const count = portalCount.min + rng.nextInt(span);
  const positions: number[] = [];
  const used = new Set<number>();

  for (let i = 0; i < count; i++) {
    let pos = rng.nextInt(chunkSize);
    let attempts = 0;
    while (used.has(pos) && attempts < chunkSize) {
      pos = (pos + 1) % chunkSize;
      attempts++;
    }
    used.add(pos);
    positions.push(pos);
  }

  return positions;
}

function setOpen(mask: boolean[][], lx: number, ly: number): void {
  mask[ly][lx] = true;
}

export function applyBorderPortals(
  mask: boolean[][],
  seed: number,
  cx: number,
  cy: number,
  chunkSize: number,
  portalCount: PortalCount
): void {
  const edges: Edge[] = [Edge.North, Edge.East, Edge.South, Edge.West];

  for (const edge of edges) {
    const positions = getEdgePortalPositions(
      seed,
      cx,
      cy,
      edge,
      chunkSize,
      portalCount
    );

    for (const pos of positions) {
      switch (edge) {
        case Edge.North:
          setOpen(mask, pos, 0);
          break;
        case Edge.South:
          setOpen(mask, pos, chunkSize - 1);
          break;
        case Edge.West:
          setOpen(mask, 0, pos);
          break;
        case Edge.East:
          setOpen(mask, chunkSize - 1, pos);
          break;
      }
    }
  }
}

export function applyCenterCorridor(mask: boolean[][], chunkSize: number): void {
  const mid = Math.floor(chunkSize / 2);

  for (let i = 1; i < chunkSize - 1; i++) {
    mask[mid][i] = true;
    mask[i][mid] = true;
  }
}

export function buildTerrainMask(
  seed: number,
  cx: number,
  cy: number,
  chunkSize: number,
  wallDensity: number,
  portalCount: PortalCount
): boolean[][] {
  const mask: boolean[][] = [];

  for (let ly = 0; ly < chunkSize; ly++) {
    const row: boolean[] = [];
    for (let lx = 0; lx < chunkSize; lx++) {
      const wx = cx * chunkSize + lx;
      const wy = cy * chunkSize + ly;
      row.push(!baseSolid(wx, wy, chunkSize, seed, wallDensity));
    }
    mask.push(row);
  }

  applyBorderPortals(mask, seed, cx, cy, chunkSize, portalCount);
  applyCenterCorridor(mask, chunkSize);

  return mask;
}

export function carveOpenPad(
  mask: boolean[][],
  centerLx: number,
  centerLy: number,
  radius: number
): void {
  const size = mask.length;
  for (let ly = 0; ly < size; ly++) {
    for (let lx = 0; lx < size; lx++) {
      if (Math.abs(lx - centerLx) <= radius && Math.abs(ly - centerLy) <= radius) {
        mask[ly][lx] = true;
      }
    }
  }
}

export function edgeHasPortal(
  mask: boolean[][],
  edge: Edge
): boolean {
  const size = mask.length;
  switch (edge) {
    case Edge.North:
      return mask[0].some((open) => open);
    case Edge.South:
      return mask[size - 1].some((open) => open);
    case Edge.West:
      return mask.some((row) => row[0]);
    case Edge.East:
      return mask.some((row) => row[size - 1]);
  }
}

export function getSharedEdgeCells(
  chunkSize: number,
  cxA: number,
  cyA: number,
  cxB: number,
  cyB: number
): { lxA: number; lyA: number; lxB: number; lyB: number }[] {
  const cells: { lxA: number; lyA: number; lxB: number; lyB: number }[] = [];

  if (cxB === cxA + 1 && cyB === cyA) {
    for (let ly = 0; ly < chunkSize; ly++) {
      cells.push({
        lxA: chunkSize - 1,
        lyA: ly,
        lxB: 0,
        lyB: ly
      });
    }
    return cells;
  }

  if (cxB === cxA - 1 && cyB === cyA) {
    for (let ly = 0; ly < chunkSize; ly++) {
      cells.push({
        lxA: 0,
        lyA: ly,
        lxB: chunkSize - 1,
        lyB: ly
      });
    }
    return cells;
  }

  if (cyB === cyA + 1 && cxB === cxA) {
    for (let lx = 0; lx < chunkSize; lx++) {
      cells.push({
        lxA: lx,
        lyA: chunkSize - 1,
        lxB: lx,
        lyB: 0
      });
    }
    return cells;
  }

  if (cyB === cyA - 1 && cxB === cxA) {
    for (let lx = 0; lx < chunkSize; lx++) {
      cells.push({
        lxA: lx,
        lyA: 0,
        lxB: lx,
        lyB: chunkSize - 1
      });
    }
  }

  return cells;
}
