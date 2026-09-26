import type { Theme, ThemePalette, Rgb } from "./types";

/** RGB triple used for rgba() glows/veils while keeping the hex as the CSS var. */
const rgb = (tuple: Rgb): string => tuple.join(" ");

/** Five fully-themed worlds, each with its own palette, type voice and score. */
export const THEMES: Theme[] = [
  {
    id: "haunted_house",
    name: "Haunted House",
    description: "Trapped in a cursed Victorian mansion with dark secrets",
    tagline: "The house remembers every soul it has taken.",
    icon: "🏚️",
    soundtrack: "Gothic Organ Dirge",
    palette: {
      accent: "#dc143c",
      accentRgb: [220, 20, 60],
      accent2: "#8b0000",
      accent2Rgb: [139, 0, 0],
      bg0: "#0c0c0c",
      bg1: "#1a0000",
      bg2: "#000000",
      ink: "#e6dede",
      inkDim: "#8a7f80",
      surfaceRgb: [22, 16, 16],
      border: "#3a2a2c",
      fontDisplay: '"Creepster", Georgia, serif',
      fontBody: "Georgia, serif",
    },
  },
  {
    id: "zombie_outbreak",
    name: "Zombie Outbreak",
    description: "Survive the undead apocalypse in a quarantined research wing",
    tagline: "The outbreak started nine minutes ago. You have nine left.",
    icon: "☣️",
    soundtrack: "Industrial Quarantine Hum",
    palette: {
      accent: "#8bd450",
      accentRgb: [139, 212, 80],
      accent2: "#2f6b1f",
      accent2Rgb: [47, 107, 31],
      bg0: "#060a06",
      bg1: "#0d1a0b",
      bg2: "#000000",
      ink: "#dfe8d6",
      inkDim: "#7d8a75",
      surfaceRgb: [16, 22, 14],
      border: "#2c3a26",
      fontDisplay: '"Special Elite", "Courier New", monospace',
      fontBody: '"Special Elite", "Courier New", monospace',
      fontMono: '"Courier New", monospace',
    },
  },
  {
    id: "slasher_movie",
    name: "Slasher Movie",
    description: "Escape a masked killer in an isolated storm-swept campground",
    tagline: "Camp Crystal Pines closed in 1987. Nobody told the killer.",
    icon: "🔪",
    soundtrack: "VHS Stalker Pulse",
    palette: {
      accent: "#ff3b1f",
      accentRgb: [255, 59, 31],
      accent2: "#8f1206",
      accent2Rgb: [143, 18, 6],
      bg0: "#0a0304",
      bg1: "#1b0402",
      bg2: "#000000",
      ink: "#f2e2dd",
      inkDim: "#9c7d78",
      surfaceRgb: [24, 12, 10],
      border: "#421f18",
      fontDisplay: '"Metal Mania", Impact, sans-serif',
      fontBody: '"Trebuchet MS", Verdana, sans-serif',
    },
  },
  {
    id: "alien_invasion",
    name: "Alien Invasion",
    description: "Extraterrestrial organisms breach a remote Arctic radar base",
    tagline: "They were already inside the walls before the alarms sounded.",
    icon: "👽",
    soundtrack: "Xenomorphic FM Drone",
    palette: {
      accent: "#3ef0d0",
      accentRgb: [62, 240, 208],
      accent2: "#12584f",
      accent2Rgb: [18, 88, 79],
      bg0: "#030608",
      bg1: "#04161a",
      bg2: "#000000",
      ink: "#d8f2ee",
      inkDim: "#6f968f",
      surfaceRgb: [10, 22, 24],
      border: "#1d3d3d",
      fontDisplay: "Orbitron, Verdana, sans-serif",
      fontBody: "Verdana, Geneva, sans-serif",
    },
  },
  {
    id: "deep_sea_terror",
    name: "Deep Sea Terror",
    description: "Flooding abyssal trench facility as an ancient entity awakens",
    tagline: "Eleven kilometres down, something has been waiting for a way in.",
    icon: "🦑",
    soundtrack: "Abyssal Pressure Sonar",
    palette: {
      accent: "#3aa0ff",
      accentRgb: [58, 160, 255],
      accent2: "#0b3a72",
      accent2Rgb: [11, 58, 114],
      bg0: "#020409",
      bg1: "#03162b",
      bg2: "#000000",
      ink: "#d4e6f7",
      inkDim: "#6d86a0",
      surfaceRgb: [8, 18, 32],
      border: "#1a3552",
      fontDisplay: '"Cinzel Decorative", Palatino, serif',
      fontBody: '"Trebuchet MS", Verdana, sans-serif',
    },
  },
  {
    id: "cryptid_woods",
    name: "Cryptid Woods",
    description: "Hunt something that mimics voices through an Appalachian pine hollow",
    tagline: "It learned your voice from a scream. It is still practising.",
    icon: "🌲",
    soundtrack: "Bone Flute Hollow",
    palette: {
      accent: "#c9a227",
      accentRgb: [201, 162, 39],
      accent2: "#5a4a12",
      accent2Rgb: [90, 74, 18],
      bg0: "#060704",
      bg1: "#12130a",
      bg2: "#000000",
      ink: "#e9e4d2",
      inkDim: "#8f8a74",
      surfaceRgb: [20, 21, 12],
      border: "#3b3822",
      fontDisplay: '"IM Fell English", Georgia, serif',
      fontBody: '"IM Fell English", Georgia, serif',
    },
  },
];

export const DEFAULT_THEME = "haunted_house";

export const getTheme = (id: string | undefined): Theme =>
  THEMES.find((theme) => theme.id === id) ?? THEMES[0];

/**
 * Push a theme's design tokens onto the document root as CSS custom properties.
 * All themed styling in globals.css reads these variables, so switching a theme
 * restyles the entire app without re-rendering React.
 */
export function applyTheme(id: string | undefined): void {
  if (typeof document === "undefined") return;
  const theme = getTheme(id);
  const root = document.documentElement;
  const p = theme.palette;

  root.dataset.theme = theme.id;
  root.style.setProperty("--accent", p.accent);
  root.style.setProperty("--accent-rgb", rgb(p.accentRgb));
  root.style.setProperty("--accent-2", p.accent2);
  root.style.setProperty("--accent-2-rgb", rgb(p.accent2Rgb));
  root.style.setProperty("--bg-0", p.bg0);
  root.style.setProperty("--bg-1", p.bg1);
  root.style.setProperty("--bg-2", p.bg2);
  root.style.setProperty("--ink", p.ink);
  root.style.setProperty("--ink-dim", p.inkDim);
  root.style.setProperty("--surface-rgb", rgb(p.surfaceRgb));
  root.style.setProperty("--border", p.border);
  root.style.setProperty("--font-display", p.fontDisplay);
  root.style.setProperty("--font-body", p.fontBody);
  root.style.setProperty("--font-mono", p.fontMono ?? '"Courier New", monospace');
  root.style.setProperty("--theme-icon", `"${theme.icon}"`);
}
