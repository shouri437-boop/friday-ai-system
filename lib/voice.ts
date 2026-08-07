"use client";

export interface VoiceOption {
  id: string;
  name: string;
  accent: string;
  description: string;
}

// ─── Preferred Soft & Feminine Voices List ──────────────────────────────────
export const SOFT_FEMININE_VOICES = [
  {
    keywords: ["sonia", "uk english female", "hazel", "maisie", "mia"],
    accent: "Soft British (UK)",
  },
  {
    keywords: ["jenny", "aria", "zira", "samantha", "clara", "us english"],
    accent: "Soft American (US)",
  },
  {
    keywords: ["karen", "serena", "victoria", "tessa", "veena", "moira"],
    accent: "Soft International",
  },
];

/**
 * Returns the best matching soft & feminine SpeechSynthesisVoice from available browser voices.
 */
export function getSoftFeminineVoice(preferredAccent: string = "soft-uk"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. High-priority exact & natural soft female voice names
  const topTierVoiceNames = [
    // Soft British / UK Accents
    "Microsoft Sonia Online (Natural) - English (United Kingdom)",
    "Microsoft Maisie Online (Natural) - English (United Kingdom)",
    "Microsoft Mia Online (Natural) - English (United Kingdom)",
    "Google UK English Female",
    "Microsoft Hazel Desktop - English (Great Britain)",
    // Soft US Accents
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Clara Online (Natural) - English (Canada)",
    "Samantha",
    "Serena",
    "Victoria",
    "Google US English",
    "Karen",
    "Veena",
    "Microsoft Zira - English (United States)",
  ];

  // If user requested UK accent specifically
  if (preferredAccent === "soft-uk") {
    const ukVoice = voices.find(
      (v) =>
        /uk|great britain|england|en-gb/i.test(v.name + v.lang) &&
        /female|sonia|hazel|maisie|mia|woman/i.test(v.name)
    );
    if (ukVoice) return ukVoice;
  }

  // If user requested US accent specifically
  if (preferredAccent === "soft-us") {
    const usVoice = voices.find(
      (v) =>
        /us|united states|en-us/i.test(v.name + v.lang) &&
        /female|jenny|aria|zira|samantha|clara|woman/i.test(v.name)
    );
    if (usVoice) return usVoice;
  }

  // Check top tier exact names
  for (const name of topTierVoiceNames) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }

  // Fallback: any voice containing "female", "natural", or "soft" in English
  const regexMatch = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      /(female|natural|woman|soft|samantha|zira|karen|victoria)/i.test(v.name)
  );
  if (regexMatch) return regexMatch;

  // Ultimate fallback: first English voice
  return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
}

/**
 * Configure a SpeechSynthesisUtterance for a soothing, soft, feminine acoustic output.
 */
export function configureSoftFeminineUtterance(
  utterance: SpeechSynthesisUtterance,
  accent: string = "soft-uk"
): SpeechSynthesisUtterance {
  const voice = getSoftFeminineVoice(accent);
  if (voice) {
    utterance.voice = voice;
  }

  // Acoustic parameters for soft, gentle, warm feminine speech
  utterance.pitch = 1.22; // Elevates pitch slightly to a gentle, sweet feminine register
  utterance.rate = 0.90;  // Slightly relaxed rate (0.90x) for a calm, soft, smooth cadence
  utterance.volume = 0.95; // Gentle, clean volume output

  return utterance;
}
