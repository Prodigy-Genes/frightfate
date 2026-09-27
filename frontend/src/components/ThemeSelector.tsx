import { DEFAULT_THEME, THEMES } from "@/lib/themes";
import { WorldIllustration } from "@/components/WorldIllustration";

interface ThemeSelectorProps {
  selected?: string;
}

/** Six illustrated field records; each record's image is its own nightmare. */
export function ThemeSelector({ selected = DEFAULT_THEME }: ThemeSelectorProps) {
  return (
    <div className="theme-selector" role="radiogroup" aria-label="Choose your nightmare">
      {THEMES.map((theme, index) => {
        const isSelected = theme.id === selected;
        return (
          <div key={theme.id} className={`theme-option${isSelected ? " selected" : ""}`} data-theme={theme.id}
            role="radio" aria-checked={isSelected} tabIndex={isSelected ? 0 : -1} title={theme.tagline}
            aria-label={`${theme.name}. ${theme.tagline}`}
            style={{ ["--record-accent" as string]: theme.palette.accent, ["--record-bg" as string]: theme.palette.bg1 }}>
            <WorldIllustration themeId={theme.id} name={theme.name} variant="card" />
            <div className="record-head"><span className="theme-icon" aria-hidden="true">{theme.icon}</span><span className="record-number">REC. 0{index + 1}</span><span className="record-mark" aria-hidden="true">◉</span></div>
            <div className="record-body"><span className="record-classification">{index % 2 === 0 ? "INCIDENT REPORT" : "SIGNAL TRANSCRIPT"}</span><h4>{theme.name}</h4><p>{theme.description}</p></div>
            <div className="record-foot"><span className="theme-soundtrack"><i>♫</i> {theme.soundtrack}</span><span className="record-open">OPEN FILE <b>↗</b></span></div>
          </div>
        );
      })}
    </div>
  );
}
