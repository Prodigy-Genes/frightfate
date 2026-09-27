import { QUESTION_TIME_LIMIT } from "../time";

/** Rounds per game. 3 keeps the AI cost per session down while preserving a full escalation arc. */
export const TOTAL_QUESTIONS = 3;
import type { AnyRecord, Scenario } from "../types";

export interface GameState {
  sessionCode: string;
  playerId: string;
  playerName: string;
  currentTheme: string;
  currentQuestion: number;
  totalQuestions: number;
  scenarios: Scenario[];
  isGameHost: boolean;
  isEliminated: boolean;
  eliminationReason: string;
  storyContext: string;
  playerChoices: AnyRecord[];
  questionTimer: number | null;
  timeRemaining: number;
  currentScenario: Scenario | null;
  currentTimeLimit: number;
  /** Highest Fate Feed seq rendered — dedupes socket vs REST replay. */
  lastFeedSeq: number;
  /** Guards against the socket echo of "game_started" re-launching the round. */
  isStartingGame: boolean;
}

export function createGameState(): GameState {
  return {
    sessionCode: "",
    playerId: "",
    playerName: "",
    currentTheme: "haunted_house",
    currentQuestion: 0,
    totalQuestions: TOTAL_QUESTIONS,
    scenarios: [],
    isGameHost: false,
    isEliminated: false,
    eliminationReason: "",
    storyContext: "",
    playerChoices: [],
    questionTimer: null,
    timeRemaining: QUESTION_TIME_LIMIT,
    currentScenario: null,
    currentTimeLimit: QUESTION_TIME_LIMIT,
    lastFeedSeq: 0,
    isStartingGame: false,
  };
}
