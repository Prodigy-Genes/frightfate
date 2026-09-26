import { soundEngine } from "../audio";
import { el, inputValue } from "../dom";
import { promptName } from "@/components/NameModal";
import { applyTheme } from "../themes";
import type { AnyRecord } from "../types";
import type { FrightFateGame } from "./controller";
import { eliminatedPlayerItemHtml, feedEventHtml, playerItemHtml } from "./templates";

/** Session lifecycle: create, join, lobby rendering and elimination checks. */
export class SessionController {
  constructor(private game: FrightFateGame) {}

  async createGameSession(): Promise<void> {
    this.game.ui.showLoadingButton("createGameBtn", "Creating...");

    try {
      const response = await this.game.api.createSession(this.game.state.currentTheme);

      this.game.state.sessionCode = response.session_code;
      this.game.state.isGameHost = true;

      const playerName = await promptName();
      if (playerName && playerName.trim()) {
        await this.joinGameSession(response.session_code, playerName.trim());
      } else {
        throw new Error("Player name is required");
      }

      this.game.ui.hideLoadingButton("createGameBtn", "Create New Game");
      this.game.ui.showNotification("Game session created successfully!", "success");
    } catch (error: any) {
      this.game.ui.hideLoadingButton("createGameBtn", "Create New Game");
      this.game.ui.showNotification(`Failed to create game session: ${error.message}`, "error");
    }
  }

  async joinGameSession(sessionCode: string | null = null, playerName: string | null = null): Promise<void> {
    const code = sessionCode || inputValue("sessionCode").toUpperCase().trim();
    const name = playerName || inputValue("playerName").trim();

    if (!code || !name) {
      this.game.ui.showNotification("Please enter both session code and your name.", "warning");
      return;
    }

    if (code.length !== 6) {
      this.game.ui.showNotification("Session code must be 6 characters long.", "warning");
      return;
    }

    this.game.ui.showLoadingButton("joinSessionBtn", "Joining...");

    try {
      const response = await this.game.api.joinSession(code, name);

      this.game.state.sessionCode = code;
      this.game.state.playerId = response.player_id;
      this.game.state.playerName = name;

      this.game.socket.connect(code);
      await this.loadLobby();

      this.game.ui.hideLoadingButton("joinSessionBtn", "Join Session");
      this.game.ui.showNotification("Successfully joined the game!", "success");
    } catch (error: any) {
      this.game.ui.hideLoadingButton("joinSessionBtn", "Join Session");
      this.game.ui.showNotification(`Failed to join session: ${error.message}`, "error");
    }
  }

  async loadLobby(): Promise<void> {
    try {
      const session = await this.game.api.getSession(this.game.state.sessionCode);

      // Adopt the session's world so joiners see the host's chosen theme.
      if (session.theme && session.theme !== this.game.state.currentTheme) {
        this.game.state.currentTheme = session.theme;
        applyTheme(session.theme);
        soundEngine.playThemeAmbience(session.theme);
      }

      const codeEl = el("displaySessionCode");
      if (codeEl) codeEl.textContent = this.game.state.sessionCode;

      const activePlayersList = el("activePlayersList");
      if (activePlayersList) {
        activePlayersList.innerHTML = "";

        if (session.active_players && session.active_players.length > 0) {
          session.active_players.forEach((player: AnyRecord) => {
            const playerDiv = document.createElement("div");
            playerDiv.className = "player-item";
            playerDiv.innerHTML = playerItemHtml(player);
            activePlayersList.appendChild(playerDiv);
          });
        } else {
          activePlayersList.innerHTML = '<div class="no-players">No active players</div>';
        }
      }

      const eliminatedSection = el("eliminatedSection");
      const eliminatedPlayersList = el("eliminatedPlayersList");

      if (eliminatedSection && eliminatedPlayersList) {
        if (session.eliminated_players && session.eliminated_players.length > 0) {
          eliminatedSection.style.display = "block";
          eliminatedPlayersList.innerHTML = "";

          session.eliminated_players.forEach((player: AnyRecord) => {
            const playerDiv = document.createElement("div");
            playerDiv.className = "player-item";
            playerDiv.innerHTML = eliminatedPlayerItemHtml(player);
            eliminatedPlayersList.appendChild(playerDiv);
          });
        } else {
          eliminatedSection.style.display = "none";
        }
      }

      await this.refreshFateFeed();

      this.game.ui.showScreen("lobbyScreen");
    } catch {
      this.game.ui.showNotification("Failed to load lobby information.", "error");
    }
  }

  /**
   * Replay the shared Fate Feed (events the socket may have missed) into the
   * lobby panel. Called on lobby load; live events arrive via WebSocket.
   */
  async refreshFateFeed(): Promise<void> {
    if (!this.game.state.sessionCode) return;
    try {
      const code = this.game.state.sessionCode;
      const response = await this.game.api.getFateFeed(code, this.game.state.lastFeedSeq);
      for (const event of response.events || []) {
        this.appendFateFeedEvent(event);
      }
    } catch {
      // The feed is a garnish — never block the lobby on it.
    }
  }

  /** Append one feed event to the lobby panel (live or replayed). */
  appendFateFeedEvent(event: AnyRecord): void {
    if (!event || typeof event.seq !== "number") return;
    if (event.seq <= this.game.state.lastFeedSeq) return;
    this.game.state.lastFeedSeq = event.seq;

    const feedList = el("fateFeedList");
    const feedSection = el("fateFeedSection");
    if (!feedList || !feedSection) return;

    feedSection.style.display = "block";
    feedList.insertAdjacentHTML("beforeend", feedEventHtml(event));
    feedList.scrollTop = feedList.scrollHeight;
  }

  async checkPlayerElimination(): Promise<boolean> {
    try {
      const result = await this.game.api.checkElimination(
        this.game.state.sessionCode,
        this.game.state.playerId
      );

      if (result.is_eliminated) {
        this.game.state.isEliminated = true;
        this.game.state.eliminationReason = result.elimination_reason;
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking elimination:", error);
      return false;
    }
  }
}
