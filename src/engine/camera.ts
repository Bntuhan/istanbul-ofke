import type { Vec2 } from "./math";
import { damp } from "./math";

/**
 * Follows a target with smoothing and trauma-based screen shake.
 * Shake uses squared trauma so small hits barely register and big ones slam.
 */
export class Camera {
  x = 0;
  y = 0;
  private trauma = 0;
  private shakeX = 0;
  private shakeY = 0;
  private seed = 1337;

  follow(target: Vec2, dt: number): void {
    this.x = damp(this.x, target.x, 8, dt);
    this.y = damp(this.y, target.y, 8, dt);
  }

  /** Add shake. amount in 0..1; stacks but clamps. */
  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    const shake = this.trauma * this.trauma;
    const maxOffset = 26;
    this.shakeX = (this.noise() * 2 - 1) * shake * maxOffset;
    this.shakeY = (this.noise() * 2 - 1) * shake * maxOffset;
  }

  /** Apply the camera transform; the world is drawn centered on the viewport. */
  apply(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    ctx.translate(
      Math.round(vw / 2 - this.x + this.shakeX),
      Math.round(vh / 2 - this.y + this.shakeY),
    );
  }

  private noise(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}
