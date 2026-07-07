/** Araç tanımları — oyun/garage.js'den port edildi. */
export interface VehicleDef {
  id: string;
  name: string;
  tier: number;
  body: string;
  accent: string;
  w: number;
  h: number;
  ramPower: number;
  resist: number;
  recharge: number;
  unlockCost: number;
  ability: string;
}

export const VEHICLES: Record<string, VehicleDef> = {
  tofas: {
    id: "tofas",
    name: "Tofaş Kartal (1991)",
    tier: 1,
    body: "#8C3A10",
    accent: "#000000",
    w: 60,
    h: 104,
    ramPower: 1,
    resist: 2,
    recharge: 2.0,
    unlockCost: 0,
    ability: "Saygı İndirimi: NPC'ler bazen yol verir.",
  },
  taksi: {
    id: "taksi",
    name: "Renault 12 Taksi",
    tier: 2,
    body: "#ffbb00",
    accent: "#000000",
    w: 62,
    h: 106,
    ramPower: 2,
    resist: 2,
    recharge: 1.8,
    unlockCost: 1500,
    ability: "Drift Ram: Çarpma açısı daha geniş.",
  },
  dolmus: {
    id: "dolmus",
    name: "Sarı Dolmuş",
    tier: 3,
    body: "#ffcc00",
    accent: "#66d8ff",
    w: 72,
    h: 118,
    ramPower: 3,
    resist: 1,
    recharge: 2.0,
    unlockCost: 3500,
    ability: "İroni: Başka bir dolmuşa vurmak 2x puan verir.",
  },
  iett: {
    id: "iett",
    name: "İETT Otobüs",
    tier: 4,
    body: "#0066cc",
    accent: "#ffffff",
    w: 88,
    h: 160,
    ramPower: 5,
    resist: 5,
    recharge: 2.5,
    unlockCost: 8000,
    ability: "Şerit Temizleyici: Tek ram ile önündeki tüm şeridi siler.",
  },
};

export type UpgradeKey = "ramPower" | "resistance" | "rechargeRate" | "powerupDuration";

export interface SaveState {
  coins: number;
  highScore: number;
  currentVehicle: string;
  unlockedVehicles: string[];
  unlockedLevels: number[];
  upgrades: Record<UpgradeKey, number>;
  stats: {
    maxCombo: number;
    kills: Record<string, number>;
  };
  dailyQuest: {
    date: string;
    targetId: string;
    required: number;
    current: number;
    rewarded: boolean;
  };
}

const SAVE_KEY = "istanbulOfke_save_v4";

const DEFAULT_STATE: SaveState = {
  coins: 0,
  highScore: 0,
  currentVehicle: "tofas",
  unlockedVehicles: ["tofas"],
  unlockedLevels: [1],
  upgrades: { ramPower: 0, resistance: 0, rechargeRate: 0, powerupDuration: 0 },
  stats: { maxCombo: 0, kills: {} },
  dailyQuest: { date: "", targetId: "cakarli", required: 5, current: 0, rewarded: false },
};

export interface VehicleStats extends VehicleDef {
  ramPowerBonus: number;
  resistBonus: number;
  rechargeBonus: number;
  powerupBonus: number;
}

/** Garaj, para, araç kilidi ve yükseltmeler. */
export class GarageManager {
  readonly state: SaveState;

  constructor() {
    const saved = localStorage.getItem(SAVE_KEY);
    let parsed = saved ? JSON.parse(saved) : {};
    this.state = { ...DEFAULT_STATE, ...parsed };
    if (!this.state.stats) this.state.stats = { maxCombo: 0, kills: {} };
    if (!this.state.upgrades.powerupDuration) this.state.upgrades.powerupDuration = 0;
    if (!this.state.dailyQuest) this.state.dailyQuest = { ...DEFAULT_STATE.dailyQuest };
    this.checkDailyQuest();
  }

  checkDailyQuest(): void {
    const today = new Date().toISOString().split("T")[0];
    if (this.state.dailyQuest.date !== today) {
      const targets = ["cakarli", "makasci", "dolmus", "simit", "scooter", "minibus"];
      const r = Math.floor(Math.random() * targets.length);
      this.state.dailyQuest = {
        date: today,
        targetId: targets[r],
        required: targets[r] === "simit" ? 10 : 5,
        current: 0,
        rewarded: false,
      };
      this.save();
    }
  }

  updateStats(combo: number, kills: Record<string, number>): void {
    if (combo > this.state.stats.maxCombo) {
      this.state.stats.maxCombo = combo;
    }
    for (const [tid, count] of Object.entries(kills)) {
      this.state.stats.kills[tid] = (this.state.stats.kills[tid] || 0) + count;
      if (this.state.dailyQuest.targetId === tid && !this.state.dailyQuest.rewarded) {
        this.state.dailyQuest.current = Math.min(this.state.dailyQuest.required, this.state.dailyQuest.current + count);
      }
    }
    this.save();
  }

  claimDailyQuest(): boolean {
    const q = this.state.dailyQuest;
    if (q.current >= q.required && !q.rewarded) {
      q.rewarded = true;
      this.addCoins(1500);
      return true;
    }
    return false;
  }

  private save(): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
  }

  addCoins(amount: number): void {
    this.state.coins += amount;
    this.save();
  }

  updateHighScore(score: number): void {
    if (score > this.state.highScore) {
      this.state.highScore = score;
      this.save();
    }
  }

  unlockLevel(levelId: number): void {
    if (!this.state.unlockedLevels.includes(levelId)) {
      this.state.unlockedLevels.push(levelId);
      this.save();
    }
  }

  isLevelUnlocked(levelId: number): boolean {
    return this.state.unlockedLevels.includes(levelId);
  }

  unlockVehicle(vid: string): boolean {
    const veh = VEHICLES[vid];
    if (!veh) return false;
    if (this.state.unlockedVehicles.includes(vid)) return false;
    if (this.state.coins < veh.unlockCost) return false;
    this.state.coins -= veh.unlockCost;
    this.state.unlockedVehicles.push(vid);
    this.save();
    return true;
  }

  selectVehicle(vid: string): void {
    if (this.state.unlockedVehicles.includes(vid)) {
      this.state.currentVehicle = vid;
      this.save();
    }
  }

  buyUpgrade(type: UpgradeKey): boolean {
    const lvl = this.state.upgrades[type];
    if (lvl >= 5) return false;
    const cost = (lvl + 1) * 300;
    if (this.state.coins < cost) return false;
    this.state.coins -= cost;
    this.state.upgrades[type]++;
    this.save();
    return true;
  }

  getCurrentVehicle(): VehicleStats {
    const base = VEHICLES[this.state.currentVehicle] ?? VEHICLES.tofas;
    const upRam = this.state.upgrades.ramPower * 0.5;
    const upRes = this.state.upgrades.resistance * 0.5;
    const upRecharge = this.state.upgrades.rechargeRate * 0.25;
    const upPower = (this.state.upgrades.powerupDuration || 0);
    return {
      ...base,
      ramPower: base.ramPower + upRam,
      resist: base.resist + upRes,
      recharge: Math.max(1.5, base.recharge - upRecharge),
      ramPowerBonus: upRam,
      resistBonus: upRes,
      rechargeBonus: upRecharge,
      powerupBonus: upPower,
    };
  }
}
