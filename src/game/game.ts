import { AudioEngine } from "../engine/audio";
import { Camera } from "../engine/camera";
import { Input, haptic, type RamGesture } from "../engine/input";
import { makeRng, randRange, clamp } from "../engine/math";
import { Particles } from "../engine/particles";
import { ComboChain } from "./combo";
import { FloatingText } from "./floatingText";
import { drawHud, drawVignette, type HudState } from "./hud";
import { LEVELS, LevelManager, type LevelConfig } from "./levels";
import { OfkeMeter } from "./ofkeMeter";
import { Player } from "./player";
import { RamSystem } from "./ramSystem";
import { drawPlayer, drawRoad, drawTarget, LANE_COUNT, LANE_W, ROAD_HALF } from "./render";
import { TARGET_TYPES, Target, type TargetId } from "./targets";
import type { VehicleStats } from "./garage";

export interface RunResult {
  won: boolean;
  score: number;
  maxCombo: number;
  kills: number;
  levelId: number;
}

export interface Collectible {
  type: "gold" | "cay" | "kriko" | "cukur";
  x: number;
  y: number;
}

type GameState = "intro" | "playing" | "won" | "lost";

const CAR_GAP = 124; // bumper-to-bumper spacing in driving lanes
const PARK_GAP = 150;
const MAX_PARK_PER_SIDE = 5;
const laneCenterX = (lane: number): number => -ROAD_HALF + LANE_W * 0.5 + lane * LANE_W;

export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly rng = makeRng(0x15ada);
  private readonly camera = new Camera();
  private readonly particles = new Particles(makeRng(99));
  private readonly floats = new FloatingText();

  private player = new Player();
  private ofke = new OfkeMeter();
  private combo = new ComboChain();
  private ram = new RamSystem();
  private targets: Target[] = [];
  private collectibles: Collectible[] = [];
  private crosswalks: number[] = [];

  private collectibleTimer = 4;
  private crosswalkTimer = 10;

  // --- Trafik Işığı ---
  private trafficLightTimer = 45;   // ilk ışık 45 sn sonra
  private trafficLightState: "none" | "red" | "countdown" | "green" = "none";
  private trafficLightCountdown = 0; // kalan süre (saniye)
  private trafficLightFrozen = false; // araçlar dursun mu

  private state: GameState = "intro";
  private level: LevelConfig = LEVELS[0];
  private lvl = new LevelManager(LEVELS[0]);
  private winTimer = 0; // brief delay before the win screen so the last kill lands
  private activeVehicle?: VehicleStats;

  public onRunEnd?: (result: RunResult) => void;

  private readonly audio = new AudioEngine();
  private radioPlayed = false;
  private radioQuipTimer = 35; // ilk quip 35 sn sonra

  // Oyun içi komik radyo anonsları
  private static readonly RADIO_QUIPS = [
    "Dikkat! E-5'te bir Tofaş trafiği mahvediyor, polis çekildi.",
    "Meteoroloji uyarıyor: Bugün sinir seviyesi yüksek, şerit değiştirmeyin.",
    "Bu sabah Bağcılar'da bir dolmuş 4 şeridi tek başına kapattı.",
    "Çakarlı uyarısı: Herkes çakarlı, herkes önce geçiyor, kimse hiçbir yere gitmiyor.",
    "Makąsçı rekoru kırıldı! Bir araç 15 saniyede 8 şerit değiştirdi.",
    "Hayalet frenci gözlemlendi. Sebep: yok. Sonuç: hepimiz bekliyoruz.",
    "Simitçi uyarısı: Trafik ışığında satış yapılıyor, şerït kaybı kesin.",
    "Trafik bülteni: Trafik. Hepsi bu.",
    "FSM Köprüsü durumu: Köprü kapalı. Neden? Istanbul olduğu için.",
    "Bugün öfke seviyesi ölçüm dışına çıktı. Cihaz bozuldu.",
  ];
  private radioQuipIndex = 0;

  private score = 0;
  private hitStop = 0; // real seconds of freeze remaining
  private vw = 0;
  private vh = 0;
  private dpr = 1;
  private lastTime = 0;
  private flashWhite = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;

    const input = new Input(canvas);
    input.onRamGesture((g) => this.handleRam(g));
    // a plain tap also advances the intro / restart screens
    canvas.addEventListener("pointerup", () => this.handleTap());

    // unlock audio on the first user gesture (browser requirement)
    const unlock = (): void => this.audio.unlock();
    canvas.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("keydown", (e) => {
      if (e.key === "m" || e.key === "M") this.audio.toggleMute();
    });

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.resetRun();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ------------------------------------------------------------- level flow
  public beginLevel(index: number, vehicle: VehicleStats): void {
    this.level = LEVELS[index];
    this.lvl = new LevelManager(this.level);
    this.activeVehicle = vehicle;
    this.audio.unlock();
    this.state = "playing";
    this.resetRun();
    if (!this.radioPlayed) {
      this.radioPlayed = true;
      this.audio.radioIntro(this.level.intro[0] || "Hadi başlayalım.");
    }
  }

  public beginSeedRun(seed: string, difficulty: number, vehicle: VehicleStats): void {
    const diffInt = Math.round(difficulty * 100);
    this.level = {
      id: 0,
      name: `MAHKEME YOK (${seed})`,
      location: "Kendi Cehennemin",
      goalType: "survival",
      specialRule: `Zorluk: %${diffInt}`,
      spawnWeights: [
        ["phantom", 40],
        ["cakarli", 30],
        ["dolmus", 30],
      ],
      speedMult: 0.5 + difficulty,
      maxTargets: 30 + Math.floor(difficulty * 30),
      tutorial: false,
      intro: [
        `Tofaş Kodu: ${seed}`,
        "Kural yok.",
        "Mahkeme yok."
      ]
    };
    this.lvl = new LevelManager(this.level);
    this.activeVehicle = vehicle;
    this.audio.unlock();
    this.state = "playing";
    this.resetRun();
    if (!this.radioPlayed) {
      this.radioPlayed = true;
      this.audio.radioIntro(`Tofaş Kodu: ${seed}`);
    }
  }

  public returnToMenu(): void {
    this.state = "intro";
  }

  private resetRun(): void {
    this.player = new Player(this.activeVehicle);
    this.ofke = new OfkeMeter();
    this.combo = new ComboChain();
    this.ram = new RamSystem();
    this.targets = [];
    this.collectibles = [];
    this.crosswalks = [];
    this.score = 0;
    this.winTimer = 0;
    this.trafficLightTimer = 45;
    this.trafficLightState = "none";
    this.trafficLightFrozen = false;
    this.collectibleTimer = 4;
    this.crosswalkTimer = 10;
    this.wireEvents();
    this.fillTraffic(); // start already congested
  }

  private startPlaying(): void {
    this.lvl = new LevelManager(this.level);
    this.resetRun();
    this.state = "playing";
    this.audio.unlock();
    if (!this.radioPlayed) {
      this.radioPlayed = true;
      this.audio.radioIntro("İşte İstanbul'dayız, saat sabahın yedisi, trafik bugün de kilit.");
    }
  }

  private wireEvents(): void {
    this.ofke.onFullOfkeStart = () => {
      this.ram.unlimited = true;
      this.flashWhite = 1;
      this.camera.addTrauma(0.8);
      haptic([60, 40, 120]);
      this.audio.fullOfkeHit();
      this.floats.spawn(this.player.x, this.player.y - 90, "FULL ÖFKE!", "#ff2d2d", 40);
    };
    this.ofke.onFullOfkeEnd = () => {
      this.ram.unlimited = false;
    };
    this.combo.onBurst = () => {
      this.ofke.add(10);
      this.floats.spawn(this.player.x, this.player.y - 70, "+10 ÖFKE", "#ff8a3a", 20);
    };
    this.combo.onFullRageChain = () => this.ofke.triggerFullOfke();
  }

  // ----------------------------------------------------------------- input
  private handleTap(): void {
    if (this.state === "intro") this.startPlaying();
    else if (this.state === "won" || this.state === "lost") this.startPlaying();
  }

  private handleRam(g: RamGesture): void {
    if (this.state !== "playing") return; // taps are handled separately
    if (g.isFullRam && this.ram.tryConsume()) {
      this.player.ram(g.dir);
      haptic(12);
    } else {
      this.player.nudge(g.dir);
    }
  }

  // --------------------------------------------------------------- spawning
  /** Weighted pick among target ids matching a behavior filter. */
  private pickType(park: boolean): TargetId {
    const list = this.level.spawnWeights.filter(
      ([id]) => (TARGET_TYPES[id].behavior === "park") === park,
    );
    if (list.length === 0) return park ? "simit" : "phantom";
    const total = list.reduce((a, [, w]) => a + w, 0);
    let r = this.rng() * total;
    for (const [id, w] of list) {
      if (r < w) return id;
      r -= w;
    }
    return list[0][0];
  }

  /**
   * Keep every driving lane packed bumper-to-bumper up to the top of the view,
   * and the curbs lined with parked obstacles. This is what makes it feel like
   * Istanbul traffic instead of an empty road.
   */
  private fillTraffic(): void {
    const topBound = this.player.y - this.vh * 0.9;
    const bottomFill = this.player.y + this.vh * 0.6;

    // driving lanes
    let guard = 0;
    while (this.drivingCount() < this.level.maxTargets && guard++ < 200) {
      // find the lane with the most empty space at the top
      // (curb lanes 0 and LANE_COUNT-1 are reserved for parked obstacles)
      let bestLane = -1;
      let bestTopY = -Infinity;
      for (let lane = 1; lane < LANE_COUNT - 1; lane++) {
        const cx = laneCenterX(lane);
        let topY = bottomFill;
        for (const t of this.targets) {
          if (t.dead || t.type.behavior === "park") continue;
          if (Math.abs(t.x - cx) < LANE_W * 0.5 && t.y < topY) topY = t.y;
        }
        if (topY > bestTopY) {
          bestTopY = topY;
          bestLane = lane;
        }
      }
      if (bestLane < 0 || bestTopY <= topBound) break; // every lane is full to the top
      const cx = laneCenterX(bestLane);
      const y = bestTopY - (CAR_GAP + randRange(this.rng, 0, 40));
      const type = TARGET_TYPES[this.pickType(false)];
      this.targets.push(new Target(type, cx, y, this.rng, this.level.speedMult));
    }

    // curbs (parked obstacles)
    const hasPark = this.level.spawnWeights.some(([id]) => TARGET_TYPES[id].behavior === "park");
    if (!hasPark) return;
    for (const side of [-1, 1]) {
      const cx = side * (ROAD_HALF - LANE_W * 0.5);
      let g2 = 0;
      // fill each curb independently up to its own cap
      while (g2++ < 20) {
        let count = 0;
        let topY = bottomFill;
        for (const t of this.targets) {
          if (t.dead || t.type.behavior !== "park") continue;
          if (Math.abs(t.x - cx) < LANE_W * 0.5) {
            count++;
            if (t.y < topY) topY = t.y;
          }
        }
        if (count >= MAX_PARK_PER_SIDE || topY <= topBound) break;
        const y = topY - (PARK_GAP + randRange(this.rng, 0, 80));
        const typeId = this.pickType(true);
        const type = TARGET_TYPES[typeId];
        this.targets.push(new Target(type, cx, y, this.rng, this.level.speedMult));
      }
    }
  }

  private spawnPickups(dt: number) {
    this.collectibleTimer -= dt;
    if (this.collectibleTimer <= 0) {
      this.collectibleTimer = 4.0;
      const types: Collectible["type"][] = ["gold", "gold", "gold", "cay", "kriko", "cukur", "cukur"];
      const lane = [-LANE_W, 0, LANE_W][Math.floor(this.rng() * 3)];
      this.collectibles.push({
        type: types[Math.floor(this.rng() * types.length)],
        x: lane,
        y: this.player.y - this.vh * 0.8
      });
    }

    this.crosswalkTimer -= dt;
    if (this.crosswalkTimer <= 0) {
      this.crosswalkTimer = 10.0;
      const cy = this.player.y - this.vh * 0.8;
      this.crosswalks.push(cy);
      for (let i = 0; i < 3; i++) {
        this.targets.push(new Target(TARGET_TYPES["yaya"], -ROAD_HALF + this.rng() * ROAD_HALF * 2, cy - 20 + this.rng() * 40, this.rng, this.level.speedMult));
      }
    }
  }

  private drivingCount(): number {
    let n = 0;
    for (const t of this.targets) if (!t.dead && t.type.behavior !== "park") n++;
    return n;
  }

  /** Car-following: nobody drives into the car ahead — creates stop-and-go jams. */
  private applyTrafficFlow(): void {
    const byLane = new Map<number, Target[]>();
    for (const t of this.targets) {
      if (t.dead || t.type.behavior === "park") continue;
      const lane = Math.round((t.x + ROAD_HALF - LANE_W * 0.5) / LANE_W);
      (byLane.get(lane) ?? byLane.set(lane, []).get(lane)!).push(t);
    }
    for (const cars of byLane.values()) {
      cars.sort((a, b) => b.y - a.y); // front (largest y) first
      for (let i = 1; i < cars.length; i++) {
        const car = cars[i];
        const ahead = cars[i - 1];
        const minGap = (car.type.h + ahead.type.h) * 0.5 + 8;
        const gap = ahead.y - car.y;
        if (gap < minGap) {
          car.y = ahead.y - minGap; // resolve overlap
          if (car.vy > ahead.vy) car.vy = ahead.vy; // don't tailgate faster than the car ahead
        }
      }
    }
  }

  // ------------------------------------------------------------------ loop
  private frame(time: number): void {
    requestAnimationFrame((t) => this.frame(t));
    if (!this.lastTime) {
      this.lastTime = time;
      return;
    }
    const realDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    if (isNaN(realDt) || realDt > 0.1) return; // prevent massive jumps if tab was inactive

    const scale = this.state === "playing" ? (this.level?.speedMult ?? 1) : 0.5;
    let dt = realDt * scale;
    if (isNaN(dt)) dt = 0.016;

    this.update(dt, realDt);
    this.render();
  }

  private update(dt: number, realDt: number): void {
    if (this.hitStop > 0) {
      this.hitStop -= realDt;
      return;
    }

    if (isNaN(this.player.x) || isNaN(this.player.y)) {
      this.player.x = 0; this.player.y = 0;
      this.player.vx = 0; this.player.vy = 0;
    }
    if (isNaN(this.camera.x) || isNaN(this.camera.y)) {
      this.camera.x = 0; this.camera.y = 0;
    }

    this.flashWhite = Math.max(0, this.flashWhite - realDt * 3);
    this.camera.update(realDt);
    this.particles.update(dt);
    this.floats.update(dt);

    // The field keeps drifting under the intro/win/lost overlays for life.
    if (this.state !== "playing") {
      for (const target of this.targets) target.update(dt, this.rng);
      this.camera.follow(this.player, realDt);
      if (this.state === "won" && this.winTimer > 0) this.winTimer -= realDt;
      return;
    }

    this.player.update(dt);
    this.ofke.update(dt);
    this.combo.update(dt);
    this.ram.update(dt);
    this.lvl.update(dt);
    this.audio.setOfke(this.ofke.current, this.ofke.state, this.ofke.fullOfke);
    this.audio.updateDrift(this.player.driftIntensity);
    this.clampToRoad();

    // Periyodik radyo anonsları
    this.radioQuipTimer -= realDt;
    if (this.radioQuipTimer <= 0) {
      const quips = Game.RADIO_QUIPS;
      this.audio.radioQuip(quips[this.radioQuipIndex % quips.length]);
      this.radioQuipIndex++;
      this.radioQuipTimer = 30 + this.rng() * 30;
    }

    // Drift dumanı
    if (this.player.shouldEmitSmoke()) {
      const px = this.player.x;
      const py = this.player.y + this.player.h * 0.4;
      this.particles.burst({
        x: px, y: py, count: 3,
        colors: ["rgba(180,160,120,0.5)", "rgba(140,130,110,0.4)", "rgba(200,190,170,0.3)"],
        speed: 30, size: 12, shape: "ring", spread: Math.PI / 2,
      });
    }

    // --- Trafik Işığı Güncelle ---
    this.updateTrafficLight(dt);

    this.spawnPickups(dt);

    // Kırmızı ışıkta NPC'ler durur, yeşilde patlıyor gibi hücum eder
    const targetDt = this.trafficLightFrozen ? 0 : dt;
    for (const target of this.targets) target.update(targetDt, this.rng);
    this.applyTrafficFlow();
    this.handleCollisions();

    // Collectible updates
    const py = this.player.y;
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      if (Math.abs(this.player.x - col.x) < (this.player.w + 24) / 2 &&
          Math.abs(this.player.y - col.y) < (this.player.h + 24) / 2) {
        
        if (col.type === "gold") {
          this.score += 25;
          this.floats.spawn(col.x, col.y, "+25🪙", "#E8A030", 20);
        } else if (col.type === "cay") {
          this.ofke.add(40);
          this.player.hasar = Math.min(100, this.player.hasar + 25);
          this.floats.spawn(col.x, col.y, "TAVŞAN KANI!", "#e23a2a", 18);
        } else if (col.type === "kriko") {
          this.player.shieldTimer = 5.0;
          this.floats.spawn(col.x, col.y, "KRİKO ZIRHI!", "#fff", 18);
        } else if (col.type === "cukur") {
          this.player.takeDamage(15, false);
          this.camera.addTrauma(0.35);
          this.audio.playImpact("cukur" as TargetId, true);
          this.floats.spawn(col.x, col.y, "KASİS!", "#CC3310", 20);
        }
        this.collectibles.splice(i, 1);
      } else if (col.y > py + this.vh) {
        this.collectibles.splice(i, 1);
      }
    }
    this.crosswalks = this.crosswalks.filter(y => y < py + this.vh);

    this.targets = this.targets.filter(
      (t) => !t.removable && t.y < this.player.y + this.vh * 0.95 && t.y > this.player.y - this.vh * 1.6,
    );
    this.fillTraffic();

    this.camera.follow(this.player, realDt);

    if (this.player.dead) {
      this.state = "lost";
      this.audio.sting(false);
      this.onRunEnd?.({
        won: false,
        score: this.score,
        maxCombo: this.combo.count,
        kills: this.lvl.destroyed,
        levelId: this.level.id
      });
    } else if (this.lvl.checkWin(this.score)) {
      this.state = "won";
      this.winTimer = 0.8;
      this.flashWhite = 0.8;
      this.camera.addTrauma(0.5);
      haptic([40, 30, 40, 30, 120]);
      this.audio.sting(true);
      this.onRunEnd?.({
        won: true,
        score: this.score,
        maxCombo: this.combo.count,
        kills: this.lvl.destroyed,
        levelId: this.level.id
      });
    }
  }

  private clampToRoad(): void {
    const limit = ROAD_HALF - this.player.w * 0.4;
    if (this.player.x < -limit || this.player.x > limit) {
      const wasRamming = this.player.ramming;
      this.player.x = clamp(this.player.x, -limit, limit);
      this.player.vx = -this.player.vx * 0.4;
      if (wasRamming) {
        this.player.ramming = false;
        this.player.takeDamage(15, false);
        this.camera.addTrauma(0.35);
        haptic(40);
        this.floats.spawn(this.player.x, this.player.y - 60, "-15 BARİYER", "#e23a2a", 18);
      }
    }
  }

  private handleCollisions(): void {
    const p = this.player;
    for (const target of this.targets) {
      if (target.dead) continue;
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.hypot(dx, dy);
      const minDist = p.radius + target.radius;
      if (dist > minDist) continue;

      if (p.ramming) {
        this.smash(target, p.vx, p.vy);
      } else {
        const nx = dist > 0.01 ? dx / dist : 0;
        const ny = dist > 0.01 ? dy / dist : 1;
        const push = (minDist - dist) * 0.5;
        target.x += nx * push;
        target.y += ny * push;
        p.x -= nx * push;
        p.y -= ny * push;
        p.vx -= nx * 30;
        p.vy -= ny * 30;
      }
    }
  }

  private smash(target: Target, pvx: number, pvy: number): void {
    const speed = Math.hypot(pvx, pvy) || 1;
    const dirX = pvx / speed;
    const dirY = pvy / speed;
    const destroyed = target.hit(dirX, dirY, speed * 0.9, this.rng);

    this.camera.addTrauma(destroyed ? 0.55 : 0.3);
    this.hitStop = destroyed ? 0.07 : 0.04;
    haptic(destroyed ? 28 : 14);
    this.audio.playImpact(target.type.id, destroyed);
    this.particles.burst({
      x: target.x,
      y: target.y,
      count: destroyed ? 22 : 10,
      colors: target.type.debris,
      speed: destroyed ? 360 : 200,
      size: target.type.debrisShape === "ring" ? 12 : 9,
      shape: target.type.debrisShape,
    });

    if (!destroyed) return;

    this.player.vx *= 0.55;
    this.player.vy *= 0.55;

    this.ofke.add(target.type.ofkeFill);
    this.combo.registerHit();
    this.lvl.registerKill(target.type.id);
    const mult = this.combo.multiplier * this.ofke.scoreMultiplier;
    const points = Math.round(target.type.score * mult);
    this.score += points;
    this.player.takeDamage(target.type.selfDamage, this.ofke.fullOfke);

    const col =
      this.ofke.fullOfke ? "#ff2d2d" : mult >= 3 ? "#ffd23a" : mult >= 2 ? "#ff8a3a" : "#ffffff";
    this.floats.spawn(target.x, target.y - 20, `+${points}`, col, 24);
    this.floats.spawn(target.x, target.y - 48, target.type.shout, "#e8e2d8", 15);
  }

  // ---------------------------------------------------------------- render
  private render(): void {
    const { ctx, vw, vh } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);

    ctx.save();
    this.camera.apply(ctx, vw, vh);
    drawRoad(ctx, this.camera.x, this.camera.y, vw, vh);
    
    // Draw crosswalks
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (const cy of this.crosswalks) {
      for (let cx = -ROAD_HALF + 10; cx < ROAD_HALF; cx += 30) {
        ctx.fillRect(cx, cy - 20, 20, 40);
      }
    }

    // Draw collectibles
    for (const c of this.collectibles) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = c.type === "gold" ? "#FFD700" : c.type === "cay" ? "#c92a2a" : c.type === "kriko" ? "#aaaaaa" : "#333333";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const t of this.targets) drawTarget(ctx, t);
    drawPlayer(ctx, this.player, this.ofke.fullOfke);
    this.particles.draw(ctx);
    this.floats.draw(ctx);
    ctx.restore();

    const hud = this.hudState();
    drawVignette(ctx, vw, vh, hud);
    if (this.state === "playing" || this.state === "won") drawHud(ctx, vw, vh, hud);

    if (this.flashWhite > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashWhite * 0.6})`;
      ctx.fillRect(0, 0, vw, vh);
    }

    if (this.state === "intro") this.drawIntro();
    else if (this.state === "lost") this.drawGameOver();
    else if (this.state === "won" && this.winTimer <= 0) this.drawWin();
    else if (this.state === "playing" && this.level.tutorial && this.lvl.goalProgress(this.score).current === 0) {
      this.drawTutorialHint();
    }

    // Trafik ışığı her zaman en üstte
    if (this.state === "playing") this.drawTrafficLight();
  }

  private hudState(): HudState {
    const goal = this.lvl.goalProgress(this.score);
    const isSurvival = this.level.goalType === "survival";
    return {
      ofke: this.ofke.current,
      ofkeState: this.ofke.state,
      fullOfke: this.ofke.fullOfke,
      fullOfkeRemaining: this.ofke.fullOfkeRemaining,
      hasar: this.player.hasar,
      score: this.score,
      comboCount: this.combo.count,
      comboName: this.combo.tierName,
      comboFrac: this.combo.windowFrac,
      ramCharges: this.ram.charges,
      ramMax: this.ram.maxCharges,
      ramRechargeFrac: this.ram.rechargeFrac,
      ramUnlimited: this.ram.unlimited,
      location: this.level.location,
      goalLabel: this.lvl.goalLabel,
      goalCurrent: goal.current,
      goalTarget: goal.target,
      isSurvival,
      survivalElapsed: isSurvival ? this.lvl.elapsed : undefined,
      survivalLimit: isSurvival ? this.level.timeLimit : undefined,
    };
  }

  // -------------------------------------------------------- trafik ışığı
  private updateTrafficLight(dt: number): void {
    if (this.trafficLightState === "none") {
      this.trafficLightTimer -= dt;
      if (this.trafficLightTimer <= 0) {
        // Kırmızı ışık başlasın
        this.trafficLightState = "red";
        this.trafficLightCountdown = 3.5;
        this.trafficLightFrozen = true;
        this.camera.addTrauma(0.3);
        this.floats.spawn(0, this.player.y - 120, "🚦 KIRMIZI IŞIK!", "#ff3322", 32);
        this.audio.sting(false);
      }
    } else if (this.trafficLightState === "red") {
      this.trafficLightCountdown -= dt;
      if (this.trafficLightCountdown <= 0) {
        this.trafficLightState = "green";
        this.trafficLightCountdown = 0.8; // kısa yeşil flash süresi
        this.trafficLightFrozen = false;
        this.camera.addTrauma(0.5);
        this.floats.spawn(0, this.player.y - 120, "🟢 YEŞİL! HÜCUM!", "#44ff66", 36);
        this.audio.sting(true);
        // Öfke bonusu
        this.ofke.add(20);
      }
    } else if (this.trafficLightState === "green") {
      this.trafficLightCountdown -= dt;
      if (this.trafficLightCountdown <= 0) {
        this.trafficLightState = "none";
        // Bir sonraki ışık 50-80 sn arası
        this.trafficLightTimer = 50 + this.rng() * 30;
      }
    }
  }

  private drawTrafficLight(): void {
    if (this.trafficLightState === "none") return;
    const { ctx, vw, vh } = this;
    const isRed = this.trafficLightState === "red";
    const isGreen = this.trafficLightState === "green";

    // Yarı saydam overlay
    ctx.fillStyle = isRed ? "rgba(180,20,10,0.18)" : "rgba(30,180,50,0.18)";
    ctx.fillRect(0, 0, vw, vh);

    // Işık kutusu
    const bx = vw / 2 - 60, by = vh * 0.18;
    ctx.fillStyle = "rgba(10,10,15,0.88)";
    ctx.beginPath();
    ctx.roundRect(bx, by, 120, 160, 14);
    ctx.fill();

    // Kırmızı daire
    ctx.beginPath();
    ctx.arc(vw / 2, by + 44, 26, 0, Math.PI * 2);
    ctx.fillStyle = isRed ? "#ff3322" : "#3a1a1a";
    ctx.shadowColor = isRed ? "#ff3322" : "transparent";
    ctx.shadowBlur = isRed ? 30 : 0;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Yeşil daire
    ctx.beginPath();
    ctx.arc(vw / 2, by + 116, 26, 0, Math.PI * 2);
    ctx.fillStyle = isGreen ? "#44ff66" : "#1a3a1a";
    ctx.shadowColor = isGreen ? "#44ff66" : "transparent";
    ctx.shadowBlur = isGreen ? 30 : 0;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Geri sayım
    if (isRed && this.trafficLightCountdown > 0) {
      ctx.textAlign = "center";
      ctx.font = "900 48px -apple-system, system-ui, sans-serif";
      ctx.fillStyle = "#ff3322";
      ctx.shadowColor = "#ff3322";
      ctx.shadowBlur = 20;
      ctx.fillText(Math.ceil(this.trafficLightCountdown).toString(), vw / 2, vh * 0.5);
      ctx.shadowBlur = 0;
    }
  }

  private dimScreen(alpha: number): void {
    this.ctx.fillStyle = `rgba(8,8,10,${alpha})`;
    this.ctx.fillRect(0, 0, this.vw, this.vh);
  }

  private pulse(): number {
    return 0.55 + 0.45 * Math.sin(performance.now() / 380);
  }

  private drawIntro(): void {
    const { ctx, vw, vh } = this;
    this.dimScreen(0.72);
    ctx.textAlign = "center";

    // "radio" framing
    ctx.fillStyle = "#ffb13a";
    ctx.font = "700 14px -apple-system, system-ui, sans-serif";
    ctx.fillText("◉ CANLI · TRAFİK BÜLTENİ", vw / 2, vh * 0.16);

    ctx.fillStyle = "#fff";
    ctx.font = "900 34px -apple-system, system-ui, sans-serif";
    ctx.fillText("İSTANBUL ÖFKE", vw / 2, vh * 0.16 + 44);

    ctx.fillStyle = "#ffb13a";
    ctx.font = "800 18px -apple-system, system-ui, sans-serif";
    ctx.fillText(`SEVİYE ${this.level.id} — ${this.level.name}`, vw / 2, vh * 0.16 + 78);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 14px -apple-system, system-ui, sans-serif";
    ctx.fillText(this.level.location, vw / 2, vh * 0.16 + 100);

    // announcement lines
    ctx.font = "300 italic 19px Georgia, serif";
    let y = vh * 0.16 + 150;
    for (const line of this.level.intro) {
      ctx.fillStyle = "rgba(232,226,216,0.92)";
      ctx.fillText(line, vw / 2, y);
      y += 30;
    }

    // goal
    ctx.font = "700 16px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "#4caf6e";
    ctx.fillText(`HEDEF: ${this.lvl.goalProgress(this.score).target} ${this.lvl.goalLabel} TEMİZLE`, vw / 2, y + 24);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 13px -apple-system, system-ui, sans-serif";
    ctx.fillText(this.level.specialRule, vw / 2, y + 48);

    // tap to start
    ctx.globalAlpha = this.pulse();
    ctx.fillStyle = "#fff";
    ctx.font = "900 22px -apple-system, system-ui, sans-serif";
    ctx.fillText("BAŞLAMAK İÇİN DOKUN", vw / 2, vh * 0.86);
    ctx.globalAlpha = 1;
  }

  private drawTutorialHint(): void {
    const { ctx, vw, vh } = this;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "800 22px -apple-system, system-ui, sans-serif";
    ctx.fillText("UZUN KAYDIR = RAM", vw / 2, vh - 120);
    ctx.font = "500 15px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("Hayalet frencilerine çarp · (masaüstü: WASD / oklar)", vw / 2, vh - 95);
  }

  private drawGameOver(): void {
    const { ctx, vw, vh } = this;
    this.dimScreen(0.78);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8e2d8";
    ctx.font = "300 italic 30px Georgia, serif";
    ctx.fillText("“Yeter artık...”", vw / 2, vh / 2 - 60);
    ctx.fillStyle = "#fff";
    ctx.font = "900 26px -apple-system, system-ui, sans-serif";
    ctx.fillText("ARABAN HARAP OLDU", vw / 2, vh / 2 - 10);
    ctx.font = "800 44px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "#ffb13a";
    ctx.fillText(this.score.toLocaleString("tr-TR") + " puan", vw / 2, vh / 2 + 44);
    ctx.globalAlpha = this.pulse();
    ctx.font = "700 17px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("Tekrar denemek için dokun", vw / 2, vh / 2 + 96);
    ctx.globalAlpha = 1;
  }

  private drawWin(): void {
    const { ctx, vw, vh } = this;
    this.dimScreen(0.72);
    ctx.textAlign = "center";
    ctx.fillStyle = "#4caf6e";
    ctx.font = "800 18px -apple-system, system-ui, sans-serif";
    ctx.fillText("SEVİYE TAMAMLANDI", vw / 2, vh / 2 - 90);
    ctx.fillStyle = "#fff";
    ctx.font = "900 32px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${this.level.name}`, vw / 2, vh / 2 - 48);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "600 15px -apple-system, system-ui, sans-serif";
    ctx.fillText(this.level.location, vw / 2, vh / 2 - 24);

    ctx.fillStyle = "#ffb13a";
    ctx.font = "900 48px -apple-system, system-ui, sans-serif";
    ctx.fillText(this.score.toLocaleString("tr-TR"), vw / 2, vh / 2 + 36);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "700 14px -apple-system, system-ui, sans-serif";
    ctx.fillText("PUAN", vw / 2, vh / 2 + 58);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 14px -apple-system, system-ui, sans-serif";
    ctx.fillText("Sıradaki seviye yakında — Metrobüs Çılgınlığı", vw / 2, vh / 2 + 96);

    ctx.globalAlpha = this.pulse();
    ctx.fillStyle = "#fff";
    ctx.font = "900 20px -apple-system, system-ui, sans-serif";
    ctx.fillText("TEKRAR OYNA — DOKUN", vw / 2, vh / 2 + 140);
    ctx.globalAlpha = 1;
  }

  private resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    // Use the container's actual rendered size, not window.innerWidth,
    // so the game respects max-width: 500px on #app.
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.vw = rect.width;
    this.vh = window.innerHeight;
    this.canvas.width = Math.floor(this.vw * this.dpr);
    this.canvas.height = Math.floor(this.vh * this.dpr);
    this.canvas.style.width = this.vw + "px";
    this.canvas.style.height = this.vh + "px";
  }
}
