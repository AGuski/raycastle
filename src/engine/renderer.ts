import { Player } from '../game/player';
import { World } from '../game/world';
import { GlRenderer } from './gl/glRenderer';

export class Renderer {
  private readonly glRenderer: GlRenderer;

  constructor(
    canvas: HTMLCanvasElement,
    renderRange: number,
    focalLength: number
  ) {
    this.glRenderer = new GlRenderer(canvas, renderRange, focalLength);
  }

  render(player: Player, map: World): void {
    this.glRenderer.render(player, map);
  }
}
