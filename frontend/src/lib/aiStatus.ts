import { useEffect, useState } from "react";

export type EngineKind = "ai" | "fallback";

export interface AiStatusState {
  /** Number of AI-backed requests currently in flight. */
  active: number;
  /** Human label for what the model is working on right now. */
  label: string;
  /** How the most recent AI-backed call was actually answered. */
  lastEngine: EngineKind | null;
  /** Timestamp of the most recent resolution, for the transient "done" glow. */
  lastAt: number;
}

const listeners = new Set<(state: AiStatusState) => void>();

let state: AiStatusState = { active: 0, label: "", lastEngine: null, lastAt: 0 };

function emit(next: Partial<AiStatusState>): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener(state));
}

/**
 * Lightweight pub/sub for "is the model working right now?".
 *
 * The ApiClient marks AI-backed endpoints as in-flight; the backend tells us
 * afterwards whether the model answered or the offline fallback did. The UI
 * only needs to render a small, unobtrusive indicator from this.
 */
export const aiStatus = {
  subscribe(listener: (state: AiStatusState) => void): () => void {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  },
  get(): AiStatusState {
    return state;
  },
  begin(label: string): void {
    emit({ active: state.active + 1, label });
  },
  finish(engine?: string | null): void {
    const resolved: EngineKind | null =
      engine === "ai" || engine === "fallback" ? engine : null;
    emit({
      active: Math.max(0, state.active - 1),
      lastEngine: resolved ?? state.lastEngine,
      lastAt: Date.now(),
    });
  },
};

/** React hook wrapper around the store. */
export function useAiStatus(): AiStatusState {
  const [snapshot, setSnapshot] = useState<AiStatusState>(state);

  useEffect(() => {
    const timer = window.setInterval(() => setSnapshot(aiStatus.get()), 400);
    const unsubscribe = aiStatus.subscribe(setSnapshot);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, []);

  return snapshot;
}
