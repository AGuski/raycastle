import './style.css';
import Stats from 'stats.js/src/Stats.js';
import { Bitmap, WallDirection } from './block';
import { World } from './world';
import { Sprite } from './sprite';
import lampstandImg from './assets/lampstand_1_large.png';
import weaponKnifeImg from './assets/weapon_knife.png';
import {
  ControlState,
  ControlStates,
  isOpenCell,
  MAP_EMPTY,
  MAP_OUT_OF_BOUNDS,
  RayStep,
  WallProjection
} from './types';

let debugEnabled = false;

const stats = new Stats();
stats.domElement.style.position = 'fixed';
stats.domElement.style.top = '0';
stats.domElement.style.left = '0';
stats.domElement.style.zIndex = '10000';
document.body.appendChild(stats.domElement);

const CIRCLE = Math.PI * 2;
const MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

class Controls {
  private codes: Record<string, ControlState> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'forward',
    ArrowDown: 'backward',
    KeyA: 'left',
    KeyD: 'right',
    KeyW: 'forward',
    KeyS: 'backward'
  };
  public states: ControlStates = {
    left: false,
    right: false,
    forward: false,
    backward: false
  };

  constructor() {
    document.addEventListener('keydown', this.onKeyDown.bind(this), false);
    document.addEventListener('keyup', this.onKeyUp.bind(this), false);
    document.addEventListener('touchstart', this.onTouch.bind(this), false);
    document.addEventListener('touchmove', this.onTouch.bind(this), false);
    document.addEventListener('touchend', this.onTouchEnd.bind(this), false);
  }

  onTouch(e: TouchEvent): void {
    const t = e.touches[0];
    this.onTouchEnd(e);
    if (!t) return;
    if (t.pageY < window.innerHeight * 0.5) this.setAction('forward', true);
    else if (t.pageX < window.innerWidth * 0.5) this.setAction('left', true);
    else this.setAction('right', true);
  }

  onTouchEnd(e: TouchEvent): void {
    this.states = { left: false, right: false, forward: false, backward: false };
    e.preventDefault();
    e.stopPropagation();
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    if (e.code === 'F3') {
      debugEnabled = !debugEnabled;
      e.preventDefault();
      return;
    }

    const state = this.codes[e.code];
    if (!state) return;

    this.states[state] = true;
    e.preventDefault();
  }

  onKeyUp(e: KeyboardEvent): void {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    const state = this.codes[e.code];
    if (!state) return;

    this.states[state] = false;
    e.preventDefault();
  }

  private setAction(action: ControlState, val: boolean): void {
    this.states[action] = val;
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
    public direction: number,
    weapon: Bitmap
  ) {
    this.weapon = weapon;
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
  private width = 0;
  private height = 0;
  private spacing = 0;
  private range: number;
  private scale = 0;
  private focalLength: number;

  constructor(
    private canvas: HTMLCanvasElement,
    private resolution: number,
    focalLength = 0.8
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is not available');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.focalLength = focalLength;
    this.range = MOBILE ? 8 : 30;
    this.resize();
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.resize();
  };

  private resize(): void {
    this.width = this.canvas.width = window.innerWidth * 0.5;
    this.height = this.canvas.height = window.innerHeight * 0.5;
    this.spacing = this.width / this.resolution;
    this.scale = (this.width + this.height) / 1200;
  }

  render(player: Player, map: World): void {
    this.drawSky(player.direction, map.skybox, map.light);
    this.drawColumns(player, map);
    this.drawWeapon(player.weapon, player.paces);
  }

  private drawSky(_direction: number, _sky: Bitmap, _ambient: number): void {
    const skyHeight = this.height * 0.5;

    this.ctx.save();
    this.ctx.fillStyle = '#1a120a';
    this.ctx.fillRect(0, 0, this.width, skyHeight);

    // Skybox disabled for now — re-enable when ready:
    // const width = sky.width * (this.height / sky.height) * 2;
    // const left = (direction / CIRCLE) * -width;
    // this.ctx.drawImage(sky.image, left, 0, width, skyHeight);
    // if (left < width - this.width) {
    //   this.ctx.drawImage(sky.image, left + width, 0, width, skyHeight);
    // }

    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(0, skyHeight, this.width, this.height - skyHeight);

    // Ambient lighting overlay disabled for now:
    // if (ambient > 0) {
    //   this.ctx.fillStyle = '#ffffff';
    //   this.ctx.globalAlpha = ambient * 0.1;
    //   this.ctx.fillRect(0, skyHeight, this.width, this.height - skyHeight);
    // }

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

      const getDir = (): WallDirection => {
        if (stepXFrac === 0) {
          return invX ? 0 : 2;
        }
        return invY ? 1 : 3;
      };
      const dir = getDir();

      if (s === hit) {
        let wall: WallProjection;

        if (step.block === MAP_EMPTY || step.block === MAP_OUT_OF_BOUNDS) {
          wall = this.project(step.block, angle, step.distance);
        } else {
          wall = this.project(step.block.height, angle, step.distance);
          ctx.globalAlpha = 1;
          const side = step.block.sides[dir];
          if (side.texture) {
            let textureX = Math.floor(side.texture.width * step.offset);
            if (side.frames) {
              const currentFrame = Math.floor((map.deltaTime * 8) % side.frames);
              textureX =
                textureX / side.frames +
                (side.texture.width / side.frames) * currentFrame;
            }
            ctx.drawImage(
              side.texture.image,
              textureX,
              0,
              1,
              side.texture.height,
              left,
              wall.top,
              width,
              wall.height
            );
          } else if (side.color) {
            ctx.fillStyle = side.color;
            ctx.fillRect(left, wall.top, width, wall.height);
          } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(left, wall.top, width, wall.height);
          }
        }

        if (debugEnabled) {
          if (step.offset <= 0.025 || step.offset >= 0.975) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(left, wall.top, width, wall.height);
          }
          ctx.fillStyle = '#00ff00';
          ctx.globalAlpha = 0.7;
          ctx.fillRect(left, wall.top, width, 1);
          ctx.fillRect(left, wall.top + wall.height, width, 1);
        }

        ctx.fillStyle = '#000000';
        // Dynamic wall lighting disabled for now (lightRange was 7):
        // ctx.globalAlpha = Math.max(
        //   (step.distance + step.shading) / 7 - map.light,
        //   0
        // );
        // ctx.fillRect(left, wall.top, width, wall.height);
      }

      if (step.sprite) {
        const sprite = step.sprite;
        const wall = this.project(1, angle, step.distance);
        const textureX = Math.floor(sprite.texture.width * step.offset);

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
    if (seconds < 0.2) {
      this.callback(seconds);
      stats.update();
    }
    requestAnimationFrame(this.frame);
  }
}

const display = document.getElementById('display');
if (!display || !(display instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element #display not found');
}

const weapon = new Bitmap(weaponKnifeImg, 1200, 950);
const player = new Player(15.3, -1.2, Math.PI * 0.3, weapon);
const map = new World(320);
const controls = new Controls();
const camera = new Camera(display, MOBILE ? 160 : 640, 0.6);
const loop = new GameLoop();

map.randomize();
map.addSprite(new Sprite(new Bitmap(lampstandImg, 1024, 1024), 15, -3));

loop.start((seconds) => {
  map.update(seconds);
  player.update(controls.states, map, seconds);
  camera.render(player, map);
});
