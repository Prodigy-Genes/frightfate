import { soundEngine } from "../audio";
import { el } from "../dom";
import { narrator } from "../narrator";
import { applyTheme, THEMES } from "../themes";
import { getThemeDirection } from "../themeDirection";
import { ApiClient } from "./api";
import { LeaderboardController } from "./leaderboard";
import { OverlayManager } from "./overlays";
import { ResultsController } from "./results";
import { RoundController } from "./round";
import { SessionController } from "./session";
import { clearSession } from "./sessionStorage";
import { SocketManager } from "./socket";
import { createGameState } from "./state";
import type { GameState } from "./state";
import { TimerManager } from "./timer";
import { Timers } from "./timers";
import { UiManager } from "./ui";

/**
 * FrightFate game controller.
 * Faithful port of the original imperative main.js logic, now composed from
 * focused managers. `mount()` attaches the DOM listeners and `destroy()`
 * tears everything down.
 */
export class FrightFateGame {
  readonly apiBaseUrl: string;
  readonly wsBaseUrl: string;

  state: GameState = createGameState();
  timers = new Timers();

  api: ApiClient;
  ui: UiManager;
  overlays: OverlayManager;
  timer: TimerManager;
  socket: SocketManager;
  session: SessionController;
  round: RoundController;
  results: ResultsController;
  leaderboard: LeaderboardController;

  private globalKeydown?: (e: KeyboardEvent) => void;

  constructor() {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      (window.location.port === "5173" ? "http://localhost:8000" : window.location.origin);

    this.apiBaseUrl = apiBaseUrl;
    this.wsBaseUrl = apiBaseUrl.replace(/^http/, "ws");

    this.api = new ApiClient(apiBaseUrl);
    this.ui = new UiManager(this);
    this.overlays = new OverlayManager(this);
    this.timer = new TimerManager(this);
    this.socket = new SocketManager(this);
    this.session = new SessionController(this);
    this.round = new RoundController(this);
    this.results = new ResultsController(this);
    this.leaderboard = new LeaderboardController(this);

    // Apply the default world's design tokens before the first paint of state.
    applyTheme(this.state.currentTheme);
  }

  mount(): void {
    // Scripted-fallback transparency: whenever the backend answers with canned
    // content instead of the model, tell the player why instead of silently
    // downgrading (a stale-config outage once hid behind this exact silence).
    window.addEventListener("frightfate-fallback", (event) => {
      const { context, reason } = (event as CustomEvent<{ context: string; reason?: string }>).detail;
      const detail = reason ? ` — ${reason}` : "";
      this.ui.showNotification(
        `⚠️ ${context} served by the scripted fallback${detail}. The Fate Engine could not be reached; check the backend log.`,
        "warning"
      );
    });

    // First user interaction unblocks WebAudio on modern browsers
    const unlockAudio = () => {
      soundEngine.init();
      if (!soundEngine.isMuted && !soundEngine.activeTheme) {
        soundEngine.playThemeAmbience(this.state.currentTheme || "haunted_house");
      }
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
    document.addEventListener("click", unlockAudio);
    document.addEventListener("keydown", unlockAudio);

    this.ui.applyThemeDirection(this.state.currentTheme);

    el("createGameBtn")?.addEventListener("click", () => {
      soundEngine.playConfirm();
      void this.session.createGameSession();
    });

    el("joinGameBtn")?.addEventListener("click", () => {
      soundEngine.playSelect();
      this.ui.showScreen("joinScreen");
    });

    el("leaderboardBtn")?.addEventListener("click", () => {
      soundEngine.playSelect();
      void this.leaderboard.open();
    });

    el("leaderboardBackBtn")?.addEventListener("click", () => {
      soundEngine.playCancel();
      this.ui.showScreen("homeScreen");
    });

    el("joinSessionBtn")?.addEventListener("click", () => {
      soundEngine.playConfirm();
      void this.session.joinGameSession();
    });

    el("startGameBtn")?.addEventListener("click", () => {
      soundEngine.playConfirm();
      void this.round.startGame();
    });

    el("submitAnswerBtn")?.addEventListener("click", () => {
      soundEngine.playConfirm();
      void this.round.submitAnswer();
    });

    el("playAgainBtn")?.addEventListener("click", () => {
      soundEngine.playConfirm();
      void this.round.startGame();
    });

    el("backToHomeBtn")?.addEventListener("click", () => {
      soundEngine.playCancel();
      clearSession();
      this.ui.showScreen("homeScreen");
    });

    el("leaveLobbyBtn")?.addEventListener("click", () => {
      soundEngine.playCancel();
      clearSession();
      this.ui.showScreen("homeScreen");
    });

    el("watchOthersBtn")?.addEventListener("click", () => {
      soundEngine.playCancel();
      // Spectating means returning to the live room: reload the lobby so the
      // Fate Feed and player lists show the game's current state.
      if (this.state.sessionCode) {
        void this.session.loadLobby();
      } else {
        this.ui.showScreen("lobbyScreen");
      }
    });

    el("returnToLobbyBtn")?.addEventListener("click", () => {
      soundEngine.playCancel();
      clearSession();
      this.ui.showScreen("homeScreen");
    });

    el("newSessionBtn")?.addEventListener("click", () => {
      soundEngine.playCancel();
      clearSession();
      this.ui.showScreen("homeScreen");
    });

    el("resultsLeaderboardBtn")?.addEventListener("click", () => {
      soundEngine.playSelect();
      void this.leaderboard.open();
    });

    document.querySelectorAll(".btn, .theme-option, .session-code, .leaderboard-tab").forEach(
      (element) => {
        element.addEventListener("mouseenter", () => soundEngine.playHover());
      }
    );

    const themeOptions = Array.from(document.querySelectorAll<HTMLElement>(".theme-option"));
    themeOptions.forEach((option, index) => {
      option.addEventListener("click", () => {
        this.ui.selectTheme(option.dataset.theme as string);
      });
      option.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.ui.selectTheme(option.dataset.theme as string);
          return;
        }
        const direction = ["ArrowRight", "ArrowDown"].includes(event.key)
          ? 1
          : ["ArrowLeft", "ArrowUp"].includes(event.key)
            ? -1
            : 0;
        const targetIndex = event.key === "Home"
          ? 0
          : event.key === "End"
            ? themeOptions.length - 1
            : Math.max(0, Math.min(themeOptions.length - 1, index + direction));
        if (!direction && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const target = themeOptions[targetIndex];
        if (target) {
          this.ui.selectTheme(target.dataset.theme as string);
          target.focus();
        }
      });
    });

    const answerTextarea = el<HTMLTextAreaElement>("playerAnswer");
    if (answerTextarea) {
      const counterDiv = document.createElement("div");
      counterDiv.className = "character-counter";
      counterDiv.id = "characterCounter";
      answerTextarea.parentNode?.appendChild(counterDiv);

      answerTextarea.addEventListener("keydown", (e) => {
        if (!["Control", "Alt", "Shift", "Tab", "Escape"].includes(e.key)) {
          soundEngine.playTypewriter();
        }
      });

      answerTextarea.addEventListener("input", function (this: HTMLTextAreaElement) {
        const length = this.value.length;
        const counter = el("characterCounter");
        if (counter) {
          counter.textContent = `${length} characters`;
          counter.className = length > 500 ? "character-counter warning" : "character-counter";
        }
      });
    }

    el<HTMLInputElement>("sessionCode")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        soundEngine.playConfirm();
        void this.session.joinGameSession();
      }
    });

    el<HTMLInputElement>("playerName")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        soundEngine.playConfirm();
        void this.session.joinGameSession();
      }
    });

    answerTextarea?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        soundEngine.playConfirm();
        void this.round.submitAnswer();
      }
    });

    const volumeSlider = el<HTMLInputElement>("volumeSlider");
    if (volumeSlider) {
      volumeSlider.value = String(soundEngine.volume);
      volumeSlider.addEventListener("input", (e) => {
        soundEngine.setVolume(parseFloat((e.target as HTMLInputElement).value));
      });
    }

    const narrateBtn = el("narrateToggleBtn");
    if (narrateBtn) {
      this.updateNarrateButton(narrateBtn, narrator.isEnabled);
      if (!narrator.supported) {
        narrateBtn.style.display = "none";
      }
      narrateBtn.addEventListener("click", () => {
        const on = narrator.toggle();
        this.updateNarrateButton(narrateBtn, on);
        soundEngine.playSelect();
        if (on) {
          this.ui.showNotification("🎙️ The host will narrate your scenarios.", "info");
          // Re-narrate the scene currently on screen, if any.
          const s = this.state.currentScenario;
          if (s && el("gameScreen")?.classList.contains("active")) {
            narrator.speak([s.title, s.description].filter(Boolean).join(". "));
          }
        }
      });
    }

    const audioBtn = el("audioToggleBtn");
    if (audioBtn) {
      this.updateAudioButton(audioBtn, soundEngine.isMuted);
      audioBtn.addEventListener("click", () => {
        const isMuted = soundEngine.toggleMute();
        this.updateAudioButton(audioBtn, isMuted);
        soundEngine.playSelect();
      });
    }

    this.globalKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        (e.key === "m" || e.key === "M") &&
        target.tagName !== "TEXTAREA" &&
        target.tagName !== "INPUT"
      ) {
        const isMuted = soundEngine.toggleMute();
        if (audioBtn) this.updateAudioButton(audioBtn, isMuted);
        soundEngine.playSelect();
      }
      if (
        (e.key === "t" || e.key === "T") &&
        target.tagName !== "TEXTAREA" &&
        target.tagName !== "INPUT" &&
        narrateBtn &&
        narrator.supported
      ) {
        const on = narrator.toggle();
        this.updateNarrateButton(narrateBtn, on);
        soundEngine.playSelect();
      }
    };
    window.addEventListener("keydown", this.globalKeydown);

    const copyInviteBtn = el("copyInviteBtn");
    if (copyInviteBtn) {
      copyInviteBtn.addEventListener("click", () => {
        if (!this.state.sessionCode) return;
        const inviteUrl = `${window.location.origin}${window.location.pathname}?code=${this.state.sessionCode}`;
        navigator.clipboard
          .writeText(inviteUrl)
          .then(() => {
            this.ui.showNotification("📋 Invite link copied to clipboard!", "success");
            soundEngine.playConfirm();
          })
          .catch(() => {
            prompt("Copy this invite link:", inviteUrl);
          });
      });
    }

    const urlParams = new URLSearchParams(window.location.search);

    // Session recovery: a refresh mid-game used to orphan the player's seat.
    // If sessionStorage still holds a live identity, resume into the lobby
    // before any deep-link join flow can interfere. Fire-and-forget: the
    // home screen remains usable while the check runs.
    void this.session.tryRecoverSession().then((recovered) => {
      if (recovered && (joinCode || urlParams.get("join"))) {
        // A deep-link join should win over recovery only if the user confirms;
        // for now the recovered lobby stands and the code stays in the URL.
        console.log("Session recovered — ignoring join deep-link for", urlParams.get("code") || urlParams.get("join"));
      }
    });

    const joinCode = urlParams.get("code") || urlParams.get("join");
    if (joinCode && joinCode.length === 6) {
      const sessionCodeInput = el<HTMLInputElement>("sessionCode");
      if (sessionCodeInput) {
        sessionCodeInput.value = joinCode.toUpperCase();
        this.ui.showScreen("joinScreen");
        this.ui.showNotification(
          `Session code ${joinCode.toUpperCase()} loaded! Enter your name to join.`,
          "info"
        );
      }
    }

    // Deep-link / persisted theme: ?theme= wins over the saved preference.
    const themeParam = urlParams.get("theme");
    const storedTheme = this.readStoredTheme();
    const initialTheme =
      themeParam && THEMES.some((t) => t.id === themeParam)
        ? themeParam
        : storedTheme && THEMES.some((t) => t.id === storedTheme)
          ? storedTheme
          : null;
    if (initialTheme && initialTheme !== this.state.currentTheme) {
      // Apply silently (no UI sound — the player hasn't interacted yet).
      this.state.currentTheme = initialTheme;
      applyTheme(initialTheme);
      this.ui.applyThemeDirection(initialTheme);
      window.dispatchEvent(new Event("frightfate-theme-change"));
      document.querySelectorAll<HTMLElement>(".theme-option").forEach((option) => {
        const selected = option.dataset.theme === initialTheme;
        option.classList.toggle("selected", selected);
        option.setAttribute("aria-checked", String(selected));
        option.tabIndex = selected ? 0 : -1;
      });
    }
  }

  private readStoredTheme(): string | null {
    try {
      return localStorage.getItem("frightfate_theme");
    } catch {
      return null;
    }
  }

  destroy(): void {
    this.timer.clear();
    this.timers.clearAll();
    this.socket.disconnect();
    if (this.globalKeydown) window.removeEventListener("keydown", this.globalKeydown);
    narrator.stop();
    soundEngine.stopAmbience();
    soundEngine.stopHeartbeat();
  }

  private updateAudioButton(btn: HTMLElement, isMuted: boolean): void {
    btn.textContent = isMuted ? "×))" : "◖))";
    btn.title = isMuted ? "Audio OFF — click to turn on (M)" : "Audio ON — click to mute (M)";
    btn.setAttribute("aria-label", isMuted ? "Turn sound on" : "Mute sound");
  }

  private updateNarrateButton(btn: HTMLElement, on: boolean): void {
    btn.textContent = on ? "◖)) Live" : "◖)) Narrate";
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.title = on
      ? "Host narration ON — click to silence (T)"
      : "Have the host narrate scenarios aloud (T)";
  }
}
