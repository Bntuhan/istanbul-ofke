/** Gece/gündüz ve yağmur — level id'ye göre otomatik. */
export interface AtmospherePalette {
  shoulder: string;
  asphalt: string;
  curb: string;
  line: string;
  sky: string;
}

export interface AtmosphereState {
  darkness: number; // 0 = gündüz, 1 = gece
  raining: boolean;
  /** Oyuncu/araç sürtünmesi — yağmurda düşer (kaygan). */
  frictionMult: number;
  palette: AtmospherePalette;
  label: string;
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string): [number, number, number] => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

const DAY: AtmospherePalette = {
  shoulder: "#16161a",
  asphalt: "#26262b",
  curb: "#3a3a42",
  line: "rgba(230,220,140,0.55)",
  sky: "#1a1a22",
};

const NIGHT: AtmospherePalette = {
  shoulder: "#0a0a0e",
  asphalt: "#141418",
  curb: "#222228",
  line: "rgba(180,170,100,0.28)",
  sky: "#050508",
};

/** Level ilerledikçe kararır; bazı levellerde yağmur. */
export function atmosphereForLevel(levelId: number): AtmosphereState {
  const darkness = Math.min(0.92, (levelId - 1) * 0.12 + (levelId >= 7 ? 0.08 : 0));
  const raining = levelId !== 1 && levelId !== 5 && (levelId >= 4 || levelId === 3);
  const t = darkness;
  const palette: AtmospherePalette = {
    shoulder: lerpColor(DAY.shoulder, NIGHT.shoulder, t),
    asphalt: lerpColor(DAY.asphalt, NIGHT.asphalt, t),
    curb: lerpColor(DAY.curb, NIGHT.curb, t),
    line: t > 0.5 ? NIGHT.line : DAY.line,
    sky: lerpColor(DAY.sky, NIGHT.sky, t),
  };
  let label = "GÜNDÜZ";
  if (darkness > 0.65) label = "GECE";
  else if (darkness > 0.3) label = "AKŞAM";
  if (raining) label += " · YAĞMUR";

  return {
    darkness,
    raining,
    frictionMult: raining ? 0.52 : 1,
    palette,
    label,
  };
}

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  len: number;
}

/** Basit yağmur çizgileri — world space. */
export class RainSystem {
  private drops: RainDrop[] = [];
  private seeded = false;

  update(dt: number, camX: number, camY: number, vw: number, vh: number, rng: () => number): void {
    if (!this.seeded) {
      for (let i = 0; i < 120; i++) {
        this.drops.push({
          x: camX + randRange(rng, -vw, vw),
          y: camY + randRange(rng, -vh, vh),
          speed: randRange(rng, 520, 780),
          len: randRange(rng, 14, 28),
        });
      }
      this.seeded = true;
    }
    const top = camY - vh;
    const bottom = camY + vh;
    const left = camX - vw;
    const right = camX + vw;
    for (const d of this.drops) {
      d.y += d.speed * dt;
      d.x -= 40 * dt;
      if (d.y > bottom + 20) {
        d.y = top - randRange(rng, 0, 80);
        d.x = camX + randRange(rng, -vw, vw);
      }
      if (d.x < left - 40) d.x = right + 20;
    }
  }

  reset(): void {
    this.drops = [];
    this.seeded = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "rgba(180,200,255,0.35)";
    ctx.lineWidth = 1.5;
    for (const d of this.drops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 3, d.y + d.len);
      ctx.stroke();
    }
  }
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}
