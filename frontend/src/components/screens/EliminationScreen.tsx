/** Shown when the player is eliminated. */
export function EliminationScreen() {
  return (
    <div id="eliminationScreen" className="screen">
      <div className="card elimination-card panel-brackets fate-doom">
        <div className="elimination-header">
          <div className="fate-sigil fate-sigil-doom" aria-hidden="true">☠</div>
          <h2>YOU HAVE BEEN ELIMINATED</h2>
          <p className="elimination-subtitle">Your poor choices have sealed your fate…</p>
        </div>

        <div className="elimination-content" id="eliminationContent">
          <div className="death-narrative" id="deathNarrative">
            {/* Death narrative will be populated here */}
          </div>

          <div className="elimination-analysis" id="eliminationAnalysis">
            {/* Analysis will be populated here */}
          </div>
        </div>

        <div className="controls">
          <button className="btn btn-secondary" id="watchOthersBtn" title="Return to the room — the Fate Feed shows how the story unfolds">
            Watch Other Players
          </button>
          <button className="btn" id="returnToLobbyBtn">
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
