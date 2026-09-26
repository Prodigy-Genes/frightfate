/** Fixed audio HUD — always visible on every screen. */
export function AudioHud() {
  return (
    <div id="audioHud" className="audio-hud">
      <button id="audioToggleBtn" className="audio-toggle-btn" title="Toggle Sound (M)">
        🔊
      </button>
      <input
        type="range"
        id="volumeSlider"
        min="0"
        max="1"
        step="0.05"
        defaultValue="0.7"
        title="Master Volume"
        className="volume-slider"
      />
      <span className="audio-hud-label">Audio</span>
    </div>
  );
}
