import { CONFIG } from '../../../core/config';
import { combineShader, linkProgram } from '../glUtils';
import { getBitmapTexture } from '../glTexture';
import { FullscreenQuad } from '../fullscreenQuad';
import { Program } from '../program';
import { FrameContext, RenderPass } from '../renderPass';
import fogGlsl from '../shaders/lib/fog.glsl?raw';
import fullscreenVert from '../shaders/fullscreen.vert.glsl?raw';
import floorCeilingFrag from '../shaders/floorCeiling.frag.glsl?raw';

export class FloorCeilingPass implements RenderPass {
  private program: Program | null = null;
  private quad: FullscreenQuad | null = null;
  private readonly fogInvRange =
    1 / (CONFIG.fogEnd - CONFIG.fogStart);

  init(gl: WebGL2RenderingContext): void {
    const program = linkProgram(
      gl,
      combineShader(fullscreenVert),
      combineShader(fogGlsl, floorCeilingFrag)
    );
    this.program = new Program(gl, program);
    this.quad = new FullscreenQuad(gl);
  }

  resize(_width: number, _height: number): void {}

  render(ctx: FrameContext): void {
    const gl = ctx.gl;
    const program = this.program;
    const quad = this.quad;
    if (!program || !quad) return;

    const floorTex = getBitmapTexture(gl, ctx.world.floorTexture, 'surface');
    const ceilingTex = getBitmapTexture(gl, ctx.world.ceilingTexture, 'surface');

    ctx.zBufferTex.uploadFloats(ctx.columns, 1, ctx.zBuffer);

    program.use();
    gl.uniform2f(program.uniform('uResolution'), ctx.width, ctx.height);
    gl.uniform1f(program.uniform('uColumns'), ctx.columns);
    gl.uniform1f(program.uniform('uViewScale'), ctx.viewScale);
    gl.uniform2f(program.uniform('uPlayerPos'), ctx.player.x, ctx.player.y);
    gl.uniform1f(program.uniform('uDir'), ctx.player.direction);
    gl.uniform1f(program.uniform('uFocal'), ctx.focalLength);
    gl.uniform1f(program.uniform('uMaxZ'), ctx.renderRange);
    gl.uniform1f(program.uniform('uFogStart'), CONFIG.fogStart);
    gl.uniform1f(program.uniform('uFogInvRange'), this.fogInvRange);
    gl.uniform3f(
      program.uniform('uFogColor'),
      CONFIG.fogColor[0],
      CONFIG.fogColor[1],
      CONFIG.fogColor[2]
    );

    floorTex.bind(0);
    gl.uniform1i(program.uniform('uFloorTex'), 0);
    ceilingTex.bind(1);
    gl.uniform1i(program.uniform('uCeilingTex'), 1);
    ctx.zBufferTex.bind(2);
    gl.uniform1i(program.uniform('uZBuffer'), 2);

    quad.bind(program.attrib('aPosition'));
    quad.draw();
    quad.unbind();
  }

  dispose(): void {
    this.quad?.dispose();
    this.program?.dispose();
  }
}
