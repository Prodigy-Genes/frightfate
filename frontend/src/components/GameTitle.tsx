/** The FrightFate title header, restyled as a marquee. */
export function GameTitle() {
  return (
    <header className="title">
      <div className="title-row">
        <span className="title-kicker">Who dies first?</span>
        <h1>FrightFate</h1>
        <span className="title-rule" aria-hidden="true" />
        <p className="subtitle">Try to survive</p>
      </div>
    </header>
  );
}
