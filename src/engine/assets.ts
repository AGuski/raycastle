import { Bitmap } from '../game/block';

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
    ).then(() => undefined);
  }
}
