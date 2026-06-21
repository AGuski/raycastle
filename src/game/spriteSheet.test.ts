import { describe, expect, it } from 'vitest';
import { SpriteSheet } from './spriteSheet';

function mockBitmap(width: number, height: number) {
  return {
    image: {} as HTMLImageElement,
    width,
    height
  };
}

describe('SpriteSheet', () => {
  it('uses the full width for a single-frame sheet', () => {
    const sheet = new SpriteSheet(mockBitmap(512, 512), 1);
    expect(sheet.frameWidth).toBe(512);
    expect(sheet.aspectRatio).toBe(1);
    expect(sheet.frameColumn(100, 0, 8)).toBe(100);
  });

  it('selects animated frames from a horizontal sprite sheet', () => {
    const sheet = new SpriteSheet(mockBitmap(3072, 512), 6);
    expect(sheet.frameWidth).toBe(512);

    const frame0 = sheet.frameColumn(10, 0, 8);
    const frame1 = sheet.frameColumn(10, 0.125, 8);

    expect(frame0).toBe(10);
    expect(frame1).toBe(522);
  });
});
