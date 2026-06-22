import { CONFIG } from '../../../core/config';
import { combineShader, linkProgram } from '../glUtils';
import { getBitmapTexture } from '../glTexture';
import { Program } from '../program';
import { QuadBatch } from '../quadBatch';
import { FrameContext, RenderPass } from '../renderPass';
import weaponVert from '../shaders/weapon.vert.glsl?raw';
import weaponFrag from '../shaders/weapon.frag.glsl?raw';

export class WeaponPass implements RenderPass {
  private program: Program | null = null;
  private batch: QuadBatch | null = null;

  init(gl: WebGL2RenderingContext): void {
    const handle = linkProgram(
      gl,
      combineShader(weaponVert),
      combineShader(weaponFrag)
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
    if (!program || !batch) return;

    const { position, pivot, rotation, scale, bobAmplitude } = CONFIG.weapon;
    const bobScale = ctx.weaponScale * bobAmplitude;
    const bobX = Math.cos(ctx.player.paces * 2) * bobScale;
    const bobY = Math.sin(ctx.player.paces * 4) * bobScale;
    const weapon = ctx.player.weapon;
    const sizeScale = ctx.weaponScale * scale;
    const w = weapon.width * sizeScale;
    const h = weapon.height * sizeScale;
    const pivotX = ctx.width * position.x + bobX;
    const pivotY = ctx.height * position.y + bobY;
    const left = pivotX - w * pivot.x;
    const top = pivotY - h * pivot.y;

    program.use();
    gl.uniform2f(program.uniform('uResolution'), ctx.width, ctx.height);

    const tex = getBitmapTexture(gl, weapon);
    tex.bind(0);
    gl.uniform1i(program.uniform('uTexture'), 0);

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
      rotation,
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
