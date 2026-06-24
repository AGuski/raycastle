import { CONFIG } from '../../../core/config';
import { experimental } from '../../../core/experimental';
import { swingTransformAt } from '../../../game/weaponSwing';
import { combineShader, linkProgram } from '../glUtils';
import { getBitmapTexture } from '../glTexture';
import { Program } from '../program';
import { QuadBatch } from '../quadBatch';
import { FrameContext, RenderPass } from '../renderPass';
import volumetricGlsl from '../shaders/lib/volumetric.glsl?raw';
import weaponVert from '../shaders/weapon.vert.glsl?raw';
import weaponFrag from '../shaders/weapon.frag.glsl?raw';

export class WeaponPass implements RenderPass {
  private program: Program | null = null;
  private batch: QuadBatch | null = null;

  init(gl: WebGL2RenderingContext): void {
    const handle = linkProgram(
      gl,
      combineShader(weaponVert),
      combineShader(volumetricGlsl, weaponFrag)
    );
    this.program = new Program(gl, handle);
    this.batch = new QuadBatch(
      gl,
      1,
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
    if (!program || !batch || ctx.player.sheathed) return;

    const { position, pivot, rotation, scale, bobAmplitude } = CONFIG.weapon;
    const bobScale = ctx.weaponScale * bobAmplitude;
    const bobX = Math.cos(ctx.player.paces * 2) * bobScale;
    const bobY = Math.sin(ctx.player.paces * 4) * bobScale;
    const weapon = ctx.player.weapon;
    const sizeScale = ctx.weaponScale * scale;
    const w = weapon.width * sizeScale;
    const h = weapon.height * sizeScale;
    const swing = ctx.player.swingProgress;
    const swingPose = swing > 0 ? swingTransformAt(swing) : null;
    const swingRotation = rotation + (swingPose?.rotation ?? 0);
    const swingOffsetX = (swingPose?.translation.x ?? 0) * w;
    const swingOffsetY = (swingPose?.translation.y ?? 0) * h;
    const pivotX = ctx.width * position.x + bobX + swingOffsetX;
    const pivotY = ctx.height * position.y + bobY - swingOffsetY;
    const left = pivotX - w * pivot.x;
    const top = pivotY - h * pivot.y;

    program.use();
    gl.uniform2f(program.uniform('uResolution'), ctx.width, ctx.height);

    const tex = getBitmapTexture(gl, weapon);
    tex.bind(0);
    gl.uniform1i(program.uniform('uTexture'), 0);
    gl.uniform2f(program.uniform('uTexSize'), tex.width, tex.height);
    gl.uniform1f(
      program.uniform('uVolumetric'),
      experimental.volumetricWeapon ? 1 : 0
    );
    gl.uniform1f(program.uniform('uTime'), ctx.time);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    batch.clear();
    batch.pushQuadScreenAtPivot(
      left,
      top,
      w,
      h,
      pivot.x,
      pivot.y,
      swingRotation,
      0,
      1,
      0
    );
    batch.upload();
    batch.bind();
    batch.draw();
    batch.unbind();

    gl.disable(gl.BLEND);
  }

  dispose(): void {
    this.batch?.dispose();
    this.program?.dispose();
  }
}
