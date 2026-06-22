import { CONFIG } from '../../../core/config';
import { BlockSide, WallDirection } from '../../../game/block';
import { Player } from '../../../game/player';
import { World } from '../../../game/world';
import {
  isOpenCell,
  MAP_EMPTY,
  MAP_OUT_OF_BOUNDS,
  RayStep,
  WallProjection
} from '../../../types';
import { combineShader, linkProgram } from '../glUtils';
import { getBitmapTexture, GLTexture, createSolidTexture } from '../glTexture';
import { Program } from '../program';
import { QuadBatch } from '../quadBatch';
import { FrameContext, RenderPass } from '../renderPass';
import fogGlsl from '../shaders/lib/fog.glsl?raw';
import quadVert from '../shaders/quad.vert.glsl?raw';
import wallFrag from '../shaders/wall.frag.glsl?raw';

interface WallDraw {
  left: number;
  top: number;
  width: number;
  height: number;
  texColumn: number;
  depth: number;
  texture: GLTexture | null;
  solidColor: [number, number, number] | null;
}

export class WallPass implements RenderPass {
  private gl: WebGL2RenderingContext | null = null;
  private program: Program | null = null;
  private batch: QuadBatch | null = null;
  private whiteTex: GLTexture | null = null;
  private batchColumns = 0;
  private readonly fogInvRange =
    1 / (CONFIG.fogEnd - CONFIG.fogStart);

  init(gl: WebGL2RenderingContext): void {
    const handle = linkProgram(
      gl,
      combineShader(quadVert),
      combineShader(fogGlsl, wallFrag)
    );
    this.program = new Program(gl, handle);
    this.gl = gl;
    this.whiteTex = createSolidTexture(gl, [255, 255, 255, 255]);
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
    const whiteTex = this.whiteTex;
    if (!program || !batch || !whiteTex) return;

    const draws = this.collectWalls(ctx, ctx.player, ctx.world);
    if (draws.length === 0) return;

    const groups = new Map<GLTexture | string, WallDraw[]>();
    for (const draw of draws) {
      const key: GLTexture | string = draw.solidColor
        ? `solid:${draw.solidColor.join(',')}`
        : draw.texture!;
      const list = groups.get(key) ?? [];
      list.push(draw);
      groups.set(key, list);
    }

    program.use();
    gl.uniform2f(program.uniform('uResolution'), ctx.width, ctx.height);
    gl.uniform1f(program.uniform('uFogStart'), CONFIG.fogStart);
    gl.uniform1f(program.uniform('uFogInvRange'), this.fogInvRange);
    gl.uniform3f(
      program.uniform('uFogColor'),
      CONFIG.fogColor[0],
      CONFIG.fogColor[1],
      CONFIG.fogColor[2]
    );

    for (const groupDraws of groups.values()) {
      const sample = groupDraws[0];
      batch.clear();
      for (const draw of groupDraws) {
        if (draw.solidColor) {
          batch.pushQuadScreen(
            draw.left,
            draw.top,
            draw.width,
            draw.height,
            0,
            1,
            draw.depth
          );
        } else {
          batch.pushColumnStrip(
            draw.left,
            draw.top,
            draw.width,
            draw.height,
            draw.texColumn,
            draw.depth
          );
        }
      }
      batch.upload();
      batch.bind();

      const tex = sample.texture ?? whiteTex;
      tex.bind(0);
      gl.uniform1i(program.uniform('uTexture'), 0);
      gl.uniform2i(program.uniform('uTexSize'), tex.width, tex.height);

      if (sample.solidColor) {
        gl.uniform1i(program.uniform('uSolid'), 1);
        gl.uniform3f(
          program.uniform('uSolidColor'),
          sample.solidColor[0],
          sample.solidColor[1],
          sample.solidColor[2]
        );
      } else {
        gl.uniform1i(program.uniform('uSolid'), 0);
      }

      batch.draw();
      batch.unbind();
    }
  }

  private collectWalls(
    ctx: FrameContext,
    player: Player,
    world: World
  ): WallDraw[] {
    const draws: WallDraw[] = [];
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

      const camX = column / res - 0.5;
      const angle = Math.atan2(camX, ctx.focalLength);
      const wall = this.project(
        step.block.height,
        angle,
        step.distance,
        ctx.height,
        ctx.viewScale
      );
      const wallZ = this.perpDistance(step.distance, angle);
      const dir = this.wallDirection(step, player);
      const side = step.block.sides[dir];
      const left = Math.floor(column * ctx.spacing);
      const width = Math.ceil(ctx.spacing);

      if (side.texture) {
        const texture = getBitmapTexture(ctx.gl, side.texture.bitmap);
        const texColumn = this.wallTexColumn(side, step, world);
        draws.push({
          left,
          top: wall.top,
          width,
          height: wall.height,
          texColumn,
          depth: wallZ,
          texture,
          solidColor: null
        });
      } else if (side.color) {
        draws.push({
          left,
          top: wall.top,
          width,
          height: wall.height,
          texColumn: 0,
          depth: wallZ,
          texture: null,
          solidColor: this.parseColor(side.color)
        });
      } else {
        draws.push({
          left,
          top: wall.top,
          width,
          height: wall.height,
          texColumn: 0,
          depth: wallZ,
          texture: null,
          solidColor: [0, 0, 0]
        });
      }
    }

    return draws;
  }

  private wallTexColumn(
    side: BlockSide,
    step: RayStep,
    world: World
  ): number {
    if (!side.texture) return 0;

    const localColumn = side.texture.frameWidth * step.offset;
    return side.texture.frameColumn(
      localColumn,
      world.deltaTime,
      CONFIG.animationFps
    );
  }

  private wallDirection(step: RayStep, player: Player): WallDirection {
    if (step.verticalHit) {
      return player.x > step.x ? 0 : 2;
    }
    return player.y > step.y ? 1 : 3;
  }

  private parseColor(color: string): [number, number, number] {
    if (color.startsWith('#') && color.length === 7) {
      return [
        parseInt(color.slice(1, 3), 16) / 255,
        parseInt(color.slice(3, 5), 16) / 255,
        parseInt(color.slice(5, 7), 16) / 255
      ];
    }
    return [0, 0, 0];
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
  ): WallProjection {
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
    this.whiteTex?.dispose();
    this.program?.dispose();
  }
}
