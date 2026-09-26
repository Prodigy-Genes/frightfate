/**
 * Optional text-to-speech narration, built on the browser's Web Speech API.
 * Zero dependencies, zero assets — the host's voice reads scenarios aloud
 * when the player toggles the narration button. Preference persists.
 */

const STORAGE_KEY = "frightfate_narration";

const storage = {
  get(): string | null {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(value: string): void {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
  },
};

class Narrator {
  private enabled: boolean = storage.get() === "true";
  private voice: SpeechSynthesisVoice | null = null;
  private voicePicked = false;

  get supported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  get isEnabled(): boolean {
    return this.enabled && this.supported;
  }

  /** Pick a voice once the (async) voice list is populated. */
  private pickVoice(): void {
    if (!this.supported || this.voicePicked) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return; // stays empty until voiceschanged fires
    this.voicePicked = true;
    // Prefer an English voice; prefer ones that sound story-like if present.
    const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
    const pool = english.length ? english : voices;
    this.voice =
      pool.find((v) => /narrate|story|male|daniel|george|uk english/i.test(v.name)) ??
      pool[0] ??
      null;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    storage.set(String(on));
    if (!on) this.stop();
  }

  toggle(): boolean {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  /** Speak a passage in the host's cadence. No-ops when disabled/unsupported. */
  speak(text: string): void {
    if (!this.isEnabled || !text) return;
    try {
      this.stop();
      this.pickVoice();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) utterance.voice = this.voice;
      utterance.rate = 0.92; // a story told slowly
      utterance.pitch = 0.85; // slightly grave — a host, not an assistant
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  stop(): void {
    if (!this.supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export const narrator = new Narrator();
