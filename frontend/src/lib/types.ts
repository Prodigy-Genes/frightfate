/** Shared domain types for the FrightFate game. */

export type AnyRecord = Record<string, any>;

export interface BranchingPath {
  action_type: string;
  description: string;
}

/**
 * The carried-forward simulation state. The client echoes this back on the next
 * scenario request so injuries, blocked routes and threat awareness persist
 * across rounds without any server-side session storage.
 */
export interface WorldState {
  location?: string;
  threat?: string;
  threat_proximity?: string;
  threat_awareness?: string;
  noise_level?: string;
  injuries?: string[];
  inventory?: string[];
  blocked_routes?: string[];
}

/** `engine` records whether the model or the offline fallback produced the text. */
export type EngineKind = "ai" | "fallback";

export interface Scenario {
  question_number: number;
  title: string;
  description: string;
  survival_factors?: string[];
  story_context?: string;
  death_risk_level?: string;
  narrative_consequences?: string;
  branching_paths?: BranchingPath[];
  world_state?: WorldState;
  engine?: EngineKind;
}

/** The in-character feedback attached to every scored answer. */
export interface AnswerFeedback {
  score: number;
  analysis: string;
  story_progression?: string;
  choice_classification?: string;
  better_alternatives?: string[];
  host_verdict?: string;
  death_epitaph?: string | null;
  instant_death?: boolean;
  death_reason?: string;
  elimination_reason?: string;
  death_narrative?: AnyRecord;
  engine?: EngineKind;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WordTag {
  word: string;
  type: string;
}

/** RGB triple used for rgba() glows/veils while the hex stays a CSS var. */
export type Rgb = [number, number, number];

export interface ThemePalette {
  /** Primary accent (buttons, titles, active states). */
  accent: string;
  accentRgb: Rgb;
  /** Deeper companion tone used for gradients. */
  accent2: string;
  accent2Rgb: Rgb;
  /** Three-stop body background gradient. */
  bg0: string;
  bg1: string;
  bg2: string;
  /** Primary + dimmed text colours. */
  ink: string;
  inkDim: string;
  /** Card/panel surface (as an rgb triple for rgba composition). */
  surfaceRgb: Rgb;
  border: string;
  /** CSS font stacks. */
  fontDisplay: string;
  fontBody: string;
  fontMono?: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  /** One-line atmospheric hook shown when the theme is selected. */
  tagline: string;
  /** Emoji glyph standing in for the theme (used in cards + the backdrop). */
  icon: string;
  /** Human-readable name of the theme's procedural soundtrack. */
  soundtrack: string;
  palette: ThemePalette;
}

export interface LeaderboardEntry {
  rank: number;
  player_name: string;
  theme: string;
  score: number;
  survived: boolean;
  eliminated_at?: number | null;
  created_at?: string | null;
}
