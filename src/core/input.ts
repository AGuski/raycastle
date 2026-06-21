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
  private turnDelta = 0;
  private lookTouchId: number | null = null;
  private lastLookX = 0;

  constructor(private canvas: HTMLCanvasElement) {
    document.addEventListener('keydown', this.onKeyDown.bind(this), false);
    document.addEventListener('keyup', this.onKeyUp.bind(this), false);
    document.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    document.addEventListener('touchstart', this.onTouch.bind(this), false);
    document.addEventListener('touchmove', this.onTouch.bind(this), false);
    document.addEventListener('touchend', this.onTouchEnd.bind(this), false);
    document.addEventListener('touchcancel', this.onTouchEnd.bind(this), false);
    this.canvas.addEventListener('click', this.onCanvasClick.bind(this), false);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  consumeTurnDelta(): number {
    const delta = this.turnDelta;
    this.turnDelta = 0;
    return delta;
  }

  private onCanvasClick(): void {
    if (document.pointerLockElement === this.canvas) return;
    this.canvas.requestPointerLock();
  }

  private onMouseMove(e: MouseEvent): void {
    if (document.pointerLockElement !== this.canvas) return;
    this.turnDelta += e.movementX * CONFIG.lookSensitivity;
  }

  onTouch(e: TouchEvent): void {
    e.preventDefault();
    this.resetMovementStates();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const onLookSide = touch.pageX >= window.innerWidth * 0.5;

      if (onLookSide) {
        if (this.lookTouchId === null) {
          this.lookTouchId = touch.identifier;
          this.lastLookX = touch.pageX;
        } else if (this.lookTouchId === touch.identifier) {
          const deltaX = touch.pageX - this.lastLookX;
          this.lastLookX = touch.pageX;
          this.turnDelta += deltaX * CONFIG.lookSensitivity;
        }
        continue;
      }

      if (touch.pageY < window.innerHeight * 0.5) {
        this.setAction('forward', true);
      } else if (touch.pageX < window.innerWidth * 0.25) {
        this.setAction('left', true);
      } else {
        this.setAction('right', true);
      }
    }
  }

  onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (this.lookTouchId !== null) {
      const lookTouchActive = Array.from(e.touches).some(
        (touch) => touch.identifier === this.lookTouchId
      );
      if (!lookTouchActive) {
        this.lookTouchId = null;
      }
    }

    this.resetMovementStates();
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.pageX >= window.innerWidth * 0.5) continue;

      if (touch.pageY < window.innerHeight * 0.5) {
        this.setAction('forward', true);
      } else if (touch.pageX < window.innerWidth * 0.25) {
        this.setAction('left', true);
      } else {
        this.setAction('right', true);
      }
    }
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

  private resetMovementStates(): void {
    this.states.left = false;
    this.states.right = false;
    this.states.forward = false;
    this.states.backward = false;
  }

  private setAction(action: ControlState, val: boolean): void {
    this.states[action] = val;
  }
}
