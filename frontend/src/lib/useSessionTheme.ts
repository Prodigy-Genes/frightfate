"use client";

import { useSyncExternalStore } from "react";
import { getTheme } from "@/lib/themes";
import { getThemeDirection } from "@/lib/themeDirection";

const subscribe = (callback: () => void) => {
  window.addEventListener("frightfate-theme-change", callback);
  return () => window.removeEventListener("frightfate-theme-change", callback);
};
const getSnapshot = () => document.documentElement.dataset.theme || "haunted_house";
const getServerSnapshot = () => "haunted_house";

export function useSessionTheme() {
  const themeId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { themeId, theme: getTheme(themeId), direction: getThemeDirection(themeId) };
}
