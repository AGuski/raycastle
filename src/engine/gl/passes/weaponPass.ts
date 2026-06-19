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

    const bobX = Math.cos(ctx.player.paces * 2) * ctx.weaponScale * 6;
    const bobY = Math.sin(ctx.player.paces * 4) * ctx.weaponScale * 6;
    const weapon = ctx.player.weapon;
    const left = ctx.width * 0.66 + bobX;
    const top = ctx.height * 0.6 + bobY;
    const w = weapon.width * ctx.weaponScale;
    const h = weapon.height * ctx.weaponScale;

    program.use();
    gl.uniform2f(program.uniform('uResolution'), ctx.width, ctx.height);

    const tex = getBitmapTexture(gl, weapon);
    tex.bind(0);
    gl.uniform1i(program.uniform('uTexture'), 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    batch.clear();
    batch.pushQuadScreen(left, top, w, h, 0, 1, 0);
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
