/** Typed, null-safe DOM lookups for the imperative game controller. */

export const el = <T extends HTMLElement = HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

export const inputValue = (id: string): string =>
  (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "";

export const byQuery = <T extends HTMLElement = HTMLElement>(selector: string): T | null =>
  document.querySelector(selector) as T | null;
