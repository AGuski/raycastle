import { CONFIG } from '../../core/config';
import { Player } from '../../game/player';
import { World } from '../../game/world';
import { cast } from '../raycaster';
import { isOpenCell, RayStep } from '../../types';
import { GlContext } from './glContext';
import { createZBufferTexture, clearTextureCache } from './glTexture';
import { FrameContext, RenderPass } from './renderPass';
import { FloorCeilingPass } from './passes/floorCeilingPass';
import { WallPass } from './passes/wallPass';
import { SpritePass } from './passes/spritePass';
import { WeaponPass } from './passes/weaponPass';
import { PostPass } from './passes/postPass';

export class GlRenderer {
  private readonly context: GlContext;
  private readonly zBuffer: Float32Array;
  private readonly rayCache: RayStep[][];
  private zBufferTex: ReturnType<typeof createZBufferTexture> | null = null;
  private readonly passes: RenderPass[];
  private spacing = 0;
  private weaponScale = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private resolution: number,
    private renderRange: number,
    private focalLength: number
  ) {
    this.context = new GlContext(canvas);
    this.zBuffer = new Float32Array(resolution);
    this.rayCache = Array.from({ length: resolution }, () => []);

    this.passes = [
      new FloorCeilingPass(),
      new WallPass(),
      new SpritePass(),
      new WeaponPass(),
      new PostPass()
    ];

    this.initPasses();
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private initPasses(): void {
    const gl = this.context.gl;
    this.zBufferTex = createZBufferTexture(gl, this.resolution);
    for (const pass of this.passes) {
      pass.init(gl);
    }
    this.onResize();
    window.addEventListener('resize', this.onResize);
  }

  private onContextRestored = (): void => {
    clearTextureCache();
    for (const pass of this.passes) {
      pass.dispose();
    }
    this.initPasses();
  };

  private onResize = (): void => {
    this.context.resize();
    this.spacing = this.context.width / this.resolution;
    this.weaponScale =
      (this.context.width + this.context.height) / CONFIG.weaponScaleDivisor;
    for (const pass of this.passes) {
      pass.resize(this.context.width, this.context.height);
    }
  };

  render(player: Player, world: World): void {
    const gl = this.context.gl;
    const zBufferTex = this.zBufferTex;
    if (!zBufferTex) return;

    this.raycast(player, world);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const ctx: FrameContext = {
      gl,
      width: this.context.width,
      height: this.context.height,
      player,
      world,
      zBuffer: this.zBuffer,
      zBufferTex,
      rayCache: this.rayCache,
      columns: this.resolution,
      spacing: this.spacing,
      focalLength: this.focalLength,
      renderRange: this.renderRange,
      weaponScale: this.weaponScale,
      time: world.deltaTime
    };

    for (const pass of this.passes) {
      pass.render(ctx);
    }
  }

  private raycast(player: Player, world: World): void {
    this.zBuffer.fill(Infinity);
    const dir = player.direction;
    const res = this.resolution;

    for (let column = 0; column < res; column++) {
      const camX = column / res - 0.5;
      const angle = Math.atan2(camX, this.focalLength);
      const ray = cast(world, player, dir + angle, this.renderRange);
      this.rayCache[column] = ray;

      let hit = -1;
      while (++hit < ray.length && isOpenCell(ray[hit].block));

      if (hit < ray.length) {
        this.zBuffer[column] = this.perpDistance(ray[hit].distance, angle);
      } else if (ray.length > 0) {
        this.zBuffer[column] = this.perpDistance(
          ray[ray.length - 1].distance,
          angle
        );
      }
    }
  }

  private perpDistance(distance: number, angle: number): number {
    return distance * Math.cos(angle);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    for (const pass of this.passes) {
      pass.dispose();
    }
    this.zBufferTex?.dispose();
    this.context.dispose();
  }
}
