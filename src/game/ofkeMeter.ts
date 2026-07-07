import { clamp } from "../engine/math";

export type OfkeState = "Sikinti" | "Sinir" | "Ofke" | "Kayniyor" | "FullOfke";

export const FULL_OFKE_DURATION = 10; // seconds
export const FULL_OFKE_SCORE_MULT = 3;

/**
 * The single variable that drives the whole game. Fills on destruction, decays
 * over time so the player must stay active. At 100% it triggers a 10s rampage.
 */
export class OfkeMeter {
  current = 0; // 0..100
  state: OfkeState = "Sikinti";
  fullOfke = false;
  private fullOfkeTimer = 0;
  private readonly decayRate = 4; // %/s while not in Full Ofke

  onStateChange: (s: OfkeState) => void = () => {};
  onFullOfkeStart: () => void = () => {};
  onFullOfkeEnd: () => void = () => {};

  add(percent: number): void {
    if (this.fullOfke) return;
    this.current = clamp(this.current + percent, 0, 100);
    if (this.current >= 100) this.triggerFullOfke();
    this.refreshState();
  }

  /** Combo system can force a rampage regardless of meter level (x10 chain). */
  triggerFullOfke(): void {
    if (this.fullOfke) {
      this.fullOfkeTimer = FULL_OFKE_DURATION; // refresh
      return;
    }
    this.fullOfke = true;
    this.current = 100;
    this.fullOfkeTimer = FULL_OFKE_DURATION;
    this.setState("FullOfke");
    this.onFullOfkeStart();
  }

  update(dt: number): void {
    if (this.fullOfke) {
      this.fullOfkeTimer -= dt;
      if (this.fullOfkeTimer <= 0) {
        this.fullOfke = false;
        this.current = 45; // drops back into Sinir
        this.onFullOfkeEnd();
        this.refreshState();
      }
      return;
    }
    if (this.current > 0) {
      this.current = clamp(this.current - this.decayRate * dt, 0, 100);
      this.refreshState();
    }
  }

  get fullOfkeRemaining(): number {
    return Math.max(0, this.fullOfkeTimer);
  }

  get scoreMultiplier(): number {
    return this.fullOfke ? FULL_OFKE_SCORE_MULT : 1;
  }

  private refreshState(): void {
    if (this.fullOfke) return;
    const c = this.current;
    const next: OfkeState =
      c >= 100 ? "FullOfke" : c >= 80 ? "Kayniyor" : c >= 60 ? "Ofke" : c >= 30 ? "Sinir" : "Sikinti";
    this.setState(next);
  }

  private setState(s: OfkeState): void {
    if (s === this.state) return;
    this.state = s;
    this.onStateChange(s);
  }
}
