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
    goalType: "score",
    goalScore: 8000,
    specialRule: "Tutorial: yalnızca ram. 8000 puana ulaş.",
    spawnWeights: [
      ["phantom", 64],
      ["cift_park", 22],
      ["simit", 14],
    ],
    speedMult: 0.65,
    maxTargets: 45,
    tutorial: true,
    intro: [
      "İşte İstanbul'dayız.",
      "Saat sabahın 7'si.",
      "İstanbul trafiği bugün de... yine kilit.",
      "E-5 Bağcılar'da ilerleme sıfır.",
      "Önündeki adam yine durduk yere fren yaptı.",
      "Öfkeni çıkar, 8000 puana ulaş!",
    ],
  },
  {
    id: 2,
    name: "Metrobüs Çılgınlığı",
    location: "E-5, Avcılar",
    goalType: "survival",
    timeLimit: 75,
    specialRule: "75 saniye hayatta kal. Çakarlılara dikkat!",
    spawnWeights: [
      ["dolmus", 32],
      ["cakarli", 38],
      ["phantom", 12],
      ["cift_park", 8],
      ["scooter", 10],
    ],
    speedMult: 0.85,
    maxTargets: 50,
    tutorial: false,
    intro: [
      "Avcılar Metrobüs durağı civarı...",
      "Çakarlılar her yeri kapattı.",
      "Simit kuvvetini iyi kullan!",
      "75 saniye boyunca yolda kal!",
    ],
  },
  {
    id: 3,
    name: "Dolmuş İsyanı",
    location: "Kadıköy, Moda",
    goalType: "score",
    goalScore: 15000,
    specialRule: "15000 puan topla. Dolmuşa vurmak x2 puan.",
    spawnWeights: [
      ["dolmus", 48],
      ["phantom", 20],
      ["cakarli", 10],
      ["simit", 8],
      ["scooter", 14],
    ],
    speedMult: 1.0,
    maxTargets: 50,
    tutorial: false,
    intro: [
      "Moda Caddesi dolmuş cehennemi.",
      "Her köşede sarı tehdit.",
      "15000 puan topla, isyan bitsin.",
    ],
  },
  {
    id: 4,
    name: "FSM Cuma (BOSS)",
    location: "FSM Köprüsü",
    goalType: "survival",
    timeLimit: 100,
    specialRule: "100 saniye hayatta kal. Cuma akşamı kaos!",
    spawnWeights: [
      ["makasci", 35],
      ["cakarli", 22],
      ["dolmus", 18],
      ["phantom", 12],
      ["scooter", 8],
      ["minibus", 5],
    ],
    speedMult: 1.25,
    maxTargets: 60,
    tutorial: false,
    intro: [
      "Cuma akşamı FSM Köprüsü.",
      "Makasçılar köprüyü işgal etti.",
      "100 saniye köprüde kal!",
    ],
  },
  {
    id: 5,
    name: "Boğaz Tüneli",
    location: "Avrasya Tüneli",
    goalType: "survival",
    timeLimit: 120,
    specialRule: "120 saniye hayatta kal. Tünel dar, manevra sıfır.",
    spawnWeights: [
      ["phantom", 32],
      ["cakarli", 24],
      ["dolmus", 16],
      ["makasci", 8],
      ["minibus", 12],
      ["ambulans", 8],
    ],
    speedMult: 1.35,
    maxTargets: 65,
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
    goalType: "score",
    goalScore: 25000,
    specialRule: "Pazar yeri kaosu! 25000 puan topla.",
    spawnWeights: [
      ["simit", 38],
      ["cicekci", 22],
      ["yaya", 18],
      ["phantom", 8],
      ["scooter", 8],
      ["ambulans", 6],
    ],
    speedMult: 1.1,
    maxTargets: 55,
    tutorial: false,
    intro: [
      "Kadıköy Çarşamba Pazarı.",
      "Simitçiler, çiçekçiler, yayalar...",
      "25000 puana ulaş, meydanı temizle!",
    ],
  },
  {
    id: 7,
    name: "TEM Makasçılar",
    location: "TEM Otoyolu, Hasdal",
    goalType: "score",
    goalScore: 40000,
    specialRule: "40000 puan. Hız %160. Dikkatli ol.",
    spawnWeights: [
      ["makasci", 42],
      ["cakarli", 18],
      ["phantom", 12],
      ["dolmus", 8],
      ["scooter", 10],
      ["minibus", 6],
      ["ambulans", 4],
    ],
    speedMult: 1.6,
    maxTargets: 65,
    tutorial: false,
    intro: [
      "TEM Otoyolu — Hasdal.",
      "Makasçılar sürü halinde.",
      "40000 puana ulaş!",
    ],
  },
  {
    id: 8,
    name: "Gece Yarısı Taksim",
    location: "İstiklal Caddesi",
    goalType: "survival",
    timeLimit: 180,
    specialRule: "BOSS MODU — 180 saniye hayatta kal. MAX hız, tam kaos.",
    spawnWeights: [
      ["boss", 18],
      ["cakarli", 26],
      ["makasci", 22],
      ["dolmus", 12],
      ["phantom", 8],
      ["minibus", 8],
      ["ambulans", 6],
    ],
    speedMult: 1.85,
    maxTargets: 75,
    tutorial: false,
    intro: [
      "Gece yarısı İstiklal Caddesi.",
      "İETT devleri devriyede.",
      "180 saniye boyunca dayan, efsane ol.",
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
  minibus: "MİNİBÜS/TIR",
  ambulans: "AMBULANS",
  scooter: "MOTO KURYE",
};
