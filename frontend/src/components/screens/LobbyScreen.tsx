"use client";

import { ScreenHead } from "@/components/ScreenHead";
import { WorldScene } from "@/components/WorldScene";
import { useSessionTheme } from "@/lib/useSessionTheme";

/** Shared room: the same players enter a different place in every nightmare. */
export function LobbyScreen() {
  const { direction } = useSessionTheme();
  return (
    <div id="lobbyScreen" className="screen">
      <div className="archive-panel lobby-panel">
        <div className="section-topline"><span>LIVE ROOM / 03</span><span><i className="live-led" /> TRANSMISSION OPEN</span></div>
        <WorldScene placement="lobby" />
        <ScreenHead icon="◉" title={direction.roomTitle} sub={direction.roomSub} />
        <div className="lobby-code-wrap">
          <div><span className="micro-label theme-room-code-label">{direction.roomCodeLabel}</span><p className="lobby-code-hint">Your room code</p></div>
          <div className="session-code" id="displaySessionCode" title="Click to copy invite link">ABC123</div>
          <button className="btn btn-secondary btn-sm" id="copyInviteBtn">▣ Copy Invite</button>
        </div>
        <div className="lobby-roster-head"><h2 className="theme-room-roster">{direction.roomRoster}</h2><span className="micro-label">THE LIVING, FOR NOW</span></div>
        <div className="players-list" id="activePlayersList">{/* Active players will be populated here */}</div>
        <div id="eliminatedSection" className="eliminated-section" style={{ display: "none" }}>
          <h3>Names already taken</h3><div className="players-list eliminated" id="eliminatedPlayersList">{/* Eliminated players */}</div>
        </div>
        <div id="fateFeedSection" className="feed-panel" style={{ display: "none" }}>
          <div className="feed-title-row"><h3 className="fate-feed-title">The room remembers</h3><span className="micro-label">LIVE FIELD NOTES</span></div>
          <div className="fate-feed" id="fateFeedList" aria-live="polite" />
        </div>
        <div className="lobby-bottom">
          <p className="lobby-warning"><span>✳</span> <span className="theme-room-warning">{direction.roomWarning}</span></p>
          <div className="controls">
            <button className="btn" id="startGameBtn"><span className="btn-glyph">▶</span> <span className="theme-room-start">{direction.roomStart}</span></button>
            <button className="btn btn-secondary" id="leaveLobbyBtn">Leave this Frequency</button>
          </div>
        </div>
      </div>
    </div>
  );
}
