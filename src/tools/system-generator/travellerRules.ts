/**
 * travellerRules.ts - Traveller RPG system rules and generation helpers
 * 
 * Contains lightweight Traveller helpers for system generation.
 * These are pure functions that don't depend on Obsidian APIs.
 */

import { SystemDraft } from "./SystemDraft";
import {
  deriveTradeCodesFromUWP,
  deriveBaseCodesFromBases,
  getUwpFromDraft,
  getPbgFromDraft,
  hexDigit,
  suggestZoneForDraft,
  rollFullSystemDraft,
  randomizeMapExtrasForDraft,
} from "./SystemDraft";

// Re-export the rule functions from SystemDraft for convenience
export {
  deriveTradeCodesFromUWP,
  deriveBaseCodesFromBases,
  getUwpFromDraft,
  getPbgFromDraft,
  hexDigit,
  suggestZoneForDraft,
  rollFullSystemDraft,
  randomizeMapExtrasForDraft,
} from "./SystemDraft";

/**
 * Derive trade codes from a SystemDraft
 */
export function deriveTradeCodesFromDraft(draft: SystemDraft): string[] {
  return deriveTradeCodesFromUWP({
    starport: draft.starport,
    size: draft.size,
    atmosphere: draft.atmosphere,
    hydrographics: draft.hydrographics,
    population: draft.population,
    government: draft.government,
    techLevel: draft.techLevel,
  });
}

/**
 * Derive base codes from a SystemDraft
 */
export function deriveBaseCodesFromDraft(draft: SystemDraft): string[] {
  return deriveBaseCodesFromBases(draft.bases);
}

/**
 * Get the full map line for a draft
 */
export function getMapLineFromDraftFull(draft: SystemDraft): string {
  const uwp = getUwpFromDraft(draft);
  const pbg = getPbgFromDraft(draft);
  const bases = deriveBaseCodesFromDraft(draft).join("/") || "-";
  const tradeCodes = deriveTradeCodesFromDraft(draft).join(" ") || "-";
  const zone = suggestZoneForDraft(draft);
  return `${draft.hex} ${draft.name} ${uwp} ${bases} ${tradeCodes} ${zone} ${pbg} ${draft.allegianceCode} ${draft.stellar}`;
}

/**
 * Roll a random UWP code
 */
export function rollUwp(): {
  starport: string;
  size: number;
  atmosphere: number;
  hydrographics: number;
  population: number;
  government: number;
  lawLevel: number;
  techLevel: number;
} {
  const rollStarport = (): string => {
    const weights = [0.1, 0.1, 0.2, 0.3, 0.2, 0.1]; // X, E, D, C, B, A
    const roll = Math.random();
    let cum = 0;
    for (let i = 0; i < weights.length; i++) {
      cum += weights[i];
      if (roll <= cum) return ["X", "E", "D", "C", "B", "A"][i];
    }
    return "C";
  };

  const rollSize = (): number => {
    const roll = Math.random();
    if (roll < 0.1) return 0;
    if (roll < 0.3) return Math.floor(Math.random() * 3) + 1; // 1-2
    if (roll < 0.7) return Math.floor(Math.random() * 6) + 3; // 3-8
    return Math.floor(Math.random() * 8) + 8; // 8-15
  };

  const rollAtmosphere = (): number => {
    const roll = Math.random();
    if (roll < 0.1) return 0;
    if (roll < 0.2) return 1;
    if (roll < 0.35) return 2;
    if (roll < 0.5) return 3;
    if (roll < 0.65) return 4;
    if (roll < 0.75) return 5;
    if (roll < 0.85) return 6;
    if (roll < 0.92) return 7;
    if (roll < 0.96) return 8;
    if (roll < 0.98) return 9;
    return Math.random() > 0.5 ? 10 : 11;
  };

  const rollHydrographics = (): number => {
    const roll = Math.random();
    if (roll < 0.1) return 0;
    if (roll < 0.3) return 1;
    if (roll < 0.5) return 2;
    if (roll < 0.65) return 3;
    if (roll < 0.75) return 4;
    if (roll < 0.85) return 5;
    if (roll < 0.92) return 6;
    return Math.random() > 0.5 ? 7 : 10;
  };

  const rollPopulation = (): number => {
    const roll = Math.random();
    if (roll < 0.1) return 0;
    if (roll < 0.25) return Math.floor(Math.random() * 4) + 1; // 1-3
    if (roll < 0.5) return Math.floor(Math.random() * 6) + 4; // 4-9
    if (roll < 0.8) return Math.floor(Math.random() * 4) + 10; // 10-13
    return Math.floor(Math.random() * 3) + 13; // 13-15
  };

  const rollGovernment = (): number => {
    const roll = Math.random();
    if (roll < 0.1) return 0;
    if (roll < 0.25) return 1;
    if (roll < 0.4) return 2;
    if (roll < 0.55) return 3;
    if (roll < 0.7) return 4;
    if (roll < 0.8) return 5;
    if (roll < 0.88) return 6;
    if (roll < 0.93) return 7;
    if (roll < 0.96) return 8;
    if (roll < 0.98) return 9;
    return Math.random() > 0.5 ? 10 : 13;
  };

  const rollLawLevel = (): number => {
    return Math.floor(Math.random() * 16);
  };

  const rollTechLevel = (): number => {
    const roll = Math.random();
    if (roll < 0.1) return Math.floor(Math.random() * 6); // 0-5
    if (roll < 0.3) return Math.floor(Math.random() * 6) + 6; // 6-11
    return Math.floor(Math.random() * 5) + 12; // 12-16
  };

  return {
    starport: rollStarport(),
    size: rollSize(),
    atmosphere: rollAtmosphere(),
    hydrographics: rollHydrographics(),
    population: rollPopulation(),
    government: rollGovernment(),
    lawLevel: rollLawLevel(),
    techLevel: rollTechLevel(),
  };
}

/**
 * Roll random map extras (PBG, belts, gas giants, stellar)
 */
export function rollMapExtras(): {
  popMultiplier: number;
  belts: number;
  gasGiants: number;
  pbg: string;
  stellar: string;
} {
  const rollPopMultiplier = (): number => {
    const roll = Math.random();
    if (roll < 0.5) return 0;
    if (roll < 0.7) return 1;
    if (roll < 0.85) return 2;
    if (roll < 0.95) return 3;
    return Math.random() > 0.5 ? 4 : 5;
  };

  const rollBelts = (): number => {
    const roll = Math.random();
    if (roll < 0.6) return 0;
    if (roll < 0.8) return 1;
    if (roll < 0.95) return 2;
    return 3;
  };

  const rollGasGiants = (): number => {
    const roll = Math.random();
    if (roll < 0.2) return 0;
    if (roll < 0.6) return 1;
    if (roll < 0.9) return 2;
    return 3;
  };

  const rollStellar = (): string => {
    const types = ["M", "K", "G", "F", "A", "B", "O"];
    const nums = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const classes = ["V", "IV", "III", "II", "I", "D", "SD"];
    return `${types[Math.floor(Math.random() * types.length)]}${nums[Math.floor(Math.random() * nums.length)]} ${classes[Math.floor(Math.random() * classes.length)]}`;
  };

  const popMult = rollPopMultiplier();
  const belts = rollBelts();
  const gasGiants = rollGasGiants();
  const pbg = `${hexDigit(popMult)}${hexDigit(belts)}${hexDigit(gasGiants)}`;
  const stellar = rollStellar();

  return { popMultiplier: popMult, belts, gasGiants, pbg, stellar };
}

/**
 * Roll random bases
 */
export function rollBases(): string[] {
  const bases = ["Naval", "Scout", "Research", "Corporate", "Military"];
  const result: string[] = [];
  for (const base of bases) {
    if (Math.random() > 0.7) result.push(base);
  }
  return result;
}

/**
 * Roll random fuel sources
 */
export function rollFuelSources(): string[] {
  const sources = ["gas giant", "water", "hydrogen", "mineral", "refinery"];
  const result: string[] = [];
  for (const source of sources) {
    if (Math.random() > 0.5) result.push(source);
  }
  return result.length > 0 ? result : ["gas giant"];
}

/**
 * Roll random routes
 */
export function rollRoutes(): { xboatRoute: boolean; tradeRoute: boolean; patrolRoute: boolean } {
  return {
    xboatRoute: Math.random() > 0.7,
    tradeRoute: Math.random() > 0.5,
    patrolRoute: Math.random() > 0.6,
  };
}

/**
 * Roll a complete random system draft with all fields
 */
export function rollCompleteSystemDraft(): SystemDraft {
  const uwp = rollUwp();
  const mapExtras = rollMapExtras();
  const bases = rollBases();
  const fuelSources = rollFuelSources();
  const routes = rollRoutes();

  return {
    hex: Math.floor(Math.random() * 10000).toString().padStart(4, "0"),
    name: "Unnamed",

    frontierCore: 35,
    dangerLevel: 25,
    corporateInfluence: 25,
    weirdnessLevel: 15,

    starport: uwp.starport,
    size: uwp.size,
    atmosphere: uwp.atmosphere,
    hydrographics: uwp.hydrographics,
    population: uwp.population,
    government: uwp.government,
    lawLevel: uwp.lawLevel,
    techLevel: uwp.techLevel,

    allegiance: "Independent",
    allegianceCode: "In",
    travelZone: "Green",

    popMultiplier: mapExtras.popMultiplier,
    belts: mapExtras.belts,
    gasGiants: mapExtras.gasGiants,
    pbg: mapExtras.pbg,
    stellar: mapExtras.stellar,
    worldCount: 1,

    bases,
    baseCodes: deriveBaseCodesFromBases(bases),
    tradeCodes: deriveTradeCodesFromUWP(uwp),

    refinedFuel: true,
    unrefinedFuel: true,
    wildernessRefuelling: true,
    fuelSources,

    xboatRoute: routes.xboatRoute,
    tradeRoute: routes.tradeRoute,
    patrolRoute: routes.patrolRoute,

    dossierStyle: "Balanced",
    dossierComplexity: "Layered",
    dossierDensity: 3,

    salvageRating: 0,
    repairCapacity: "standard",
    industrialDecay: 0,
    laborUnrest: 0,
    militiaStrength: 0,
    blackMarketPresence: 0,
    collapseRisk: 0,
    autocracyPressure: 0,
    routeSecurity: 50,
    fuelReliability: 70,
  };
}
