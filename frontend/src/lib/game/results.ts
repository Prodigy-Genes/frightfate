import { soundEngine } from "../audio";
import { el } from "../dom";
import type { AnyRecord } from "../types";
import type { FrightFateGame } from "./controller";
import {
  eliminationHtml,
  mockResultsHtml,
  mockResultsSummaryHtml,
  resultCardHtml,
  resultsSummaryHtml,
} from "./templates";

/** End-of-run screens: elimination narrative and the final verdict. */
export class ResultsController {
  constructor(private game: FrightFateGame) {}

  async showEliminationScreen(deathNarrative: AnyRecord | null = null): Promise<void> {
    this.game.timer.clear();
    soundEngine.playThemeAmbience(this.game.state.currentTheme || "haunted_house");
    soundEngine.stopAmbience();
    soundEngine.playStinger();

    try {
      const narrativeElement = el("deathNarrative");
      const analysisElement = el("eliminationAnalysis");

      if (narrativeElement && analysisElement) {
        const { narrative, analysis } = eliminationHtml(deathNarrative);
        narrativeElement.innerHTML = narrative;
        analysisElement.innerHTML = analysis;
      }

      this.game.ui.showScreen("eliminationScreen");
      // Fall back to the world's generic line when the model gave no verdict.
      this.game.ui.showNotification(
        deathNarrative?.host_verdict || "You have been eliminated from the game",
        "error"
      );
    } catch (error) {
      console.error("Error showing elimination screen:", error);
      this.game.ui.showNotification("You have been eliminated from the game", "error");
      this.game.ui.showScreen("eliminationScreen");
    }
  }

  async showResults(): Promise<void> {
    try {
      this.game.overlays.showInteractiveResultsLoading();

      const response = await this.game.api.getResults(this.game.state.sessionCode);

      this.game.overlays.hide();

      const resultsContainer = el("resultsContainer");
      const summaryElement = el("resultsSummary");

      if (resultsContainer) resultsContainer.innerHTML = "";

      if (summaryElement && response.survivors !== undefined && response.eliminated !== undefined) {
        summaryElement.innerHTML = resultsSummaryHtml(response);
      }

      if (!response.results || response.results.length === 0) {
        console.warn("No results received from API");
        this.showMockResults();
        this.game.ui.showNotification("No results available - showing placeholder", "warning");
        return;
      }

      response.results.forEach((result: AnyRecord, index: number) => {
        this.game.timers.setTimeout(() => {
          if (!resultsContainer) return;
          resultsContainer.insertAdjacentHTML("beforeend", resultCardHtml(result, index));
        }, index * 800);
      });

      this.game.ui.showScreen("resultsScreen");
      soundEngine.playVictory();
      this.game.ui.showNotification("Final results revealed!", "success");
    } catch (error) {
      console.error("Failed to load results:", error);
      this.game.overlays.hide();

      this.showMockResults();
      this.game.ui.showNotification("Using backup results - some features may be limited", "warning");
    }
  }

  showMockResults(): void {
    const resultsContainer = el("resultsContainer");
    const summaryElement = el("resultsSummary");

    if (summaryElement) {
      summaryElement.innerHTML = mockResultsSummaryHtml();
    }

    if (resultsContainer) {
      resultsContainer.innerHTML = mockResultsHtml(this.game.state.playerName);
    }

    this.game.ui.showScreen("resultsScreen");
    soundEngine.playVictory();
  }
}
