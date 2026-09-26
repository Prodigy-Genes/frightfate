import { soundEngine } from "../audio";
import { el } from "../dom";
import { QUESTION_TIME_LIMIT, WARNING_TIME } from "../time";
import type { FrightFateGame } from "./controller";

/** Drives the per-question countdown, audio cues and time-up handling. */
export class TimerManager {
  constructor(private game: FrightFateGame) {}

  start(): void {
    this.clear();

    const state = this.game.state;
    state.timeRemaining = state.currentTimeLimit || QUESTION_TIME_LIMIT;
    this.updateDisplay();

    state.questionTimer = window.setInterval(() => {
      state.timeRemaining--;
      this.updateDisplay();

      if (state.timeRemaining <= 10 && state.timeRemaining > 0) {
        soundEngine.playTimerTick(true);
      } else if (state.timeRemaining <= WARNING_TIME && state.timeRemaining > 0) {
        soundEngine.playTimerTick(false);
      }

      if (state.timeRemaining === WARNING_TIME) {
        this.game.ui.showNotification(
          "Only 30 seconds remaining! Answer quickly or face elimination!",
          "warning"
        );
        const timerElement = el("timerDisplay");
        if (timerElement) timerElement.classList.add("warning");
        soundEngine.startHeartbeat(600);
      }

      if (state.timeRemaining === 10) {
        this.game.ui.showNotification("10 seconds left! Answer NOW or be eliminated!", "error");
        const timerElement = el("timerDisplay");
        if (timerElement) timerElement.classList.add("critical");
        soundEngine.startHeartbeat(350);
      }

      if (state.timeRemaining <= 0) {
        soundEngine.stopHeartbeat();
        void this.game.round.handleTimeUp();
      }
    }, 1000);
  }

  clear(): void {
    soundEngine.stopHeartbeat();
    if (this.game.state.questionTimer) {
      window.clearInterval(this.game.state.questionTimer);
      this.game.state.questionTimer = null;
    }
  }

  updateDisplay(): void {
    const timerElement = el("timerDisplay");
    if (!timerElement) return;

    const { timeRemaining } = this.game.state;
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    if (timeRemaining <= 10) {
      timerElement.className = "timer-display critical";
    } else if (timeRemaining <= WARNING_TIME) {
      timerElement.className = "timer-display warning";
    } else {
      timerElement.className = "timer-display";
    }
  }
}
