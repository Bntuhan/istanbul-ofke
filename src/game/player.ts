import type { Vec2 } from "../engine/math";
import { clamp } from "../engine/math";

const BASE_RAM_SPEED = 720;
const NUDGE_SPEED = 240;
const RAM_DURATION = 0.32;
const FRICTION = 3.2;
const DRIFT_ANGLE_MAX = 0.32; // radyan — görsel yatma maksimumu

export interface VehicleConfig {
  w?: number;
  h?: number;
  body?: string;
  accent?: string;
  ramPower?: number;
  resist?: number;
}

/** Oyuncu aracı — garaj yükseltmeleriyle yapılandırılır. */
export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  angle = -Math.PI / 2;

  readonly w: number;
  readonly h: number;
  readonly body: string;
  readonly accent: string;
  private readonly ramSpeedMult: number;
  private readonly damageResist: number;

  hasar = 100;
  dead = false;
  ramming = false;
  private ramTimer = 0;
  ramFlash = 0;
  shieldTimer = 0;

  /** 0..1 — ne kadar drift yapıyor (parçacık ve ses için) */
  driftIntensity = 0;
  /** -1..1 — görsel yatma açısı (sola/sağa) */
  driftAngle = 0;
  /** Duman parçacığı spawn için timer */
  smokeTimer = 0;

  constructor(cfg: VehicleConfig = {}) {
    this.w = cfg.w ?? 60;
    this.h = cfg.h ?? 104;
    this.body = cfg.body ?? "#8C3A10";
    this.accent = cfg.accent ?? "#3a2d18";
    this.ramSpeedMult = 1 + ((cfg.ramPower ?? 1) - 1) * 0.12;
    this.damageResist = cfg.resist ?? 0;
  }

  nudge(dir: Vec2): void {
    this.vx += dir.x * NUDGE_SPEED;
    this.vy += dir.y * NUDGE_SPEED;
    this.faceVelocity();
  }

  ram(dir: Vec2): void {
    const speed = BASE_RAM_SPEED * this.ramSpeedMult;
    this.vx = dir.x * speed;
    this.vy = dir.y * speed;
    this.ramming = true;
    this.ramTimer = RAM_DURATION;
    this.ramFlash = 1;
    this.faceVelocity();
  }

  takeDamage(pct: number, slowDecay: boolean): void {
    if (this.shieldTimer > 0) return;
    const resist = 1 - Math.min(0.45, this.damageResist * 0.06);
    const taken = pct * (slowDecay ? 0.25 : 1) * resist;
    this.hasar = clamp(this.hasar - taken, 0, 100);
    if (this.hasar <= 0) this.dead = true;
  }

  update(dt: number): void {
    if (this.shieldTimer > 0) this.shieldTimer -= dt;

    if (this.ramTimer > 0) {
      this.ramTimer -= dt;
      if (this.ramTimer <= 0) this.ramming = false;
    }
    this.ramFlash = Math.max(0, this.ramFlash - dt * 4);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const f = 1 - Math.min(1, FRICTION * dt);
    this.vx *= f;
    this.vy *= f;
    if (Math.abs(this.vx) < 2) this.vx = 0;
    if (Math.abs(this.vy) < 2) this.vy = 0;

    // Drift hesapla — yatay hız ne kadar yüksekse o kadar drift
    const lateralSpeed = Math.abs(this.vx);
    const totalSpeed = this.speed;
    this.driftIntensity = totalSpeed > 20
      ? clamp(lateralSpeed / (totalSpeed + 1), 0, 1)
      : 0;

    // Görsel yatma açısı — vx yönüne göre yumuşak interpolasyon
    const targetDriftAngle = this.vx > 10 ? DRIFT_ANGLE_MAX
      : this.vx < -10 ? -DRIFT_ANGLE_MAX
      : 0;
    this.driftAngle += (targetDriftAngle - this.driftAngle) * Math.min(1, dt * 8);

    // Duman timer
    this.smokeTimer = Math.max(0, this.smokeTimer - dt);
  }

  /** Duman parçacığı spawn edilmeli mi? */
  shouldEmitSmoke(): boolean {
    if (this.driftIntensity < 0.35 || this.smokeTimer > 0) return false;
    this.smokeTimer = 0.04; // 25fps duman
    return true;
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  get radius(): number {
    return Math.max(this.w, this.h) * 0.42;
  }

  private faceVelocity(): void {
    if (this.speed > 1) this.angle = Math.atan2(this.vy, this.vx);
  }
}
