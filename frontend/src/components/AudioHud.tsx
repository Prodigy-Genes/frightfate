/** Compact broadcast controls, always visible without competing with the story. */
export function AudioHud() {
  return (
    <div id="audioHud" className="audio-hud" aria-label="Sound controls">
      <span className="audio-hud-led" aria-hidden="true" />
      <span className="audio-hud-label">SIGNAL</span>
      <button id="audioToggleBtn" className="audio-toggle-btn" title="Toggle Sound (M)" aria-label="Toggle sound">
        ◖))
      </button>
      <input
        type="range"
        id="volumeSlider"
        min="0"
        max="1"
        step="0.05"
        defaultValue="0.7"
        title="Master Volume"
        aria-label="Master volume"
        className="volume-slider"
      />
    </div>
  );
}
