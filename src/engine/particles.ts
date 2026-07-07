import { randRange } from "./math";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  spin: number;
  rot: number;
  color: string;
  shape: "rect" | "ring";
}

/** Object-pooled debris/confetti emitter. Debris is half the satisfaction of a smash. */
export class Particles {
  private pool: Particle[] = [];
  private active: Particle[] = [];

  constructor(private readonly rng: () => number) {}

  burst(opts: {
    x: number;
    y: number;
    count: number;
    colors: string[];
    speed: number;
    size: number;
    shape?: "rect" | "ring";
    spread?: number; // base angle bias direction (radians); omit for full circle
  }): void {
    const { x, y, count, colors, speed, size, shape = "rect" } = opts;
    for (let i = 0; i < count; i++) {
      const angle =
        opts.spread !== undefined
          ? opts.spread + randRange(this.rng, -1.1, 1.1)
          : randRange(this.rng, 0, Math.PI * 2);
      const sp = speed * randRange(this.rng, 0.4, 1);
      const p = this.pool.pop() ?? ({} as Particle);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * sp;
      p.vy = Math.sin(angle) * sp;
      p.maxLife = randRange(this.rng, 0.35, 0.85);
      p.life = p.maxLife;
      p.size = size * randRange(this.rng, 0.6, 1.4);
      p.spin = randRange(this.rng, -12, 12);
      p.rot = randRange(this.rng, 0, Math.PI * 2);
      p.color = colors[(this.rng() * colors.length) | 0];
      p.shape = shape;
      this.active.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.active.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.5 * dt; // air drag
      p.vy *= 1 - 2.5 * dt;
      p.rot += p.spin * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.active) {
      const a = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.5);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.32;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  get count(): number {
    return this.active.length;
  }
}
