import { TOTAL_QUESTIONS } from "@/lib/game/state";

/** Active gameplay: progress, timer HUD, scenario, answer input. */
export function GameScreen() {
  return (
    <div id="gameScreen" className="screen">
      <div className="progress-bar">
        <div className="progress-fill" id="progressFill" />
      </div>
      <div className="progress-text" id="progressText">
        Question 1 of {TOTAL_QUESTIONS}
      </div>

      <div className="question-timer">
        <button
          className="btn-narrate"
          id="narrateToggleBtn"
          title="Have the host narrate scenarios aloud (T)"
          aria-pressed="false"
        >
          🔈 Narrate
        </button>
        <div className="timer-info">
          <div className="timer-label">⏳ Time Remaining</div>
          <div className="timer-warning" id="timerWarning" style={{ display: "none" }}>
            ⚠️ Answer quickly or face elimination!
          </div>
        </div>
        <div className="timer-display" id="timerDisplay">
          2:00
        </div>
      </div>

      <div className="scenario" id="currentScenario">
        <div className="scenario-header">
          <div className="scenario-number" id="scenarioNumber">
            1
          </div>
          <div className="story-context" id="storyContext">
            Your journey begins…
          </div>
        </div>
        <h3 id="scenarioTitle">Loading…</h3>
        <p id="scenarioDescription">
          Please wait while we craft your personalized scenario…
        </p>

        <div className="narrative-consequence" id="narrativeConsequence" style={{ display: "none" }}>
          <h4>Consequences of your previous actions</h4>
          <p id="consequenceText" />
        </div>
      </div>

      <div className="card panel-brackets">
        <div className="input-group">
          <label htmlFor="playerAnswer">What do you do?</label>
          <textarea
            id="playerAnswer"
            placeholder="Describe your actions in detail… Your choices will affect the story! (Minimum 10 characters required)"
          />
          <div className="answer-validation" id="answerValidation">
            <div className="validation-status" id="validationStatus">
              <span className="status-icon" id="statusIcon">
                ⚠️
              </span>
              <span className="status-text" id="statusText">
                Answer too short - provide more detail
              </span>
            </div>
          </div>
        </div>

        <div className="choice-classification" id="choiceClassification" style={{ display: "none" }}>
          <p>
            Your last choice was classified as: <span id="classificationText" />
          </p>
        </div>

        <div className="controls">
          <button className="btn" id="submitAnswerBtn">
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  );
}
