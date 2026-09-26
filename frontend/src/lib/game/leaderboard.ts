import { el } from "../dom";
import { getTheme, THEMES } from "../themes";
import type { LeaderboardEntry } from "../types";
import type { FrightFateGame } from "./controller";
import { escapeHtml, leaderboardRowHtml } from "./templates";

/**
 * Loads and renders the high-score table. There are no accounts, so entries
 * are name+score snapshots recorded by the backend when a session ends.
 */
export class LeaderboardController {
  /** `null` means "all themes". */
  private activeTheme: string | null = null;

  constructor(private game: FrightFateGame) {}

  async open(): Promise<void> {
    this.game.ui.showScreen("leaderboardScreen");
    this.renderTabs();
    await this.load(this.activeTheme);
  }

  /** (Re)build the filter tabs: All + one per theme. */
  private renderTabs(): void {
    const container = el("leaderboardTabs");
    if (!container) return;

    const tabs: { id: string | null; label: string; icon: string }[] = [
      { id: null, label: "All Worlds", icon: "🩸" },
      ...THEMES.map((theme) => ({ id: theme.id, label: theme.name, icon: theme.icon })),
    ];

    container.innerHTML = tabs
      .map((tab) => {
        const isActive = tab.id === this.activeTheme;
        return `<button class="leaderboard-tab${isActive ? " active" : ""}" data-board-theme="${
          tab.id ?? "all"
        }">${tab.icon} ${escapeHtml(tab.label)}</button>`;
      })
      .join("");

    container.querySelectorAll<HTMLElement>("[data-board-theme]").forEach((button) => {
      button.addEventListener("click", () => {
        const raw = button.dataset.boardTheme;
        void this.load(raw && raw !== "all" ? raw : null);
      });
    });
  }

  async load(theme: string | null): Promise<void> {
    this.activeTheme = theme;
    this.renderTabs();

    const list = el("leaderboardList");
    if (list) {
      list.innerHTML = '<div class="leaderboard-empty">Summoning the records…</div>';
    }

    try {
      const response = await this.game.api.getLeaderboard(theme, 25);
      this.render((response.entries || []) as LeaderboardEntry[]);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
      if (list) {
        list.innerHTML =
          '<div class="leaderboard-empty">The crypt is silent — scores could not be retrieved.</div>';
      }
    }
  }

  private render(entries: LeaderboardEntry[]): void {
    const list = el("leaderboardList");
    if (!list) return;

    if (entries.length === 0) {
      list.innerHTML =
        '<div class="leaderboard-empty">No souls have been recorded yet. Finish a game to claim the first spot.</div>';
      return;
    }

    list.innerHTML = entries
      .map((entry) => leaderboardRowHtml(entry, getTheme(entry.theme).name))
      .join("");
  }
}
