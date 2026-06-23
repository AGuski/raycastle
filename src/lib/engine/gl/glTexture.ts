import { Bitmap } from '../../game/block';

export type TextureProfile = 'surface' | 'column';

interface CacheEntry {
  surface?: GLTexture;
  column?: GLTexture;
}

let textureCache = new WeakMap<Bitmap, CacheEntry>();

export class GLTexture {
  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly handle: WebGLTexture,
    readonly width: number,
    readonly height: number
  ) {}

  bind(unit: number): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.handle);
  }

  uploadFloats(width: number, height: number, data: Float32Array): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.handle);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      width,
      height,
      0,
      gl.RED,
      gl.FLOAT,
      data
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  dispose(): void {
    this.gl.deleteTexture(this.handle);
  }
}

function imageSize(image: TexImageSource): { width: number; height: number } {
  if (image instanceof HTMLImageElement) {
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height
    };
  }
  if (image instanceof HTMLCanvasElement) {
    return { width: image.width, height: image.height };
  }
  if (image instanceof ImageBitmap) {
    return { width: image.width, height: image.height };
  }
  return { width: 1, height: 1 };
}

export function createColorTexture(
  gl: WebGL2RenderingContext,
  image: TexImageSource,
  profile: TextureProfile
): GLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error('Failed to create texture');
  }

  const { width, height } = imageSize(image);
  const isSurface = profile === 'surface';

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_S,
    isSurface ? gl.REPEAT : gl.CLAMP_TO_EDGE
  );
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_T,
    isSurface ? gl.REPEAT : gl.CLAMP_TO_EDGE
  );

  if (isSurface) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  if (isSurface) {
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  gl.bindTexture(gl.TEXTURE_2D, null);

  return new GLTexture(gl, texture, width, height);
}

export function createSolidTexture(
  gl: WebGL2RenderingContext,
  rgba: [number, number, number, number]
): GLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error('Failed to create texture');
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array(rgba)
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
  return new GLTexture(gl, texture, 1, 1);
}

export function getBitmapTexture(
  gl: WebGL2RenderingContext,
  bitmap: Bitmap,
  profile: TextureProfile = 'column'
): GLTexture {
  let entry = textureCache.get(bitmap);
  if (!entry) {
    entry = {};
    textureCache.set(bitmap, entry);
  }

  const cached = entry[profile];
  if (cached) return cached;

  const created = createColorTexture(gl, bitmap.image, profile);
  entry[profile] = created;
  return created;
}

export function createZBufferTexture(
  gl: WebGL2RenderingContext,
  columns: number
): GLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error('Failed to create z-buffer texture');
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.R32F,
    columns,
    1,
    0,
    gl.RED,
    gl.FLOAT,
    null
  );
  gl.bindTexture(gl.TEXTURE_2D, null);

  return new GLTexture(gl, texture, columns, 1);
}

export function clearTextureCache(): void {
  textureCache = new WeakMap();
}
