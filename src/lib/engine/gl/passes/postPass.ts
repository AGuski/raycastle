import { combineShader, linkProgram } from '../glUtils';
import { FullscreenQuad } from '../fullscreenQuad';
import { Program } from '../program';
import { FrameContext, RenderPass } from '../renderPass';
import fullscreenVert from '../shaders/fullscreen.vert.glsl?raw';
import postFrag from '../shaders/post.frag.glsl?raw';

export class PostPass implements RenderPass {
  private program: Program | null = null;
  private quad: FullscreenQuad | null = null;

  init(gl: WebGL2RenderingContext): void {
    const handle = linkProgram(
      gl,
      combineShader(fullscreenVert),
      combineShader(postFrag)
    );
    this.program = new Program(gl, handle);
    this.quad = new FullscreenQuad(gl);
  }

  resize(_width: number, _height: number): void {}

  render(ctx: FrameContext): void {
    const gl = ctx.gl;
    const program = this.program;
    const quad = this.quad;
    if (!program || !quad) return;

    program.use();
    gl.uniform2f(program.uniform('uResolution'), ctx.width, ctx.height);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    quad.bind(program.attrib('aPosition'));
    quad.draw();
    quad.unbind();

    gl.disable(gl.BLEND);
  }

  dispose(): void {
    this.quad?.dispose();
    this.program?.dispose();
  }
}
