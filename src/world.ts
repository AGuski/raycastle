import { Bitmap, BlockSide, Block } from './block';
import { Sprite } from './sprite';
import { GridStep, MapCell, Point, RayStep } from './types';
import wallBooksImg from './assets/wall_stone_wood_books_large.png';
import wallFireAnimImg from './assets/wall_stone_wood_fire_anim_large.png';
import wallNofireImg from './assets/wall_stone_wood_nofire_1_large.png';
import wallPaintingImg from './assets/wall_stone_wood_painting_1_large.png';
import wallControlsImg from './assets/wall_stone_wood_controls_large.png';

export class World {
  private wallGrid: MapCell[];
  public sprites: Sprite[] = [];
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
    this.skybox = new Bitmap(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Chalbi_Desert_Panorama.jpg/1200px-Chalbi_Desert_Panorama.jpg',
      2000,
      750
    );
    this.light = 0;
  }

  getBlock(x: number, y: number): MapCell {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1) return -1;
    return this.wallGrid[y * this.size + x];
  }

  getSprite(x: number, y: number): Sprite | undefined {
    x = Math.floor(x);
    y = Math.floor(y);
    return this.sprites.find(sprite => sprite.x === x && sprite.y === y);
  }

  private getBlockWithImageOnRandomSide(): Block {
    const sides: BlockSide[] = [
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
      this.wallGrid[i] = Math.random() < 0.3 ? this.getBlockWithImageOnRandomSide() : 0;
    }
  }

  cast(point: Point, angle: number, range: number): RayStep[] {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const noWall: GridStep = { x: 0, y: 0, length2: Infinity };

    const ray = (origin: RayStep): RayStep[] => {
      const stepX = step(sin, cos, origin.x, origin.y);
      const stepY = step(cos, sin, origin.y, origin.x, true);
      const nextStep =
        stepX.length2 < stepY.length2
          ? inspect(stepX, 1, 0, origin.distance, stepX.y)
          : inspect(stepY, 0, 1, origin.distance, stepY.x);

      if (nextStep.distance > range) return [origin];
      return [origin].concat(ray(nextStep));
    };

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
      const rayStep: RayStep = {
        x: gridStep.x,
        y: gridStep.y,
        block: this.getBlock(gridStep.x - dx, gridStep.y - dy),
        distance: distance + Math.sqrt(gridStep.length2),
        length2: gridStep.length2,
        sprite: this.getSprite(gridStep.x - dx, gridStep.y - dy),
        shading: shiftX ? (cos < 0 ? 2 : 0) : sin < 0 ? 2 : 1,
        offset: offset - Math.floor(offset)
      };
      return rayStep;
    };

    return ray({ x: point.x, y: point.y, block: 0, distance: 0 });
  }

  update(seconds: number): void {
    this.deltaTime = this.deltaTime + seconds;
    this.light = 1;
  }
}
