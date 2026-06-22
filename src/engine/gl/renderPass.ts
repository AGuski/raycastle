import { Player } from '../../game/player';
import { World } from '../../game/world';
import { RayStep } from '../../types';
import { GLTexture } from './glTexture';

export interface FrameContext {
  gl: WebGL2RenderingContext;
  width: number;
  height: number;
  player: Player;
  world: World;
  zBuffer: Float32Array;
  zBufferTex: GLTexture;
  rayCache: RayStep[][];
  columns: number;
  spacing: number;
  /** Horizontal camera focal (aspect-corrected so pixels stay square). */
  focalLength: number;
  /** Vertical projection scale in pixels (full screen height at zoom 1). */
  viewScale: number;
  renderRange: number;
  weaponScale: number;
  time: number;
}

export interface RenderPass {
  init(gl: WebGL2RenderingContext): void;
  resize(width: number, height: number): void;
  render(ctx: FrameContext): void;
  dispose(): void;
}
