import { CONFIG } from '../../../core/config';
import { experimental } from '../../../core/experimental';
import { Sprite } from '../../../game/entities/sprite';
import { SpriteEffect } from '../../../game/entities/spriteEffect';
import { isIdentityTransform } from '../../../game/entities/spriteAnimator';
import { Player } from '../../../game/player';
import { World } from '../../../game/world';
import { combineShader, linkProgram } from '../glUtils';
import { getBitmapTexture, GLTexture } from '../glTexture';
import { Program } from '../program';
import { QuadBatch } from '../quadBatch';
import { FrameContext, RenderPass } from '../renderPass';
import fogGlsl from '../shaders/lib/fog.glsl?raw';
import hitFlashGlsl from '../shaders/lib/hitFlash.glsl?raw';
import telegraphGlsl from '../shaders/lib/telegraph.glsl?raw';
import deathDissolveGlsl from '../shaders/lib/deathDissolve.glsl?raw';
import noiseGlsl from '../shaders/lib/noise.glsl?raw';
import quadVert from '../shaders/quad.vert.glsl?raw';
import spriteFrag from '../shaders/sprite.frag.glsl?raw';
import spriteMiasmaFrag from '../shaders/spriteMiasma.frag.glsl?raw';
import spriteShadowFrag from '../shaders/spriteShadow.frag.glsl?raw';
import volumetricGlsl from '../shaders/lib/volumetric.glsl?raw';

type SpriteStripKind = 'shadow' | 'sprite';

interface SpriteStrip {
  kind: SpriteStripKind;
  left: number;
  top: number;
  width: number;
  height: number;
  texColumn: number;
  depth: number;
  texture: GLTexture;
  effect: SpriteEffect;
  hitFlash: number;
  telegraph: number;
  deathDissolve: number;
  /** When set, the strip is drawn as a rotated/translated quad (px corners). */
  quad?: [number, number, number, number, number, number, number, number];
}

const SPRITE_EFFECTS: SpriteEffect[] = ['none', 'darkMiasma'];

export class SpritePass implements RenderPass {
  private gl: WebGL2RenderingContext | null = null;
  private readonly programs = new Map<SpriteEffect, Program>();
  private shadowProgram: Program | null = null;
  private batch: QuadBatch | null = null;
  private batchColumns = 0;
  private readonly fogInvRange =
    1 / (CONFIG.fogEnd - CONFIG.fogStart);

  init(gl: WebGL2RenderingContext): void {
    const programSources: Record<SpriteEffect, string> = {
      none: combineShader(
        fogGlsl,
        hitFlashGlsl,
        telegraphGlsl,
        deathDissolveGlsl,
        volumetricGlsl,
        spriteFrag
      ),
      darkMiasma: combineShader(
        fogGlsl,
        hitFlashGlsl,
        telegraphGlsl,
        deathDissolveGlsl,
        noiseGlsl,
        volumetricGlsl,
        spriteMiasmaFrag
      )
    };

    for (const effect of SPRITE_EFFECTS) {
      const handle = linkProgram(gl, combineShader(quadVert), programSources[effect]);
      this.programs.set(effect, new Program(gl, handle));
    }

    if (!this.programs.has('none')) {
      throw new Error('Sprite pass missing default program');
    }

    const shadowHandle = linkProgram(
      gl,
      combineShader(quadVert),
      combineShader(fogGlsl, spriteShadowFrag)
    );
    this.shadowProgram = new Program(gl, shadowHandle);

    this.gl = gl;
  }

  resize(width: number, _height: number): void {
    this.ensureBatch(width);
  }

  private ensureBatch(columns: number): void {
    const defaultProgram = this.programs.get('none');
    if (!this.gl || !defaultProgram || columns === this.batchColumns) return;

    this.batch?.dispose();
    this.batch = new QuadBatch(
      this.gl,
      columns * 8,
      defaultProgram.attrib('aPosition'),
      defaultProgram.attrib('aTexCoord'),
      defaultProgram.attrib('aDepth')
    );
    this.batchColumns = columns;
  }

  render(ctx: FrameContext): void {
    const gl = ctx.gl;
    const batch = this.batch;
    if (!batch) return;

    const strips = this.collectSprites(ctx, ctx.player, ctx.world);
    if (strips.length === 0) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    ctx.zBufferTex.bind(1);

    let index = 0;
    while (index < strips.length) {
      const strip = strips[index];
      const isShadow = strip.kind === 'shadow';
      const program = isShadow
        ? this.shadowProgram
        : this.programs.get(strip.effect);
      if (!program) {
        index++;
        continue;
      }

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

      if (isShadow) {
        gl.uniform1f(program.uniform('uShadowAlpha'), CONFIG.spriteShadow.alpha);
        gl.uniform1f(
          program.uniform('uSampleFrac'),
          CONFIG.spriteShadow.sampleFrac
        );
        gl.uniform1f(
          program.uniform('uBlurRadius'),
          CONFIG.spriteShadow.blurRadius
        );
      } else {
        // Baseline volumetric relight, applied to every sprite program (not an
        // effect). The shader no-ops when uVolumetric is 0.
        gl.uniform1f(program.uniform('uTime'), ctx.time);
        gl.uniform1f(
          program.uniform('uVolumetric'),
          experimental.volumetricSprites ? 1 : 0
        );
        if (strip.effect === 'darkMiasma') {
          gl.uniform1f(program.uniform('uLayerSeed'), 0);
          gl.uniform1f(program.uniform('uSmokeOnly'), 0);
        }
      }

      if (!isShadow) {
        gl.uniform1f(program.uniform('uHitFlash'), strip.hitFlash);
        gl.uniform1f(program.uniform('uTelegraph'), strip.telegraph);
        gl.uniform1f(program.uniform('uDeathDissolve'), strip.deathDissolve);
      }

      const texture = strip.texture;
      batch.clear();
      while (
        index < strips.length &&
        strips[index].texture.handle === texture.handle &&
        strips[index].kind === strip.kind &&
        (isShadow || strips[index].effect === strip.effect) &&
        (isShadow || strips[index].hitFlash === strip.hitFlash) &&
        (isShadow || strips[index].telegraph === strip.telegraph) &&
        (isShadow || strips[index].deathDissolve === strip.deathDissolve)
      ) {
        const current = strips[index];
        if (current.quad) {
          const q = current.quad;
          batch.pushColumnStripQuad(
            q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7],
            current.texColumn,
            current.depth
          );
        } else {
          batch.pushColumnStrip(
            current.left,
            current.top,
            current.width,
            current.height,
            current.texColumn,
            current.depth
          );
        }
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

      // Second miasma layer: offset phase/position, smoke only, blended on top.
      if (!isShadow && strip.effect === 'darkMiasma') {
        gl.uniform1f(program.uniform('uLayerSeed'), 1);
        gl.uniform1f(program.uniform('uSmokeOnly'), 1);
        batch.draw();
      }

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

    strips.sort((a, b) => {
      const depthDelta = b.depth - a.depth;
      if (depthDelta !== 0) return depthDelta;
      return (a.kind === 'shadow' ? 0 : 1) - (b.kind === 'shadow' ? 0 : 1);
    });
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
    const spriteHeight = Math.abs(Math.floor(ctx.viewScale * invDepth));
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
    const effect = sprite.effect ?? 'none';
    const hitFlash = sprite.getHitFlash?.(world.deltaTime) ?? 0;
    const telegraph = sprite.getTelegraph?.(world.deltaTime) ?? 0;
    const deathDissolve = sprite.getDeathDissolve?.(world.deltaTime) ?? 0;
    const animTime = sprite.animationTime ?? world.deltaTime;
    const strips: SpriteStrip[] = [];

    const transform = sprite.animator?.transformAt(animTime);
    const animated = !!transform && !isIdentityTransform(transform);

    // Procedurally-animated sprites are drawn as transformed quads: translate the
    // billboard, then scale and rotate around the bottom-center ("legs") pivot.
    // Per-column occlusion is left to the shader's z-test so rotated strips stay
    // correctly hidden behind walls.
    const cos = animated ? Math.cos(transform!.rotation) : 1;
    const sin = animated ? Math.sin(transform!.rotation) : 0;
    const scale = animated ? transform!.scale : 1;
    const offsetX = animated ? transform!.translation.x * spriteWidth * ctx.spacing : 0;
    const offsetY = animated ? -transform!.translation.y * spriteHeight : 0;
    const topB = spriteTop + offsetY;
    const pivotX = screenX * ctx.spacing + offsetX;
    const pivotY = topB + spriteHeight;
    const shadow = CONFIG.spriteShadow;
    const shadowHeight = shadow.enabled
      ? Math.max(1, Math.floor(spriteHeight * shadow.heightFrac))
      : 0;
    const shadowOffsetY = shadow.enabled
      ? spriteHeight * shadow.offsetYFrac
      : 0;

    for (let column = startColumn; column < endColumn; column++) {
      if (!animated && transformY >= ctx.zBuffer[column]) continue;

      const stripe = column - (screenX - spriteWidth / 2);
      const left = Math.floor(column * ctx.spacing);
      const width = Math.ceil(ctx.spacing);
      const localColumn = (stripe / spriteWidth) * sheet.frameWidth;
      const texColumn = sheet.frameColumn(
        localColumn,
        animTime,
        CONFIG.animationFps
      );

      if (!animated) {
        if (shadowHeight > 0) {
          strips.push({
            kind: 'shadow',
            left: stretchColumn(
              width,
              column * ctx.spacing + width * 0.5,
              shadow.stretch
            ).left,
            top: spriteTop + spriteHeight - shadowHeight + shadowOffsetY,
            width: stretchColumn(
              width,
              column * ctx.spacing + width * 0.5,
              shadow.stretch
            ).width,
            height: shadowHeight,
            texColumn,
            depth: transformY,
            texture: tex,
            effect,
            hitFlash: 0,
            telegraph: 0,
            deathDissolve: 0
          });
        }

        strips.push({
          kind: 'sprite',
          left,
          top: spriteTop,
          width,
          height: spriteHeight,
          texColumn,
          depth: transformY,
          texture: tex,
          effect,
          hitFlash,
          telegraph,
          deathDissolve
        });
        continue;
      }

      const x0 = column * ctx.spacing + offsetX;
      const x1 = x0 + ctx.spacing;
      const yTop = topB;
      const yBot = topB + spriteHeight;

      if (shadowHeight > 0) {
        const centerX = (x0 + x1) * 0.5;
        const halfW = ((x1 - x0) * shadow.stretch) * 0.5;
        const sx0 = centerX - halfW;
        const sx1 = centerX + halfW;
        const syTop = pivotY - shadowHeight + shadowOffsetY;
        const syBot = pivotY + shadowOffsetY;

        strips.push({
          kind: 'shadow',
          left,
          top: spriteTop,
          width,
          height: spriteHeight,
          texColumn,
          depth: transformY,
          texture: tex,
          effect,
          quad: [
            ...transformCorner(sx0, syTop, pivotX, pivotY, scale, cos, sin),
            ...transformCorner(sx1, syTop, pivotX, pivotY, scale, cos, sin),
            ...transformCorner(sx1, syBot, pivotX, pivotY, scale, cos, sin),
            ...transformCorner(sx0, syBot, pivotX, pivotY, scale, cos, sin)
          ] as SpriteStrip['quad'],
          hitFlash: 0,
          telegraph: 0,
          deathDissolve: 0
        });
      }

      strips.push({
        kind: 'sprite',
        left,
        top: spriteTop,
        width,
        height: spriteHeight,
        texColumn,
        depth: transformY,
        texture: tex,
        effect,
        hitFlash,
        telegraph,
        deathDissolve,
        quad: [
          ...transformCorner(x0, yTop, pivotX, pivotY, scale, cos, sin),
          ...transformCorner(x1, yTop, pivotX, pivotY, scale, cos, sin),
          ...transformCorner(x1, yBot, pivotX, pivotY, scale, cos, sin),
          ...transformCorner(x0, yBot, pivotX, pivotY, scale, cos, sin)
        ] as SpriteStrip['quad']
      });
    }

    return strips;
  }

  dispose(): void {
    this.batch?.dispose();
    this.batch = null;
    this.batchColumns = 0;
    for (const program of this.programs.values()) {
      program.dispose();
    }
    this.programs.clear();
    this.shadowProgram?.dispose();
    this.shadowProgram = null;
  }
}

function stretchColumn(
  width: number,
  centerX: number,
  stretch: number
): { left: number; width: number } {
  const halfW = (width * stretch) * 0.5;
  const stretchedLeft = centerX - halfW;
  return { left: Math.floor(stretchedLeft), width: Math.ceil(halfW * 2) };
}

function transformCorner(
  px: number,
  py: number,
  pivotX: number,
  pivotY: number,
  scale: number,
  cos: number,
  sin: number
): [number, number] {
  const dx = (px - pivotX) * scale;
  const dy = (py - pivotY) * scale;
  return [pivotX + dx * cos - dy * sin, pivotY + dx * sin + dy * cos];
}
