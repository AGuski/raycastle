import { CONFIG } from './config';
import { toggleDebug } from './debug';
import { ControlState, ControlStates } from '../types';

export class Input {
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

    if (e.code === CONFIG.debugKey) {
      toggleDebug();
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
