/**
 * Ram charges: 3 max, recharge every 4s. A full ram costs a charge; light nudges
 * are free. During Full Ofke charges are unlimited.
 */
export class RamSystem {
  readonly maxCharges = 3;
  charges = 3;
  private rechargeTimer = 0;
  private rechargeTime = 2; // seconds — garaj yükseltmesiyle ayarlanır
  unlimited = false;

  setRechargeTime(seconds: number): void {
    this.rechargeTime = Math.max(1.5, seconds);
  }

  /** Returns true if a full ram is allowed right now (and spends a charge). */
  tryConsume(): boolean {
    if (this.unlimited) return true;
    if (this.charges <= 0) return false;
    this.charges--;
    return true;
  }

  update(dt: number): void {
    if (this.unlimited || this.charges >= this.maxCharges) {
      this.rechargeTimer = 0;
      return;
    }
    this.rechargeTimer += dt;
    if (this.rechargeTimer >= this.rechargeTime) {
      this.rechargeTimer -= this.rechargeTime;
      this.charges++;
    }
  }

  /** 0..1 progress toward the next charge (for the UI pip fill). */
  get rechargeFrac(): number {
    if (this.unlimited || this.charges >= this.maxCharges) return 0;
    return this.rechargeTimer / this.rechargeTime;
  }
}
