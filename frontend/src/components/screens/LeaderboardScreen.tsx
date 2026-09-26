import { ScreenHead } from "@/components/ScreenHead";

/** Global high-score table. No accounts — just names, worlds and scores. */
export function LeaderboardScreen() {
  return (
    <div id="leaderboardScreen" className="screen">
      <div className="card panel-brackets">
        <ScreenHead
          icon="🏆"
          title="Hall of the Fallen"
          sub="Every name the darkness has written down."
        />
        <h2>Leaderboard</h2>
        <p style={{ marginBottom: "8px", opacity: 0.85 }}>
          The highest survival scores across every nightmare world. Finish a run to carve your name
          into the crypt.
        </p>

        <div className="leaderboard-tabs" id="leaderboardTabs" />

        <div className="leaderboard-table" id="leaderboardList" />

        <div className="controls">
          <button className="btn btn-secondary" id="leaderboardBackBtn">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
