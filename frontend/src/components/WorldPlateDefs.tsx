import { THEMES } from "@/lib/themes";
import { WorldIllustration } from "@/components/WorldIllustration";

/** Hidden source plates reused by the imperative AI-analysis overlays. */
export function WorldPlateDefs() {
  return (
    <svg className="world-plate-definitions" aria-hidden="true" focusable="false">
      <defs>
        {THEMES.map((theme) => (
          <WorldIllustration
            key={theme.id}
            themeId={theme.id}
            name={theme.name}
            variant="wide"
            svgId={`world-plate-source-${theme.id}`}
          />
        ))}
      </defs>
    </svg>
  );
}
