import { soundEngine } from "../audio";
import { el } from "../dom";
import { narrator } from "../narrator";
import { applyTheme } from "../themes";
import { classifyComplexity } from "../time";
import type { Scenario } from "../types";
import type { FrightFateGame } from "./controller";
import { notificationHtml } from "./templates";

/** Generic DOM/UI helpers shared by the game controllers. */
export class UiManager {
  constructor(private game: FrightFateGame) {}

  showScreen(screenId: string): void {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add("active");
    }

    // Leaving the game screen silences any in-flight narration.
    if (screenId !== "gameScreen") {
      narrator.stop();
    }

    if (screenId === "gameScreen") {
      soundEngine.playThemeAmbience(this.game.state.currentTheme || "haunted_house");
    } else if (screenId === "eliminationScreen") {
      soundEngine.stopHeartbeat();
      soundEngine.stopAmbience();
      soundEngine.playStinger();
    } else if (screenId === "resultsScreen") {
      soundEngine.stopHeartbeat();
      soundEngine.stopAmbience();
    } else {
      // Menus (home / join / lobby) play the *selected world's* soundtrack.
      soundEngine.stopHeartbeat();
      soundEngine.playThemeAmbience(this.game.state.currentTheme || "haunted_house");
    }
  }

  showNotification(message: string, type = "info"): void {
    document.querySelectorAll(".notification").forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = notificationHtml(message);

    document.body.appendChild(notification);

    this.game.timers.setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);

    const closeBtn = notification.querySelector(".notification-close") as HTMLElement | null;
    if (closeBtn) closeBtn.onclick = () => notification.remove();
  }

  showLoadingButton(buttonId: string, loadingText = "Loading..."): void {
    const btn = document.getElementById(buttonId) as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="loading-spinner"></span>${loadingText}`;
    }
  }

  hideLoadingButton(buttonId: string, originalText: string): void {
    const btn = document.getElementById(buttonId) as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  selectTheme(theme: string): void {
    this.game.state.currentTheme = theme;
    // Remember the choice so reloads return to the same world.
    try {
      localStorage.setItem("frightfate_theme", theme);
    } catch {
      /* storage unavailable — theme just won't persist */
    }
    document.querySelectorAll(".theme-option").forEach((option) => {
      option.classList.remove("selected");
    });
    // Scope to the selector card — `<html data-theme>` also carries this attribute.
    const opt = document.querySelector(`.theme-option[data-theme="${theme}"]`);
    if (opt) opt.classList.add("selected");

    // Restyle the entire app to this world's palette, fonts and backdrop.
    applyTheme(theme);

    soundEngine.playSelect();
    soundEngine.playThemeAmbience(theme);
  }

  showComplexityInfo(scenario: Scenario, timeLimit: number): void {
    const wordCount = scenario.description.split(/\s+/).length;
    const minutes = Math.floor(timeLimit / 60);
    const seconds = timeLimit % 60;

    const complexityInfo = el("complexityInfo") || this.createComplexityInfo();
    if (!complexityInfo) return;

    const { label: difficultyText, className: difficultyClass } = classifyComplexity(timeLimit);

    complexityInfo.className = `complexity-info ${difficultyClass}`;
    complexityInfo.innerHTML = `
    <div class="complexity-header">
      <span class="complexity-label">Scenario Complexity:</span>
      <span class="complexity-level">${difficultyText}</span>
    </div>
    <div class="complexity-details">
      <span>${wordCount} words</span>
      <span>•</span>
      <span>${minutes}:${seconds.toString().padStart(2, "0")} allocated</span>
      <span>•</span>
      <span>Risk Level: ${scenario.death_risk_level || "medium"}</span>
    </div>
  `;
  }

  private createComplexityInfo(): HTMLElement | null {
    const complexityInfo = document.createElement("div");
    complexityInfo.id = "complexityInfo";

    const scenarioElement = el("currentScenario");
    if (scenarioElement) {
      scenarioElement.appendChild(complexityInfo);
    }

    return complexityInfo;
  }
}
