/** Pure HTML builders for dynamically injected UI, kept out of the controllers. */
import type { AnyRecord, LeaderboardEntry } from "../types";

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
  return `
    <span>${message}</span>
    <button class="notification-close">&times;</button>
  `;
}

export function loadingOverlayHtml(message: string, showProgress: boolean): string {
  return `
    <div class="loading-content">
      <div class="loading-spinner large"></div>
      <div class="loading-message" id="loadingMessage">${message}</div>
      ${showProgress ? '<div class="loading-progress" id="loadingProgress"></div>' : ""}
    </div>
  `;
}

export function progressBarHtml(progress: number): string {
  return `
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progress}%"></div>
          </div>
          <div class="progress-text">${Math.round(progress)}% complete</div>
        `;
}

export function interactiveLoadingHtml(message: string): string {
  return `
    <div class="loading-content">
      <div class="loading-spinner large"></div>
      <div class="loading-message" id="loadingMessage">${message}</div>
      
      <div class="analysis-preview" id="analysisPreview">
        <h4>AI is analyzing your choice...</h4>
        <div class="key-words">
          <span>Detected keywords:</span>
          <div class="word-tags" id="wordTags"></div>
        </div>
        <div class="survival-meter">
          <div class="meter-label">Survival Probability</div>
          <div class="meter-bar">
            <div class="meter-fill" id="meterFill"></div>
          </div>
          <div class="meter-text" id="meterText">Calculating...</div>
        </div>
      </div>
      
      <div class="entertainment-section" id="entertainmentSection">
        <div class="horror-facts">
          <h4>While you wait... Horror Survival Tip:</h4>
          <p id="horrorTip">Loading...</p>
        </div>
      </div>
      
      <div class="loading-time">
        <span id="loadingTimer">00:00</span>
      </div>
    </div>
  `;
}

export function resultsLoadingHtml(): string {
  return `
    <div class="loading-content">
      <div class="loading-spinner large"></div>
      <div class="loading-message" id="loadingMessage">Generating final results...</div>
      
      <div class="results-preview">
        <h4>Determining Final Fates...</h4>
        <div class="fate-calculator">
          <div class="calculating-item" id="calc1">Analyzing survival scores...</div>
          <div class="calculating-item" id="calc2">Ranking players...</div>
          <div class="calculating-item" id="calc3">Crafting death narratives...</div>
          <div class="calculating-item" id="calc4">Writing final verdicts...</div>
        </div>
        
        <div class="suspense-build">
          <div class="suspense-text" id="suspenseText">Who will survive?</div>
        </div>
      </div>
      
      <div class="loading-time">
        <span id="loadingTimer">00:00</span>
      </div>
    </div>
  `;
}

export function alternativesHtml(alternatives: string[]): string {
  if (alternatives.length === 0) return "";
  return `
        <div class="better-alternatives-box">
          <div class="alternatives-header">
            <span class="alternatives-icon">💡</span>
            <span class="alternatives-title">Optimal Survival Alternatives</span>
          </div>
          <p class="alternatives-subtitle">Better tactics you could have used instead:</p>
          <ul class="alternatives-list">
            ${alternatives.map((alt) => `<li>${alt}</li>`).join("")}
          </ul>
        </div>
      `;
}

export interface ScoreRevealOptions {
  /** CSS modifier class for the classification badge (falls back to "neutral"). */
  classificationClass: string;
  /** Visible classification label (falls back to "EVALUATED"). */
  classificationText: string;
  analysis: string;
  storyProgression?: string;
  alternativesHtml: string;
  buttonLabel: string;
  /** Short in-character line from the world's host voice. */
  hostVerdict?: string;
  /** Only present on a fatal answer. */
  deathEpitaph?: string | null;
}

export function scoreRevealCardHtml(opts: ScoreRevealOptions): string {
  const {
    classificationClass,
    classificationText,
    analysis,
    storyProgression,
    alternativesHtml: alts,
    buttonLabel,
    hostVerdict,
    deathEpitaph,
  } = opts;
  return `
      <div class="score-reveal-card">
        <div class="score-animation">
          <div class="score-number" id="animatedScore">0</div>
          <div class="score-label">Survival Score</div>
        </div>
        <div class="score-classification ${classificationClass}" id="scoreClass">
          ${classificationText.toUpperCase()}
        </div>
        ${
          hostVerdict
            ? `<div class="host-verdict" id="hostVerdict"><span class="host-verdict-mark">⌖</span>${escapeHtml(
                hostVerdict
              )}</div>`
            : ""
        }
        <div class="score-analysis" id="scoreAnalysisText">
          ${analysis}
        </div>
        ${
          storyProgression
            ? `<div class="score-progression"><strong>Outcome:</strong> ${storyProgression}</div>`
            : ""
        }
        ${alts}
        ${
          deathEpitaph
            ? `<div class="death-epitaph" id="deathEpitaph">${escapeHtml(deathEpitaph)}</div>`
            : ""
        }
        <button class="btn btn-primary next-scenario-btn" id="nextScenarioBtn">${buttonLabel}</button>
        <div class="next-btn-hint">Take your time to read. Click when you are ready to continue (or press Enter / Space)</div>
      </div>
    `;
}

export function eliminationHtml(deathNarrative: AnyRecord | null): {
  narrative: string;
  analysis: string;
} {
  if (deathNarrative) {
    const epitaph = deathNarrative.death_epitaph
      ? `<div class="death-epitaph">${escapeHtml(deathNarrative.death_epitaph)}</div>`
      : "";
    const verdict = deathNarrative.host_verdict
      ? `<div class="host-verdict"><span class="host-verdict-mark">⌖</span>${escapeHtml(
          deathNarrative.host_verdict
        )}</div>`
      : "";

    return {
      narrative: `
        <h3>${escapeHtml(deathNarrative.fate_title || "ELIMINATED")}</h3>
        <p><strong>${escapeHtml(deathNarrative.death_narrative)}</strong></p>
        ${epitaph}
      `,
      analysis: `
        <h4>The Host's Verdict:</h4>
        <p>${escapeHtml(
          deathNarrative.death_analysis ||
            deathNarrative.survival_analysis ||
            "Your choices led to elimination."
        )}</p>
        ${verdict}
      `,
    };
  }

  return {
    narrative: `
        <h3>ELIMINATED</h3>
        <p><strong>Your poor decisions have caught up with you, leading to your untimely elimination from the game.</strong></p>
      `,
    analysis: `
        <h4>Analysis:</h4>
        <p>Your survival instincts were not enough to keep you alive in this horror scenario.</p>
      `,
  };
}

export function resultsSummaryHtml(response: AnyRecord): string {
  return `
        <p><strong>Final Statistics:</strong></p>
        <p>Survivors: ${response.survivors} | Eliminated: ${response.eliminated} | Total Players: ${response.total_players}</p>
      `;
}

export function resultCardHtml(result: AnyRecord, index: number): string {
  const isEliminated = result.eliminated || false;
  const survived = result.survived || false;
  const className = `result-card ${survived ? "survivor" : "victim"} animate-in`;

  const verdict = result.host_verdict
    ? `<div class="host-verdict"><span class="host-verdict-mark">⌖</span>${escapeHtml(
        result.host_verdict
      )}</div>`
    : "";

  const inner = isEliminated
    ? `
            <div class="result-name">${escapeHtml(result.player_name)}</div>
            <div class="result-fate">${escapeHtml(result.fate_title || "ELIMINATED")}</div>
            <div class="result-narrative">${escapeHtml(
              result.death_narrative || result.narrative || "Eliminated from the game"
            )}</div>
            <div class="result-analysis">${escapeHtml(
              result.death_analysis || result.survival_analysis || "Poor survival choices led to elimination"
            )}</div>
            ${verdict}
          `
    : `
            <div class="rank-number">${result.rank || index + 1}</div>
            <div class="result-name">${escapeHtml(result.player_name)}</div>
            <div class="result-fate">${escapeHtml(result.fate_title || "Unknown Fate")}</div>
            <div class="result-narrative">${escapeHtml(result.narrative || "No story available")}</div>
            <div class="result-analysis">${escapeHtml(
              result.analysis || result.survival_analysis || "No analysis available"
            )}</div>
            ${verdict}
          `;

  return `<div class="${className}">${inner}</div>`;
}

export function mockResultsHtml(playerName: string): string {
  return `
    <div class="result-card survivor">
      <div class="rank-number">1</div>
      <div class="result-name">${playerName}</div>
      <div class="result-fate">SOLE SURVIVOR</div>
      <div class="result-narrative">Your cautious and logical approach kept you alive when others might have perished. You avoided unnecessary risks and made smart decisions under pressure.</div>
      <div class="result-analysis">Your survival instincts and decision-making skills proved superior in this horror scenario.</div>
    </div>
  `;
}

export function mockResultsSummaryHtml(): string {
  return `
    <p><strong>Final Statistics:</strong></p>
    <p>Survivors: 1 | Eliminated: 0 | Total Players: 1</p>
  `;
}

/** In-character glyph for a shared Fate Feed event. */
function feedEventIcon(type: string): string {
  switch (type) {
    case "player_joined": return "🚪";
    case "player_left": return "🌫️";
    case "player_eliminated": return "💀";
    case "survived": return "✟";
    case "session_created": return "🕯️";
    default: return "⌖";
  }
}

export function feedEventHtml(event: AnyRecord): string {
  const icon = feedEventIcon(String(event.type || ""));
  const time = new Date((event.ts || 0) * 1000);
  const stamp = Number.isFinite(time.getTime()) && event.ts
    ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  return `
    <div class="feed-event feed-${escapeHtml(event.type || "unknown")}">
      <span class="feed-icon" aria-hidden="true">${icon}</span>
      <span class="feed-message">${escapeHtml(event.message)}</span>
      ${stamp ? `<span class="feed-time">${stamp}</span>` : ""}
    </div>
  `;
}

export function playerItemHtml(player: AnyRecord): string {
  return `
          <span>${escapeHtml(player.name)}</span>
          <span class="player-status ${player.is_ready ? "ready" : "waiting"}">
            ${player.is_ready ? "Ready" : "Waiting"}
          </span>
        `;
}

export function eliminatedPlayerItemHtml(player: AnyRecord): string {
  return `
          <span>${escapeHtml(player.name)}</span>
          <span style="color: #ff6b6b;">Eliminated: ${escapeHtml(player.elimination_reason)}</span>
        `;
}

export function leaderboardRowHtml(entry: LeaderboardEntry, themeLabel: string): string {
  const podiumClass = entry.rank <= 3 ? ` podium-${entry.rank}` : "";
  const medal = ["🥇", "🥈", "🥉"][entry.rank - 1] ?? String(entry.rank);
  const fateBadge = entry.survived
    ? '<span class="leaderboard-badge survived">Survived</span>'
    : '<span class="leaderboard-badge dead">Eliminated</span>';

  return `
    <div class="leaderboard-row${podiumClass}">
      <div class="leaderboard-rank">${medal}</div>
      <div>
        <div class="leaderboard-name">${escapeHtml(entry.player_name)}</div>
        <div class="leaderboard-meta">
          <span class="leaderboard-badge">${escapeHtml(themeLabel)}</span>
          ${fateBadge}
        </div>
      </div>
      <div class="leaderboard-score">${escapeHtml(entry.score)}</div>
    </div>
  `;
}
