/** Layered analog broadcast texture, with no moving scans across the content. */
export function BackgroundEffects() {
  return (
    <>
      <div className="bg-effects" aria-hidden="true">
        <div className="fog fog-one" />
        <div className="fog fog-two" />
      </div>
      <div className="vignette" aria-hidden="true" />
      <div className="grain-layer" aria-hidden="true" />
      <div className="broadcast-mark" aria-hidden="true"><span>FF</span><i>06</i></div>
      <div className="edge-registration" aria-hidden="true" />
    </>
  );
}
