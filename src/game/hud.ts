import type { OfkeState } from "./ofkeMeter";

export interface HudState {
  ofke: number; // 0..100
  ofkeState: OfkeState;
  fullOfke: boolean;
  fullOfkeRemaining: number;
  hasar: number; // 0..100
  score: number;
  comboCount: number;
  comboName: string;
  comboFrac: number; // 0..1 window remaining
  ramCharges: number;
  ramMax: number;
  ramRechargeFrac: number;
  ramUnlimited: boolean;
  // level goal
  location: string;
  goalLabel: string;
  goalCurrent: number;
  goalTarget: number;
  // survival
  isSurvival?: boolean;
  survivalElapsed?: number;
  survivalLimit?: number;
  // power-ups
  cayTimer: number;
  simitTimer: number;
  soganTimer: number;
  kahveTimer: number;
  kolonyaTimer: number;
}

const STATE_LABEL: Record<OfkeState, string> = {
  Sikinti: "SIKINTI",
  Sinir: "SİNİR",
  Ofke: "ÖFKE",
  Kayniyor: "KAYNIYOR",
  FullOfke: "FULL ÖFKE",
};

const STATE_COLOR: Record<OfkeState, string> = {
  Sikinti: "#6b7a8f",
  Sinir: "#e0a23a",
  Ofke: "#e8682a",
  Kayniyor: "#e23a2a",
  FullOfke: "#ff2d2d",
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draws all HUD elements in screen space (call after resetting the transform). */
export function drawHud(ctx: CanvasRenderingContext2D, vw: number, vh: number, s: HudState): void {
  const pad = 20;
  ctx.textBaseline = "alphabetic";

  // --- Level goal (top-left) ---
  ctx.textAlign = "left";
  ctx.font = "600 13px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(s.location.toUpperCase(), pad, pad + 14);
  if (s.goalTarget > 0) {
    ctx.font = "900 22px -apple-system, system-ui, sans-serif";
    const done = s.goalCurrent >= s.goalTarget;
    ctx.fillStyle = done ? "#4caf6e" : "#fff";
    ctx.fillText(`${s.goalCurrent} / ${s.goalTarget}`, pad, pad + 40);
    ctx.font = "700 13px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(s.goalLabel, pad + 64, pad + 39);
    // progress pips
    const r = 5;
    for (let i = 0; i < s.goalTarget; i++) {
      ctx.beginPath();
      ctx.arc(pad + 6 + i * 16, pad + 54, r, 0, Math.PI * 2);
      ctx.fillStyle = i < s.goalCurrent ? "#4caf6e" : "rgba(255,255,255,0.18)";
      ctx.fill();
    }
  }

  // --- Score (top-center) ---
  ctx.textAlign = "center";
  const scoreSize = Math.min(40, 28 + Math.floor(s.score / 2000) * 2);
  ctx.font = `900 ${scoreSize}px -apple-system, system-ui, sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 6;
  ctx.fillText(s.score.toLocaleString("tr-TR"), vw / 2, pad + 38);
  ctx.shadowBlur = 0;

  // --- Survival Timer (top-center below score) ---
  if (s.isSurvival && s.survivalLimit) {
    const remaining = Math.max(0, s.survivalLimit - (s.survivalElapsed ?? 0));
    const pct = remaining / s.survivalLimit;
    const timerColor = pct > 0.5 ? "#4cdf80" : pct > 0.25 ? "#f0a830" : "#ff3322";
    ctx.font = "700 16px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = timerColor;
    ctx.fillText(`⏱ ${remaining.toFixed(1)}s`, vw / 2, pad + 60);
  }

  // --- Combo (below score) ---
  if (s.comboCount >= 2) {
    const comboScale = Math.min(1.6, 1 + (s.comboCount - 2) * 0.08);
    const comboSize = Math.round(24 * comboScale);
    const col = s.comboCount >= 10 ? "#ff2d2d" : s.comboCount >= 5 ? "#f0a830" : STATE_COLOR[s.fullOfke ? "FullOfke" : "Ofke"];
    ctx.save();
    ctx.translate(vw / 2, s.isSurvival ? pad + 88 : pad + 70);
    ctx.font = `900 ${comboSize}px -apple-system, system-ui, sans-serif`;
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = comboScale > 1.2 ? 12 : 0;
    ctx.fillText(`x${s.comboCount}  ${s.comboName}`, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
    // window countdown bar
    const bw = 160;
    const barY = (s.isSurvival ? pad + 100 : pad + 80);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, vw / 2 - bw / 2, barY, bw, 4, 2);
    ctx.fill();
    ctx.fillStyle = col;
    roundRect(ctx, vw / 2 - bw / 2, barY, bw * s.comboFrac, 4, 2);
    ctx.fill();
  }

  // --- Ofke Meter (left vertical bar) ---
  const mw = 26;
  const mh = Math.min(380, vh - 220);
  const mx = pad;
  const my = vh / 2 - mh / 2;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, mx - 4, my - 4, mw + 8, mh + 8, 10);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, mx, my, mw, mh, 8);
  ctx.fill();
  const fillH = (mh * s.ofke) / 100;
  const col = STATE_COLOR[s.ofkeState];
  ctx.fillStyle = col;
  roundRect(ctx, mx, my + mh - fillH, mw, fillH, 8);
  ctx.fill();
  // threshold ticks at 30/60/80
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  for (const t of [30, 60, 80]) {
    const ty = my + mh - (mh * t) / 100;
    ctx.beginPath();
    ctx.moveTo(mx, ty);
    ctx.lineTo(mx + mw, ty);
    ctx.stroke();
  }
  // label
  ctx.save();
  ctx.translate(mx + mw + 16, my + mh / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "800 16px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = col;
  ctx.fillText(s.fullOfke ? `FULL ÖFKE  ${s.fullOfkeRemaining.toFixed(1)}s` : STATE_LABEL[s.ofkeState], 0, 0);
  ctx.restore();

  // --- Hasar bar (bottom) ---
  const hw = Math.min(300, vw - 2 * pad - 120);
  const hx = vw / 2 - hw / 2;
  const hy = vh - pad - 16;
  ctx.textAlign = "left";
  ctx.font = "700 13px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("HASAR", hx, hy - 6);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, hx, hy, hw, 14, 7);
  ctx.fill();
  const hasarCol = s.hasar > 50 ? "#4caf6e" : s.hasar > 25 ? "#e0a23a" : "#e23a2a";
  ctx.fillStyle = hasarCol;
  roundRect(ctx, hx, hy, (hw * s.hasar) / 100, 14, 7);
  ctx.fill();

  // --- Ram charges (bottom-right pips) ---
  const pipR = 11;
  const gap = 30;
  const baseX = vw - pad - pipR;
  const baseY = vh - pad - 14;
  ctx.textAlign = "right";
  ctx.font = "700 13px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("RAM", baseX - 2, baseY - pipR - 8);
  for (let i = 0; i < s.ramMax; i++) {
    const cx = baseX - i * gap;
    const filled = s.ramUnlimited || i < s.ramCharges;
    ctx.beginPath();
    ctx.arc(cx, baseY, pipR, 0, Math.PI * 2);
    ctx.fillStyle = filled ? "#ffb13a" : "rgba(255,255,255,0.12)";
    ctx.fill();
    // recharge fill on the next-to-charge pip
    if (!s.ramUnlimited && i === s.ramCharges && s.ramRechargeFrac > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, baseY);
      ctx.arc(cx, baseY, pipR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.ramRechargeFrac);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,177,58,0.4)";
      ctx.fill();
      ctx.restore();
    }
  }
  if (s.ramUnlimited) {
    ctx.textAlign = "right";
    ctx.font = "900 16px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "#ff2d2d";
    ctx.fillText("∞", baseX + pipR, baseY + 5);
  }

  // --- Power-up göstergeleri (sol alt, hasar barınüstünde) ---
  const puBaseY = hy - 44;
  let puX = hx;
  const puItems: { icon: string; timer: number; maxTime: number; color: string; bg: string }[] = [];
  if (s.cayTimer > 0)     puItems.push({ icon: "🍵", timer: s.cayTimer,    maxTime: 8, color: "#e23a2a", bg: "rgba(200,30,30,0.25)" });
  if (s.simitTimer > 0)   puItems.push({ icon: "🥯", timer: s.simitTimer,   maxTime: 6, color: "#d98e36", bg: "rgba(200,130,30,0.25)" });
  if (s.soganTimer > 0)   puItems.push({ icon: "🧅", timer: s.soganTimer,   maxTime: 5, color: "#7ecb50", bg: "rgba(60,160,30,0.25)" });
  if (s.kahveTimer > 0)   puItems.push({ icon: "☕", timer: s.kahveTimer,   maxTime: 5, color: "#a0622a", bg: "rgba(120,70,20,0.30)" });
  if (s.kolonyaTimer > 0) puItems.push({ icon: "🍋", timer: s.kolonyaTimer, maxTime: 6, color: "#74d7f7", bg: "rgba(60,180,220,0.22)" });

  for (const pu of puItems) {
    const pw = 60, ph = 34, pr = 8;
    // arka plan
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(puX, puBaseY, pw, ph, pr);
    ctx.fillStyle = pu.bg;
    ctx.fill();
    ctx.strokeStyle = pu.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // ilerleme çubuğu
    const frac = Math.max(0, pu.timer / pu.maxTime);
    ctx.beginPath();
    ctx.roundRect(puX, puBaseY + ph - 5, pw * frac, 5, [0, 0, pr, pr]);
    ctx.fillStyle = pu.color;
    ctx.fill();
    // ikon + süre
    ctx.textAlign = "center";
    ctx.font = "500 13px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${pu.icon} ${Math.ceil(pu.timer)}s`, puX + pw / 2, puBaseY + 21);
    ctx.restore();
    puX += pw + 8;
  }
}

/** Coloured vignette whose intensity tracks the Ofke state (orange → blood red). */
export function drawVignette(ctx: CanvasRenderingContext2D, vw: number, vh: number, s: HudState): void {
  let color: string | null = null;
  let strength = 0;
  if (s.fullOfke) {
    color = "255,45,45";
    strength = 0.55 + 0.12 * Math.sin(performance.now() / 90);
  } else if (s.ofkeState === "Kayniyor") {
    color = "200,30,30";
    strength = 0.42;
  } else if (s.ofkeState === "Ofke") {
    color = "230,90,40";
    strength = 0.3;
  } else if (s.ofkeState === "Sinir") {
    color = "220,140,40";
    strength = 0.18;
  }
  if (!color) return;
  const g = ctx.createRadialGradient(
    vw / 2, vh / 2, Math.min(vw, vh) * 0.35,
    vw / 2, vh / 2, Math.max(vw, vh) * 0.72,
  );
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
}
