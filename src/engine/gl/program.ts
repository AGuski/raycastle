export class Program {
  private readonly uniformCache = new Map<string, WebGLUniformLocation>();
  private readonly attribCache = new Map<string, number>();

  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly handle: WebGLProgram
  ) {}

  use(): void {
    this.gl.useProgram(this.handle);
  }

  uniform(name: string): WebGLUniformLocation {
    let location = this.uniformCache.get(name);
    if (!location) {
      const found = this.gl.getUniformLocation(this.handle, name);
      if (!found) {
        throw new Error(`Uniform not found: ${name}`);
      }
      location = found;
      this.uniformCache.set(name, location);
    }
    return location;
  }

  attrib(name: string): number {
    let location = this.attribCache.get(name);
    if (location === undefined) {
      const found = this.gl.getAttribLocation(this.handle, name);
      if (found === -1) {
        throw new Error(`Attribute not found: ${name}`);
      }
      location = found;
      this.attribCache.set(name, location);
    }
    return location;
  }

  dispose(): void {
    this.gl.deleteProgram(this.handle);
  }
}
