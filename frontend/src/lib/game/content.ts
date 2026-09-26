import type { WordTag } from "../types";

export const HORROR_TIPS = [
  "In horror scenarios, the first person to investigate strange sounds usually dies first.",
  "Running blindly is often worse than standing your ground and thinking.",
  "Trust your instincts - if something feels wrong, it usually is.",
  "In group scenarios, staying together increases survival odds by 60%.",
  "The most dangerous time in any horror scenario is when you think you're safe.",
  "Panicking reduces your decision-making ability by up to 70%.",
  "Most horror movie deaths could be avoided with basic communication skills.",
];

/**
 * In-character survival tips shown while the model is thinking.
 * Each world's host gives advice in their own voice.
 */
export const THEME_TIPS: Record<string, string[]> = {
  haunted_house: [
    "The house feeds on certainty. Question every door you have already opened.",
    "Cold air means a threshold. Cold air where there was none means company.",
    "It mimics familiar voices. Answer nothing you cannot see.",
    "Candles gutter near the unseen. Watch the flame, not the dark.",
  ],
  zombie_outbreak: [
    "They hunt sound, not sight. Silence is your only armour.",
    "A bite is permanent. There is no cure in this building.",
    "Every lock you break is one you can never lock again.",
    "Count your exits before you count your enemies.",
  ],
  slasher_movie: [
    "Never investigate the noise. That is how the last three died.",
    "He cuts the power first. Plan for darkness, always.",
    "Never split up. Ever. He is counting on it.",
    "He does not run. He does not need to. Keep moving anyway.",
  ],
  alien_invasion: [
    "It tracks vibration. Walk as though the floor is listening.",
    "It adapts. Whatever defeated it last round will not work twice.",
    "Heat is a beacon. Kill your electronics when you can.",
    "If the geometry looks wrong, you are already standing inside it.",
  ],
  deep_sea_terror: [
    "Every hatch you seal removes one route forever. Choose carefully.",
    "Air is a finite resource. Treat each breath as a budget line.",
    "Pressure is patient. Water does not need to hurry.",
    "The sonar returning is not your signal. Something answered it.",
  ],
  cryptid_woods: [
    "It will not cross running water. A creek is a treaty line.",
    "It learns one new word every time you answer it. Stop answering.",
    "Marked trails lie after dark. Trust creek beds, not paint blazes.",
    "Old iron and salt buy minutes, not safety. Spend them moving.",
  ],
};

/** Tips for a theme, falling back to the global set. */
export function getTips(theme?: string): string[] {
  return (theme && THEME_TIPS[theme]) || HORROR_TIPS;
}

export const SUSPENSE_TEXTS = [
  "Who will survive?",
  "Who made the fatal mistake?",
  "The final verdict approaches...",
  "Your fate has been decided...",
];

export const RESULTS_CALC_ITEMS = ["calc1", "calc2", "calc3", "calc4"];

export const PROGRESSIVE_LOADING_SUFFIXES = [
  "Analyzing your previous choices...",
  "Crafting narrative consequences...",
  "Determining danger levels...",
  "Finalizing your personalized scenario...",
  "Almost ready...",
];

const CAUTIOUS_WORDS = [
  "carefully",
  "slowly",
  "quietly",
  "observe",
  "listen",
  "plan",
  "strategy",
  "safe",
  "caution",
  "think",
];

const AGGRESSIVE_WORDS = ["run", "charge", "attack", "rush", "fast", "immediately", "grab", "fight"];

const RECKLESS_WORDS = ["scream", "panic", "ignore", "foolish", "stupid"];

/** Detect tone keywords in the player's answer for the interactive loading screen. */
export function extractKeyWords(answer: string): WordTag[] {
  const words = answer.toLowerCase().split(/\W+/);
  const detected: WordTag[] = [];

  words.forEach((word) => {
    if (CAUTIOUS_WORDS.includes(word)) detected.push({ word, type: "cautious" });
    else if (AGGRESSIVE_WORDS.includes(word)) detected.push({ word, type: "aggressive" });
    else if (RECKLESS_WORDS.includes(word)) detected.push({ word, type: "reckless" });
  });

  return detected.slice(0, 6);
}
