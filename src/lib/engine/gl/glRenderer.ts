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
import { DecalPass } from './passes/decalPass';
import { SpritePass } from './passes/spritePass';
import { WeaponPass } from './passes/weaponPass';
import { PostPass } from './passes/postPass';

export class GlRenderer {
  private readonly context: GlContext;
  private zBuffer = new Float32Array(0);
  private rayCache: RayStep[][] = [];
  private zBufferTex: ReturnType<typeof createZBufferTexture> | null = null;
  private readonly passes: RenderPass[];
  private columns = 0;
  private weaponScale = 0;
  private frameFocal = 0;
  private viewScale = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private renderRange: number,
    private focalLength: number
  ) {
    this.context = new GlContext(canvas);

    this.passes = [
      new FloorCeilingPass(),
      new WallPass(),
      new DecalPass(),
      new SpritePass(),
      new WeaponPass(),
      new PostPass()
    ];

    this.initPasses();
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private initPasses(): void {
    const gl = this.context.gl;
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
    this.columns = 0;
    this.zBufferTex?.dispose();
    this.zBufferTex = null;
    this.initPasses();
  };

  private onResize = (): void => {
    this.context.resize();
    this.ensureColumnBuffers(this.context.width);

    const { width, height } = this.context;
    const aspect = width / height;
    // Horizontal focal follows the aspect ratio so pixels stay square; the
    // configured focalLength acts as a uniform zoom on both axes.
    this.frameFocal = 0.5 / (this.focalLength * aspect);
    this.viewScale = (height * 0.5) / this.focalLength;

    this.weaponScale = (width + height) / CONFIG.weaponScaleDivisor;
    for (const pass of this.passes) {
      pass.resize(width, height);
    }
  };

  private ensureColumnBuffers(columns: number): void {
    if (columns === this.columns) return;

    this.columns = columns;
    this.zBuffer = new Float32Array(columns);
    this.rayCache = Array.from({ length: columns }, () => []);
    this.zBufferTex?.dispose();
    this.zBufferTex = createZBufferTexture(this.context.gl, columns);
  }

  render(player: Player, world: World): void {
    const gl = this.context.gl;
    const zBufferTex = this.zBufferTex;
    if (!zBufferTex || this.columns === 0) return;

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
      columns: this.columns,
      spacing: 1,
      focalLength: this.frameFocal,
      viewScale: this.viewScale,
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
    const res = this.columns;

    for (let column = 0; column < res; column++) {
      const camX = column / res - 0.5;
      const angle = Math.atan2(camX, this.frameFocal);
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
