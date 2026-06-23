import { CONFIG } from '../../../core/config';
import { Decal } from '../../../game/decal';
import { WallDirection } from '../../../game/block';
import { Player } from '../../../game/player';
import {
  isOpenCell,
  MAP_EMPTY,
  MAP_OUT_OF_BOUNDS,
  RayStep
} from '../../../types';
import { rayHitWallCell } from '../../rayHit';
import { combineShader, linkProgram } from '../glUtils';
import { getBitmapTexture, GLTexture } from '../glTexture';
import { Program } from '../program';
import { QuadBatch } from '../quadBatch';
import { FrameContext, RenderPass } from '../renderPass';
import fogGlsl from '../shaders/lib/fog.glsl?raw';
import quadVert from '../shaders/quad.vert.glsl?raw';
import decalFrag from '../shaders/decal.frag.glsl?raw';

interface DecalDraw {
  left: number;
  top: number;
  width: number;
  height: number;
  texColumn: number;
  depth: number;
  texture: GLTexture;
}

const DEPTH_BIAS = 1 - 1e-4;

export class DecalPass implements RenderPass {
  private gl: WebGL2RenderingContext | null = null;
  private program: Program | null = null;
  private batch: QuadBatch | null = null;
  private batchColumns = 0;
  private readonly fogInvRange =
    1 / (CONFIG.fogEnd - CONFIG.fogStart);

  init(gl: WebGL2RenderingContext): void {
    const handle = linkProgram(
      gl,
      combineShader(quadVert),
      combineShader(fogGlsl, decalFrag)
    );
    this.program = new Program(gl, handle);
    this.gl = gl;
  }

  resize(width: number, _height: number): void {
    this.ensureBatch(width);
  }

  private ensureBatch(columns: number): void {
    if (!this.gl || !this.program || columns === this.batchColumns) return;

    this.batch?.dispose();
    this.batch = new QuadBatch(
      this.gl,
      columns,
      this.program.attrib('aPosition'),
      this.program.attrib('aTexCoord'),
      this.program.attrib('aDepth')
    );
    this.batchColumns = columns;
  }

  render(ctx: FrameContext): void {
    const gl = ctx.gl;
    const program = this.program;
    const batch = this.batch;
    if (!program || !batch) return;

    const decals = ctx.world.decals;
    if (decals.length === 0) return;

    const decalMap = this.buildDecalMap(decals);
    const draws = this.collectDecals(ctx, ctx.player, decalMap);
    if (draws.length === 0) return;

    const groups = new Map<GLTexture, DecalDraw[]>();
    for (const draw of draws) {
      const list = groups.get(draw.texture) ?? [];
      list.push(draw);
      groups.set(draw.texture, list);
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    ctx.zBufferTex.bind(1);

    program.use();
    gl.uniform2f(program.uniform('uResolution'), ctx.width, ctx.height);
    gl.uniform1f(program.uniform('uSpacing'), ctx.spacing);
    gl.uniform1f(program.uniform('uFogStart'), CONFIG.fogStart);
    gl.uniform1f(program.uniform('uFogInvRange'), this.fogInvRange);
    gl.uniform3f(
      program.uniform('uFogColor'),
      CONFIG.fogColor[0],
      CONFIG.fogColor[1],
      CONFIG.fogColor[2]
    );
    gl.uniform1i(program.uniform('uZBuffer'), 1);

    for (const groupDraws of groups.values()) {
      const sample = groupDraws[0];
      batch.clear();
      for (const draw of groupDraws) {
        batch.pushColumnStrip(
          draw.left,
          draw.top,
          draw.width,
          draw.height,
          draw.texColumn,
          draw.depth
        );
      }
      batch.upload();
      batch.bind();

      sample.texture.bind(0);
      gl.uniform1i(program.uniform('uTexture'), 0);
      gl.uniform2i(
        program.uniform('uTexSize'),
        sample.texture.width,
        sample.texture.height
      );

      batch.draw();
      batch.unbind();
    }

    gl.disable(gl.BLEND);
  }

  private buildDecalMap(decals: Decal[]): Map<string, Decal> {
    const map = new Map<string, Decal>();
    for (const decal of decals) {
      map.set(`${decal.wx},${decal.wy},${decal.face}`, decal);
    }
    return map;
  }

  private collectDecals(
    ctx: FrameContext,
    player: Player,
    decalMap: Map<string, Decal>
  ): DecalDraw[] {
    const draws: DecalDraw[] = [];
    const res = ctx.columns;

    for (let column = 0; column < res; column++) {
      const ray = ctx.rayCache[column];
      let hit = -1;
      while (++hit < ray.length && isOpenCell(ray[hit].block));

      if (hit >= ray.length) continue;

      const step = ray[hit];
      if (step.block === MAP_EMPTY || step.block === MAP_OUT_OF_BOUNDS) {
        continue;
      }

      const face = this.wallDirection(step, player);
      const { wx, wy } = rayHitWallCell(step, player);
      const decal = decalMap.get(`${wx},${wy},${face}`);
      if (!decal) continue;

      const camX = column / res - 0.5;
      const angle = Math.atan2(camX, ctx.focalLength);
      const wall = this.project(
        step.block.height,
        angle,
        step.distance,
        ctx.height,
        ctx.viewScale
      );
      const wallZ = this.perpDistance(step.distance, angle) * DEPTH_BIAS;
      const left = Math.floor(column * ctx.spacing);
      const width = Math.ceil(ctx.spacing);
      const texColumn = this.decalTexColumn(decal, step);

      draws.push({
        left,
        top: wall.top,
        width,
        height: wall.height,
        texColumn,
        depth: wallZ,
        texture: getBitmapTexture(ctx.gl, decal.texture.bitmap)
      });
    }

    return draws;
  }

  private decalTexColumn(decal: Decal, step: RayStep): number {
    const localColumn = decal.texture.frameWidth * step.offset;
    return decal.texture.frameColumn(
      localColumn,
      0,
      CONFIG.animationFps
    );
  }

  private wallDirection(step: RayStep, player: Player): WallDirection {
    if (step.verticalHit) {
      return player.x > step.x ? 0 : 2;
    }
    return player.y > step.y ? 1 : 3;
  }

  private perpDistance(distance: number, angle: number): number {
    return distance * Math.cos(angle);
  }

  private project(
    height: number,
    angle: number,
    distance: number,
    screenHeight: number,
    viewScale: number
  ): { top: number; height: number } {
    const z = this.perpDistance(distance, angle);
    const wallHeight = (viewScale * height) / z;
    const horizon = screenHeight / 2;
    const bottom = horizon + viewScale / (2 * z);
    return {
      top: bottom - wallHeight,
      height: wallHeight
    };
  }

  dispose(): void {
    this.batch?.dispose();
    this.batch = null;
    this.batchColumns = 0;
    this.program?.dispose();
  }
}
