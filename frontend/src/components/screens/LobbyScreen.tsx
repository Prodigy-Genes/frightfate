import { ScreenHead } from "@/components/ScreenHead";

/** Waiting room: session code, active + eliminated player lists. */
export function LobbyScreen() {
  return (
    <div id="lobbyScreen" className="screen">
      <div className="card panel-brackets">
        <ScreenHead icon="🩸" title="The Gathering" sub="Wait for the others… then the killing begins." />
        <h2>Game Lobby</h2>

        <div className="session-code" id="displaySessionCode" title="Click to copy invite link">
          ABC123
        </div>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <button className="btn btn-secondary btn-sm" id="copyInviteBtn">
            📋 Copy Invite Link
          </button>
        </div>

        <h3>Active Players</h3>
        <div className="players-list" id="activePlayersList">
          {/* Active players will be populated here */}
        </div>

        <div id="eliminatedSection" style={{ display: "none" }}>
          <h3 style={{ color: "#ff6b6b" }}>Eliminated Players</h3>
          <div className="players-list eliminated" id="eliminatedPlayersList">
            {/* Eliminated players will be populated here */}
          </div>
        </div>

        <div id="fateFeedSection" style={{ display: "none" }}>
          <h3 className="fate-feed-title">Fate Feed</h3>
          <div className="fate-feed" id="fateFeedList" aria-live="polite" />
        </div>

        <div className="controls">
          <button className="btn" id="startGameBtn">
            Start Game
          </button>
          <button className="btn btn-secondary" id="leaveLobbyBtn">
            Leave Session
          </button>
        </div>
      </div>
    </div>
  );
}
