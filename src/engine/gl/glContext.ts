import { CONFIG } from '../../core/config';

export class GlContext {
  readonly gl: WebGL2RenderingContext;
  width = 0;
  height = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false
    });
    if (!gl) {
      throw new Error('WebGL2 is not available');
    }
    this.gl = gl;
    this.resize();
    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    });
  }

  private onResize = (): void => {
    this.resize();
  };

  resize(): void {
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    const invScale = 1 / CONFIG.canvasScale;

    // Integer buffer size so display pixels upscale uniformly (no CSS stretch).
    this.width = Math.max(1, Math.round(displayWidth / invScale));
    this.height = Math.max(1, Math.round(displayHeight / invScale));

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${this.width * invScale}px`;
    this.canvas.style.height = `${this.height * invScale}px`;
    this.gl.viewport(0, 0, this.width, this.height);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
  }
}
