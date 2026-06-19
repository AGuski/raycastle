import { CONFIG } from '../core/config';
import { AssetManager } from '../engine/assets';
import { Bitmap, Block, BlockSide, BlockSides } from './block';
import { Sprite } from './entities/sprite';
import {
  isOpenCell,
  MAP_EMPTY,
  MAP_OUT_OF_BOUNDS,
  MapCell
} from '../types';
import wallBooksImg from '../assets/wall_stone_wood_books_large.png';
import wallFireAnimImg from '../assets/wall_stone_wood_fire_anim_large.png';
import wallNofireImg from '../assets/wall_stone_wood_nofire_1_large.png';
import wallPaintingImg from '../assets/wall_stone_wood_painting_1_large.png';
import wallControlsImg from '../assets/wall_stone_wood_controls_large.png';
import skyboxImg from '../assets/skybox.png';
import lampstandImg from '../assets/lampstand_1_large.png';

export class World {
  private wallGrid: MapCell[];
  public readonly sprites: Sprite[] = [];
  public readonly skybox: Bitmap;
  public light: number;
  public deltaTime = 0;

  readonly wallImage: Bitmap;
  private readonly lampstand: Bitmap;

  private readonly paintings: BlockSide[];

  constructor(
    private size: number,
    assets: AssetManager
  ) {
    const { textures } = CONFIG;
    this.wallGrid = new Array<MapCell>(size * size);
    this.wallImage = assets.createBitmap(
      wallBooksImg,
      textures.wallBooks.width,
      textures.wallBooks.height
    );
    this.paintings = [
      {
        texture: assets.createBitmap(
          wallFireAnimImg,
          textures.wallFireAnim.width,
          textures.wallFireAnim.height
        ),
        frames: textures.wallFireAnim.frames
      },
      {
        texture: assets.createBitmap(
          wallNofireImg,
          textures.wallNofire.width,
          textures.wallNofire.height
        )
      },
      {
        texture: assets.createBitmap(
          wallPaintingImg,
          textures.wallPainting.width,
          textures.wallPainting.height
        )
      },
      {
        texture: assets.createBitmap(
          wallControlsImg,
          textures.wallControls.width,
          textures.wallControls.height
        )
      }
    ];
    this.skybox = assets.createBitmap(
      skyboxImg,
      textures.skybox.width,
      textures.skybox.height
    );
    this.lampstand = assets.createBitmap(
      lampstandImg,
      textures.lampstand.width,
      textures.lampstand.height
    );
    this.light = 0;
  }

  getBitmaps(): Bitmap[] {
    return [
      this.wallImage,
      this.skybox,
      this.lampstand,
      ...this.paintings.map((p) => p.texture).filter((t): t is Bitmap => !!t)
    ];
  }

  addSprite(sprite: Sprite): void {
    this.sprites.push(sprite);
  }

  isOpen(x: number, y: number): boolean {
    return isOpenCell(this.getBlock(x, y));
  }

  getBlock(x: number, y: number): MapCell {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1) {
      return MAP_OUT_OF_BOUNDS;
    }
    return this.wallGrid[y * this.size + x];
  }

  private getBlockWithImageOnRandomSide(): Block {
    const sides: BlockSides = [
      { texture: this.wallImage },
      { texture: this.wallImage },
      { texture: this.wallImage },
      { texture: this.wallImage }
    ];
    const paintingOn = Math.floor(Math.random() * 4);
    const painting = this.paintings[Math.floor(Math.random() * this.paintings.length)];

    sides[paintingOn] = painting;
    return new Block(sides);
  }

  randomize(): void {
    this.sprites.length = 0;

    for (let i = 0; i < this.size * this.size; i++) {
      this.wallGrid[i] =
        Math.random() < CONFIG.wallFillProbability
          ? this.getBlockWithImageOnRandomSide()
          : MAP_EMPTY;
    }

    this.scatterLamps();
  }

  private scatterLamps(): void {
    const { lampSpawnProbability, lampPlayerClearRadius, playerStart } = CONFIG;
    const clearRadiusSq = lampPlayerClearRadius * lampPlayerClearRadius;

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!isOpenCell(this.wallGrid[y * this.size + x])) continue;
        if (Math.random() >= lampSpawnProbability) continue;

        const wx = x + 0.5;
        const wy = y + 0.5;
        const dx = wx - playerStart.x;
        const dy = wy - playerStart.y;
        if (dx * dx + dy * dy < clearRadiusSq) continue;

        this.addSprite(new Sprite(this.lampstand, wx, wy));
      }
    }
  }

  update(seconds: number): void {
    this.deltaTime += seconds;

    // Lighting flicker disabled for now — re-enable when ready:
    // if (this.light > 0) {
    //   this.light = Math.max(this.light - 10 * seconds, 0);
    // } else if (Math.random() * 5 < seconds) {
    //   this.light = 2;
    // }
    this.light = 1;
  }
}
