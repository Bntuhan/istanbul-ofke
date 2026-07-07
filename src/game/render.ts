import type { Player } from "./player";
import type { Target } from "./targets";

/** Rounded-rect helper. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export const LANE_W = 116;
export const LANE_COUNT = 5;
export const ROAD_HALF = (LANE_W * LANE_COUNT) / 2;

/** Asphalt + lane markings, drawn around the camera position in world space. */
export function drawRoad(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
): void {
  const top = camY - vh;
  const bottom = camY + vh;

  // off-road shoulders
  ctx.fillStyle = "#16161a";
  ctx.fillRect(camX - vw, top, vw * 2, vh * 2);

  // asphalt
  ctx.fillStyle = "#26262b";
  ctx.fillRect(-ROAD_HALF, top, ROAD_HALF * 2, vh * 2);

  // curbs
  ctx.fillStyle = "#3a3a42";
  ctx.fillRect(-ROAD_HALF - 10, top, 10, vh * 2);
  ctx.fillRect(ROAD_HALF, top, 10, vh * 2);

  // dashed lane lines
  ctx.strokeStyle = "rgba(230,220,140,0.55)";
  ctx.lineWidth = 5;
  ctx.setLineDash([34, 30]);
  const startY = Math.floor(top / 64) * 64;
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = -ROAD_HALF + i * LANE_W;
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCarBody(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  body: string,
  accent: string,
  flash: number,
): void {
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, -w / 2 + 4, -h / 2 + 6, w, h, 12);
  ctx.fill();

  // body
  ctx.fillStyle = body;
  roundRect(ctx, -w / 2, -h / 2, w, h, 12);
  ctx.fill();

  // roof / cabin
  ctx.fillStyle = accent;
  roundRect(ctx, -w / 2 + 8, -h / 2 + h * 0.22, w - 16, h * 0.4, 8);
  ctx.fill();

  // windshield highlight
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, -w / 2 + 10, -h / 2 + h * 0.24, w - 20, h * 0.14, 6);
  ctx.fill();

  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, -w / 2, -h / 2, w, h, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawTarget(ctx: CanvasRenderingContext2D, t: Target): void {
  const { w, h } = t.type;
  ctx.save();
  ctx.globalAlpha = t.alpha;
  ctx.translate(t.x, t.y);
  ctx.rotate(t.angle);
  if (t.dead) ctx.scale(t.scaleX, t.scaleY); // flip / collapse death styles

  if (t.type.id === "simit") {
    // simit cart: little box + wheels
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    roundRect(ctx, -w / 2 + 3, -h / 2 + 5, w, h, 8);
    ctx.fill();
    ctx.fillStyle = t.type.body;
    roundRect(ctx, -w / 2, -h / 2, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = t.type.accent;
    ctx.lineWidth = 6;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * 16, -2, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    drawCarBody(ctx, w, h, t.type.body, t.type.accent, t.flash);
    // çakarlı flashers
    if (t.type.id === "cakarli" && !t.dead) {
      const on = (Math.floor(performance.now() / 120) % 2) === 0;
      ctx.fillStyle = on ? "#5b8cff" : "#ff5b5b";
      roundRect(ctx, -w / 2 + 6, -h / 2 + 2, w - 12, 7, 3);
      ctx.fill();
    }
    // hazard lights on parked / dented cars
    if ((t.type.id === "cift_park" || t.dent > 0) && !t.dead) {
      const on = (Math.floor(performance.now() / 350) % 2) === 0;
      if (on) {
        ctx.fillStyle = "#ffae3a";
        ctx.fillRect(-w / 2 + 4, h / 2 - 8, 8, 6);
        ctx.fillRect(w / 2 - 12, h / 2 - 8, 8, 6);
      }
    }
  }
  ctx.restore();
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, fullOfke: boolean): void {
  const { w, h } = p;
  ctx.save();
  ctx.translate(p.x, p.y);
  // drift açısı araç yatıyor gibi görünmesini sağlar
  ctx.rotate(p.angle + Math.PI / 2 + p.driftAngle);

  // always-on glow
  ctx.shadowBlur = fullOfke ? 40 : p.ramming ? 26 : 14;
  ctx.shadowColor = fullOfke ? "#ff2d2d" : p.driftIntensity > 0.4 ? "#ffdd44" : "#ffb13a";

  const body = fullOfke ? "#e8533a" : p.body;
  const accent = fullOfke ? "#3a2d18" : p.accent;
  drawCarBody(ctx, w, h, body, accent, p.ramFlash * 0.6);
  ctx.shadowBlur = 0;

  // dark outline
  ctx.strokeStyle = fullOfke ? "#ffd23a" : p.driftIntensity > 0.4 ? "#ffe040" : "#7a5a1e";
  ctx.lineWidth = 3;
  roundRect(ctx, -w / 2, -h / 2, w, h, 12);
  ctx.stroke();

  // headlights
  ctx.fillStyle = "#fff6d0";
  ctx.fillRect(-w / 2 + 7, -h / 2 + 3, 11, 6);
  ctx.fillRect(w / 2 - 18, -h / 2 + 3, 11, 6);

  // Drift sırasında lastik izleri (arka tekerlekler)
  if (p.driftIntensity > 0.25) {
    const alpha = p.driftIntensity * 0.6;
    ctx.fillStyle = `rgba(30,20,10,${alpha})`;
    ctx.fillRect(-w / 2 + 5, h / 2 - 14, 8, 10);
    ctx.fillRect(w / 2 - 13, h / 2 - 14, 8, 10);
  }

  ctx.restore();
}

