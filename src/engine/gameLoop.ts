import Stats from 'stats.js/src/Stats.js';
import { CONFIG } from '../core/config';

export type GameLoopCallbacks = {
  update: (seconds: number) => void;
  render: (alpha: number) => void;
};

export class GameLoop {
  private lastTime = 0;
  private accumulator = 0;
  private callbacks: GameLoopCallbacks = {
    update: () => {},
    render: () => {}
  };

  constructor(private stats: Stats) {
    this.frame = this.frame.bind(this);
  }

  start(callbacks: GameLoopCallbacks): void {
    this.callbacks = callbacks;
    requestAnimationFrame(this.frame);
  }

  frame(time: number): void {
    if (this.lastTime === 0) {
      this.lastTime = time;
      requestAnimationFrame(this.frame);
      return;
    }

    let frameDelta = (time - this.lastTime) / 1000;
    this.lastTime = time;

    if (frameDelta > CONFIG.maxFrameDelta) {
      frameDelta = CONFIG.maxFrameDelta;
    }

    this.accumulator += frameDelta;

    const step = CONFIG.fixedTimestep;
    while (this.accumulator >= step) {
      this.callbacks.update(step);
      this.accumulator -= step;
    }

    const alpha = this.accumulator / step;
    this.callbacks.render(alpha);
    this.stats.update();

    requestAnimationFrame(this.frame);
  }
}
