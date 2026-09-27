"use client";

import { TOTAL_QUESTIONS } from "@/lib/game/state";
import { ScreenHead } from "@/components/ScreenHead";
import { WorldScene } from "@/components/WorldScene";
import { useSessionTheme } from "@/lib/useSessionTheme";

/** Active gameplay: every theme has its own transcript, instrument and response voice. */
export function GameScreen() {
  const { direction } = useSessionTheme();
  return (
    <div id="gameScreen" className="screen game-screen">
      <div className="game-screen-kicker"><span className="theme-game-kicker">{direction.gameKicker}</span><span className="game-frequency"><i className="live-led" /> LISTENING</span></div>
      <WorldScene placement="game" />
      <ScreenHead icon="⌁" title="The next account" sub={direction.gameSub} />
      <div className="game-progress-head">
        <div className="progress-copy"><span className="micro-label theme-game-progress">{direction.gameProgress}</span><div className="progress-text" id="progressText">Question 1 of {TOTAL_QUESTIONS}</div></div>
        <span className="progress-index"><b id="scenarioCount">01</b><i> / 0{TOTAL_QUESTIONS}</i></span>
      </div>
      <div className="progress-bar"><div className="progress-fill" id="progressFill" /></div>

      <div className="question-timer">
        <button className="btn-narrate" id="narrateToggleBtn" title="Have the host narrate scenarios aloud (T)" aria-pressed="false">◖)) Narrate</button>
        <div className="timer-info"><div className="timer-label theme-game-clock">{direction.gameClock}</div><div className="timer-warning" id="timerWarning" style={{ display: "none" }}>⚠ Answer quickly or face elimination!</div></div>
        <div className="timer-display" id="timerDisplay">2:00</div>
      </div>

      <article className="scenario" id="currentScenario">
        <div className="scenario-topline"><span className="scenario-label theme-game-scene">{direction.gameScene}</span><span className="scenario-record">FF—06 / PERSONAL FIELD NOTE</span></div>
        <div className="scenario-header"><div className="story-context" id="storyContext">Your journey begins…</div></div>
        <h3 id="scenarioTitle">Loading…</h3>
        <p id="scenarioDescription">Please wait while we craft your personalized scenario…</p>
        <div className="narrative-consequence" id="narrativeConsequence" style={{ display: "none" }}><h4>What your last choice left behind</h4><p id="consequenceText" /></div>
      </article>

      <div className="answer-panel archive-panel">
        <div className="answer-heading"><div><span className="micro-label theme-answer-kicker">{direction.answerKicker}</span><h3 className="theme-answer-heading">{direction.answerHeading}</h3></div><span className="answer-glyph" aria-hidden="true">✎</span></div>
        <div className="input-group">
          <label htmlFor="playerAnswer"><span className="theme-answer-label">{direction.answerLabel}</span><span>MIN. 10 CHARACTERS</span></label>
          <textarea id="playerAnswer" placeholder="Be precise. The archive keeps every word…" />
          <div className="answer-validation" id="answerValidation"><div className="validation-status" id="validationStatus"><span className="status-icon" id="statusIcon">⚠️</span><span className="status-text" id="statusText">Answer too short - provide more detail</span></div></div>
        </div>
        <div className="choice-classification" id="choiceClassification" style={{ display: "none" }}><p>Your last choice was classified as: <span id="classificationText" /></p></div>
        <div className="answer-submit-row"><span className="submit-note theme-answer-note">{direction.answerNote}</span><button className="btn" id="submitAnswerBtn"><span className="theme-answer-submit">{direction.answerSubmit}</span> <span className="btn-glyph">↗</span></button></div>
      </div>
    </div>
  );
}
