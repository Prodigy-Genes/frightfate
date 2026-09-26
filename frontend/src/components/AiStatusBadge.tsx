"use client";

import { useAiStatus } from "@/lib/aiStatus";

/**
 * A deliberately quiet indicator of model activity.
 *
 * - Idle: barely-there dot.
 * - Working: the dot pulses and a short label appears, so you can see the
 *   prompt is being processed.
 * - Resolved: a brief tick showing whether the model answered (`AI`) or the
 *   offline fallback did (`SCRIPTED`).
 */
export function AiStatusBadge() {
  const { active, label, lastEngine, lastAt } = useAiStatus();

  const isThinking = active > 0;
  const justResolved = !isThinking && lastEngine !== null && Date.now() - lastAt < 2200;

  let modeClass = "ai-status";
  let text = "Fate Engine";

  if (isThinking) {
    modeClass = "ai-status thinking";
    text = label || "Consulting fate";
  } else if (justResolved && lastEngine === "ai") {
    modeClass = "ai-status resolved";
    text = "Fate Engine · AI";
  } else if (justResolved && lastEngine === "fallback") {
    modeClass = "ai-status offline";
    text = "Fate Engine · Scripted";
  }

  return (
    <div
      id="aiStatus"
      className={modeClass}
      title={
        isThinking
          ? "The model is working on your request"
          : lastEngine === "fallback"
            ? "Answered by the built-in offline writer (model unavailable)"
            : "The AI model is answering in character"
      }
      aria-live="polite"
      aria-label={text}
    >
      <span className="ai-status-dot" aria-hidden="true" />
      <span className="ai-status-text">{text}</span>
    </div>
  );
}
