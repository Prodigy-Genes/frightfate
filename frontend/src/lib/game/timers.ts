/** Tracks intervals/timeouts created by the game so they can all be cleared on teardown. */
export class Timers {
  private intervals: number[] = [];
  private timeouts: number[] = [];

  setInterval(fn: () => void, ms: number): number {
    const id = window.setInterval(fn, ms);
    this.intervals.push(id);
    return id;
  }

  setTimeout(fn: () => void, ms: number): number {
    const id = window.setTimeout(fn, ms);
    this.timeouts.push(id);
    return id;
  }

  clearAll(): void {
    this.intervals.forEach((id) => window.clearInterval(id));
    this.timeouts.forEach((id) => window.clearTimeout(id));
    this.intervals = [];
    this.timeouts = [];
  }
}
