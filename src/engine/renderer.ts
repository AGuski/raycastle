import { CONFIG } from '../core/config';
import { isDebugEnabled } from '../core/debug';
import { Bitmap, WallDirection } from '../game/block';
import { Sprite } from '../game/entities/sprite';
import { Player } from '../game/player';
import { World } from '../game/world';
import { cast } from './raycaster';
import {
  isOpenCell,
  MAP_EMPTY,
  MAP_OUT_OF_BOUNDS,
  RayStep,
  WallProjection
} from '../types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private spacing = 0;
  private scale = 0;
  private focalLength: number;
  private readonly zBuffer: Float32Array;
  private readonly rayCache: RayStep[][];
  private readonly floorCanvas: HTMLCanvasElement;
  private floorCtx: CanvasRenderingContext2D;
  private floorImageData: ImageData;
  private floorBuffer: Uint8ClampedArray;
  private floorRowStride = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private resolution: number,
    private renderRange: number,
    focalLength: number
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is not available');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.focalLength = focalLength;
    this.zBuffer = new Float32Array(resolution);
    this.rayCache = Array.from({ length: resolution }, () => []);
    this.floorCanvas = document.createElement('canvas');
    const floorCtx = this.floorCanvas.getContext('2d');
    if (!floorCtx) {
      throw new Error('Canvas 2D context is not available');
    }
    this.floorCtx = floorCtx;
    this.floorCtx.imageSmoothingEnabled = false;
    this.floorImageData = new ImageData(resolution, 1);
    this.floorBuffer = this.floorImageData.data;
    this.floorRowStride = resolution * 4;
    this.resize();
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.resize();
  };

  private resize(): void {
    this.width = Math.floor(window.innerWidth * CONFIG.canvasScale);
    this.canvas.width = this.width;
    this.height = Math.floor(window.innerHeight * CONFIG.canvasScale);
    this.canvas.height = this.height;
    this.spacing = this.width / this.resolution;
    this.scale = (this.width + this.height) / CONFIG.weaponScaleDivisor;
    this.floorCanvas.width = this.resolution;
    this.floorCanvas.height = this.height;
    this.floorRowStride = this.resolution * 4;
    this.floorImageData = new ImageData(this.resolution, this.height);
    this.floorBuffer = this.floorImageData.data;
  }

  render(player: Player, map: World): void {
    this.drawSky(player.direction, map.skybox, map.light);
    this.drawColumns(player, map);
    this.drawSprites(player, map);
    this.drawWeapon(player.weapon, player.paces);
  }

  private drawSky(_direction: number, _sky: Bitmap, _ambient: number): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawColumns(player: Player, map: World): void {
    const floorTex = map.floorTexture.pixelBytes;
    if (!floorTex) {
      throw new Error('Floor texture pixel data is not loaded');
    }

    this.zBuffer.fill(Infinity);
    this.floorBuffer.fill(0);

    const halfHeight = this.height * 0.5;
    const texW = map.floorTexture.width;
    const texH = map.floorTexture.height;
    const maxZ = this.renderRange;
    const dir = player.direction;
    const focal = this.focalLength;
    const res = this.resolution;
    const px = player.x;
    const py = player.y;

    for (let column = 0; column < res; column++) {
      const camX = column / res - 0.5;
      const angle = Math.atan2(camX, focal);
      const ray = cast(map, player, dir + angle, this.renderRange);
      this.rayCache[column] = ray;

      let hit = -1;
      while (++hit < ray.length && isOpenCell(ray[hit].block));

      if (hit < ray.length) {
        this.zBuffer[column] = this.perpDistance(ray[hit].distance, angle);
      } else if (ray.length > 0) {
        this.zBuffer[column] = this.perpDistance(
          ray[ray.length - 1].distance,
          angle
        );
      }
    }

    this.fillFloorCeiling(
      floorTex,
      texW,
      texH,
      halfHeight,
      maxZ,
      focal,
      dir,
      px,
      py
    );

    this.blitFloor();

    this.ctx.save();
    for (let column = 0; column < res; column++) {
      const camX = column / res - 0.5;
      const angle = Math.atan2(camX, focal);
      const ray = this.rayCache[column];
      let hit = -1;
      while (++hit < ray.length && isOpenCell(ray[hit].block));
      this.drawColumnWalls(column, ray, angle, hit, map, player);
    }
    this.ctx.restore();
  }

  private blitFloor(): void {
    this.floorCtx.putImageData(this.floorImageData, 0, 0);

    const res = this.resolution;
    const h = this.height;
    this.ctx.save();
    this.ctx.globalAlpha = 1;
    this.ctx.imageSmoothingEnabled = false;

    for (let column = 0; column < res; column++) {
      const left = Math.floor(column * this.spacing);
      const width = Math.ceil(this.spacing);
      this.ctx.drawImage(
        this.floorCanvas,
        column,
        0,
        1,
        h,
        left,
        0,
        width,
        h
      );
    }

    this.ctx.restore();
  }

  private fillFloorCeiling(
    floorTex: Uint8ClampedArray,
    texW: number,
    texH: number,
    halfHeight: number,
    maxZ: number,
    focal: number,
    dir: number,
    px: number,
    py: number
  ): void {
    const data = this.floorBuffer;
    const res = this.resolution;
    const rowStride = this.floorRowStride;

    for (let column = 0; column < res; column++) {
      const camX = column / res - 0.5;
      const angle = Math.atan2(camX, focal);
      const cosAngle = Math.cos(angle);
      if (Math.abs(cosAngle) < 0.001) continue;

      const cosRay = Math.cos(dir + angle);
      const sinRay = Math.sin(dir + angle);
      const invCos = 1 / cosAngle;
      const zLimit = this.zBuffer[column];

      for (let y = this.height - 1; y > halfHeight; y--) {
        const z = halfHeight / (y - halfHeight);
        if (z > maxZ || z >= zLimit) break;

        const worldX = px + z * cosRay * invCos;
        const worldY = py + z * sinRay * invCos;
        const texX = Math.min(
          texW - 1,
          Math.max(0, (worldX - Math.floor(worldX)) * texW | 0)
        );
        const texY = Math.min(
          texH - 1,
          Math.max(0, (worldY - Math.floor(worldY)) * texH | 0)
        );
        const src = (texY * texW + texX) << 2;
        const dst = y * rowStride + column * 4;

        data[dst] = floorTex[src];
        data[dst + 1] = floorTex[src + 1];
        data[dst + 2] = floorTex[src + 2];
        data[dst + 3] = 255;
      }

      for (let y = 0; y < halfHeight; y++) {
        const z = halfHeight / (halfHeight - y);
        if (z > maxZ || z >= zLimit) break;

        const worldX = px + z * cosRay * invCos;
        const worldY = py + z * sinRay * invCos;
        const texX = Math.min(
          texW - 1,
          Math.max(0, (worldX - Math.floor(worldX)) * texW | 0)
        );
        const texY = Math.min(
          texH - 1,
          Math.max(0, (worldY - Math.floor(worldY)) * texH | 0)
        );
        const src = (texY * texW + texX) << 2;
        const dst = y * rowStride + column * 4;

        data[dst] = floorTex[src];
        data[dst + 1] = floorTex[src + 1];
        data[dst + 2] = floorTex[src + 2];
        data[dst + 3] = 255;
      }
    }
  }

  private drawSprites(player: Player, map: World): void {
    const ctx = this.ctx;
    const cosDir = Math.cos(player.direction);
    const sinDir = Math.sin(player.direction);
    const maxDistSq = this.renderRange * this.renderRange;

    const sorted = map.sprites.slice().sort((a, b) => {
      const da = (a.x - player.x) ** 2 + (a.y - player.y) ** 2;
      const db = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
      return db - da;
    });

    ctx.save();
    ctx.globalAlpha = 1;

    for (const sprite of sorted) {
      this.drawSprite(sprite, player, cosDir, sinDir, maxDistSq);
    }

    ctx.restore();
  }

  private drawSprite(
    sprite: Sprite,
    player: Player,
    cosDir: number,
    sinDir: number,
    maxDistSq: number
  ): void {
    const dx = sprite.x - player.x;
    const dy = sprite.y - player.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > maxDistSq) return;

    const transformY = dx * cosDir + dy * sinDir;
    if (transformY <= 0.1) return;

    const transformX = -dx * sinDir + dy * cosDir;
    const invDepth = 1 / transformY;
    const spriteHeight = Math.abs(Math.floor(this.height * invDepth));
    const spriteWidth = Math.abs(
      Math.floor(spriteHeight * (sprite.texture.width / sprite.texture.height))
    );
    if (spriteWidth <= 0 || spriteHeight <= 0) return;

    const screenX =
      (transformX * invDepth * this.focalLength + 0.5) * this.resolution;
    const spriteTop = Math.floor(this.height / 2 - spriteHeight / 2);
    const startColumn = Math.max(0, Math.floor(screenX - spriteWidth / 2));
    const endColumn = Math.min(
      this.resolution,
      Math.ceil(screenX + spriteWidth / 2)
    );

    for (let column = startColumn; column < endColumn; column++) {
      if (transformY >= this.zBuffer[column]) continue;

      const stripe = column - (screenX - spriteWidth / 2);
      const textureX = Math.min(
        sprite.texture.width - 1,
        Math.max(0, Math.floor((stripe / spriteWidth) * sprite.texture.width))
      );
      const left = Math.floor(column * this.spacing);
      const width = Math.ceil(this.spacing);

      this.ctx.drawImage(
        sprite.texture.image,
        textureX,
        0,
        1,
        sprite.texture.height,
        left,
        spriteTop,
        width,
        spriteHeight
      );
    }
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

  private drawColumnWalls(
    column: number,
    ray: RayStep[],
    angle: number,
    hit: number,
    map: World,
    player: Player
  ): void {
    const ctx = this.ctx;
    const left = Math.floor(column * this.spacing);
    const width = Math.ceil(this.spacing);

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
              const currentFrame = Math.floor(
                (map.deltaTime * CONFIG.animationFps) % side.frames
              );
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

        if (isDebugEnabled()) {
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

      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.15;
    }
  }

  private perpDistance(distance: number, angle: number): number {
    return distance * Math.cos(angle);
  }

  private project(height: number, angle: number, distance: number): WallProjection {
    const z = this.perpDistance(distance, angle);
    const wallHeight = (this.height * height) / z;
    const bottom = (this.height / 2) * (1 + 1 / z);
    return {
      top: bottom - wallHeight,
      height: wallHeight
    };
  }
}
