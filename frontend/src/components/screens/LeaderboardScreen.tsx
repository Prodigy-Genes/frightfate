"use client";

import { ScreenHead } from "@/components/ScreenHead";
import { WorldScene } from "@/components/WorldScene";
import { useSessionTheme } from "@/lib/useSessionTheme";

/** World-specific registry: where each nightmare keeps the names it claims. */
export function LeaderboardScreen() {
  const { direction } = useSessionTheme();
  return (
    <div id="leaderboardScreen" className="screen">
      <div className="archive-panel registry-panel">
        <div className="section-topline"><span>PERMANENT RECORD / INDEX 01</span><span>NO NAMES ERASED</span></div>
        <WorldScene placement="leaderboard" />
        <ScreenHead icon="✳" title={direction.boardTitle} sub={direction.boardSub} />
        <div className="registry-heading"><div><p className="eyebrow">SURVIVORS & LOST SIGNALS</p><h2 className="theme-board-title">{direction.boardTitle}</h2></div><span className="registry-index">FF<br /><small>REGISTRY</small></span></div>
        <p className="registry-intro theme-board-intro">{direction.boardIntro}</p>
        <div className="leaderboard-tabs" id="leaderboardTabs" />
        <div className="leaderboard-table" id="leaderboardList" />
        <div className="controls"><button className="btn btn-secondary" id="leaderboardBackBtn">Return to the Archive</button></div>
      </div>
    </div>
  );
}
