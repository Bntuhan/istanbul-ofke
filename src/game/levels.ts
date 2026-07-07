import type { TargetId } from "./targets";

export type GoalType = "count" | "score" | "survival";

export interface LevelConfig {
  id: number;
  name: string; // "Pazartesi Sabahı"
  location: string; // "E-5, Bağcılar"
  goalType: GoalType;
  /** For "count" goals: which target must be destroyed, and how many. */
  goalTargetId?: TargetId;
  goalCount?: number;
  /** For "score" goals. */
  goalScore?: number;
  /** For "survival" goals (seconds). */
  timeLimit?: number;
  specialRule: string;
  /** Spawn weighting for this level. */
  spawnWeights: [TargetId, number][];
  /** Tutorial slows the whole field down. */
  speedMult: number;
  maxTargets: number;
  tutorial: boolean;
  /** Radio announcement shown on the level intro. */
  intro: string[];
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "Pazartesi Sabahı",
    location: "E-5, Bağcılar",
    goalType: "count",
    goalTargetId: "phantom",
    goalCount: 5,
    specialRule: "Tutorial: yalnızca ram. Yavaş hedefler.",
    spawnWeights: [
      ["phantom", 64],
      ["cift_park", 22],
      ["simit", 14],
    ],
    speedMult: 0.5,
    maxTargets: 40,
    tutorial: true,
    intro: [
      "İşte İstanbul'dayız.",
      "Saat sabahın 7'si.",
      "İstanbul trafiği bugün de... yine kilit.",
      "E-5 Bağcılar'da ilerleme sıfır.",
      "Önündeki adam yine durduk yere fren yaptı.",
      "Sen de patlıyorsun.",
    ],
  },
  {
    id: 2,
    name: "Metrobüs Çılgınlığı",
    location: "E-5, Avcılar",
    goalType: "score",
    goalScore: 1500,
    specialRule: "Dolmuş ve çakarlı trafiği yoğun. x2 otobüs kombo.",
    spawnWeights: [
      ["dolmus", 40],
      ["cakarli", 30],
      ["phantom", 20],
      ["cift_park", 10],
    ],
    speedMult: 0.75,
    maxTargets: 45,
    tutorial: false,
    intro: [
      "Avcılar Metrobüs durağı civarı...",
      "Dolmuşlar şerit kapmaca oynuyor.",
      "Çakarlılar da araya girdi.",
      "1500 puana ulaş, trafikten çık!",
    ],
  },
  {
    id: 3,
    name: "Dolmuş İsyanı",
    location: "Kadıköy, Moda",
    goalType: "count",
    goalTargetId: "dolmus",
    goalCount: 8,
    specialRule: "8 dolmuş temizle. Dolmuşa vurmak x2 puan.",
    spawnWeights: [
      ["dolmus", 55],
      ["phantom", 25],
      ["cakarli", 12],
      ["simit", 8],
    ],
    speedMult: 0.85,
    maxTargets: 42,
    tutorial: false,
    intro: [
      "Moda Caddesi dolmuş cehennemi.",
      "Her köşede sarı tehdit.",
      "8 dolmuşu yok et, isyan bitsin.",
    ],
  },
  {
    id: 4,
    name: "FSM Cuma (BOSS)",
    location: "FSM Köprüsü",
    goalType: "score",
    goalScore: 2500,
    specialRule: "Cuma akşamı kaos. Çakarlı ve dolmuş dalgası.",
    spawnWeights: [
      ["cakarli", 35],
      ["dolmus", 35],
      ["phantom", 20],
      ["cift_park", 10],
    ],
    speedMult: 1.0,
    maxTargets: 50,
    tutorial: false,
    intro: [
      "Cuma akşamı FSM Köprüsü.",
      "Köprü kilit, herkes sinirli.",
      "2500 puan — trafik seni yutmadan bitir.",
    ],
  },
  {
    id: 5,
    name: "Boğaz Tüneli",
    location: "Avrasya Tüneli",
    goalType: "survival",
    timeLimit: 120,
    goalScore: 0,
    specialRule: "120 saniye hayatta kal. Tünel dar, manevra sıfır.",
    spawnWeights: [
      ["phantom", 40],
      ["cakarli", 30],
      ["dolmus", 20],
      ["makasci", 10],
    ],
    speedMult: 1.1,
    maxTargets: 55,
    tutorial: false,
    intro: [
      "Avrasya Tüneli — her iki yaka da kilit.",
      "Kaçış yok, sıkışık, karanlık.",
      "120 saniye hayatta kal.",
    ],
  },
  {
    id: 6,
    name: "Çarşamba Pazarı",
    location: "Kadıköy Meydan",
    goalType: "count",
    goalTargetId: "simit",
    goalCount: 12,
    specialRule: "Pazar yeri kaosu! 12 Simitçi temizle. Yaya yoğunluğu fazla.",
    spawnWeights: [
      ["simit", 45],
      ["cicekci", 25],
      ["yaya", 20],
      ["phantom", 10],
    ],
    speedMult: 0.9,
    maxTargets: 48,
    tutorial: false,
    intro: [
      "Kadıköy Çarşamba Pazarı.",
      "Simitçiler, çiçekçiler, yayalar...",
      "Herkes ortada, hiçbir şey düzgün.",
      "12 simitçiyi temizle!",
    ],
  },
  {
    id: 7,
    name: "TEM Makasçılar",
    location: "TEM Otoyolu, Hasdal",
    goalType: "score",
    goalScore: 4000,
    specialRule: "Makasçı sürüsü! Hız %130. Her makasçı 3x puan.",
    spawnWeights: [
      ["makasci", 50],
      ["cakarli", 25],
      ["phantom", 15],
      ["dolmus", 10],
    ],
    speedMult: 1.3,
    maxTargets: 52,
    tutorial: false,
    intro: [
      "TEM Otoyolu — Hasdal.",
      "Makasçılar sürü halinde.",
      "Dur yok, dur yok, dur yok.",
      "4000 puanı kap kaç!",
    ],
  },
  {
    id: 8,
    name: "Gece Yarısı Taksim",
    location: "İstiklal Caddesi",
    goalType: "score",
    goalScore: 6000,
    specialRule: "BOSS MODU — İETT Otobüsü + Gece kaos trafik. MAX hız.",
    spawnWeights: [
      ["boss", 15],
      ["cakarli", 30],
      ["makasci", 25],
      ["dolmus", 20],
      ["phantom", 10],
    ],
    speedMult: 1.5,
    maxTargets: 60,
    tutorial: false,
    intro: [
      "Gece yarısı İstiklal Caddesi.",
      "İETT devleri sokaklarda.",
      "Çakarlılar, makasçılar, hepsi burada.",
      "6000 puan — efsane ol.",
    ],
  },
];

/** Live progress tracker for the active level. */
export class LevelManager {
  destroyed = 0; // counts the goal target only
  elapsed = 0;
  won = false;

  constructor(public readonly cfg: LevelConfig) {}

  registerKill(targetId: TargetId): void {
    if (this.cfg.goalType === "count" && targetId === this.cfg.goalTargetId) {
      this.destroyed++;
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
  }

  /** Check the win condition against current score / time. */
  checkWin(score: number): boolean {
    if (this.won) return true;
    const c = this.cfg;
    if (c.goalType === "count") this.won = this.destroyed >= (c.goalCount ?? Infinity);
    else if (c.goalType === "score") this.won = score >= (c.goalScore ?? Infinity);
    else if (c.goalType === "survival")
      this.won = this.elapsed >= (c.timeLimit ?? Infinity);
    return this.won;
  }

  get goalLabel(): string {
    const c = this.cfg;
    if (c.goalType === "count") return GOAL_LABELS[c.goalTargetId ?? "phantom"];
    if (c.goalType === "score") return "PUAN";
    return "HAYATTA KAL";
  }

  goalProgress(score: number): { current: number; target: number } {
    const c = this.cfg;
    if (c.goalType === "count") {
      return { current: this.destroyed, target: c.goalCount ?? 0 };
    }
    if (c.goalType === "score") {
      return { current: score, target: c.goalScore ?? 0 };
    }
    return { current: Math.floor(this.elapsed), target: c.timeLimit ?? 0 };
  }
}

const GOAL_LABELS: Record<TargetId, string> = {
  phantom: "HAYALET FRENCİ",
  cakarli: "ÇAKARLI",
  dolmus: "DOLMUŞ",
  cift_park: "ÇİFT PARK",
  simit: "SİMİTÇİ",
  yaya: "YAYA",
  cicekci: "ÇİÇEKÇİ",
  dilenci: "DİLENCİ",
  taksi: "TAKSİ",
  makasci: "MAKASÇI",
  boss: "İETT OTOBÜS",
};
