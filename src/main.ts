import "./styles.css";
import { Game } from "./game/game";
import { UIManager } from "./ui/UIManager";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#game canvas not found");

// Prevent iOS Safari rubber-band / pinch while playing.
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

const game = new Game(canvas);
(window as any).game = game;
new UIManager(game);
