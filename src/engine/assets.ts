import { Bitmap } from '../game/block';

function bakePixelData(bitmap: Bitmap): void {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }
  ctx.drawImage(bitmap.image, 0, 0);
  const pixels = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.pixelBytes = pixels.data;
  bitmap.pixelData = new Uint32Array(
    pixels.data.buffer,
    pixels.data.byteOffset,
    pixels.data.byteLength >> 2
  );
}

export class AssetManager {
  createBitmap(src: string, width: number, height: number): Bitmap {
    return new Bitmap(src, width, height);
  }

  preload(bitmaps: Bitmap[]): Promise<void> {
    return Promise.all(
      bitmaps.map(
        (bitmap) =>
          new Promise<void>((resolve, reject) => {
            if (bitmap.image.complete) {
              resolve();
              return;
            }
            bitmap.image.onload = () => resolve();
            bitmap.image.onerror = () =>
              reject(new Error(`Failed to load image: ${bitmap.image.src}`));
          })
      )
    ).then(() => {
      for (const bitmap of bitmaps) {
        bakePixelData(bitmap);
      }
    });
  }
}
