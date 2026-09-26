import { ScreenHead } from "@/components/ScreenHead";
import { ThemeSelector } from "@/components/ThemeSelector";

/** Landing screen: theme selection + create/join/leaderboard actions. */
export function HomeScreen() {
  return (
    <div id="homeScreen" className="screen active">
      <div className="card panel-brackets">
        <ScreenHead
          icon="🕯️"
          title="Survival Protocol"
          sub="Choose a world. Out-think the dark. Don't die first."
        />

        <h2>Welcome to the Ultimate Horror Survival Challenge</h2>
        <p style={{ margin: "18px 0", lineHeight: 1.65 }}>
          Face dynamic scenarios where your choices shape the story. Will you be the lone survivor,
          or will your poor decisions lead to an early grave? Each choice matters — make too many
          mistakes and you&apos;ll be eliminated before the story ends…
        </p>

        <ThemeSelector />

        <div className="controls">
          <button className="btn" id="createGameBtn">
            Create New Game
          </button>
          <button className="btn btn-secondary" id="joinGameBtn">
            Join Existing Game
          </button>
          <button className="btn btn-secondary" id="leaderboardBtn">
            🏆 Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
