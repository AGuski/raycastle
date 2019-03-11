import { Bitmap, BlockSide, Block } from './block';
import { Sprite } from './sprite';

export class World {

  private wallGrid: any[];
  public sprites: Sprite[] = [];
  private skybox: Bitmap;
  private wallTexture: Bitmap;
  public light: number;
  public deltaTime: number = 0;

  wallImage = new Bitmap(require('./assets/wall_stone_wood_books_large.png'), 1024, 1024);

  paintings = [
    {
      texture: new Bitmap(require('./assets/wall_stone_wood_fire_anim_large.png'), 4096, 1024),
      frames: 4
    },
    {
      texture: new Bitmap(require('./assets/wall_stone_wood_nofire_1_large.png'), 1024, 1024)
    },
    {
      texture: new Bitmap(require('./assets/wall_stone_wood_painting_1_large.png'), 1024, 1024)
    },
    {
      texture: new Bitmap(require('./assets/wall_stone_wood_controls_large.png'), 1024, 1024)
    }
  ];

  constructor(private size: number) {
    this.size = size;
    this.wallGrid = new Array(size * size);
    this.skybox = new Bitmap('https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Chalbi_Desert_Panorama.jpg/1200px-Chalbi_Desert_Panorama.jpg', 2000, 750);
    this.light = 0;
  }

  getBlock(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1) return -1;
    return this.wallGrid[y * this.size + x];
  }

  getSprite(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    return this.sprites.find(sprite => sprite.x === x && sprite.y === y);
  }

  private getBlockWithImageOnRandomSide() {

    const sides = [
      {texture: this.wallImage}, 
      {texture: this.wallImage}, 
      {texture: this.wallImage}, 
      {texture: this.wallImage}, 
    ] as BlockSide[];
    const paintingOn = Math.floor(Math.random() * 4);
    const painting = this.paintings[Math.floor(Math.random()*this.paintings.length)];

    sides[paintingOn] = painting;
    return new Block(sides);
  }

  randomize() {
    for (var i = 0; i < this.size * this.size; i++) {
      this.wallGrid[i] = Math.random() < 0.3 ?
        this.getBlockWithImageOnRandomSide()
        : 0;
    }
  }

  cast(point, angle, range) {
    var self = this;
    var sin = Math.sin(angle);
    var cos = Math.cos(angle);
    var noWall = { length2: Infinity };
    return ray({ x: point.x, y: point.y, block: 0, distance: 0 });

    function ray(origin) {
      var stepX = step(sin, cos, origin.x, origin.y);
      var stepY = step(cos, sin, origin.y, origin.x, true);
      var nextStep = stepX.length2 < stepY.length2
        ? inspect(stepX, 1, 0, origin.distance, stepX.y)
        : inspect(stepY, 0, 1, origin.distance, stepY.x);

      if (nextStep.distance > range) return [origin];
      return [origin].concat(ray(nextStep));
    }

    function step(rise, run, x, y, inverted?): any {
      
      if (run === 0) return noWall;
      var dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x;
      var dy = dx * (rise / run);
      return {
        x: inverted ? y + dy : x + dx,
        y: inverted ? x + dx : y + dy,
        length2: dx * dx + dy * dy
      };
    }

    function inspect(step, shiftX, shiftY, distance, offset) {
      var dx = cos < 0 ? shiftX : 0;
      var dy = sin < 0 ? shiftY : 0;
      step.block = self.getBlock(step.x - dx, step.y - dy);
      step.sprite = self.getSprite(step.x - dx, step.y - dy) as Sprite;
      step.distance = distance + Math.sqrt(step.length2);
      if (shiftX) step.shading = cos < 0 ? 2 : 0;
      else step.shading = sin < 0 ? 2 : 1;
      step.offset = offset - Math.floor(offset);
      return step;
    }
  }

  update(seconds) {
    /* Lighting */
    //if (this.light > 0) this.light = Math.max(this.light - 10 * seconds, 0);
    //else if (Math.random() * 5 < seconds) this.light = 2
    this.deltaTime = this.deltaTime + seconds;
    this.light = 1;
  }
}