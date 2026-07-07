export interface ComboTier {
  name: string;
  multiplier: number;
}

/** Zincir Öfke — consecutive destructions within the window stack a multiplier. */
export class ComboChain {
  count = 0;
  private timer = 0;
  private readonly window = 2; // seconds

  /** Fired on milestone tiers (5 = burst, 10 = full rage). */
  onBurst: () => void = () => {};
  onFullRageChain: () => void = () => {};

  registerHit(): void {
    this.count = this.timer > 0 ? this.count + 1 : 1;
    this.timer = this.window;
    if (this.count === 10) this.onFullRageChain();
    else if (this.count === 5) this.onBurst();
  }

  update(dt: number): void {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.count = 0;
    }
  }

  reset(): void {
    this.count = 0;
    this.timer = 0;
  }

  get multiplier(): number {
    const c = this.count;
    return c >= 12 ? 2.5 : c >= 8 ? 2 : c >= 5 ? 1.5 : c >= 3 ? 1.2 : c >= 2 ? 1.1 : 1;
  }

  get tierName(): string {
    const c = this.count;
    if (c >= 12) return "TAM ÖFKE ZİNCİRİ";
    if (c >= 8) return "Kontrolden Çıktı";
    if (c >= 5) return "Ateş Püsküren";
    if (c >= 3) return "Küplere Binmiş";
    if (c >= 2) return "Sinirli";
    return "";
  }

  /** 0..1 — how much of the combo window remains (for the UI countdown ring). */
  get windowFrac(): number {
    return Math.max(0, this.timer / this.window);
  }
}
