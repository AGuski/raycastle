import { CONFIG } from '../../../core/config';
import { Sprite } from '../../../game/entities/sprite';
import { Player } from '../../../game/player';
import { World } from '../../../game/world';
import { combineShader, linkProgram } from '../glUtils';
import { getBitmapTexture, GLTexture } from '../glTexture';
import { Program } from '../program';
import { QuadBatch } from '../quadBatch';
import { FrameContext, RenderPass } from '../renderPass';
import fogGlsl from '../shaders/lib/fog.glsl?raw';
import quadVert from '../shaders/quad.vert.glsl?raw';
import spriteFrag from '../shaders/sprite.frag.glsl?raw';

interface SpriteStrip {
  left: number;
  top: number;
  width: number;
  height: number;
  texColumn: number;
  depth: number;
  texture: GLTexture;
}

export class SpritePass implements RenderPass {
  private program: Program | null = null;
  private batch: QuadBatch | null = null;
  private readonly fogInvRange =
    1 / (CONFIG.fogEnd - CONFIG.fogStart);

  init(gl: WebGL2RenderingContext): void {
    const handle = linkProgram(
      gl,
      combineShader(quadVert),
      combineShader(fogGlsl, spriteFrag)
    );
    this.program = new Program(gl, handle);
    this.batch = new QuadBatch(
      gl,
      CONFIG.resolution * 8,
      this.program.attrib('aPosition'),
      this.program.attrib('aTexCoord'),
      this.program.attrib('aDepth')
    );
  }

  resize(_width: number, _height: number): void {}

  render(ctx: FrameContext): void {
    const gl = ctx.gl;
    const program = this.program;
    const batch = this.batch;
    if (!program || !batch) return;

    const strips = this.collectSprites(ctx, ctx.player, ctx.world);
    if (strips.length === 0) return;

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
    ctx.zBufferTex.bind(1);
    gl.uniform1i(program.uniform('uZBuffer'), 1);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let index = 0;
    while (index < strips.length) {
      const texture = strips[index].texture;
      batch.clear();
      while (index < strips.length && strips[index].texture.handle === texture.handle) {
        const strip = strips[index];
        batch.pushColumnStrip(
          strip.left,
          strip.top,
          strip.width,
          strip.height,
          strip.texColumn,
          strip.depth
        );
        index++;
      }

      batch.upload();
      batch.bind();

      texture.bind(0);
      gl.uniform1i(program.uniform('uTexture'), 0);
      gl.uniform2i(
        program.uniform('uTexSize'),
        texture.width,
        texture.height
      );

      batch.draw();
      batch.unbind();
    }

    gl.disable(gl.BLEND);
  }

  private collectSprites(
    ctx: FrameContext,
    player: Player,
    world: World
  ): SpriteStrip[] {
    const strips: SpriteStrip[] = [];
    const cosDir = Math.cos(player.direction);
    const sinDir = Math.sin(player.direction);
    const maxDistSq = ctx.renderRange * ctx.renderRange;

    for (const sprite of world.sprites) {
      strips.push(
        ...this.spriteStrips(sprite, player, cosDir, sinDir, maxDistSq, ctx, world)
      );
    }

    strips.sort((a, b) => b.depth - a.depth);
    return strips;
  }

  private spriteStrips(
    sprite: Sprite,
    player: Player,
    cosDir: number,
    sinDir: number,
    maxDistSq: number,
    ctx: FrameContext,
    world: World
  ): SpriteStrip[] {
    const dx = sprite.x - player.x;
    const dy = sprite.y - player.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > maxDistSq) return [];

    const transformY = dx * cosDir + dy * sinDir;
    if (transformY <= 0.1) return [];

    const transformX = -dx * sinDir + dy * cosDir;
    const invDepth = 1 / transformY;
    const spriteHeight = Math.abs(Math.floor(ctx.height * invDepth));
    const spriteWidth = Math.abs(
      Math.floor(spriteHeight * sprite.texture.aspectRatio)
    );
    if (spriteWidth <= 0 || spriteHeight <= 0) return [];

    const screenX =
      (transformX * invDepth * ctx.focalLength + 0.5) * ctx.columns;
    const spriteTop = Math.floor(ctx.height / 2 - spriteHeight / 2);
    const startColumn = Math.max(0, Math.floor(screenX - spriteWidth / 2));
    const endColumn = Math.min(ctx.columns, Math.ceil(screenX + spriteWidth / 2));
    const sheet = sprite.texture;
    const tex = getBitmapTexture(ctx.gl, sheet.bitmap);
    const animTime = sprite.animationTime ?? world.deltaTime;
    const strips: SpriteStrip[] = [];

    for (let column = startColumn; column < endColumn; column++) {
      if (transformY >= ctx.zBuffer[column]) continue;

      const stripe = column - (screenX - spriteWidth / 2);
      const left = Math.floor(column * ctx.spacing);
      const width = Math.ceil(ctx.spacing);
      const localColumn = (stripe / spriteWidth) * sheet.frameWidth;
      const texColumn = sheet.frameColumn(
        localColumn,
        animTime,
        CONFIG.animationFps
      );

      strips.push({
        left,
        top: spriteTop,
        width,
        height: spriteHeight,
        texColumn,
        depth: transformY,
        texture: tex
      });
    }

    return strips;
  }

  dispose(): void {
    this.batch?.dispose();
    this.program?.dispose();
  }
}
