/**
 * 16-Bit Systemic Game Engine - Input Adapter
 * Translates Keyboard, Touch D-Pad / Buttons, and Gamepad API into unified PlayerInputIntent.
 */

import { PlayerActionCommand, PlayerInputIntent } from '../game/types';

export class InputAdapter {
  private keysHeld: Set<string> = new Set();
  private queuedActions: PlayerActionCommand[] = [];
  private prevGamepadButtons: Record<number, boolean> = {};

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }

  public attach(): () => void {
    if (typeof window === 'undefined') return () => {};

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    return () => {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
    };
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const code = e.code;
    this.keysHeld.add(code);

    // One-shot edge actions
    if (!e.repeat) {
      if (code === 'KeyJ') {
        this.queuedActions.push('light');
      } else if (code === 'KeyK') {
        this.queuedActions.push('heavy');
      } else if (code === 'KeyL' || code === 'ShiftLeft' || code === 'ShiftRight') {
        this.queuedActions.push('dash');
      } else if (code === 'Space') {
        this.queuedActions.push('emp');
      } else if (code === 'KeyC') {
        this.queuedActions.push('parry');
      } else if (code === 'KeyE') {
        this.queuedActions.push('interact');
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysHeld.delete(e.code);
  }

  private handleBlur(): void {
    this.keysHeld.clear();
  }

  /**
   * Called by virtual touch controls in ConsoleShell
   */
  public triggerVirtualPress(action: 'up' | 'down' | 'left' | 'right' | PlayerActionCommand): void {
    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') {
      this.keysHeld.add(action);
    } else {
      this.queuedActions.push(action);
    }
  }

  public triggerVirtualRelease(action: 'up' | 'down' | 'left' | 'right' | PlayerActionCommand): void {
    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') {
      this.keysHeld.delete(action);
    }
  }

  /**
   * Polls Gamepad API and consumes queued inputs to return current intent
   */
  public pollIntent(): PlayerInputIntent {
    let moveX = 0;
    let moveY = 0;

    // 1. Keyboard & Touch directional input
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp') || this.keysHeld.has('up')) moveY -= 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown') || this.keysHeld.has('down')) moveY += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft') || this.keysHeld.has('left')) moveX -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight') || this.keysHeld.has('right')) moveX += 1;

    // 2. Gamepad API
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];
      if (gp) {
        // Left stick
        const axisX = gp.axes[0] || 0;
        const axisY = gp.axes[1] || 0;
        if (Math.abs(axisX) > 0.25) moveX = axisX;
        if (Math.abs(axisY) > 0.25) moveY = axisY;

        // D-pad
        if (gp.buttons[14]?.pressed) moveX = -1;
        if (gp.buttons[15]?.pressed) moveX = 1;
        if (gp.buttons[12]?.pressed) moveY = -1;
        if (gp.buttons[13]?.pressed) moveY = 1;

        // Button A (Light) - Button 0
        if (gp.buttons[0]?.pressed && !this.prevGamepadButtons[0]) {
          this.queuedActions.push('light');
        }
        // Button B (Heavy) - Button 1
        if (gp.buttons[1]?.pressed && !this.prevGamepadButtons[1]) {
          this.queuedActions.push('heavy');
        }
        // Button X (Dash) - Button 2
        if (gp.buttons[2]?.pressed && !this.prevGamepadButtons[2]) {
          this.queuedActions.push('dash');
        }
        // Button Y (EMP) - Button 3
        if (gp.buttons[3]?.pressed && !this.prevGamepadButtons[3]) {
          this.queuedActions.push('emp');
        }

        // Cache previous buttons
        for (let i = 0; i < gp.buttons.length; i++) {
          this.prevGamepadButtons[i] = gp.buttons[i]?.pressed || false;
        }
      }
    }

    // Normalize diagonal
    const len = Math.hypot(moveX, moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }

    const actions = [...this.queuedActions];
    this.queuedActions = [];

    return {
      moveX,
      moveY,
      actions
    };
  }
}
