import { soundEngine } from "../audio";
import { el, inputValue } from "../dom";
import { narrator } from "../narrator";
import { calculateAdaptiveTimeLimit } from "../time";
import type { AnyRecord, Scenario } from "../types";
import { getThemeDirection } from "../themeDirection";
import { validateAnswer } from "../validation";
import type { FrightFateGame } from "./controller";

/** Drives an active game: scenarios, answers, scoring and elimination. */
export class RoundController {
  constructor(private game: FrightFateGame) {}

  async handleTimeUp(): Promise<void> {
    this.game.timer.clear();

    const answer = inputValue("playerAnswer").trim();

    if (!answer) {
      console.log("Time up with no answer - instant elimination");
      await this.forceElimination("Failed to provide any answer within time limit");
    } else if (answer.length < 10) {
      console.log("Time up with insufficient answer - instant elimination");
      await this.forceElimination("Answer too brief and rushed - shows poor survival instincts");
    } else {
      console.log("Time up - submitting rushed answer");
      await this.submitRushedAnswer(answer);
    }
  }

  async startGame(): Promise<void> {
    this.game.ui.showLoadingButton("startGameBtn", "Starting Game...");
    if (this.game.socket.isOpen()) {
      this.game.socket.send({
        type: "game_started",
        session_code: this.game.state.sessionCode,
      });
    }
    await this.runStartGame();
  }

  async runStartGame(): Promise<void> {
    // The backend echoes "game_started" back to the host's own socket, so the
    // click handler and the WS handler can both call this concurrently.
    // Re-entry would fetch/display the scenario twice, so bail on the echo.
    if (this.game.state.isStartingGame) return;
    this.game.state.isStartingGame = true;
    try {
      if (await this.game.session.checkPlayerElimination()) {
        await this.game.results.showEliminationScreen();
        this.game.ui.hideLoadingButton("startGameBtn", "Start Game");
        return;
      }

      this.game.state.currentQuestion = 1;
      this.game.state.playerChoices = [];

      await this.displayCurrentScenario();
      this.game.ui.showScreen("gameScreen");

      this.game.timer.start();

      this.game.ui.hideLoadingButton("startGameBtn", "Start Game");
    } catch (error: any) {
      this.game.ui.hideLoadingButton("startGameBtn", "Start Game");
      this.game.ui.showNotification(`Failed to start game: ${error.message}`, "error");
    } finally {
      this.game.state.isStartingGame = false;
    }
  }

  async displayCurrentScenario(): Promise<void> {
    try {
      console.log("Displaying scenario:", this.game.state.currentQuestion);

      const scenario = await this.loadDynamicScenario(this.game.state.currentQuestion);

      if (!scenario) {
        throw new Error("No scenario available");
      }

      this.game.state.currentScenario = scenario;

      soundEngine.playThemeAmbience(this.game.state.currentTheme || "haunted_house");
      const scenarioNumberEl = el("scenarioCount");
      if (scenarioNumberEl) {
        scenarioNumberEl.textContent = String(this.game.state.currentQuestion).padStart(2, "0");
      }

      const titleEl = el("scenarioTitle");
      if (titleEl) titleEl.textContent = scenario.title || `Trial ${this.game.state.currentQuestion}`;

      const desc = scenario.description || "";
      const dilemmaMatch = desc.match(/(What do you do\??)$/i);
      const descElement = el("scenarioDescription");
      if (descElement) {
        if (dilemmaMatch && dilemmaMatch.index !== undefined) {
          const bodyText = desc.slice(0, dilemmaMatch.index).trim();
          descElement.innerHTML = `${bodyText} <span class="dilemma-highlight">${dilemmaMatch[1]}</span>`;
        } else {
          descElement.textContent = desc;
        }
      }

      const storyContextElement = el("storyContext");
      if (storyContextElement && scenario.story_context) {
        storyContextElement.textContent = scenario.story_context;
        this.game.state.storyContext = scenario.story_context;
      }

      const consequenceElement = el("narrativeConsequence");
      if (consequenceElement) {
        if (this.game.state.currentQuestion > 1 && scenario.narrative_consequences) {
          const consequenceText = el("consequenceText");
          if (consequenceText) consequenceText.textContent = scenario.narrative_consequences;
          consequenceElement.style.display = "block";
        } else {
          consequenceElement.style.display = "none";
        }
      }

      const progress = (this.game.state.currentQuestion / this.game.state.totalQuestions) * 100;
      const progressFill = el("progressFill");
      if (progressFill) progressFill.style.width = `${progress}%`;
      const progressText = el("progressText");
      if (progressText) {
        progressText.textContent = `Question ${this.game.state.currentQuestion} of ${this.game.state.totalQuestions}`;
      }

      const timeLimit = calculateAdaptiveTimeLimit(scenario, this.game.state.playerChoices);
      this.game.state.currentTimeLimit = timeLimit;

      this.game.ui.showComplexityInfo(scenario, timeLimit);

      // Optional host narration: read the scene aloud in the host's cadence.
      if (narrator.isEnabled) {
        const spoken = [scenario.title, scenario.description]
          .filter(Boolean)
          .join(". ");
        narrator.speak(spoken);
      }

      this.game.timers.setTimeout(() => this.trackReadingProgress(), 500);

      console.log("Scenario displayed successfully");
    } catch (error) {
      console.error("Error displaying scenario:", error);
      this.game.ui.showNotification("Error loading scenario. Please try again.", "error");
    }
  }

  async submitAnswer(): Promise<void> {
    const answer = inputValue("playerAnswer").trim();
    const validation = validateAnswer(answer);

    if (!validation.isValid) {
      validation.errors.forEach((error) => {
        this.game.ui.showNotification(error, "error");
      });

      if (
        validation.errors.some(
          (error) =>
            error.includes("No answer provided") ||
            error.includes("low-effort") ||
            error.includes("spam")
        )
      ) {
        await this.forceElimination("Provided invalid or inappropriate answer");
        return;
      }
      return;
    }

    validation.warnings.forEach((warning) => {
      this.game.ui.showNotification(warning, "warning");
    });

    this.game.timer.clear();
    this.game.ui.showLoadingButton("submitAnswerBtn", "Analyzing...");
    this.game.overlays.showInteractiveLoading(
      getThemeDirection(this.game.state.currentTheme).analysisTitle,
      answer
    );

    try {
      const response = await this.game.api.submitAnswer({
        session_code: this.game.state.sessionCode,
        player_id: this.game.state.playerId,
        question_number: this.game.state.currentQuestion,
        answer_text: answer,
        scenario_title: this.game.state.currentScenario?.title || "",
        scenario_description: this.game.state.currentScenario?.description || "",
        scenario_survival_factors: this.game.state.currentScenario?.survival_factors || [],
        scenario_death_risk: this.game.state.currentScenario?.death_risk_level || "medium",
      });

      await this.processAnswerResponse(response);
    } catch (error: any) {
      console.error("Failed to submit answer:", error);
      this.game.overlays.hide();
      this.game.ui.hideLoadingButton("submitAnswerBtn", "Submit Answer");
      this.game.ui.showNotification(`Failed to submit answer: ${error.message}`, "error");

      this.game.timer.start();
    }
  }

  async submitRushedAnswer(answer: string): Promise<void> {
    this.game.ui.showLoadingButton("submitAnswerBtn", "Processing Rushed Answer...");
    this.game.overlays.showLoading("Analyzing your last-second desperate attempt...");

    try {
      const response = await this.game.api.submitAnswer({
        session_code: this.game.state.sessionCode,
        player_id: this.game.state.playerId,
        question_number: this.game.state.currentQuestion,
        answer_text: answer,
        is_rushed: true,
      });

      this.game.overlays.hide();

      const rushedPenalty = Math.max(0, (response.score || 50) - 30);
      response.score = rushedPenalty;
      response.analysis = `RUSHED ANSWER: ${
        response.analysis ||
        "Your panicked, last-second response shows poor decision-making under pressure."
      }`;

      if (rushedPenalty < 25 || Math.random() < 0.7) {
        response.instant_death = true;
        response.death_reason = "Rushed decision-making under time pressure led to fatal mistake";
      }

      await this.processAnswerResponse(response);
    } catch (error) {
      console.error("Failed to submit rushed answer:", error);
      this.game.overlays.hide();
      await this.forceElimination("Failed to submit answer in time due to technical issues");
    }
  }

  async processAnswerResponse(response: AnyRecord): Promise<void> {
    console.log("Answer submitted:", response);
    this.game.overlays.hide();

    this.game.state.playerChoices.push({
      question_number: this.game.state.currentQuestion,
      answer_text: response.answer_text || inputValue("playerAnswer").trim(),
      score: response.score,
      analysis: response.analysis,
      choice_classification: response.choice_classification,
    });

    await this.game.overlays.showScoreReveal(response);

    if (response.instant_death) {
      console.log("Player has been eliminated");
      this.game.state.isEliminated = true;
      this.game.state.eliminationReason = response.elimination_reason;

      this.game.ui.hideLoadingButton("submitAnswerBtn", "Submit Answer");
      await this.game.results.showEliminationScreen(response.death_narrative);
      return;
    }

    const answerEl = el<HTMLTextAreaElement>("playerAnswer");
    if (answerEl) answerEl.value = "";

    if (this.game.state.currentQuestion < this.game.state.totalQuestions) {
      this.game.state.currentQuestion++;
      console.log("Moving to question:", this.game.state.currentQuestion);

      this.game.overlays.showLoading(
        `Preparing scenario ${this.game.state.currentQuestion} based on your choices...`,
        true
      );

      this.game.timers.setTimeout(async () => {
        this.game.overlays.hide();
        await this.displayCurrentScenario();
        this.game.ui.hideLoadingButton("submitAnswerBtn", "Submit Answer");
        this.game.timer.start();
      }, 2000);
    } else {
      console.log("Game completed, showing results");
      this.game.ui.hideLoadingButton("submitAnswerBtn", "Submit Answer");
      await this.game.results.showResults();
    }
  }

  async forceElimination(reason: string): Promise<void> {
    this.game.state.isEliminated = true;
    this.game.state.eliminationReason = reason;

    this.game.ui.showNotification("Time expired! You have been eliminated!", "error");

    const eliminationNarrative = {
      player_name: this.game.state.playerName,
      eliminated: true,
      death_narrative: `Time ran out and panic set in. ${reason}. In horror scenarios, hesitation and poor time management are often fatal mistakes.`,
      death_analysis:
        "Your inability to make timely decisions under pressure led to your elimination. Survival requires quick thinking and decisive action.",
      fate_title: "ELIMINATED - TIME EXPIRED",
      elimination_reason: reason,
    };

    await this.game.results.showEliminationScreen(eliminationNarrative);
  }

  private trackReadingProgress(): void {
    const scenarioDescription = el("scenarioDescription");
    const answerTextarea = el<HTMLTextAreaElement>("playerAnswer");

    if (!scenarioDescription || !answerTextarea) return;

    let hasStartedReading = false;
    let hasStartedTyping = false;
    let readingStartTime: number | null = null;

    scenarioDescription.addEventListener("focus", () => {
      if (!hasStartedReading) {
        hasStartedReading = true;
        readingStartTime = Date.now();
        console.log("Player started reading scenario");
      }
    });

    answerTextarea.addEventListener("focus", () => {
      if (!hasStartedTyping && hasStartedReading) {
        hasStartedTyping = true;
        const readingTime = (Date.now() - (readingStartTime as number)) / 1000;
        console.log(`Player took ${readingTime}s to read scenario`);
        this.showReadingFeedback(readingTime);
      }
    });

    answerTextarea.addEventListener("input", () => {
      if (!hasStartedTyping) {
        hasStartedTyping = true;
      }
    });
  }

  private showReadingFeedback(readingTime: number): void {
    console.log(`Player read scenario in ${readingTime}s`);
  }

  private async loadDynamicScenario(questionNumber: number): Promise<Scenario> {
    try {
      console.log(`Loading dynamic scenario ${questionNumber} for player ${this.game.state.playerId}`);

      if (questionNumber === 1) {
        this.game.overlays.showLoading("Crafting your opening horror scenario...", true);
      } else {
        this.game.overlays.showLoading(
          `Analyzing your ${questionNumber - 1} previous choices to craft scenario ${questionNumber}...`,
          true
        );
      }

      // Echo the previous round's world-state back so the simulation carries
      // injuries, blocked routes and threat awareness forward.
      const previousState =
        questionNumber > 1
          ? this.game.state.scenarios[questionNumber - 2]?.world_state ?? null
          : null;

      const scenario = await this.game.api.getScenario(
        this.game.state.sessionCode,
        questionNumber,
        this.game.state.playerId,
        previousState
      );

      this.game.overlays.hide();

      if (!scenario) {
        throw new Error("No scenario received");
      }

      this.game.state.scenarios[questionNumber - 1] = scenario;
      return scenario;
    } catch (error) {
      console.error("Failed to load dynamic scenario:", error);
      this.game.overlays.hide();

      const fallbackScenario: Scenario = {
        question_number: questionNumber,
        title: `Horror Challenge ${questionNumber}`,
        description: `Lethal danger closes in around you in this ${this.game.state.currentTheme.replace(
          "_",
          " "
        )}. You have mere seconds to act before your position is overrun. What do you do?`,
        survival_factors: ["quick_thinking", "survival_instinct"],
        story_context: `Round ${questionNumber} survival trial`,
        death_risk_level: questionNumber > 3 ? "high" : "medium",
        engine: "fallback",
      };

      this.game.state.scenarios[questionNumber - 1] = fallbackScenario;
      this.game.ui.showNotification("Using backup scenario - some features may be limited", "warning");
      return fallbackScenario;
    }
  }
}
