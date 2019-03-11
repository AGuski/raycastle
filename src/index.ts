import './style.css';
import { Bitmap } from './block';
import { World } from './world';
import { Sprite } from './sprite';

declare var Stats;

var debugging = document.getElementById('debugging');

function debug(value: string) {
  debugging.innerHTML = `Debug: ${value}`;
}


var script = document.createElement('script');

script.onload = function() {
  var stats = new Stats();
  document.body.appendChild(stats.dom);requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop)});
};

script.src='//mrdoob.github.io/stats.js/build/stats.min.js';
document.body.appendChild(script);


var CIRCLE = Math.PI * 2;
var MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)

class Controls {
  private codes = { 37: 'left', 39: 'right', 38: 'forward', 40: 'backward' };
  public states = { 'left': false, 'right': false, 'forward': false, 'backward': false };

  constructor() {
    document.addEventListener('keydown', this.onKey.bind(this, true), false);
    document.addEventListener('keyup', this.onKey.bind(this, false), false);
    document.addEventListener('touchstart', this.onTouch.bind(this), false);
    document.addEventListener('touchmove', this.onTouch.bind(this), false);
    document.addEventListener('touchend', this.onTouchEnd.bind(this), false);
  }

  onTouch(e) {
    var t = e.touches[0];
    this.onTouchEnd(e);
    if (t.pageY < window.innerHeight * 0.5) this.onKey(true, { keyCode: 38 });
    else if (t.pageX < window.innerWidth * 0.5) this.onKey(true, { keyCode: 37 });
    else if (t.pageY > window.innerWidth * 0.5) this.onKey(true, { keyCode: 39 });
  };

  onTouchEnd(e) {
    this.states = { 'left': false, 'right': false, 'forward': false, 'backward': false };
    e.preventDefault();
    e.stopPropagation();
  }

  onKey(val, e) {
    var state = this.codes[e.keyCode];
    if (typeof state === 'undefined') return;
    this.states[state] = val;
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();
  }
}

class Player {

  private weapon: Bitmap;
  private paces: number;

  constructor(private x: number, private y: number, private direction: number) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.weapon = new Bitmap('https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Flearnbritenglish.files.wordpress.com%2F2013%2F09%2Fknife_fo3.png&f=1', 319, 320);
    this.paces = 0;
  }

  rotate(angle) {
    this.direction = (this.direction + angle + CIRCLE) % (CIRCLE);
  }

  walk(distance, map) {
    var dx = Math.cos(this.direction) * distance;
    var dy = Math.sin(this.direction) * distance;
    if (map.getBlock(this.x + dx, this.y) <= 0) this.x += dx;
    if (map.getBlock(this.x, this.y + dy) <= 0) this.y += dy;
    this.paces += distance;
  }

  update(controls, map, seconds) {
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

  constructor(private canvas: HTMLCanvasElement, private resolution: number, public focalLength?: number) {
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.width = canvas.width = window.innerWidth * .5;
    this.height = canvas.height = window.innerHeight * .5;
    this.resolution = resolution;
    this.spacing = this.width / resolution;
    this.focalLength = focalLength || 0.8;
    this.range = MOBILE ? 8 : 30; // render range
    this.lightRange = 7;
    this.scale = (this.width + this.height) / 1200;
  }

  render(player, map) {
    this.drawSky(player.direction, map.skybox, map.light);
    this.drawColumns(player, map);
    this.drawWeapon(player.weapon, player.paces);
  }

  private drawSky(direction, sky, ambient) {
    var width = sky.width * (this.height / sky.height) * 2;
    var left = (direction / CIRCLE) * -width;

    this.ctx.save();
    this.ctx.fillStyle = '#1a120a';//'#312213';
    this.ctx.fillRect(0, 0, this.width, this.height * 0.5);
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(0,this.height * 0.5 , this.width, this.height * 0.5);
    //this.ctx.drawImage(sky.image, left, 0, width, this.height);
    //if (left < width - this.width) {
    //  this.ctx.drawImage(sky.image, left + width, 0, width, this.height);
    //}
    //if (ambient > 0) {
    //  this.ctx.fillStyle = '#ffffff';
    //  this.ctx.globalAlpha = ambient * 0.1;
    //  this.ctx.fillRect(0, this.height * 0.5, this.width, this.height * 0.5);
    //}
    this.ctx.restore();
  }

  private drawColumns(player, map: World) {
    this.ctx.save();
    for (var column = 0; column < this.resolution; column++) {
      
      // these are always the same if resolution and focalLength stays the same
      var x = column / this.resolution - 0.5;
      var angle = Math.atan2(x, this.focalLength);


      var ray = map.cast(player, player.direction + angle, this.range);
      this.drawColumn(column, ray, angle, map, player);
    }
    this.ctx.restore();
  }

  private drawWeapon(weapon, paces) {
    var bobX = Math.cos(paces * 2) * this.scale * 6;
    var bobY = Math.sin(paces * 4) * this.scale * 6;
    var left = this.width * 0.66 + bobX;
    var top = this.height * 0.6 + bobY;
    this.ctx.drawImage(weapon.image, left, top, weapon.width * this.scale, weapon.height * this.scale);
  }

  private drawColumn(column, ray, angle, map: World, player) {
    var ctx = this.ctx;
    var left = Math.floor(column * this.spacing);
    var width = Math.ceil(this.spacing);
    var hit = -1;

    while (++hit < ray.length && ray[hit].block <= 0);

    for (var s = ray.length - 1; s >= 0; s--) {
      var step = ray[s];
      //var rainDrops = Math.pow(Math.random(), 3) * s;
      //var rain = (rainDrops > 0) && this.project(0.1, angle, step.distance);

      const stepXFrac = step.x - Math.floor(step.x);
      //const stepYFrac = step.y - Math.floor(step.y);
      const invY = player.y > step.y;
      const invX = player.x > step.x;

      const getDir = () => {
        if (stepXFrac === 0 ) {
          return invX ? 0 : 2;
        } else {
          return invY ? 1 : 3;
        }
      }
      const dir = getDir();

      if (s === hit) {
        
        // step.block is value in map position
        if (step.block === -1 || step.block === 0) {
          var wall = this.project(step.block, angle, step.distance);
        } else {
          var wall = this.project(step.block.height, angle, step.distance);
          ctx.globalAlpha = 1;
          if (step.block.sides[dir].texture) {
            const side = step.block.sides[dir];
            var textureX = Math.floor(side.texture.width * step.offset);
            if (side.frames) {
              const currentFrame = Math.floor((map.deltaTime*8)%side.frames);
              textureX = textureX / side.frames + side.texture.width / side.frames * currentFrame;
            }
            ctx.drawImage(
              side.texture.image, 
              textureX, 0, 1, side.texture.height, left, wall.top, width, wall.height
              );
            }
          else if (step.block.sides[dir].color) {
            ctx.fillStyle = step.block.sides[dir].color;
            ctx.fillRect(left, wall.top, width, wall.height);
          } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(left, wall.top, width, wall.height);
          }
        }
        //var wall = this.project(step.block * Math.random() * 2, angle, step.distance); psycho stuff


        /*  geometric helpers: */

        if (step.offset <= 0.025 || step.offset >= .975) {
          ctx.globalAlpha = .7;
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(left, wall.top, width, wall.height);
        }
          ctx.fillRect(left, wall.top, width, 1);
          ctx.fillRect(left, wall.top+wall.height, width, 1);
        


        /* +++++++++++++++++++ */
  
       
        
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = Math.max((step.distance + step.shading) / this.lightRange - map.light, 0);
        ctx.fillRect(left, wall.top, width, wall.height);
      }

      if(step.sprite) {
        var sprite = step.sprite as Sprite;
        var wall = this.project(1, angle, step.distance);

        var textureX = Math.floor(sprite.texture.width * step.offset);
        // sprite.timesHit = sprite.timesHit%1023; //Math.floor(sprite.texture.width * step.offset);
        // debugger;
        ctx.globalAlpha = 1;
        // if (step.offset > 0.59 && step.offset < 0.61) {
        //   ctx.fillStyle = '#ff0000';
        //   ctx.fillRect(left, wall.top, width, wall.height);
        // }

        // need to get column which is over the center of the block ??


        
        ctx.drawImage(
          sprite.texture.image, 
          textureX, // current src x

          0,  // current src y
          1, // source selection width 
          sprite.texture.image.height,  // source selection height


          left, // target position x
          wall.top, // target position y -> by distance
          width, // target width (2)
          wall.height // target height -> by distance
        );
        // debugger;
      }
      
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.15;

      //while (--rainDrops > 0) ctx.fillRect(left, Math.random() * rain.top, 1, rain.height);
    }
  }

  private project(height, angle, distance) {
    var z = distance * Math.cos(angle);
    var wallHeight = (this.height * height / z);
    var bottom = this.height / 2 * (1 + 1 / z);
    return {
      top: bottom - wallHeight,
      height: wallHeight
    }; 
  }
}

class GameLoop {

  private lastTime: number;
  private callback: Function;

  constructor() {
    this.frame = this.frame.bind(this);
    this.lastTime = 0;
    this.callback = function() {};
  }

  start(callback) {
    this.callback = callback;
    requestAnimationFrame(this.frame);
  }

  frame(time) {
    var seconds = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (seconds < 0.2) this.callback(seconds);
    requestAnimationFrame(this.frame);
  }
}

export function loadImageData(srcString: string, width, height): Promise<ImageBitmap> {
  return new Promise((resolve: (t: ImageBitmap) => void) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ofc = document.createElement('canvas').getContext('2d')
      ofc.drawImage(img, 0,0);
      const imageData = ofc.getImageData(0,0, width, height);

      createImageBitmap(imageData).then(imageBitmap => {
        resolve(imageBitmap);
      });
    }
    img.src = srcString;
    // to ImageBitmap
  });
}

var display = document.getElementById('display') as HTMLCanvasElement;
var player = new Player(15.3, -1.2, Math.PI * 0.3);
var map = new World(320);
var controls = new Controls();
var camera = new Camera(display, MOBILE ? 160 : 640, .6);
var loop = new GameLoop();

map.randomize();
map.sprites.push(new Sprite(new Bitmap(require('./assets/lampstand_1_large.png'), 1024, 1024), 15, -3));
var deltaTime = 0;



loop.start(function frame(seconds) {
  deltaTime += seconds;
  map.update(seconds);
  player.update(controls.states, map, seconds);
  camera.render(player, map);
  //camera.focalLength = 0.8 + Math.pow(Math.cos(deltaTime)/2, 2); // <-- drunk mode
});

