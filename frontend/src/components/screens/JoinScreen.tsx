import { ScreenHead } from "@/components/ScreenHead";

/** Join an existing session by its recovered six-character transmission code. */
export function JoinScreen() {
  return (
    <div id="joinScreen" className="screen">
      <div className="archive-panel form-panel">
        <div className="section-topline"><span>02 / FREQUENCY MATCH</span><span>INCOMING TRANSMISSION</span></div>
        <ScreenHead icon="⌁" title="Breach the signal" sub="A friend has opened a door. You only need the code." />
        <h2>Find your way in.</h2>
        <p className="form-intro">Enter the six marks your host received. The room will recognize you.</p>
        <div className="input-group">
          <label htmlFor="sessionCode">Session Code <span>01</span></label>
          <input type="text" id="sessionCode" placeholder="A B C 1 2 3" maxLength={6} autoComplete="off" />
        </div>
        <div className="input-group">
          <label htmlFor="playerName">Your Name <span>02</span></label>
          <input type="text" id="playerName" placeholder="What should the archive call you?" maxLength={20} autoComplete="name" />
        </div>
        <div className="controls">
          <button className="btn" id="joinSessionBtn"><span className="btn-glyph">↗</span> Enter the Room</button>
          <button className="btn btn-secondary" id="backToHomeBtn">Return to the Archive</button>
        </div>
        <p className="form-footnote">If the line is silent, check the code with your host.</p>
      </div>
    </div>
  );
}
