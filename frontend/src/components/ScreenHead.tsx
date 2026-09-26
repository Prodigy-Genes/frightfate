interface ScreenHeadProps {
  icon: string;
  title: string;
  sub?: string;
}

/** Small game-room banner used at the top of each screen for a consistent frame. */
export function ScreenHead({ icon, title, sub }: ScreenHeadProps) {
  return (
    <div className="screen-head">
      <span className="screen-head-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <div className="screen-head-title">{title}</div>
        {sub ? <div className="screen-head-sub">{sub}</div> : null}
      </div>
    </div>
  );
}
