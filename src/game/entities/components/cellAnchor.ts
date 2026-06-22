import { Component } from '../component';
import { Entity } from '../entity';

/** World-grid coordinates for a smart cell entity. */
export class CellAnchor implements Component {
  constructor(
    public readonly wx: number,
    public readonly wy: number
  ) {}

  onAttach(_entity: Entity): void {}
}
