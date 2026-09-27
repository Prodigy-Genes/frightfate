"use client";

import type { CSSProperties } from "react";
import { useSessionTheme } from "@/lib/useSessionTheme";
import { WorldIllustration } from "@/components/WorldIllustration";

interface WorldSceneProps {
  placement: "home" | "lobby" | "game" | "analysis" | "lost" | "survived" | "leaderboard";
  caption?: string;
}

/** The same world gets a new living landscape across each stage of its story. */
export function WorldScene({ placement, caption }: WorldSceneProps) {
  const { theme, direction } = useSessionTheme();
  const sceneCaption = caption || (placement === "lost"
    ? direction.finaleLostCaption
    : placement === "survived"
      ? direction.finaleWonCaption
      : direction.sceneCaption);

  return (
    <div
      className={`world-scene-frame world-scene-frame-${placement} world-scene-frame-${theme.id}`}
      data-placement={placement}
      data-theme-scene={theme.id}
      aria-label={`${theme.name}: ${sceneCaption}`}
      role="img"
      style={{ "--scene-accent": theme.palette.accent, "--scene-bg": theme.palette.bg1, "--scene-accent-rgb": theme.palette.accentRgb.join(" ") } as CSSProperties}
    >
      <WorldIllustration themeId={theme.id} name={theme.name} variant="wide" />
      <span className="world-scene-title">{theme.name.toUpperCase()}</span>
      <span className="world-scene-caption">{sceneCaption}</span>
      <span className="world-scene-coordinates">NIGHT ARCHIVE / PLATE {String(theme.id.length).padStart(2, "0")}</span>
    </div>
  );
}
