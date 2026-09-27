/** Pure HTML builders for dynamically injected UI, kept out of the controllers. */
import type { AnyRecord, LeaderboardEntry } from "../types";
import { getTheme, THEMES } from "../themes";
import { getThemeDirection } from "../themeDirection";

/** Escape untrusted strings (player names, AI text) before innerHTML injection. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function notificationHtml(message: string): string {
  return `<span>${message}</span><button class="notification-close">&times;</button>`;
}

export function loadingOverlayHtml(message: string, showProgress: boolean): string {
  return `<div class="loading-content"><div class="loading-spinner large"></div><div class="loading-message" id="loadingMessage">${message}</div>${showProgress ? '<div class="loading-progress" id="loadingProgress"></div>' : ""}</div>`;
}

export function progressBarHtml(progress: number): string {
  return `<div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${progress}%"></div></div><div class="progress-text">${Math.round(progress)}% complete</div>`;
}

export function interactiveLoadingHtml(message: string, themeId = "haunted_house", answer = ""): string {
  const theme = getTheme(themeId);
  const direction = getThemeDirection(themeId);
  const currentQuestion = document.getElementById("progressText")?.textContent || "SURVIVAL LOG";
  return `
    <div class="analysis-content" style="--analysis-accent:${theme.palette.accent};--analysis-bg:${theme.palette.bg1};--analysis-accent-rgb:${theme.palette.accentRgb.join(" ")}">
      <div class="analysis-transmission"><span>INCOMING REVIEW / ${escapeHtml(currentQuestion)}</span><span>${escapeHtml(theme.name.toUpperCase())}</span></div>
      <div class="analysis-world-plate"><svg viewBox="0 0 640 340" aria-hidden="true"><use href="#world-plate-source-${escapeHtml(themeId)}" /></svg><span>${escapeHtml(direction.analysisMetric.toUpperCase())}</span></div>
      <div class="analysis-host"><span class="analysis-host-seal">${escapeHtml(theme.icon)}</span><div><span class="analysis-host-label">THE WORLD IS LISTENING</span><h2>${escapeHtml(direction.analysisTitle)}</h2></div></div>
      <div class="analysis-preview" id="analysisPreview">
        <h4>${escapeHtml(direction.analysisHeading)}</h4>
        <div class="analysis-evidence"><span>YOUR LAST TRANSMISSION</span><blockquote>“${escapeHtml(answer)}”</blockquote></div>
        <div class="key-words"><span>Recovered words / intent fragments</span><div class="word-tags" id="wordTags"></div></div>
        <div class="survival-meter"><div class="meter-label">${escapeHtml(direction.analysisMetric)}</div><div class="meter-bar"><div class="meter-fill" id="meterFill"></div></div><div class="meter-text" id="meterText">Reading the signs…</div></div>
      </div>
      <div class="analysis-tip"><span class="micro-label">${escapeHtml(direction.analysisTipHeading)}</span><p id="horrorTip">Listening…</p></div>
      <div class="analysis-status"><span class="analysis-pulse"></span><span id="loadingMessage">${escapeHtml(message)}</span><span class="loading-time"><span id="loadingTimer">00:00</span></span></div>
      <p class="analysis-closing">${escapeHtml(direction.analysisClosing)}</p>
    </div>`;
}

export function resultsLoadingHtml(themeId = "haunted_house"): string {
  const theme = getTheme(themeId);
  const direction = getThemeDirection(themeId);
  return `
    <div class="analysis-content results-analysis-content" style="--analysis-accent:${theme.palette.accent};--analysis-bg:${theme.palette.bg1};--analysis-accent-rgb:${theme.palette.accentRgb.join(" ")}">
      <div class="analysis-transmission"><span>FINAL REVIEW / ALL WITNESSES</span><span>${escapeHtml(theme.name.toUpperCase())}</span></div>
      <div class="analysis-world-plate"><svg viewBox="0 0 640 340" aria-hidden="true"><use href="#world-plate-source-${escapeHtml(themeId)}" /></svg><span>${escapeHtml(direction.boardTitle.toUpperCase())}</span></div>
      <div class="analysis-host"><span class="analysis-host-seal">${escapeHtml(theme.icon)}</span><div><span class="analysis-host-label">LAST ENTRY / ${escapeHtml(theme.soundtrack.toUpperCase())}</span><h2>${escapeHtml(direction.resultsTitle)}</h2></div></div>
      <div class="results-preview"><h4>${escapeHtml(direction.resultsSub)}</h4><div class="fate-calculator">
        <div class="calculating-item" id="calc1">Gathering final signal traces…</div>
        <div class="calculating-item" id="calc2">Ordering the names by survival…</div>
        <div class="calculating-item" id="calc3">Writing what happened to the lost…</div>
        <div class="calculating-item" id="calc4">Filing the last witness…</div>
      </div><div class="suspense-build"><div class="suspense-text" id="suspenseText">${escapeHtml(direction.analysisClosing)}</div></div></div>
      <div class="analysis-status"><span class="analysis-pulse"></span><span id="loadingMessage">Consulting the last record…</span><span class="loading-time"><span id="loadingTimer">00:00</span></span></div>
    </div>`;
}

export function alternativesHtml(alternatives: string[]): string {
  if (alternatives.length === 0) return "";
  return `<div class="better-alternatives-box"><div class="alternatives-header"><span class="alternatives-icon">✳</span><span class="alternatives-title">A different possible path</span></div><p class="alternatives-subtitle">If you could send another version of yourself:</p><ul class="alternatives-list">${alternatives.map((alt) => `<li>${escapeHtml(alt)}</li>`).join("")}</ul></div>`;
}

export interface ScoreRevealOptions {
  classificationClass: string;
  classificationText: string;
  analysis: string;
  storyProgression?: string;
  alternativesHtml: string;
  buttonLabel: string;
  hostVerdict?: string;
  deathEpitaph?: string | null;
}

export function scoreRevealCardHtml(opts: ScoreRevealOptions): string {
  const { classificationClass, classificationText, analysis, storyProgression, alternativesHtml: alts, buttonLabel, hostVerdict, deathEpitaph } = opts;
  return `<div class="score-reveal-card"><div class="score-animation"><div class="score-number" id="animatedScore">0</div><div class="score-label">Survival Score</div></div><div class="score-classification ${classificationClass}" id="scoreClass">${escapeHtml(classificationText.toUpperCase())}</div>${hostVerdict ? `<div class="host-verdict" id="hostVerdict"><span class="host-verdict-mark">⌖</span>${escapeHtml(hostVerdict)}</div>` : ""}<div class="score-analysis" id="scoreAnalysisText">${escapeHtml(analysis)}</div>${storyProgression ? `<div class="score-progression"><strong>Outcome:</strong> ${escapeHtml(storyProgression)}</div>` : ""}${alts}${deathEpitaph ? `<div class="death-epitaph" id="deathEpitaph">${escapeHtml(deathEpitaph)}</div>` : ""}<button class="btn btn-primary next-scenario-btn" id="nextScenarioBtn">${escapeHtml(buttonLabel)}</button><div class="next-btn-hint">Take your time to read. Click when you are ready to continue (or press Enter / Space)</div></div>`;
}

export function eliminationHtml(deathNarrative: AnyRecord | null): { narrative: string; analysis: string } {
  if (deathNarrative) {
    const epitaph = deathNarrative.death_epitaph ? `<div class="death-epitaph">${escapeHtml(deathNarrative.death_epitaph)}</div>` : "";
    const verdict = deathNarrative.host_verdict ? `<div class="host-verdict"><span class="host-verdict-mark">⌖</span>${escapeHtml(deathNarrative.host_verdict)}</div>` : "";
    return {
      narrative: `<h3>${escapeHtml(deathNarrative.fate_title || "ELIMINATED")}</h3><p><strong>${escapeHtml(deathNarrative.death_narrative)}</strong></p>${epitaph}`,
      analysis: `<h4>The Host's Verdict:</h4><p>${escapeHtml(deathNarrative.death_analysis || deathNarrative.survival_analysis || "Your choices led to elimination.")}</p>${verdict}`,
    };
  }
  return {
    narrative: `<h3>ELIMINATED</h3><p><strong>Your poor decisions have caught up with you, leading to your untimely elimination from the game.</strong></p>`,
    analysis: `<h4>Analysis:</h4><p>Your survival instincts were not enough to keep you alive in this horror scenario.</p>`,
  };
}

export function resultsSummaryHtml(response: AnyRecord): string {
  return `<p><strong>Final Statistics:</strong></p><p>Survivors: ${response.survivors} | Eliminated: ${response.eliminated} | Total Players: ${response.total_players}</p>`;
}

export function resultCardHtml(result: AnyRecord, index: number): string {
  const isEliminated = result.eliminated || false;
  const survived = result.survived || false;
  const className = `result-card ${survived ? "survivor" : "victim"} animate-in`;
  const verdict = result.host_verdict ? `<div class="host-verdict"><span class="host-verdict-mark">⌖</span>${escapeHtml(result.host_verdict)}</div>` : "";
  const inner = isEliminated
    ? `<div class="result-name">${escapeHtml(result.player_name)}</div><div class="result-fate">${escapeHtml(result.fate_title || "ELIMINATED")}</div><div class="result-narrative">${escapeHtml(result.death_narrative || result.narrative || "Eliminated from the game")}</div><div class="result-analysis">${escapeHtml(result.death_analysis || result.survival_analysis || "Poor survival choices led to elimination")}</div>${verdict}`
    : `<div class="rank-number">${escapeHtml(result.rank || index + 1)}</div><div class="result-name">${escapeHtml(result.player_name)}</div><div class="result-fate">${escapeHtml(result.fate_title || "Unknown Fate")}</div><div class="result-narrative">${escapeHtml(result.narrative || "No story available")}</div><div class="result-analysis">${escapeHtml(result.analysis || result.survival_analysis || "No analysis available")}</div>${verdict}`;
  return `<div class="${className}">${inner}</div>`;
}

export function mockResultsHtml(playerName: string): string {
  return `<div class="result-card survivor"><div class="rank-number">1</div><div class="result-name">${escapeHtml(playerName)}</div><div class="result-fate">SOLE SURVIVOR</div><div class="result-narrative">Your cautious and logical approach kept you alive when others might have perished. You avoided unnecessary risks and made smart decisions under pressure.</div><div class="result-analysis">Your survival instincts and decision-making skills proved superior in this horror scenario.</div></div>`;
}

export function mockResultsSummaryHtml(): string {
  return `<p><strong>Final Statistics:</strong></p><p>Survivors: 1 | Eliminated: 0 | Total Players: 1</p>`;
}

export function feedEventHtml(event: AnyRecord): string {
  const icons: Record<string, string> = { player_joined: "↗", player_left: "◌", player_eliminated: "✕", survived: "✳", session_created: "⌁" };
  const icon = icons[String(event.type || "")] || "⌖";
  const time = new Date((event.ts || 0) * 1000);
  const stamp = Number.isFinite(time.getTime()) && event.ts ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  return `<div class="feed-event feed-${escapeHtml(event.type || "unknown")}"><span class="feed-icon" aria-hidden="true">${icon}</span><span class="feed-message">${escapeHtml(event.message)}</span>${stamp ? `<span class="feed-time">${stamp}</span>` : ""}</div>`;
}

export function playerItemHtml(player: AnyRecord): string {
  return `<span>${escapeHtml(player.name)}</span><span class="player-status ${player.is_ready ? "ready" : "waiting"}">${player.is_ready ? "Ready" : "Waiting"}</span>`;
}

export function eliminatedPlayerItemHtml(player: AnyRecord): string {
  return `<span>${escapeHtml(player.name)}</span><span class="player-status dead">Eliminated: ${escapeHtml(player.elimination_reason)}</span>`;
}

export function leaderboardRowHtml(entry: LeaderboardEntry, themeLabel: string): string {
  const podiumClass = entry.rank <= 3 ? ` podium-${entry.rank}` : "";
  const medal = ["I", "II", "III"][entry.rank - 1] ?? String(entry.rank).padStart(2, "0");
  const fateBadge = entry.survived ? '<span class="leaderboard-badge survived">SURVIVED</span>' : '<span class="leaderboard-badge dead">LOST</span>';
  return `<div class="leaderboard-row${podiumClass}"><div class="leaderboard-rank">${escapeHtml(medal)}</div><div><div class="leaderboard-name">${escapeHtml(entry.player_name)}</div><div class="leaderboard-meta"><span class="leaderboard-badge">${escapeHtml(themeLabel)}</span>${fateBadge}</div></div><div class="leaderboard-score">${escapeHtml(entry.score)}</div></div>`;
}

export function themeAnalysisTipHtml(tip: string): string {
  return escapeHtml(tip);
}
