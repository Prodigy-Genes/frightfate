"use client";

import { BrandSigil } from "@/components/BrandSigil";
import { useSessionTheme } from "@/lib/useSessionTheme";
import { THEMES } from "@/lib/themes";

/** FrightFate masthead: an intercepted case-file, not a conventional game logo. */
export function GameTitle() {
  const { theme, direction } = useSessionTheme();
  const themeId = theme.id;
  const themeIndex = THEMES.findIndex((entry) => entry.id === theme.id) + 1;

  return (
    <header className="title archive-masthead">
      <div className="masthead-topline">
        <span className="masthead-index">NIGHT ARCHIVE <i>·</i> VOL. 0{themeIndex}</span>
        <span className="masthead-frequency"><span className="signal-dot" /> <span className="masthead-world">{theme.name.toUpperCase()}</span> / TRANSMISSION RECEIVED</span>
      </div>
      <div className="title-row masthead-lockup">
        <BrandSigil className="brand-sigil" />
        <div className="masthead-wordmark">
          <span className="title-kicker" data-theme-title>{theme.name.toUpperCase()} / FIELD ARCHIVE</span>
          <h1>Fright<span>Fate</span></h1>
          <p className="subtitle" data-theme-subtitle>{direction.homeDeck}</p>
        </div>
      </div>
      <div className="masthead-rule"><span>☽</span></div>
    </header>
  );
}
