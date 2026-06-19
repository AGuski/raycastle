import { Player } from '../game/player';
import { World } from '../game/world';
import { GlRenderer } from './gl/glRenderer';

export class Renderer {
  private readonly glRenderer: GlRenderer;

  constructor(
    canvas: HTMLCanvasElement,
    resolution: number,
    renderRange: number,
    focalLength: number
  ) {
    this.glRenderer = new GlRenderer(
      canvas,
      resolution,
      renderRange,
      focalLength
    );
  }

  render(player: Player, map: World): void {
    this.glRenderer.render(player, map);
  }
}
