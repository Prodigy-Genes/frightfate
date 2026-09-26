import { ScreenHead } from "@/components/ScreenHead";

/** Join an existing session by code. */
export function JoinScreen() {
  return (
    <div id="joinScreen" className="screen">
      <div className="card panel-brackets">
        <ScreenHead icon="🚪" title="Breach the Group" sub="Enter the code your host shared." />
        <h2>Join Game Session</h2>

        <div className="input-group">
          <label htmlFor="sessionCode">Session Code</label>
          <input type="text" id="sessionCode" placeholder="Enter 6-character code" maxLength={6} />
        </div>

        <div className="input-group">
          <label htmlFor="playerName">Your Name</label>
          <input type="text" id="playerName" placeholder="Enter your name" maxLength={20} />
        </div>

        <div className="controls">
          <button className="btn" id="joinSessionBtn">
            Join Session
          </button>
          <button className="btn btn-secondary" id="backToHomeBtn">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
