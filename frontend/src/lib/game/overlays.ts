import { soundEngine } from "../audio";
import { el } from "../dom";
import { getScoreClass } from "../time";
import type { AnyRecord, WordTag } from "../types";
import { getThemeDirection } from "../themeDirection";
import {
  extractKeyWords,
  getTips,
  PROGRESSIVE_LOADING_SUFFIXES,
  RESULTS_CALC_ITEMS,
  SUSPENSE_TEXTS,
} from "./content";
import type { FrightFateGame } from "./controller";
import {
  alternativesHtml,
  interactiveLoadingHtml,
  loadingOverlayHtml,
  progressBarHtml,
  resultsLoadingHtml,
  scoreRevealCardHtml,
} from "./templates";

/** Owns every full-screen overlay: loading screens and the score reveal modal. */
export class OverlayManager {
  constructor(private game: FrightFateGame) {}

  showLoading(message = "Loading...", showProgress = false): void {
    this.hide();

    const overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = loadingOverlayHtml(message, showProgress);
    document.body.appendChild(overlay);

    if (showProgress) {
      this.startProgressiveLoading(message);
    }

    console.log("Loading overlay shown with message:", message);
  }

  hide(): void {
    const overlay = el("loadingOverlay");
    if (overlay) {
      console.log("Removing loading overlay");
      overlay.remove();
    }

    const intervals = [
      "loadingProgressInterval",
      "meterInterval",
      "tipInterval",
      "timerInterval",
      "calcInterval",
      "suspenseInterval",
    ];

    intervals.forEach((intervalName) => {
      const handle = (window as any)[intervalName];
      if (handle) {
        window.clearInterval(handle);
        (window as any)[intervalName] = null;
      }
    });
  }

  showInteractiveLoading(message: string, playerAnswer: string): void {
    this.hide();

    const overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "loading-overlay interactive";
    overlay.dataset.theme = this.game.state.currentTheme;
    overlay.innerHTML = interactiveLoadingHtml(message, this.game.state.currentTheme, playerAnswer);

    document.body.appendChild(overlay);

    this.startWordAnimation(extractKeyWords(playerAnswer));
    this.startSurvivalMeter();
    this.startHorrorTips();
    this.startLoadingTimer();
  }

  showInteractiveResultsLoading(): void {
    this.hide();

    const overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "loading-overlay results-loading";
    overlay.dataset.theme = this.game.state.currentTheme;
    overlay.innerHTML = resultsLoadingHtml(this.game.state.currentTheme);

    document.body.appendChild(overlay);

    this.startResultsAnimation();
    this.startLoadingTimer();
  }

  async showScoreReveal(response: AnyRecord): Promise<void> {
    return new Promise<void>((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "score-reveal-overlay";

      const altList: string[] = response.better_alternatives || [];

      let buttonLabel = "Proceed to Next Trial ➡️";
      if (response.instant_death) {
        buttonLabel = "Face Your Fate 💀";
      } else if (this.game.state.currentQuestion >= this.game.state.totalQuestions) {
        buttonLabel = "View Final Survival Results 🏆";
      }

      overlay.innerHTML = scoreRevealCardHtml({
        classificationClass: response.choice_classification || "neutral",
        classificationText: response.choice_classification || "EVALUATED",
        analysis: response.analysis || "Your tactical action has been evaluated.",
        storyProgression: response.story_progression,
        alternativesHtml: alternativesHtml(altList),
        buttonLabel,
        hostVerdict: response.host_verdict,
        deathEpitaph: response.death_epitaph || response.death_narrative?.death_epitaph,
      });

      document.body.appendChild(overlay);

      let currentScore = 0;
      const targetScore = response.score || 50;
      const increment = targetScore / 25;

      const scoreInterval = window.setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
          currentScore = targetScore;
          window.clearInterval(scoreInterval);

          const scoreElement = el("animatedScore");
          if (scoreElement) {
            scoreElement.className = `score-number ${getScoreClass(targetScore)}`;
          }
        }

        const scoreElement = el("animatedScore");
        if (scoreElement) {
          scoreElement.textContent = String(Math.round(currentScore));
        }
      }, 28);

      let hasContinued = false;
      const continueToNext = () => {
        if (hasContinued) return;
        hasContinued = true;
        soundEngine.playConfirm();
        window.removeEventListener("keydown", handleKeyDown);
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity 0.25s ease";
        this.game.timers.setTimeout(() => {
          overlay.remove();
          resolve();
        }, 250);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          continueToNext();
        }
      };

      const nextBtn = overlay.querySelector("#nextScenarioBtn") as HTMLElement | null;
      if (nextBtn) {
        nextBtn.addEventListener("click", continueToNext);
        nextBtn.addEventListener("mouseenter", () => soundEngine.playHover());
      }
      window.addEventListener("keydown", handleKeyDown);
    });
  }

  private startProgressiveLoading(baseMessage: string): void {
    const messages = [`${baseMessage}`, ...PROGRESSIVE_LOADING_SUFFIXES];
    let currentIndex = 0;

    const progressInterval = window.setInterval(() => {
      const messageElement = el("loadingMessage");
      const progressElement = el("loadingProgress");

      if (messageElement && currentIndex < messages.length) {
        messageElement.textContent = messages[currentIndex];

        if (progressElement) {
          const progress = ((currentIndex + 1) / messages.length) * 100;
          progressElement.innerHTML = progressBarHtml(progress);
        }

        currentIndex++;
      } else {
        window.clearInterval(progressInterval);
      }
    }, 2000);

    (window as any).loadingProgressInterval = progressInterval;
  }

  private startWordAnimation(words: WordTag[]): void {
    const container = el("wordTags");
    if (!container) return;

    words.forEach((wordObj, index) => {
      this.game.timers.setTimeout(() => {
        const tag = document.createElement("span");
        tag.className = `word-tag ${wordObj.type}`;
        tag.textContent = wordObj.word;
        container.appendChild(tag);
      }, index * 500);
    });
  }

  private startSurvivalMeter(): void {
    const meterFill = el("meterFill");
    const meterText = el("meterText");
    const direction = getThemeDirection(this.game.state.currentTheme);
    if (!meterFill || !meterText) return;
    const label = meterFill.closest(".survival-meter")?.querySelector(".meter-label");
    if (label) label.textContent = direction.analysisMetric;

    let progress = 0;
    const interval = window.setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 100) progress = 100;

      meterFill.style.width = `${progress}%`;
      meterText.textContent = `${Math.round(progress)}%`;

      if (progress >= 100) {
        window.clearInterval(interval);
        meterText.textContent = getThemeDirection(this.game.state.currentTheme).analysisClosing;
      }
    }, 800);

    (window as any).meterInterval = interval;
  }

  private startHorrorTips(): void {
    const tipElement = el("horrorTip");
    if (!tipElement) return;

    // Tips are delivered in the selected world's own voice.
    const tips = [
      ...getTips(this.game.state.currentTheme),
      ...getThemeDirection(this.game.state.currentTheme).analysisTips,
    ];

    let currentTip = 0;
    tipElement.textContent = tips[currentTip];

    const tipInterval = window.setInterval(() => {
      currentTip = (currentTip + 1) % tips.length;
      tipElement.textContent = tips[currentTip];
    }, 4000);

    (window as any).tipInterval = tipInterval;
  }

  private startLoadingTimer(): void {
    const timerElement = el("loadingTimer");
    if (!timerElement) return;

    let seconds = 0;
    const timerInterval = window.setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerElement.textContent = `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }, 1000);

    (window as any).timerInterval = timerInterval;
  }

  private startResultsAnimation(): void {
    let currentItem = 0;
    let currentSuspense = 0;

    const calcInterval = window.setInterval(() => {
      const element = el(RESULTS_CALC_ITEMS[currentItem]);
      if (element) {
        element.classList.add("completed");
      }

      currentItem++;
      if (currentItem >= RESULTS_CALC_ITEMS.length) {
        window.clearInterval(calcInterval);
      }
    }, 2000);

    const suspenseInterval = window.setInterval(() => {        const suspenseElement = el("suspenseText");
        if (suspenseElement) {
          const direction = getThemeDirection(this.game.state.currentTheme);
          suspenseElement.textContent = [direction.analysisClosing, direction.analysisTitle, direction.lostEyebrow, direction.survivedEyebrow][currentSuspense % 4];
          currentSuspense++;
        }

    }, 3000);

    (window as any).calcInterval = calcInterval;
    (window as any).suspenseInterval = suspenseInterval;
  }
}
