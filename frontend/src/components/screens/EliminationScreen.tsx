"use client";

import { FateIllustration } from "@/components/FateIllustration";
import { WorldScene } from "@/components/WorldScene";
import { useSessionTheme } from "@/lib/useSessionTheme";

/** A world-specific ending tableau; the same fate is staged six different ways. */
export function EliminationScreen() {
  const { direction } = useSessionTheme();
  return (
    <div id="eliminationScreen" className="screen finale-screen finale-lost">
      <div className="finale-topline"><span className="theme-lost-topline">{direction.lostTopline}</span><span>ARCHIVE COPY 01</span></div>
      <WorldScene placement="lost" />
      <div className="finale-art-wrap"><FateIllustration fate="lost" /><span className="finale-art-caption theme-lost-caption">{direction.finaleLostCaption}</span></div>
      <div className="card elimination-card panel-brackets fate-doom finale-card">
        <div className="elimination-header">
          <p className="eyebrow theme-lost-eyebrow">{direction.lostEyebrow}</p>
          <h2 className="theme-lost-headline">{direction.lostHeadline.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2>
          <p className="elimination-subtitle theme-lost-sub">{direction.lostSub}</p>
        </div>
        <div className="elimination-content" id="eliminationContent">
          <div className="death-narrative" id="deathNarrative">{/* World-written death narrative */}</div>
          <div className="elimination-analysis" id="eliminationAnalysis">{/* World-written analysis */}</div>
        </div>
        <div className="controls">
          <button className="btn btn-secondary" id="watchOthersBtn" title="Return to the room — the Fate Feed shows how the story unfolds">Stay on the Frequency</button>
          <button className="btn" id="returnToLobbyBtn">Close the File <span className="btn-glyph">↗</span></button>
        </div>
      </div>
      <p className="finale-footnote theme-lost-footer">{direction.lostFooter}</p>
    </div>
  );
}
