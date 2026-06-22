const FLOATS_PER_VERTEX = 5;

export class QuadBatch {
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private readonly data: Float32Array;
  private vertexCount = 0;

  constructor(
    private gl: WebGL2RenderingContext,
    maxQuads: number,
    positionLoc: number,
    texCoordLoc: number,
    depthLoc: number
  ) {
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) {
      throw new Error('Failed to create quad batch');
    }
    this.vao = vao;
    this.buffer = buffer;
    this.data = new Float32Array(maxQuads * 6 * FLOATS_PER_VERTEX);

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);

    const stride = FLOATS_PER_VERTEX * 4;
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(depthLoc);
    gl.vertexAttribPointer(depthLoc, 1, gl.FLOAT, false, stride, 16);

    gl.bindVertexArray(null);
  }

  clear(): void {
    this.vertexCount = 0;
  }

  pushQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    depth: number
  ): void {
    const offset = this.vertexCount * FLOATS_PER_VERTEX;
    const d = this.data;
    const x1 = x + w;
    const y1 = y + h;

    d.set([x, y, u0, v0, depth, x1, y, u1, v0, depth, x1, y1, u1, v1, depth], offset);
    d.set([x, y, u0, v0, depth, x1, y1, u1, v1, depth, x, y1, u0, v1, depth], offset + 15);
    this.vertexCount += 6;
  }

  /** Top-left screen coords; V flipped to match UNPACK_FLIP_Y texture uploads. */
  pushQuadScreen(
    x: number,
    y: number,
    w: number,
    h: number,
    u0: number,
    u1: number,
    depth: number
  ): void {
    this.pushQuad(x, y, w, h, u0, 1, u1, 0, depth);
  }

  /** Single texture column stretched horizontally (matches Canvas 2D column strips). */
  pushColumnStrip(
    x: number,
    y: number,
    w: number,
    h: number,
    u: number,
    depth: number
  ): void {
    this.pushQuad(x, y, w, h, u, 1, u, 0, depth);
  }

  /**
   * Single texture column drawn as an arbitrarily-positioned quad. Corners are
   * given in screen pixels (top-left, top-right, bottom-right, bottom-left),
   * letting the caller apply rotation/translation per strip. The column texel
   * (`u`) is constant; V runs 1 at the top corners to 0 at the bottom corners to
   * match {@link pushColumnStrip}.
   */
  pushColumnStripQuad(
    tlX: number,
    tlY: number,
    trX: number,
    trY: number,
    brX: number,
    brY: number,
    blX: number,
    blY: number,
    u: number,
    depth: number
  ): void {
    const offset = this.vertexCount * FLOATS_PER_VERTEX;
    const d = this.data;

    d.set(
      [tlX, tlY, u, 1, depth, trX, trY, u, 1, depth, brX, brY, u, 0, depth],
      offset
    );
    d.set(
      [tlX, tlY, u, 1, depth, brX, brY, u, 0, depth, blX, blY, u, 0, depth],
      offset + 15
    );
    this.vertexCount += 6;
  }

  upload(): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      this.data.subarray(0, this.vertexCount * FLOATS_PER_VERTEX)
    );
  }

  bind(): void {
    this.gl.bindVertexArray(this.vao);
  }

  draw(): void {
    if (this.vertexCount === 0) return;
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount);
  }

  unbind(): void {
    this.gl.bindVertexArray(null);
  }

  get count(): number {
    return this.vertexCount;
  }

  dispose(): void {
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteVertexArray(this.vao);
  }
}
