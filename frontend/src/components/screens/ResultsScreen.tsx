import { ScreenHead } from "@/components/ScreenHead";

/** Final results / verdict screen. */
export function ResultsScreen() {
  return (
    <div id="resultsScreen" className="screen">
      <div className="card panel-brackets fate-verdict">
        <div className="fate-sigil fate-sigil-verdict" aria-hidden="true">✟</div>
        <ScreenHead icon="📜" title="The Reckoning" sub="Every choice, weighed and judged." />
        <h2>The Final Verdict</h2>
        <div className="results-summary" id="resultsSummary">
          <p>Loading final results…</p>
        </div>

        <div id="resultsContainer">{/* Results will be populated here */}</div>

        <div className="controls">
          <button className="btn" id="playAgainBtn">
            Play Again
          </button>
          <button className="btn btn-secondary" id="newSessionBtn">
            New Session
          </button>
          <button className="btn btn-secondary" id="resultsLeaderboardBtn">
            🏆 Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
