import './style.css';
import { Bitmap } from './block';
import { World } from './world';
import { Sprite } from './sprite';
import lampstandImg from './assets/lampstand_1_large.png';
import { ControlState, ControlStates, MapCell, RayStep, WallProjection } from './types';

function isOpenCell(cell: MapCell): cell is 0 | -1 {
  return cell === 0 || cell === -1;
}

const script = document.createElement('script');

script.onload = function () {
  const stats = new Stats();
  document.body.appendChild(stats.dom);
  requestAnimationFrame(function loop() {
    stats.update();
    requestAnimationFrame(loop);
  });
};

script.src = '//mrdoob.github.io/stats.js/build/stats.min.js';
document.body.appendChild(script);

const CIRCLE = Math.PI * 2;
const MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

class Controls {
  private codes: Record<number, ControlState> = {
    37: 'left',
    39: 'right',
    38: 'forward',
    40: 'backward'
  };
  public states: ControlStates = {
    left: false,
    right: false,
    forward: false,
    backward: false
  };

  constructor() {
    document.addEventListener('keydown', this.onKey.bind(this, true), false);
    document.addEventListener('keyup', this.onKey.bind(this, false), false);
    document.addEventListener('touchstart', this.onTouch.bind(this), false);
    document.addEventListener('touchmove', this.onTouch.bind(this), false);
    document.addEventListener('touchend', this.onTouchEnd.bind(this), false);
  }

  onTouch(e: TouchEvent): void {
    const t = e.touches[0];
    this.onTouchEnd(e);
    if (!t) return;
    if (t.pageY < window.innerHeight * 0.5) this.setState(true, 38);
    else if (t.pageX < window.innerWidth * 0.5) this.setState(true, 37);
    else if (t.pageY > window.innerWidth * 0.5) this.setState(true, 39);
  }

  onTouchEnd(e: TouchEvent): void {
    this.states = { left: false, right: false, forward: false, backward: false };
    e.preventDefault();
    e.stopPropagation();
  }

  onKey(val: boolean, e: KeyboardEvent): void {
    this.setState(val, e.keyCode);
    e.preventDefault();
    e.stopPropagation();
  }

  private setState(val: boolean, keyCode: number): void {
    const state = this.codes[keyCode];
    if (!state) return;
    this.states[state] = val;
  }
}

class Player {
  readonly weapon: Bitmap;
  private _paces = 0;

  get paces(): number {
    return this._paces;
  }

  constructor(
    public x: number,
    public y: number,
    public direction: number
  ) {
    this.weapon = new Bitmap(
      'https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Flearnbritenglish.files.wordpress.com%2F2013%2F09%2Fknife_fo3.png&f=1',
      319,
      320
    );
    this._paces = 0;
  }

  rotate(angle: number): void {
    this.direction = (this.direction + angle + CIRCLE) % CIRCLE;
  }

  walk(distance: number, map: World): void {
    const dx = Math.cos(this.direction) * distance;
    const dy = Math.sin(this.direction) * distance;
    if (isOpenCell(map.getBlock(this.x + dx, this.y))) this.x += dx;
    if (isOpenCell(map.getBlock(this.x, this.y + dy))) this.y += dy;
    this._paces += distance;
  }

  update(controls: ControlStates, map: World, seconds: number): void {
    if (controls.left) this.rotate(-Math.PI * seconds);
    if (controls.right) this.rotate(Math.PI * seconds);
    if (controls.forward) this.walk(3 * seconds, map);
    if (controls.backward) this.walk(-3 * seconds, map);
  }
}

class Camera {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private spacing: number;
  private range: number;
  private lightRange: number;
  private scale: number;
  private focalLength: number;

  constructor(
    canvas: HTMLCanvasElement,
    private resolution: number,
    focalLength = 0.8
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is not available');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.width = canvas.width = window.innerWidth * 0.5;
    this.height = canvas.height = window.innerHeight * 0.5;
    this.spacing = this.width / resolution;
    this.focalLength = focalLength;
    this.range = MOBILE ? 8 : 30;
    this.lightRange = 7;
    this.scale = (this.width + this.height) / 1200;
  }

  render(player: Player, map: World): void {
    this.drawSky(player.direction, map.skybox, map.light);
    this.drawColumns(player, map);
    this.drawWeapon(player.weapon, player.paces);
  }

  private drawSky(_direction: number, _sky: Bitmap, _ambient: number): void {
    this.ctx.save();
    this.ctx.fillStyle = '#1a120a';
    this.ctx.fillRect(0, 0, this.width, this.height * 0.5);
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(0, this.height * 0.5, this.width, this.height * 0.5);
    this.ctx.restore();
  }

  private drawColumns(player: Player, map: World): void {
    this.ctx.save();
    for (let column = 0; column < this.resolution; column++) {
      const x = column / this.resolution - 0.5;
      const angle = Math.atan2(x, this.focalLength);
      const ray = map.cast(player, player.direction + angle, this.range);
      this.drawColumn(column, ray, angle, map, player);
    }
    this.ctx.restore();
  }

  private drawWeapon(weapon: Bitmap, paces: number): void {
    const bobX = Math.cos(paces * 2) * this.scale * 6;
    const bobY = Math.sin(paces * 4) * this.scale * 6;
    const left = this.width * 0.66 + bobX;
    const top = this.height * 0.6 + bobY;
    this.ctx.drawImage(
      weapon.image,
      left,
      top,
      weapon.width * this.scale,
      weapon.height * this.scale
    );
  }

  private drawColumn(
    column: number,
    ray: RayStep[],
    angle: number,
    map: World,
    player: Player
  ): void {
    const ctx = this.ctx;
    const left = Math.floor(column * this.spacing);
    const width = Math.ceil(this.spacing);
    let hit = -1;

    while (++hit < ray.length && isOpenCell(ray[hit].block));

    for (let s = ray.length - 1; s >= 0; s--) {
      const step = ray[s];
      const stepXFrac = step.x - Math.floor(step.x);
      const invY = player.y > step.y;
      const invX = player.x > step.x;

      const getDir = (): number => {
        if (stepXFrac === 0) {
          return invX ? 0 : 2;
        }
        return invY ? 1 : 3;
      };
      const dir = getDir();

      if (s === hit) {
        let wall: WallProjection;

        if (step.block === -1 || step.block === 0) {
          wall = this.project(step.block, angle, step.distance);
        } else {
          wall = this.project(step.block.height, angle, step.distance);
          ctx.globalAlpha = 1;
          if (step.block.sides[dir].texture) {
            const side = step.block.sides[dir];
            let textureX = Math.floor(side.texture!.width * step.offset!);
            if (side.frames) {
              const currentFrame = Math.floor((map.deltaTime * 8) % side.frames);
              textureX =
                textureX / side.frames +
                (side.texture!.width / side.frames) * currentFrame;
            }
            ctx.drawImage(
              side.texture!.image,
              textureX,
              0,
              1,
              side.texture!.height,
              left,
              wall.top,
              width,
              wall.height
            );
          } else if (step.block.sides[dir].color) {
            ctx.fillStyle = step.block.sides[dir].color!;
            ctx.fillRect(left, wall.top, width, wall.height);
          } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(left, wall.top, width, wall.height);
          }
        }

        if (step.offset! <= 0.025 || step.offset! >= 0.975) {
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(left, wall.top, width, wall.height);
        }
        ctx.fillRect(left, wall.top, width, 1);
        ctx.fillRect(left, wall.top + wall.height, width, 1);

        ctx.fillStyle = '#000000';
        ctx.globalAlpha = Math.max(
          (step.distance + step.shading!) / this.lightRange - map.light,
          0
        );
        ctx.fillRect(left, wall.top, width, wall.height);
      }

      if (step.sprite) {
        const sprite = step.sprite;
        const wall = this.project(1, angle, step.distance);
        const textureX = Math.floor(sprite.texture.width * step.offset!);

        ctx.globalAlpha = 1;
        ctx.drawImage(
          sprite.texture.image,
          textureX,
          0,
          1,
          sprite.texture.image.height,
          left,
          wall.top,
          width,
          wall.height
        );
      }

      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.15;
    }
  }

  private project(height: number, angle: number, distance: number): WallProjection {
    const z = distance * Math.cos(angle);
    const wallHeight = (this.height * height) / z;
    const bottom = (this.height / 2) * (1 + 1 / z);
    return {
      top: bottom - wallHeight,
      height: wallHeight
    };
  }
}

class GameLoop {
  private lastTime = 0;
  private callback: (seconds: number) => void = () => {};

  constructor() {
    this.frame = this.frame.bind(this);
  }

  start(callback: (seconds: number) => void): void {
    this.callback = callback;
    requestAnimationFrame(this.frame);
  }

  frame(time: number): void {
    const seconds = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (seconds < 0.2) this.callback(seconds);
    requestAnimationFrame(this.frame);
  }
}

export function loadImageData(
  srcString: string,
  width: number,
  height: number
): Promise<ImageBitmap> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ofc = document.createElement('canvas').getContext('2d');
      if (!ofc) {
        throw new Error('Canvas 2D context is not available');
      }
      ofc.drawImage(img, 0, 0);
      const imageData = ofc.getImageData(0, 0, width, height);

      createImageBitmap(imageData).then((imageBitmap) => {
        resolve(imageBitmap);
      });
    };
    img.src = srcString;
  });
}

const display = document.getElementById('display');
if (!display || !(display instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element #display not found');
}

const player = new Player(15.3, -1.2, Math.PI * 0.3);
const map = new World(320);
const controls = new Controls();
const camera = new Camera(display, MOBILE ? 160 : 640, 0.6);
const loop = new GameLoop();

map.randomize();
map.sprites.push(new Sprite(new Bitmap(lampstandImg, 1024, 1024), 15, -3));

loop.start((seconds) => {
  map.update(seconds);
  player.update(controls.states, map, seconds);
  camera.render(player, map);
});
