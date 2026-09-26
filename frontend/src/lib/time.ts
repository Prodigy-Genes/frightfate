/** Question timing constants and adaptive time-limit calculations. */
import type { AnyRecord, Scenario } from "./types";

export const QUESTION_TIME_LIMIT = 120; // 2 minutes per question
export const WARNING_TIME = 30;

export const MIN_TIME_LIMIT = 120;
export const MAX_TIME_LIMIT = 500;
export const WORDS_PER_MINUTE = 350;

export function calculateTimeLimit(scenario: Scenario | null): number {
  if (!scenario) return QUESTION_TIME_LIMIT;

  const wordCount = scenario.description.split(/\s+/).length;
  const baseTime = Math.max(
    MIN_TIME_LIMIT,
    Math.min(MAX_TIME_LIMIT, Math.floor(wordCount / (WORDS_PER_MINUTE / 60)))
  );

  const riskMultipliers: Record<string, number> = {
    low: 0.8,
    medium: 1.0,
    high: 1.2,
    extreme: 1.5,
  };

  const riskLevel = scenario.death_risk_level || "medium";
  return Math.floor(baseTime * (riskMultipliers[riskLevel] || 1.0));
}

export function calculateAdaptiveTimeLimit(
  scenario: Scenario,
  playerHistory: AnyRecord[] = []
): number {
  const baseTime = calculateTimeLimit(scenario);

  if (playerHistory.length === 0) return baseTime;

  const avgScore =
    playerHistory.reduce((sum, choice) => sum + (choice.score || 50), 0) / playerHistory.length;
  const hasRushedAnswers = playerHistory.some((choice) => choice.was_rushed);
  const hasTimeoutIssues = playerHistory.some((choice) => choice.timed_out);

  let timeModifier = 1.0;

  if (avgScore >= 75) timeModifier -= 0.1;
  else if (avgScore <= 35) timeModifier += 0.15;

  if (hasRushedAnswers) timeModifier += 0.2;
  if (hasTimeoutIssues) timeModifier += 0.3;

  if (scenario.question_number >= 4 && avgScore < 50) timeModifier += 0.25;

  const adaptiveTime = Math.round(baseTime * timeModifier);

  return Math.max(MIN_TIME_LIMIT, Math.min(MAX_TIME_LIMIT, adaptiveTime));
}

/** Map an allocated time (seconds) to the complexity label + CSS state class. */
export function classifyComplexity(timeLimit: number): { label: string; className: string } {
  if (timeLimit >= 240) return { label: "Very Complex", className: "very-complex" };
  if (timeLimit >= 180) return { label: "Complex", className: "complex" };
  if (timeLimit <= 120) return { label: "Quick Decision", className: "quick" };
  return { label: "Standard", className: "standard" };
}

/** Map a survival score to the score-reveal colour class. */
export function getScoreClass(score: number): string {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "average";
  return "poor";
}
