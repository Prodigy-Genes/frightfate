"use client";

import { FateIllustration } from "@/components/FateIllustration";
import { ScreenHead } from "@/components/ScreenHead";
import { WorldScene } from "@/components/WorldScene";
import { useSessionTheme } from "@/lib/useSessionTheme";

/** Final results: the world that tested the players gets the last word. */
export function ResultsScreen() {
  const { direction } = useSessionTheme();
  return (
    <div id="resultsScreen" className="screen finale-screen finale-reckoning results-screen">
      <div className="finale-topline"><span>END OF TRANSMISSION / 03 DECISIONS</span><span className="theme-results-mark">{direction.resultsTitle.toUpperCase()}</span></div>
      <WorldScene placement="survived" />
      <div className="verdict-hero">
        <FateIllustration fate="survived" />
        <div className="verdict-hero-copy"><p className="eyebrow theme-survived-eyebrow">{direction.survivedEyebrow}</p><h2 className="theme-survived-headline">{direction.survivedHeadline.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}<em>{line}</em></span>)}</h2><p className="theme-survived-sub">{direction.survivedSub}</p></div>
      </div>
      <div className="card panel-brackets fate-verdict finale-card">
        <ScreenHead icon="✳" title={direction.resultsTitle} sub={direction.resultsSub} />
        <div className="verdict-heading-row"><h2>The Final Record</h2><span className="archive-seal" aria-hidden="true">FF<br /><small>FILED</small></span></div>
        <div className="results-summary" id="resultsSummary"><p>Loading final results…</p></div>
        <div id="resultsContainer">{/* Results will be populated here */}</div>
        <div className="controls">
          <button className="btn" id="playAgainBtn"><span className="btn-glyph">↻</span> Return to the Story</button>
          <button className="btn btn-secondary" id="newSessionBtn">Open Another Case</button>
          <button className="btn btn-secondary btn-archive" id="resultsLeaderboardBtn">✳ Hall of the Remembered</button>
        </div>
      </div>
      <p className="finale-footnote">THE ARCHIVE NEVER FORGETS. THE BROADCAST NEVER ENDS.</p>
    </div>
  );
}
