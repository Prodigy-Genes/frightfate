import { DEFAULT_THEME, THEMES } from "@/lib/themes";

interface ThemeSelectorProps {
  /** Initially selected theme; class toggling afterwards is done by the game controller. */
  selected?: string;
}

/** Grid of selectable horror worlds, each a themed portal card. */
export function ThemeSelector({ selected = DEFAULT_THEME }: ThemeSelectorProps) {
  return (
    <div className="theme-selector" role="radiogroup" aria-label="Choose your nightmare">
      {THEMES.map((theme) => {
        const isSelected = theme.id === selected;
        return (
          <div
            key={theme.id}
            className={`theme-option${isSelected ? " selected" : ""}`}
            data-theme={theme.id}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            title={theme.tagline}
          >
            <span className="theme-icon" aria-hidden="true">
              {theme.icon}
            </span>
            <h4>{theme.name}</h4>
            <p>{theme.description}</p>
            <span className="theme-soundtrack" title={`Soundtrack: ${theme.soundtrack}`}>
              ♪ {theme.soundtrack}
            </span>
          </div>
        );
      })}
    </div>
  );
}
