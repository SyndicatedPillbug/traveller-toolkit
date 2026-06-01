// ============================================================================
// Traveller Constants
// ============================================================================

export const HEX = "0123456789ABCDEF";

export const STARPORTS: Record<string, string> = {
  A: "Excellent",
  B: "Good",
  C: "Routine",
  D: "Poor",
  E: "Frontier",
  X: "No starport",
};

export const ATMOSPHERES: Record<number, string> = {
  0: "None",
  1: "Trace",
  2: "Very thin, tainted",
  3: "Very thin",
  4: "Thin, tainted",
  5: "Thin",
  6: "Standard",
  7: "Standard, tainted",
  8: "Dense",
  9: "Dense, tainted",
  10: "Exotic",
  11: "Corrosive",
  12: "Insidious",
  13: "Dense, high",
  14: "Thin, low",
  15: "Unusual",
};

export const GOVERNMENTS: Record<number, string> = {
  0: "None",
  1: "Company/corporation or family/clan",
  2: "Participating democracy",
  3: "Self-perpetuating oligarchy",
  4: "Representative democracy",
  5: "Feudal technocracy",
  6: "Captive government / colony",
  7: "Balkanized",
  8: "Civil service bureaucracy",
  9: "Impersonal bureaucracy",
  10: "Charismatic dictator",
  11: "Non-charismatic dictator",
  12: "Charismatic oligarchy",
  13: "Religious dictatorship",
  14: "Religious autocracy",
  15: "Totalitarian oligarchy",
};

export const TRAVEL_ZONES = ["Green", "Amber", "Red"] as const;

export const BASE_OPTIONS = [
  "Naval",
  "Scout",
  "Research",
  "Corporate",
  "Military",
  "Pirate",
  "Ancient Site",
] as const;

export const BASE_CODES: Record<string, string> = {
  Naval: "N",
  Scout: "S",
  Research: "R",
  Corporate: "C",
  Military: "M",
  Pirate: "P",
  "Ancient Site": "A",
};

export const SUPPORT_NOTES = [
  { id: "npcs", fileName: "NPCs.md", label: "NPCs" },
  { id: "factions", fileName: "Factions.md", label: "Factions" },
  { id: "rumors", fileName: "Rumors.md", label: "Rumors" },
  { id: "traffic", fileName: "Ships and Traffic.md", label: "Ships and Traffic" },
  { id: "sessions", fileName: "Sessions.md", label: "Sessions" },
] as const;

// ============================================================================
// Default Allegiances
// ============================================================================

export const DEFAULT_ALLEGIANCES = [
  "Independent",
  "Sallowfall Holdings",
  "Corporate Client",
  "Port League",
  "Autocracy",
  "Frontier Autonomous",
  "Disputed",
  "Unclaimed",
] as const;

// ============================================================================
// UI Constants
// ============================================================================

export const CSS_PREFIX = "ttk";
export const PLUGIN_ID = "traveller-toolkit";
export const VIEW_TYPE = "traveller-toolkit-view";
