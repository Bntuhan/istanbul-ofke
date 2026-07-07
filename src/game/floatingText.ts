interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  vy: number;
}

/** Score / commentary popups that rise and fade in world space. */
export class FloatingText {
  private items: FloatText[] = [];

  spawn(x: number, y: number, text: string, color: string, size = 22): void {
    this.items.push({ x, y, text, color, life: 0.9, maxLife: 0.9, size, vy: -90 });
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const t = this.items[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= 1 - 2 * dt;
      if (t.life <= 0) this.items.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of this.items) {
      const a = t.life / t.maxLife;
      const pop = a > 0.7 ? 1 + (a - 0.7) * 1.5 : 1; // brief pop-in
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.font = `900 ${t.size * pop}px -apple-system, system-ui, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }
}
