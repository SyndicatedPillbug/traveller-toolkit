/**
 * SystemDraft - Single source of truth for new system creation
 * 
 * All UI controls update this draft object.
 * Preview reads from this draft.
 * Create System uses this draft.
 * Template context is built from this draft.
 */

export interface SystemDraft {
  hex: string;
  name: string;

  // Generation direction sliders (0-100 for precision)
  frontierCore: number;
  dangerLevel: number;
  corporateInfluence: number;
  weirdnessLevel: number;

  // Mainworld UWP fields
  starport: string;
  size: number;
  atmosphere: number;
  hydrographics: number;
  population: number;
  government: number;
  lawLevel: number;
  techLevel: number;

  // Allegiance and zone
  allegiance: string;
  allegianceCode: string;
  travelZone: "Green" | "Amber" | "Red";

  // Map metadata
  popMultiplier: number;
  belts: number;
  gasGiants: number;
  pbg: string;
  stellar: string;
  worldCount: number;

  // Bases
  bases: string[];
  baseCodes: string[];
  tradeCodes: string[];

  // Fuel
  refinedFuel: boolean;
  unrefinedFuel: boolean;
  wildernessRefuelling: boolean;
  fuelSources: string[];

  // Routes
  xboatRoute: boolean;
  tradeRoute: boolean;
  patrolRoute: boolean;

  // Dossier options
  dossierStyle: string;
  dossierComplexity: string;
  dossierDensity: number;

  // Ardress pressure profile
  salvageRating: number;
  repairCapacity: string;
  industrialDecay: number;
  laborUnrest: number;
  militiaStrength: number;
  blackMarketPresence: number;
  collapseRisk: number;
  autocracyPressure: number;
  routeSecurity: number;
  fuelReliability: number;
}

/**
 * Default values for a new system draft
 */
export function createDefaultSystemDraft(): SystemDraft {
  return {
    hex: "0000",
    name: "Unnamed",

    frontierCore: 35,
    dangerLevel: 25,
    corporateInfluence: 25,
    weirdnessLevel: 15,

    starport: "C",
    size: 7,
    atmosphere: 6,
    hydrographics: 7,
    population: 6,
    government: 4,
    lawLevel: 5,
    techLevel: 8,

    allegiance: "Independent",
    allegianceCode: "In",
    travelZone: "Green",

    popMultiplier: 1,
    belts: 0,
    gasGiants: 1,
    pbg: "101",
    stellar: "G2 V",
    worldCount: 1,

    bases: [],
    baseCodes: [],
    tradeCodes: [],

    refinedFuel: true,
    unrefinedFuel: true,
    wildernessRefuelling: true,
    fuelSources: ["gas giant"],

    xboatRoute: false,
    tradeRoute: false,
    patrolRoute: false,

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

/**
 * Normalize draft values - clamp, validate, derive fields
 */
export function normalizeDraft(draft: Partial<SystemDraft>): SystemDraft {
  const base = createDefaultSystemDraft();
  
  return {
    ...base,
    // Normalize hex
    hex: normalizeHexForDraft(draft.hex),
    
    // Normalize name
    name: draft.name ? normalizeSystemName(draft.name) : base.name,
    
    // Sliders (0-100)
    frontierCore: clampNumber(draft.frontierCore, 0, 100),
    dangerLevel: clampNumber(draft.dangerLevel, 0, 100),
    corporateInfluence: clampNumber(draft.corporateInfluence, 0, 100),
    weirdnessLevel: clampNumber(draft.weirdnessLevel, 0, 100),
    
    // UWP fields
    starport: validStarport(draft.starport) ? draft.starport : base.starport,
    size: clampNumber(draft.size, 0, 15),
    atmosphere: clampNumber(draft.atmosphere, 0, 15),
    hydrographics: clampNumber(draft.hydrographics, 0, 10),
    population: clampNumber(draft.population, 0, 15),
    government: clampNumber(draft.government, 0, 15),
    lawLevel: clampNumber(draft.lawLevel, 0, 15),
    techLevel: clampNumber(draft.techLevel, 0, 15),
    
    // Allegiance
    allegiance: draft.allegiance || base.allegiance,
    allegianceCode: draft.allegianceCode || base.allegianceCode,
    travelZone: draft.travelZone || base.travelZone,
    
    // Map metadata
    popMultiplier: clampNumber(draft.popMultiplier, 0, 9),
    belts: clampNumber(draft.belts, 0, 9),
    gasGiants: clampNumber(draft.gasGiants, 0, 9),
    pbg: draft.pbg || base.pbg,
    stellar: draft.stellar || base.stellar,
    worldCount: clampNumber(draft.worldCount, 1, 99),
    
    // Bases
    bases: draft.bases || [],
    baseCodes: draft.baseCodes || deriveBaseCodesFromBases(draft.bases || []),
    tradeCodes: draft.tradeCodes || deriveTradeCodesFromUWP({
      starport: draft.starport || base.starport,
      size: draft.size ?? base.size,
      atmosphere: draft.atmosphere ?? base.atmosphere,
      hydrographics: draft.hydrographics ?? base.hydrographics,
      population: draft.population ?? base.population,
      government: draft.government ?? base.government,
      techLevel: draft.techLevel ?? base.techLevel,
    }),
    
    // Fuel
    refinedFuel: draft.refinedFuel !== undefined ? draft.refinedFuel : base.refinedFuel,
    unrefinedFuel: draft.unrefinedFuel !== undefined ? draft.unrefinedFuel : base.unrefinedFuel,
    wildernessRefuelling: draft.wildernessRefuelling !== undefined ? draft.wildernessRefuelling : base.wildernessRefuelling,
    fuelSources: draft.fuelSources || base.fuelSources,
    
    // Routes
    xboatRoute: draft.xboatRoute !== undefined ? draft.xboatRoute : base.xboatRoute,
    tradeRoute: draft.tradeRoute !== undefined ? draft.tradeRoute : base.tradeRoute,
    patrolRoute: draft.patrolRoute !== undefined ? draft.patrolRoute : base.patrolRoute,
    
    // Dossier
    dossierStyle: draft.dossierStyle || base.dossierStyle,
    dossierComplexity: draft.dossierComplexity || base.dossierComplexity,
    dossierDensity: clampNumber(draft.dossierDensity, 1, 5),
    
    // Pressure profile
    salvageRating: clampNumber(draft.salvageRating, 0, 100),
    repairCapacity: draft.repairCapacity || base.repairCapacity,
    industrialDecay: clampNumber(draft.industrialDecay, 0, 100),
    laborUnrest: clampNumber(draft.laborUnrest, 0, 100),
    militiaStrength: clampNumber(draft.militiaStrength, 0, 100),
    blackMarketPresence: clampNumber(draft.blackMarketPresence, 0, 100),
    collapseRisk: clampNumber(draft.collapseRisk, 0, 100),
    autocracyPressure: clampNumber(draft.autocracyPressure, 0, 100),
    routeSecurity: clampNumber(draft.routeSecurity, 0, 100),
    fuelReliability: clampNumber(draft.fuelReliability, 0, 100),
  };
}

/**
 * Helper functions
 */

export function clampNumber(value: number | undefined, min: number, max: number): number {
  if (value === undefined || isNaN(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(Number(value))));
}

export function normalizeHexForDraft(value: string | undefined): string {
  if (!value) return "0000";
  const digits = String(value).trim().replace(/[^0-9]/g, "");
  if (!digits) return "0000";
  return digits.padStart(4, "0").slice(-4);
}

export function normalizeSystemName(value: string | undefined): string {
  if (!value) return "Unnamed";
  return String(value)
    .replace(/^_/, "")
    .replace(/\s+System$/i, "")
    .trim();
}

export function validStarport(value: string | undefined): value is string {
  return value !== undefined && ["X", "E", "D", "C", "B", "A"].includes(value);
}

/**
 * Derive base codes from base names
 */
export function deriveBaseCodesFromBases(bases: string[]): string[] {
  const baseCodeMap: Record<string, string> = {
    "Naval": "N",
    "Scout": "S",
    "Research": "R",
    "Corporate": "C",
    "Military": "M",
    "Pirate": "P",
    "Ancient Site": "A",
  };
  return bases.map(b => baseCodeMap[b] || b[0]).filter(Boolean);
}

/**
 * Derive trade codes from UWP
 */
export function deriveTradeCodesFromUWP(uwp: {
  starport: string;
  size: number;
  atmosphere: number;
  hydrographics: number;
  population: number;
  government: number;
  techLevel: number;
}): string[] {
  const codes: string[] = [];
  const { starport, size, atmosphere, hydrographics, population, government, techLevel } = uwp;
  
  // Agricultural
  if (["4", "5", "6", "7"].includes(starport) && 
      ["4", "5", "6", "8"].includes(String(atmosphere)) && 
      ["4", "5", "6", "7"].includes(String(hydrographics))) {
    codes.push("Ag");
  }
  
  // Asteroid
  if (size === 0) {
    codes.push("As");
  }
  
  // Barren
  if (population === 0) {
    codes.push("Ba");
  }
  
  // Desert
  if (["2", "3", "4", "5", "9", "A", "B"].includes(String(atmosphere)) && 
      hydrographics === 0) {
    codes.push("De");
  }
  
  // Fluid Oceans
  if (["A", "B", "C", "E"].includes(starport) && 
      ["A", "B", "C"].includes(String(atmosphere)) && 
      ["A", "B", "C", "D", "E"].includes(String(hydrographics))) {
    codes.push("Fl");
  }
  
  // Garden
  if (["6", "7", "8"].includes(String(atmosphere)) && 
      ["5", "6", "7", "8"].includes(String(hydrographics)) && 
      population >= 5) {
    codes.push("Ga");
  }
  
  // High Population
  if (population >= 9) {
    codes.push("Hi");
  }
  
  // High Tech
  if (techLevel >= 12) {
    codes.push("Ht");
  }
  
  // Ice-capped
  if (["9", "A", "B", "C"].includes(String(atmosphere)) && 
      hydrographics >= 1) {
    codes.push("Ic");
  }
  
  // Industrial
  if (["A", "B", "C"].includes(starport) && 
      population >= 7) {
    codes.push("In");
  }
  
  // Low Population
  if (population <= 3) {
    codes.push("Lo");
  }
  
  // Low Tech
  if (techLevel <= 5) {
    codes.push("Lt");
  }
  
  // Non-Agricultural
  if (["0", "1", "2", "3", "9", "A", "B", "C"].includes(String(atmosphere))) {
    codes.push("Na");
  }
  
  // Non-Industrial
  if (population <= 6) {
    codes.push("Ni");
  }
  
  // Poor
  if (["0", "1", "2", "3", "4", "5"].includes(starport) && 
      population <= 6) {
    codes.push("Po");
  }
  
  // Rich
  if (["A", "B", "C"].includes(starport) && 
      population >= 6) {
    codes.push("Ri");
  }
  
  // Vacuum
  if (size === 0 || atmosphere === 0) {
    codes.push("Va");
  }
  
  // Water World
  if (hydrographics >= 10) {
    codes.push("Wa");
  }
  
  return codes;
}

/**
 * Get UWP string from draft
 */
export function getUwpFromDraft(draft: SystemDraft): string {
  return `${draft.starport}${draft.size}${draft.atmosphere}${draft.hydrographics}${draft.population}${draft.government}${draft.lawLevel}-${draft.techLevel}`;
}

/**
 * Get PBG string from draft
 */
export function getPbgFromDraft(draft: SystemDraft): string {
  return `${hexDigit(draft.popMultiplier)}${hexDigit(draft.belts)}${hexDigit(draft.gasGiants)}`;
}

/**
 * Get map line from draft
 */
export function getMapLineFromDraft(draft: SystemDraft): string {
  const uwp = getUwpFromDraft(draft);
  const pbg = getPbgFromDraft(draft);
  const bases = draft.baseCodes.join("/") || "-";
  const tradeCodes = draft.tradeCodes.join(" ") || "-";
  return `${draft.hex} ${draft.name} ${uwp} ${bases} ${tradeCodes} ${draft.travelZone} ${pbg} ${draft.allegianceCode} ${draft.stellar}`;
}

/**
 * Convert number to hex digit
 */
export function hexDigit(n: number): string {
  return Math.max(0, Math.min(15, Math.floor(n))).toString(16).toUpperCase();
}

/**
 * Suggest travel zone based on UWP
 */
export function suggestZoneForDraft(draft: SystemDraft): "Green" | "Amber" | "Red" {
  // Simple heuristic based on law and starport
  const { starport, lawLevel } = draft;
  
  if (starport === "X" || lawLevel >= 10) {
    return "Red";
  }
  if (starport === "E" || lawLevel >= 7) {
    return "Amber";
  }
  return "Green";
}

/**
 * Roll a full system draft with random values
 */
export function rollFullSystemDraft(existingDraft: Partial<SystemDraft> = {}): SystemDraft {
  const draft = normalizeDraft(existingDraft);
  
  return {
    ...draft,
    hex: generateRandomHex(),
    name: generateRandomName(),
    
    starport: rollStarport(),
    size: rollSize(),
    atmosphere: rollAtmosphere(),
    hydrographics: rollHydrographics(),
    population: rollPopulation(),
    government: rollGovernment(),
    lawLevel: rollLawLevel(),
    techLevel: rollTechLevel(),
    
    tradeCodes: deriveTradeCodesFromUWP({
      starport: draft.starport,
      size: draft.size,
      atmosphere: draft.atmosphere,
      hydrographics: draft.hydrographics,
      population: draft.population,
      government: draft.government,
      techLevel: draft.techLevel,
    }),
    
    pbg: getPbgFromDraft({
      ...draft,
      popMultiplier: rollPopMultiplier(),
      belts: rollBelts(),
      gasGiants: rollGasGiants(),
    }),
    popMultiplier: rollPopMultiplier(),
    belts: rollBelts(),
    gasGiants: rollGasGiants(),
    stellar: rollStellar(),
    worldCount: rollWorldCount(),
    
    bases: rollBases(),
    baseCodes: deriveBaseCodesFromBases(rollBases()),
    
    travelZone: suggestZoneForDraft(draft),
    
    refinedFuel: Math.random() > 0.3,
    unrefinedFuel: Math.random() > 0.2,
    wildernessRefuelling: Math.random() > 0.5,
    fuelSources: rollFuelSources(),
    
    xboatRoute: Math.random() > 0.7,
    tradeRoute: Math.random() > 0.5,
    patrolRoute: Math.random() > 0.6,
  };
}

/**
 * Random generators
 */

function generateRandomHex(): string {
  return Math.floor(Math.random() * 10000).toString().padStart(4, "0");
}

function generateRandomName(): string {
  const names = ["Milice", "Cigrdu", "Dengiz", "Ardress", "Vland", "Glisten", "Biter", "Mare", "Trin", "Nix", "Pole", "Roug"];
  return names[Math.floor(Math.random() * names.length)];
}

function rollStarport(): string {
  const weights = [0.1, 0.1, 0.2, 0.3, 0.2, 0.1]; // X, E, D, C, B, A
  const roll = Math.random();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (roll <= cum) return ["X", "E", "D", "C", "B", "A"][i];
  }
  return "C";
}

function rollSize(): number {
  const roll = Math.random();
  if (roll < 0.1) return 0;
  if (roll < 0.3) return Math.floor(Math.random() * 3); // 1-2
  if (roll < 0.7) return Math.floor(Math.random() * 6) + 3; // 3-8
  return Math.floor(Math.random() * 8) + 8; // 8-15
}

function rollAtmosphere(): number {
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
}

function rollHydrographics(): number {
  const roll = Math.random();
  if (roll < 0.1) return 0;
  if (roll < 0.3) return 1;
  if (roll < 0.5) return 2;
  if (roll < 0.65) return 3;
  if (roll < 0.75) return 4;
  if (roll < 0.85) return 5;
  if (roll < 0.92) return 6;
  return Math.random() > 0.5 ? 7 : 10;
}

function rollPopulation(): number {
  const roll = Math.random();
  if (roll < 0.1) return 0;
  if (roll < 0.25) return Math.floor(Math.random() * 4); // 1-3
  if (roll < 0.5) return Math.floor(Math.random() * 6) + 4; // 4-9
  if (roll < 0.8) return Math.floor(Math.random() * 4) + 10; // 10-13
  return Math.floor(Math.random() * 3) + 13; // 13-15
}

function rollGovernment(): number {
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
}

function rollLawLevel(): number {
  return Math.floor(Math.random() * 16);
}

function rollTechLevel(): number {
  const roll = Math.random();
  if (roll < 0.1) return Math.floor(Math.random() * 6); // 0-5
  if (roll < 0.3) return Math.floor(Math.random() * 6) + 6; // 6-11
  return Math.floor(Math.random() * 5) + 12; // 12-16
}

function rollPopMultiplier(): number {
  const roll = Math.random();
  if (roll < 0.5) return 0;
  if (roll < 0.7) return 1;
  if (roll < 0.85) return 2;
  if (roll < 0.95) return 3;
  return Math.random() > 0.5 ? 4 : 5;
}

function rollBelts(): number {
  const roll = Math.random();
  if (roll < 0.6) return 0;
  if (roll < 0.8) return 1;
  if (roll < 0.95) return 2;
  return 3;
}

function rollGasGiants(): number {
  const roll = Math.random();
  if (roll < 0.2) return 0;
  if (roll < 0.6) return 1;
  if (roll < 0.9) return 2;
  return 3;
}

function rollStellar(): string {
  const types = ["M", "K", "G", "F", "A", "B", "O"];
  const nums = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const classes = ["V", "IV", "III", "II", "I", "D", "SD"];
  return `${types[Math.floor(Math.random() * types.length)]}${nums[Math.floor(Math.random() * nums.length)]} ${classes[Math.floor(Math.random() * classes.length)]}`;
}

function rollWorldCount(): number {
  const roll = Math.random();
  if (roll < 0.5) return 1;
  if (roll < 0.8) return Math.floor(Math.random() * 4) + 2; // 2-5
  return Math.floor(Math.random() * 5) + 6; // 6-10
}

function rollBases(): string[] {
  const bases = ["Naval", "Scout", "Research", "Corporate", "Military"];
  const result: string[] = [];
  for (const base of bases) {
    if (Math.random() > 0.7) result.push(base);
  }
  return result;
}

function rollFuelSources(): string[] {
  const sources = ["gas giant", "water", "hydrogen", "mineral", "refinery"];
  const result: string[] = [];
  for (const source of sources) {
    if (Math.random() > 0.5) result.push(source);
  }
  return result.length > 0 ? result : ["gas giant"];
}

/**
 * Randomize map extras for draft
 */
export function randomizeMapExtrasForDraft(draft: SystemDraft): SystemDraft {
  return {
    ...draft,
    pbg: getPbgFromDraft({
      ...draft,
      popMultiplier: rollPopMultiplier(),
      belts: rollBelts(),
      gasGiants: rollGasGiants(),
    }),
    popMultiplier: rollPopMultiplier(),
    belts: rollBelts(),
    gasGiants: rollGasGiants(),
    stellar: rollStellar(),
    worldCount: rollWorldCount(),
    bases: rollBases(),
    baseCodes: deriveBaseCodesFromBases(rollBases()),
    fuelSources: rollFuelSources(),
    xboatRoute: Math.random() > 0.7,
    tradeRoute: Math.random() > 0.5,
    patrolRoute: Math.random() > 0.6,
  };
}

/**
 * Populate draft from loaded system frontmatter
 */
export function populateDraftFromFrontmatter(draft: SystemDraft, fm: Record<string, unknown>): SystemDraft {
  const readStr = (keys: string[], fallback: string) => {
    for (const k of keys) {
      const v = fm[k];
      if (v !== undefined && v !== null) return String(v);
    }
    return fallback;
  };
  const readNum = (keys: string[], fallback: number) => {
    for (const k of keys) {
      const v = fm[k];
      if (v !== undefined && v !== null && !isNaN(Number(v))) return Number(v);
    }
    return fallback;
  };
  const readBool = (keys: string[], fallback: boolean) => {
    for (const k of keys) {
      const v = fm[k];
      if (typeof v === "boolean") return v;
      if (typeof v === "string") {
        if (["true", "yes", "1"].includes(v.toLowerCase())) return true;
        if (["false", "no", "0"].includes(v.toLowerCase())) return false;
      }
    }
    return fallback;
  };
  const readArr = (keys: string[]): string[] => {
    for (const k of keys) {
      const v = fm[k];
      if (Array.isArray(v)) return v.map(String);
      if (typeof v === "string" && v.trim()) {
        return v.split(",").map(x => x.trim()).filter(Boolean);
      }
    }
    return [];
  };
  
  return normalizeDraft({
    ...draft,
    hex: readStr(["hex", "system_hex"], draft.hex),
    name: readStr(["mainworld", "name"], draft.name),
    
    starport: readStr(["starport"], draft.starport),
    size: readNum(["size"], draft.size),
    atmosphere: readNum(["atmosphere", "atm"], draft.atmosphere),
    hydrographics: readNum(["hydrographics", "hydro"], draft.hydrographics),
    population: readNum(["population", "pop"], draft.population),
    government: readNum(["government", "gov"], draft.government),
    lawLevel: readNum(["law_level", "law"], draft.lawLevel),
    techLevel: readNum(["tech_level", "tl"], draft.techLevel),
    
    allegiance: readStr(["allegiance"], draft.allegiance),
    allegianceCode: readStr(["allegiance_code"], draft.allegianceCode),
    travelZone: readStr(["travel_zone", "zone"], draft.travelZone) as "Green" | "Amber" | "Red",
    
    pbg: readStr(["pbg"], draft.pbg),
    popMultiplier: readNum(["population_multiplier"], draft.popMultiplier),
    belts: readNum(["belts"], draft.belts),
    gasGiants: readNum(["gas_giants", "gas_giant"], draft.gasGiants),
    stellar: readStr(["stellar_data", "stellar", "primary_star"], draft.stellar),
    worldCount: readNum(["world_count"], draft.worldCount),
    
    bases: readArr(["bases"]),
    baseCodes: readArr(["base_codes"]),
    tradeCodes: readArr(["trade_codes", "remarks"]),
    
    refinedFuel: readBool(["refined_fuel", "refined_fuel_available"], draft.refinedFuel),
    unrefinedFuel: readBool(["unrefined_fuel", "unrefined_fuel_available"], draft.unrefinedFuel),
    wildernessRefuelling: readBool(["wilderness_refuelling"], draft.wildernessRefuelling),
    fuelSources: readArr(["fuel_sources"]),
    
    xboatRoute: readBool(["xboat_route"], draft.xboatRoute),
    tradeRoute: readBool(["trade_route"], draft.tradeRoute),
    patrolRoute: readBool(["patrol_route"], draft.patrolRoute),
    
    salvageRating: readNum(["salvage_rating"], draft.salvageRating),
    repairCapacity: readStr(["repair_capacity"], draft.repairCapacity),
    industrialDecay: readNum(["industrial_decay"], draft.industrialDecay),
    laborUnrest: readNum(["labor_unrest"], draft.laborUnrest),
    militiaStrength: readNum(["militia_strength"], draft.militiaStrength),
    blackMarketPresence: readNum(["black_market_presence"], draft.blackMarketPresence),
    collapseRisk: readNum(["collapse_risk"], draft.collapseRisk),
    autocracyPressure: readNum(["autocracy_pressure"], draft.autocracyPressure),
    routeSecurity: readNum(["route_security"], draft.routeSecurity),
    fuelReliability: readNum(["fuel_reliability"], draft.fuelReliability),
  });
}
