/** Layered atmospheric backdrop: drifting fog, film vignette and a themed glyph. */
export function BackgroundEffects() {
  return (
    <>
      <div className="bg-effects" aria-hidden="true">
        <div className="fog" />
        <div className="fog" />
        <div className="fog" />
      </div>
      <div className="vignette" aria-hidden="true" />
      <div className="theme-ghost" aria-hidden="true" />
    </>
  );
}
