import { Game, type RunResult } from "../game/game";
import { GarageManager, VEHICLES, type UpgradeKey } from "../game/garage";
import { LEVELS } from "../game/levels";

type ScreenId = "main-menu" | "level-select" | "garage-screen" | "mahkeme-screen" | "end-screen";

const DIFFICULTY_STARS: Record<number, string> = {
  1: "★☆☆☆",
  2: "★★☆☆",
  3: "★★★☆",
  4: "★★★★",
  5: "★★★★★",
};

function difficultyStars(speedMult: number): string {
  const d = Math.round(speedMult * 4);
  return DIFFICULTY_STARS[Math.max(1, Math.min(4, d))] ?? "★★☆☆";
}

/** HTML menü katmanı — oyun motoru ile bağlantı. */
export class UIManager {
  private readonly garage = new GarageManager();
  private activeLevelIndex = 0;

  constructor(private readonly game: Game) {
    this.game.onRunEnd = (r) => this.handleRunEnd(r);
    this.bindNavigation();
    this.refreshMainMenu();
  }

  private bindNavigation(): void {
    document.getElementById("btn-play")!.onclick = () => {
      this.show("level-select");
      this.renderLevelSelect();
    };
    document.getElementById("btn-garage")!.onclick = () => {
      this.show("garage-screen");
      this.renderGarage();
    };
    document.getElementById("btn-mahkeme")!.onclick = () => this.show("mahkeme-screen");

    document.querySelectorAll(".btn-back").forEach((btn) => {
      btn.addEventListener("click", () => this.show("main-menu"));
    });

    document.getElementById("btn-end-menu")!.onclick = () => {
      this.game.returnToMenu();
      this.show("main-menu");
      this.refreshMainMenu();
    };
    document.getElementById("btn-end-retry")!.onclick = () => this.startLevel(this.activeLevelIndex);
    document.getElementById("btn-end-next")!.onclick = () => {
      const next = this.activeLevelIndex + 1;
      if (next < LEVELS.length) this.startLevel(next);
    };

    document.getElementById("tab-upgrades")!.onclick = () => this.switchGarageTab("upgrades");
    document.getElementById("tab-vehicles")!.onclick = () => this.switchGarageTab("vehicles");

    document.getElementById("btn-random-seed")!.onclick = () => {
      const seed = this.randomSeed();
      (document.getElementById("seed-input") as HTMLInputElement).value = seed;
    };
    document.getElementById("seed-diff")!.oninput = (e) => {
      const val = (e.target as HTMLInputElement).value;
      document.getElementById("seed-diff-val")!.textContent = `${val}%`;
    };
    document.getElementById("btn-play-seed")!.onclick = () => {
      const seed = (document.getElementById("seed-input") as HTMLInputElement).value.trim();
      const diff = Number((document.getElementById("seed-diff") as HTMLInputElement).value) / 100;
      if (!seed) return;
      this.startSeedRun(seed, diff);
    };
  }

  private show(id: ScreenId): void {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    document.getElementById(id)!.classList.add("active");
  }

  private refreshMainMenu(): void {
    const hs = this.garage.state.highScore;
    document.getElementById("menu-highscore")!.textContent =
      hs > 0 ? hs.toLocaleString("tr-TR") : "—";
  }

  private renderLevelSelect(): void {
    const cont = document.getElementById("levels-container")!;
    cont.innerHTML = "";
    LEVELS.forEach((lvl, idx) => {
      const unlocked = this.garage.isLevelUnlocked(lvl.id);
      const el = document.createElement("div");
      el.className = `level-card${unlocked ? "" : " locked"}`;

      const goal =
        lvl.goalType === "count"
          ? `${lvl.goalCount} ${lvl.goalTargetId?.toUpperCase()}`
          : lvl.goalType === "score"
          ? `${lvl.goalScore?.toLocaleString("tr-TR")} PUAN`
          : `${lvl.timeLimit}SN HAYATTA KAL`;

      const stars = difficultyStars(lvl.speedMult);

      if (unlocked) {
        el.innerHTML = `
          <div>
            <h3>${lvl.name}</h3>
            <p>${lvl.location}</p>
            <p>Hedef: ${goal}</p>
          </div>
          <div class="level-card-right">
            <span class="level-stars">${stars}</span>
            <span class="level-arrow">▶</span>
          </div>`;
        el.onclick = () => this.startLevel(idx);
      } else {
        el.innerHTML = `
          <div>
            <h3>${lvl.name}</h3>
            <p>Önceki seviyeyi tamamla</p>
          </div>
          <span class="lock-icon">🔒</span>`;
      }

      cont.appendChild(el);
    });
  }

  private startLevel(index: number): void {
    this.activeLevelIndex = index;
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    this.game.beginLevel(index, this.garage.getCurrentVehicle());
  }

  private startSeedRun(seed: string, difficulty: number): void {
    this.activeLevelIndex = 0;
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    this.game.beginSeedRun(seed, difficulty, this.garage.getCurrentVehicle());
  }

  private handleRunEnd(result: RunResult): void {
    const coins = Math.floor(result.score / 25) + result.kills * 8;
    this.garage.addCoins(coins);
    this.garage.updateHighScore(result.score);
    if (result.won) {
      const nextId = result.levelId + 1;
      if (LEVELS.some((l) => l.id === nextId)) this.garage.unlockLevel(nextId);
    }

    const titleEl = document.getElementById("end-title")!;
    titleEl.textContent = result.won ? "HEDEF TAMAM! 🏆" : "ARAÇ ENKAZ! 💥";
    (titleEl as HTMLElement).style.color = result.won
      ? "var(--ofke-altin)"
      : "var(--kan-kirmizi)";

    document.getElementById("end-score")!.textContent = result.score.toLocaleString("tr-TR");
    document.getElementById("end-combo")!.textContent = `x${result.maxCombo}`;
    document.getElementById("end-coins")!.textContent = `+${coins}`;

    const nextBtn = document.getElementById("btn-end-next") as HTMLButtonElement;
    const hasNext = result.won && LEVELS.some((l) => l.id === result.levelId + 1);
    nextBtn.style.display = hasNext ? "block" : "none";

    this.show("end-screen");
    this.refreshMainMenu();
  }

  private switchGarageTab(tab: "upgrades" | "vehicles"): void {
    const up = tab === "upgrades";
    document.getElementById("tab-upgrades")!.classList.toggle("active", up);
    document.getElementById("tab-vehicles")!.classList.toggle("active", !up);
    document.getElementById("panel-upgrades")!.classList.toggle("active", up);
    document.getElementById("panel-vehicles")!.classList.toggle("active", !up);
    if (!up) this.renderGarageVehicles();
  }

  private renderGarage(): void {
    const v = this.garage.getCurrentVehicle();
    document.getElementById("garage-veh-name")!.textContent = v.name;
    document.getElementById("garage-veh-tier")!.textContent = `TİER ${v.tier} · ${v.ability.split(":")[0].toUpperCase()}`;
    document.getElementById("garage-coins")!.innerHTML = `🪙 <strong>${this.garage.state.coins.toLocaleString("tr-TR")}</strong>`;

    this.bindUpgrade("ram", "ramPower");
    this.bindUpgrade("resist", "resistance");
    this.bindUpgrade("recharge", "rechargeRate");

    this.drawGaragePreview(v);
  }

  private drawGaragePreview(v: { body: string; accent: string; w: number; h: number }): void {
    const c = document.getElementById("garagePreviewCanvas") as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    const W = 200, H = 200;
    ctx.clearRect(0, 0, W, H);

    // Road stripe
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(W * 0.35, 0, W * 0.3, H);

    // Lane markers
    ctx.strokeStyle = "rgba(240,168,48,0.2)";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    const sw = v.w * 0.85, sh = v.h * 0.25;
    ctx.beginPath();
    ctx.ellipse(W / 2 + 4, H / 2 + v.h * 0.3, sw / 2, sh / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body
    ctx.fillStyle = v.body;
    const cx = W / 2 - v.w / 2, cy = H / 2 - v.h / 2;
    ctx.beginPath();
    (ctx as any).roundRect(cx, cy, v.w, v.h, 10);
    ctx.fill();

    // Cabin
    ctx.fillStyle = v.accent;
    ctx.beginPath();
    (ctx as any).roundRect(cx + 8, cy + v.h * 0.22, v.w - 16, v.h * 0.38, 6);
    ctx.fill();

    // Headlights
    ctx.fillStyle = "#fff6c8";
    ctx.fillRect(cx + 5, cy + 4, 10, 5);
    ctx.fillRect(cx + v.w - 15, cy + 4, 10, 5);

    // Taillights
    ctx.fillStyle = "#ff2200";
    ctx.fillRect(cx + 5, cy + v.h - 9, 10, 5);
    ctx.fillRect(cx + v.w - 15, cy + v.h - 9, 10, 5);

    // Glow
    ctx.shadowColor = v.body;
    ctx.shadowBlur = 20;
    ctx.fillStyle = "transparent";
    ctx.fillRect(cx, cy, v.w, v.h);
    ctx.shadowBlur = 0;
  }

  private bindUpgrade(id: string, type: UpgradeKey): void {
    const lvl = this.garage.state.upgrades[type];
    const badge = document.getElementById(`lvl-${id}`)!;
    const dots = "●".repeat(lvl) + "○".repeat(5 - lvl);
    badge.textContent = dots;
    badge.className = "upgrade-level-badge";

    const btn = document.getElementById(`btn-up-${id}`) as HTMLButtonElement;
    if (lvl >= 5) {
      btn.textContent = "MAKS ✓";
      btn.disabled = true;
    } else {
      const cost = (lvl + 1) * 300;
      btn.textContent = `${cost}🪙`;
      btn.disabled = this.garage.state.coins < cost;
      btn.onclick = () => {
        if (this.garage.buyUpgrade(type)) {
          this.renderGarage();
          // Flash effect
          btn.style.background = "linear-gradient(135deg, #4cdf80, #2aaa50)";
          setTimeout(() => (btn.style.background = ""), 500);
        }
      };
    }
  }

  private renderGarageVehicles(): void {
    const cont = document.getElementById("panel-vehicles")!;
    cont.innerHTML = "";
    Object.values(VEHICLES).forEach((v) => {
      const unlocked = this.garage.state.unlockedVehicles.includes(v.id);
      const selected = this.garage.state.currentVehicle === v.id;
      const el = document.createElement("div");
      el.className = `vehicle-card${selected ? " selected-vehicle" : ""}`;

      const ramPct = Math.min(100, (v.ramPower / 5) * 100);
      const resistPct = Math.min(100, (v.resist / 5) * 100);
      const speedPct = Math.min(100, ((5 - v.recharge) / 3.5) * 100);

      let actionBtn = "";
      if (selected) {
        actionBtn = `<button class="btn-select-vehicle">✓ SEÇİLİ</button>`;
      } else if (unlocked) {
        actionBtn = `<button class="btn-select-vehicle">SEÇ</button>`;
      } else {
        actionBtn = `<button class="btn-buy-vehicle">${v.unlockCost.toLocaleString("tr-TR")}🪙 KİLİT AÇ</button>`;
      }

      el.innerHTML = `
        <div class="vehicle-card-top">
          <div>
            <h3>${v.name}</h3>
            <p>Tier ${v.tier}</p>
          </div>
          <div style="width:44px;height:60px;position:relative;">
            <canvas class="veh-mini-canvas" width="44" height="60"></canvas>
          </div>
        </div>
        <div class="vehicle-stats-bars">
          <div class="stat-bar-row">
            <span style="min-width:48px">RAM</span>
            <div class="stat-bar-track"><div class="stat-bar-fill ram" style="width:${ramPct}%"></div></div>
          </div>
          <div class="stat-bar-row">
            <span style="min-width:48px">ZIRH</span>
            <div class="stat-bar-track"><div class="stat-bar-fill resist" style="width:${resistPct}%"></div></div>
          </div>
          <div class="stat-bar-row">
            <span style="min-width:48px">HIZ</span>
            <div class="stat-bar-track"><div class="stat-bar-fill speed" style="width:${speedPct}%"></div></div>
          </div>
        </div>
        <p class="vehicle-ability">⚡ ${v.ability}</p>
        ${actionBtn}`;

      // Draw mini car preview
      const mini = el.querySelector(".veh-mini-canvas") as HTMLCanvasElement;
      if (mini) {
        const mctx = mini.getContext("2d")!;
        const scale = Math.min(44 / v.w, 60 / v.h) * 0.85;
        mctx.translate(22, 30);
        mctx.scale(scale, scale);
        mctx.fillStyle = v.body;
        mctx.beginPath();
        (mctx as any).roundRect(-v.w / 2, -v.h / 2, v.w, v.h, 8);
        mctx.fill();
        mctx.fillStyle = v.accent;
        mctx.beginPath();
        (mctx as any).roundRect(-v.w / 2 + 6, -v.h / 2 + v.h * 0.22, v.w - 12, v.h * 0.38, 5);
        mctx.fill();
      }

      const btn = el.querySelector("button")!;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (selected) return;
        if (unlocked) {
          this.garage.selectVehicle(v.id);
        } else {
          if (!this.garage.unlockVehicle(v.id)) return;
          this.garage.selectVehicle(v.id);
        }
        this.renderGarageVehicles();
        this.renderGarage();
      });

      cont.appendChild(el);
    });
  }

  private randomSeed(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "OFKE";
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
}
