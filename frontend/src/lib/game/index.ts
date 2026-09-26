import { FrightFateGame } from "./controller";

/** Boot the game against the already-mounted DOM; returns a teardown function. */
export function initGame(): () => void {
  const game = new FrightFateGame();
  game.mount();
  return () => game.destroy();
}
