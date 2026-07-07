import type { Vec2 } from "./math";
import { normalize } from "./math";

export interface RamGesture {
  /** Unit direction of the swipe. */
  dir: Vec2;
  /** Pixel length of the swipe. */
  magnitude: number;
  /** True when the swipe is long enough to be a full RAM (vs. a light nudge). */
  isFullRam: boolean;
}

const MIN_SWIPE = 28; // px — below this, ignore (a tap)
const FULL_RAM_SWIPE = 90; // px — at/above this it's a committed RAM

/**
 * Swipe-to-Ram input. The brief's "core feel": a gesture, not a button.
 * Emits a RamGesture on pointer release, plus keyboard fallback for desktop iteration.
 */
export class Input {
  private startX = 0;
  private startY = 0;
  private tracking = false;
  private onRam: (g: RamGesture) => void = () => {};

  constructor(el: HTMLElement) {
    el.addEventListener("pointerdown", this.down, { passive: false });
    el.addEventListener("pointerup", this.up, { passive: false });
    el.addEventListener("pointercancel", this.cancel, { passive: false });
    window.addEventListener("keydown", this.key);
  }

  onRamGesture(cb: (g: RamGesture) => void): void {
    this.onRam = cb;
  }

  private down = (e: PointerEvent): void => {
    e.preventDefault();
    this.tracking = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
  };

  private up = (e: PointerEvent): void => {
    if (!this.tracking) return;
    this.tracking = false;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude < MIN_SWIPE) return;
    this.onRam({
      dir: normalize(dx, dy),
      magnitude,
      isFullRam: magnitude >= FULL_RAM_SWIPE,
    });
  };

  private cancel = (): void => {
    this.tracking = false;
  };

  // Desktop fallback: WASD / arrows fire full rams so we can iterate without a touchscreen.
  private key = (e: KeyboardEvent): void => {
    const map: Record<string, Vec2> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 },
    };
    const dir = map[e.key];
    if (!dir) return;
    e.preventDefault();
    this.onRam({ dir, magnitude: FULL_RAM_SWIPE, isFullRam: true });
  };
}

/** Heavy haptic on connect — the phone should feel like it weighs 3 tons. */
export function haptic(pattern: number | number[]): void {
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* not supported — silently ignore */
    }
  }
}
