import { randRange } from "../engine/math";

export type TargetId =
  | "phantom"
  | "cakarli"
  | "dolmus"
  | "cift_park"
  | "simit"
  | "yaya"
  | "cicekci"
  | "dilenci"
  | "taksi"
  | "makasci"
  | "boss"
  | "minibus"
  | "ambulans"
  | "scooter";

export const GOAL_LABELS: Record<TargetId, string> = {
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

/** Per-target destruction animation (brief §2.2). */
export type DeathStyle =
  | "skid" // skids forward, wheels spinning in confusion (phantom)
  | "spinSide" // side-swiped into the pavement, hazards still blinking (çift park)
  | "tbone" // T-boned, flashers fly off (çakarlı)
  | "spin180" // spins 180°, passengers scatter (dolmuş)
  | "flip" // slow theatrical flip (misalı dönüş)
  | "shatter" // bursts apart (simit cart)
  | "collapse"; // side collapse (İETT boss)

export interface TargetType {
  id: TargetId;
  /** Turkish destruction commentary shown on kill. */
  shout: string;
  label: string;
  body: string; // base car color
  accent: string; // roof/window color
  w: number;
  h: number;
  score: number;
  ofkeFill: number; // %
  selfDamage: number; // % Hasar to player on ram
  hits: number; // hits to destroy (boss-like targets > 1)
  debris: string[];
  debrisShape: "rect" | "ring";
  death: DeathStyle;
  /** "drive" flows down the road; "park" is stationary at the roadside; "stutter" brakes; "wander" drifts; "makas" zig-zags; "horiz" walks horizontally; "block" fills the lane. */
  behavior: "stutter" | "drive" | "park" | "wander" | "makas" | "horiz" | "boss" | "block";
  baseSpeed: number; // px/s downward drift
  /** Fills the entire lane — only one per lane, larger follow gap. */
  laneBlock?: boolean;
  /** Player speed multiplier when within 200px (ambulans e-zone). */
  proximitySlow?: number;
  /** Periodic horn/siren when player is nearby. */
  horn?: "siren" | "dolmus" | "beep" | "cakarli";
}

/** The destruction database (brief §2.2 / §2.3). Data-driven so new targets are trivial. */
export const TARGET_TYPES: Record<TargetId, TargetType> = {
  phantom: {
    id: "phantom",
    shout: "Niye fren yaptın?!",
    label: "Hayalet Frenci",
    body: "#c9c4bb",
    accent: "#2b2b30",
    w: 64,
    h: 108,
    score: 100,
    ofkeFill: 8,
    selfDamage: 5,
    hits: 1,
    debris: ["#c9c4bb", "#8f8a82", "#e4e0d8", "#5a5650"],
    debrisShape: "rect",
    death: "skid",
    behavior: "stutter",
    baseSpeed: 36,
  },
  cakarli: {
    id: "cakarli",
    shout: "Adalet!",
    label: "Çakarlı Araç",
    body: "#1d1d22",
    accent: "#3a6df0",
    w: 66,
    h: 114,
    score: 150,
    ofkeFill: 10,
    selfDamage: 6,
    hits: 1,
    debris: ["#3a6df0", "#9ec0ff", "#1d1d22", "#ffd23a"],
    debrisShape: "rect",
    death: "tbone",
    behavior: "drive",
    baseSpeed: 96,
    horn: "cakarli",
  },
  dolmus: {
    id: "dolmus",
    shout: "Şerit boşaldı!",
    label: "Dolmuş",
    body: "#2e6b4f",
    accent: "#f2c14e",
    w: 78,
    h: 150,
    score: 120,
    ofkeFill: 8,
    selfDamage: 7,
    hits: 1,
    debris: ["#2e6b4f", "#f2c14e", "#9fd6b6", "#1c3f30"],
    debrisShape: "rect",
    death: "spin180",
    behavior: "wander",
    baseSpeed: 26,
    horn: "dolmus",
  },
  cift_park: {
    id: "cift_park",
    shout: "Engel kalktı!",
    label: "Çift Seri Park",
    body: "#a33636",
    accent: "#2b2b30",
    w: 66,
    h: 116,
    score: 80,
    ofkeFill: 5,
    selfDamage: 5,
    hits: 1,
    debris: ["#a33636", "#e06666", "#2b2b30", "#ffae3a"],
    debrisShape: "rect",
    death: "spinSide",
    behavior: "park",
    baseSpeed: 0,
  },
  simit: {
    id: "simit",
    shout: "Simit yağmuru!",
    label: "Simitçi Arabası",
    body: "#7a4a22",
    accent: "#d98e36",
    w: 70,
    h: 56,
    score: 30,
    ofkeFill: 2,
    selfDamage: 2,
    hits: 1,
    debris: ["#d98e36", "#c9772a", "#f0c27a", "#8a5a2a"],
    debrisShape: "ring",
    death: "shatter",
    behavior: "park",
    baseSpeed: 0,
  },
  yaya: {
    id: "yaya",
    shout: "Yola atladı!",
    label: "Yaya",
    body: "#a2a2a2",
    accent: "#ffffff",
    w: 24, h: 24,
    score: 50, ofkeFill: 2, selfDamage: 0, hits: 1,
    debris: ["#ffffff", "#cccccc", "#ffaaaa"], debrisShape: "ring", death: "shatter", behavior: "horiz", baseSpeed: 0
  },
  cicekci: {
    id: "cicekci",
    shout: "Gül devrildi!",
    label: "Çiçekçi",
    body: "#cc3366",
    accent: "#ff99cc",
    w: 30, h: 30,
    score: 60, ofkeFill: 4, selfDamage: 1, hits: 1,
    debris: ["#ff99cc", "#ff3366", "#33cc66"], debrisShape: "ring", death: "shatter", behavior: "park", baseSpeed: 0
  },
  dilenci: {
    id: "dilenci",
    shout: "Sadaka niyetine!",
    label: "Dilenci",
    body: "#6b4f4f",
    accent: "#3a2a2a",
    w: 24, h: 24,
    score: 40, ofkeFill: 2, selfDamage: 0, hits: 1,
    debris: ["#6b4f4f", "#3a2a2a", "#8c7171"], debrisShape: "ring", death: "shatter", behavior: "horiz", baseSpeed: 0
  },
  taksi: {
    id: "taksi",
    shout: "Sarı Bela!",
    label: "Taksi",
    body: "#e6b800",
    accent: "#000000",
    w: 64, h: 108,
    score: 100, ofkeFill: 6, selfDamage: 5, hits: 1,
    debris: ["#e6b800", "#000000", "#ffcc00"], debrisShape: "rect", death: "skid", behavior: "wander", baseSpeed: 50
  },
  makasci: {
    id: "makasci",
    shout: "Makas patladı!",
    label: "Makasçı",
    body: "#ff3300",
    accent: "#000000",
    w: 66, h: 110,
    score: 150, ofkeFill: 10, selfDamage: 8, hits: 1,
    debris: ["#ff3300", "#000000", "#ff6633"], debrisShape: "rect", death: "tbone", behavior: "makas", baseSpeed: 100
  },
  boss: {
    id: "boss",
    shout: "OTOBÜS DEVRİLDİ!",
    label: "İETT Otobüs",
    body: "#0066cc",
    accent: "#ffffff",
    w: 80, h: 160,
    score: 500, ofkeFill: 20, selfDamage: 15, hits: 3,
    debris: ["#0066cc", "#ffffff", "#3399ff", "#000000"], debrisShape: "rect", death: "collapse", behavior: "boss", baseSpeed: 40
  },
  minibus: {
    id: "minibus",
    shout: "TİR SİLİNDİ!",
    label: "Minibüs/TIR",
    body: "#3a3a52",
    accent: "#c0c0c8",
    w: 100,
    h: 210,
    score: 300,
    ofkeFill: 15,
    selfDamage: 12,
    hits: 3,
    debris: ["#3a3a52", "#c0c0c8", "#888899", "#222230"],
    debrisShape: "rect",
    death: "collapse",
    behavior: "block",
    baseSpeed: 24,
    laneBlock: true,
    horn: "beep",
  },
  ambulans: {
    id: "ambulans",
    shout: "UTAN!",
    label: "Ambulans",
    body: "#f0f0f0",
    accent: "#cc1111",
    w: 68,
    h: 130,
    score: -150,
    ofkeFill: -10,
    selfDamage: 20,
    hits: 1,
    debris: ["#f0f0f0", "#cc1111", "#ffffff", "#ffaaaa"],
    debrisShape: "rect",
    death: "tbone",
    behavior: "drive",
    baseSpeed: 110,
    proximitySlow: 0.38,
    horn: "siren",
  },
  scooter: {
    id: "scooter",
    shout: "KURYE UÇTU!",
    label: "Moto Kurye",
    body: "#ff6600",
    accent: "#222222",
    w: 26,
    h: 48,
    score: 50,
    ofkeFill: 4,
    selfDamage: 2,
    hits: 1,
    debris: ["#ff6600", "#222222", "#ffaa55"],
    debrisShape: "ring",
    death: "skid",
    behavior: "makas",
    baseSpeed: 175,
    horn: "beep",
  },
};

export class Target {
  readonly type: TargetType;
  x: number;
  y: number;
  vx = 0;
  vy: number;
  hitsLeft: number;
  angle = 0; // facing / spin
  dead = false;
  removable = false;
  // post-kill animation
  private deathTimer = 0;
  private deathDuration = 0.7;
  private spin = 0;
  private flipPhase = 0;
  private flipping = false;
  private collapsing = false;
  flash = 0; // 0..1 white hit-flash
  dent = 0; // accumulates per non-lethal hit
  // behavior state
  private brakeTimer: number;
  private readonly driveSpeed: number;
  private readonly rngId: number;

  constructor(type: TargetType, x: number, y: number, rng: () => number, speedMult = 1) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.driveSpeed = type.baseSpeed * speedMult;
    this.vy = this.driveSpeed;
    this.hitsLeft = type.hits;
    this.brakeTimer = randRange(rng, 0.5, 2.5);
    this.rngId = rng();
  }

  /** Apply a hit. Returns true if this hit destroyed the target. */
  hit(dirX: number, dirY: number, force: number, rng: () => number): boolean {
    this.flash = 1;
    this.hitsLeft--;
    if (this.hitsLeft > 0) {
      this.dent = Math.min(1, this.dent + 0.5);
      // knock it a bit
      this.vx += dirX * force * 0.4;
      this.vy += dirY * force * 0.4;
      return false;
    }
    this.dead = true;
    // toward the nearest curb (for the side-swipe); pick a side if dead-center
    const toCurb = this.x === 0 ? (rng() < 0.5 ? -1 : 1) : Math.sign(this.x);
    switch (this.type.death) {
      case "skid": // phantom: shoved forward, wheels spinning
        this.deathDuration = 0.6;
        this.vx = dirX * force * 1.25;
        this.vy = dirY * force * 1.25;
        this.spin = randRange(rng, -2.5, 2.5);
        break;
      case "spinSide": // çift park: swept into the pavement, hazards blinking
        this.deathDuration = 0.7;
        this.vx = toCurb * force * 0.95 + dirX * force * 0.3;
        this.vy = dirY * force * 0.4;
        this.spin = toCurb * randRange(rng, 10, 16);
        break;
      case "tbone": // çakarlı: T-boned, flashers fly off
        this.deathDuration = 0.6;
        this.vx = dirX * force * 1.15;
        this.vy = dirY * force * 1.15;
        this.spin = randRange(rng, -16, 16);
        break;
      case "spin180": // dolmuş: spins 180°, passengers scatter
        this.deathDuration = 0.95;
        this.vx = dirX * force * 0.6;
        this.vy = dirY * force * 0.6;
        this.spin = (rng() < 0.5 ? 1 : -1) * (Math.PI / 0.95); // ~half turn over the death
        break;
      case "flip": // misalı dönüş: slow theatrical flip
        this.deathDuration = 1.15;
        this.vx = dirX * force * 0.5;
        this.vy = dirY * force * 0.5;
        this.spin = randRange(rng, -2.5, 2.5);
        this.flipping = true;
        break;
      case "shatter": // simit cart: bursts apart fast
        this.deathDuration = 0.4;
        this.vx = dirX * force * 0.5 + randRange(rng, -30, 30);
        this.vy = dirY * force * 0.5 + randRange(rng, -30, 30);
        this.spin = randRange(rng, -8, 8);
        break;
      case "collapse": // İETT: caves in where it stands
        this.deathDuration = 0.85;
        this.vx = dirX * force * 0.2;
        this.vy = dirY * force * 0.2;
        this.spin = randRange(rng, -1, 1);
        this.collapsing = true;
        break;
    }
    this.deathTimer = this.deathDuration;
    return true;
  }

  update(dt: number, rng: () => number): void {
    this.flash = Math.max(0, this.flash - dt * 5);

    if (this.dead) {
      this.deathTimer -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 1 - 1.6 * dt;
      this.vy *= 1 - 1.6 * dt;
      this.angle += this.spin * dt;
      if (this.flipping) this.flipPhase += dt * 5.2; // ~1.5 flips over the death
      if (this.deathTimer <= 0) this.removable = true;
      return;
    }

    switch (this.type.behavior) {
      case "stutter": {
        this.brakeTimer -= dt;
        if (this.brakeTimer <= 0) {
          this.vy = this.vy < this.driveSpeed * 0.5 ? this.driveSpeed : 0; // sudden, pointless brake
          this.brakeTimer = randRange(rng, 0.8, 2.2);
        }
        break;
      }
      case "wander": {
        this.brakeTimer -= dt;
        if (this.brakeTimer <= 0) {
          this.vx = randRange(rng, -40, 40);
          this.vy = randRange(rng, 0, this.driveSpeed * 1.5);
          this.brakeTimer = randRange(rng, 0.6, 1.8);
        }
        break;
      }
      case "makas": {
        const tNow = performance.now();
        const weave = this.type.id === "scooter" ? 280 : 200;
        const period = this.type.id === "scooter" ? 220 : 300;
        this.vx = Math.sin(tNow / period + this.rngId * 100) * weave;
        this.vy = this.driveSpeed;
        break;
      }
      case "block":
        this.vx = 0;
        this.vy = this.driveSpeed;
        break;
      case "horiz": {
        // walks left or right
        if (this.vx === 0) {
           this.vx = (this.x > 0 ? -1 : 1) * 30;
        }
        this.vy = 0; // stationary relative to road scroll
        break;
      }
      case "boss":
      case "drive":
        this.vy = this.driveSpeed;
        break;
      case "park":
        this.vx = 0;
        this.vy = 0;
        break;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 1 - 1.5 * dt;
  }

  get alpha(): number {
    return this.dead ? Math.max(0, this.deathTimer / this.deathDuration) : 1;
  }

  /** Vertical scale for flip (cos wave) / collapse (shrink) death styles; else 1. */
  get scaleY(): number {
    if (!this.dead) return 1;
    if (this.flipping) return Math.cos(this.flipPhase);
    if (this.collapsing) return Math.max(0.12, this.deathTimer / this.deathDuration);
    return 1;
  }

  /** Horizontal scale — collapse caves the body inward. */
  get scaleX(): number {
    if (this.dead && this.collapsing) return Math.max(0.35, 0.6 + 0.4 * (this.deathTimer / this.deathDuration));
    return 1;
  }

  get isDeadSpinSide(): boolean {
    return this.dead && this.type.death === "spinSide";
  }

  get radius(): number {
    return Math.max(this.type.w, this.type.h) * 0.42;
  }
}
