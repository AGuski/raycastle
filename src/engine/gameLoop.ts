import Stats from 'stats.js/src/Stats.js';
import { CONFIG } from '../core/config';

export class GameLoop {
  private lastTime = 0;
  private callback: (seconds: number) => void = () => {};

  constructor(private stats: Stats) {
    this.frame = this.frame.bind(this);
  }

  start(callback: (seconds: number) => void): void {
    this.callback = callback;
    requestAnimationFrame(this.frame);
  }

  frame(time: number): void {
    const seconds = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (seconds < CONFIG.maxFrameDelta) {
      this.callback(seconds);
      this.stats.update();
    }
    requestAnimationFrame(this.frame);
  }
}
