/**
 * Session recovery storage.
 *
 * A page refresh mid-game used to orphan the player: all game state lived in
 * memory, so the seat stayed occupied on the server while the client forgot
 * it existed. We persist the minimum identity (playerId, sessionCode, name)
 * in sessionStorage — scoped to the tab, cleared when the tab closes — so the
 * controller can offer to resume the run after a reload.
 */

const KEY = "frightfate_session";

export interface StoredSession {
  sessionCode: string;
  playerId: string;
  playerName: string;
}

export function saveSession(session: StoredSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — recovery just won't work */
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.sessionCode === "string" &&
      typeof parsed.playerId === "string" &&
      typeof parsed.playerName === "string" &&
      parsed.sessionCode.length === 6
    ) {
      return parsed as StoredSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
