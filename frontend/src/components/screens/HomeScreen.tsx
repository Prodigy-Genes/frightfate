"use client";

import { ScreenHead } from "@/components/ScreenHead";
import { ThemeSelector } from "@/components/ThemeSelector";
import { WorldScene } from "@/components/WorldScene";
import { useSessionTheme } from "@/lib/useSessionTheme";

/** Landing screen: world-specific scene, voice, and six distinct nightmare records. */
export function HomeScreen() {
  const { direction } = useSessionTheme();
  return (
    <div id="homeScreen" className="screen active">
      <div className="home-intro">
        <div className="home-copy">
          <p className="eyebrow"><span className="eyebrow-mark">✳</span> CASE FILE 000 — OPEN</p>
          <h2 className="theme-home-headline">{direction.homeHeadline.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}<em>{line}</em></span>)}</h2>
          <p className="home-deck">{direction.homeDeck}</p>
          <div className="home-stamp"><span>FIELD NOTE</span><b className="theme-home-stamp">{direction.homeStamp}</b><span>EST. AFTER DARK</span></div>
        </div>
        <WorldScene placement="home" />
      </div>

      <section className="archive-panel world-panel" aria-labelledby="world-heading">
        <div className="section-topline"><span>01 / SELECT A FREQUENCY</span><span>6 RECORDS RECOVERED</span></div>
        <div className="world-heading-row">
          <div><p className="eyebrow">CHOOSE YOUR NIGHTMARE</p><h3 id="world-heading">Where will it find you?</h3></div>
          <span className="archive-seal" aria-hidden="true">FF<br /><small>ARCHIVE</small></span>
        </div>
        <ThemeSelector />
      </section>

      <section className="launch-panel" aria-label="Begin your session">
        <div className="launch-copy"><ScreenHead icon="⌁" title="The line is open" sub="Invite the living. The rest is listening." /></div>
        <div className="controls">
          <button className="btn" id="createGameBtn"><span className="btn-glyph">↗</span> Open a New Case</button>
          <button className="btn btn-secondary" id="joinGameBtn"><span className="btn-glyph">⌕</span> Enter a Code</button>
          <button className="btn btn-secondary btn-archive" id="leaderboardBtn">✳ Hall of the Remembered</button>
        </div>
      </section>
      <footer className="home-footnote"><span>THREE QUESTIONS</span><i>·</i><span>ONE SHARED FATE</span><i>·</i><span>NO SAFE ANSWERS</span></footer>
    </div>
  );
}
