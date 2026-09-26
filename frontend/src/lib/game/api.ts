import { aiStatus } from "../aiStatus";
import type { AnyRecord, Scenario, WorldState } from "../types";

/** Thin wrapper around the FrightFate backend REST endpoints. */
export class ApiClient {
  constructor(private baseUrl: string) {}

  async call<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  }

  createSession(theme: string): Promise<AnyRecord> {
    return this.call("/api/game/create-session", {
      method: "POST",
      body: JSON.stringify({ theme }),
    });
  }

  joinSession(code: string, playerName: string): Promise<AnyRecord> {
    return this.call(`/api/game/join-session/${code}?player_name=${encodeURIComponent(playerName)}`, {
      method: "POST",
    });
  }

  getSession(code: string): Promise<AnyRecord> {
    return this.call(`/api/game/session/${code}`);
  }

  checkElimination(code: string, playerId: string): Promise<AnyRecord> {
    return this.call(`/api/game/check-elimination/${code}/${playerId}`);
  }

  /** Scenario generation is AI-backed: announce it so the UI can show activity. */
  async getScenario(
    code: string,
    questionNumber: number,
    playerId: string,
    previousState?: WorldState | null
  ): Promise<Scenario> {
    const params = new URLSearchParams({ player_id: playerId });
    if (previousState) {
      params.set("previous_state", JSON.stringify(previousState));
    }

    aiStatus.begin(questionNumber <= 1 ? "Opening the nightmare" : "Writing your consequence");
    try {
      const scenario = await this.call<Scenario>(
        `/api/game/scenario/${code}/${questionNumber}?${params.toString()}`
      );
      aiStatus.finish(scenario?.engine);
      return scenario;
    } catch (error) {
      aiStatus.finish(null);
      throw error;
    }
  }

  async submitAnswer(payload: AnyRecord): Promise<AnyRecord> {
    aiStatus.begin("Judging your choice");
    try {
      const response = await this.call<AnyRecord>("/api/game/submit-answer", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      aiStatus.finish(response?.engine);
      return response;
    } catch (error) {
      aiStatus.finish(null);
      throw error;
    }
  }

  async getResults(code: string): Promise<AnyRecord> {
    aiStatus.begin("Weighing every fate");
    try {
      const response = await this.call<AnyRecord>(`/api/game/results/${code}`);
      aiStatus.finish(response?.engine);
      return response;
    } catch (error) {
      aiStatus.finish(null);
      throw error;
    }
  }

  getLeaderboard(theme?: string | null, limit = 25): Promise<AnyRecord> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (theme && theme !== "all") params.set("theme", theme);
    return this.call(`/api/game/leaderboard?${params.toString()}`);
  }

  getFateFeed(code: string, afterSeq = 0): Promise<AnyRecord> {
    return this.call(`/api/game/feed/${code}?after_seq=${afterSeq}`);
  }
}
