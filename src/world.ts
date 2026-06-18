import { Bitmap, BlockSide, Block, BlockSides } from './block';
import { Sprite } from './sprite';
import {
  GridStep,
  MAP_EMPTY,
  MAP_OUT_OF_BOUNDS,
  MapCell,
  Point,
  RayStep
} from './types';
import wallBooksImg from './assets/wall_stone_wood_books_large.png';
import wallFireAnimImg from './assets/wall_stone_wood_fire_anim_large.png';
import wallNofireImg from './assets/wall_stone_wood_nofire_1_large.png';
import wallPaintingImg from './assets/wall_stone_wood_painting_1_large.png';
import wallControlsImg from './assets/wall_stone_wood_controls_large.png';
import skyboxImg from './assets/skybox.png';

export class World {
  private wallGrid: MapCell[];
  public readonly sprites: Sprite[] = [];
  private readonly spriteIndex = new Map<number, Sprite>();
  public readonly skybox: Bitmap;
  public light: number;
  public deltaTime = 0;

  readonly wallImage = new Bitmap(wallBooksImg, 1024, 1024);

  private readonly paintings: BlockSide[] = [
    {
      texture: new Bitmap(wallFireAnimImg, 4096, 1024),
      frames: 4
    },
    {
      texture: new Bitmap(wallNofireImg, 1024, 1024)
    },
    {
      texture: new Bitmap(wallPaintingImg, 1024, 1024)
    },
    {
      texture: new Bitmap(wallControlsImg, 1024, 1024)
    }
  ];

  constructor(private size: number) {
    this.wallGrid = new Array<MapCell>(size * size);
    this.skybox = new Bitmap(skyboxImg, 4096, 1024);
    this.light = 0;
  }

  addSprite(sprite: Sprite): void {
    this.sprites.push(sprite);
    this.indexSprite(sprite);
  }

  getBlock(x: number, y: number): MapCell {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1) {
      return MAP_OUT_OF_BOUNDS;
    }
    return this.wallGrid[y * this.size + x];
  }

  getSprite(x: number, y: number): Sprite | undefined {
    return this.spriteIndex.get(this.cellKey(Math.floor(x), Math.floor(y)));
  }

  private cellKey(x: number, y: number): number {
    return y * this.size + x;
  }

  private indexSprite(sprite: Sprite): void {
    this.spriteIndex.set(this.cellKey(sprite.x, sprite.y), sprite);
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
    for (let i = 0; i < this.size * this.size; i++) {
      this.wallGrid[i] =
        Math.random() < 0.3 ? this.getBlockWithImageOnRandomSide() : MAP_EMPTY;
    }
  }

  cast(point: Point, angle: number, range: number): RayStep[] {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const noWall: GridStep = { x: 0, y: 0, length2: Infinity };
    const steps: RayStep[] = [];

    let current: RayStep = {
      x: point.x,
      y: point.y,
      block: MAP_EMPTY,
      distance: 0,
      length2: 0,
      shading: 0,
      offset: 0
    };
    steps.push(current);

    const step = (
      rise: number,
      run: number,
      x: number,
      y: number,
      inverted = false
    ): GridStep => {
      if (run === 0) return noWall;
      const dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x;
      const dy = dx * (rise / run);
      return {
        x: inverted ? y + dy : x + dx,
        y: inverted ? x + dx : y + dy,
        length2: dx * dx + dy * dy
      };
    };

    const inspect = (
      gridStep: GridStep,
      shiftX: number,
      shiftY: number,
      distance: number,
      offset: number
    ): RayStep => {
      const dx = cos < 0 ? shiftX : 0;
      const dy = sin < 0 ? shiftY : 0;
      const cellX = gridStep.x - dx;
      const cellY = gridStep.y - dy;
      const sprite = this.getSprite(cellX, cellY);
      const rayStep: RayStep = {
        x: gridStep.x,
        y: gridStep.y,
        block: this.getBlock(cellX, cellY),
        distance: distance + Math.sqrt(gridStep.length2),
        length2: gridStep.length2,
        shading: shiftX ? (cos < 0 ? 2 : 0) : sin < 0 ? 2 : 1,
        offset: offset - Math.floor(offset)
      };
      if (sprite) {
        rayStep.sprite = sprite;
      }
      return rayStep;
    };

    while (current.distance <= range) {
      const stepX = step(sin, cos, current.x, current.y);
      const stepY = step(cos, sin, current.y, current.x, true);
      const nextStep =
        stepX.length2 < stepY.length2
          ? inspect(stepX, 1, 0, current.distance, stepX.y)
          : inspect(stepY, 0, 1, current.distance, stepY.x);

      if (nextStep.distance > range) break;

      steps.push(nextStep);
      current = nextStep;
    }

    return steps;
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
