import { LoadedSystem } from "../..//app/types";

export interface TravellerTemplateContext {
  loadedSystem: LoadedSystem;
  hex: string;
  name: string;
  systemName: string;
  systemFolder: string;
  systemNotePath: string;
  mainworldPath: string;
  supportPaths: Record<string, string>;
  date: string;

  uwp: string;
  starport: string;
  size: number;
  atmosphere: number;
  hydrographics: number;
  population: number;
  government: number;
  lawLevel: number;
  techLevel: number;

  tradeCodes: string[];
  bases: string[];
  baseCodes: string[];
  allegiance: string;
  allegianceCode: string;
  travelZone: string;
  pbg: string;
  populationMultiplier: number;
  belts: number;
  gasGiants: number;
  stellarData: string;
  worldCount: number;

  refinedFuel: boolean;
  unrefinedFuel: boolean;
  wildernessRefuelling: boolean;
  fuelSources: string[];
  repairCapacity: string;
  salvageRating: string;
  routeSecurity: string;
  fuelReliability: string;

  industrialDecay: string;
  laborUnrest: string;
  militiaStrength: string;
  blackMarketPresence: string;
  collapseRisk: string;
  autocracyPressure: string;

  xboatRoute: boolean;
  tradeRoute: boolean;
  patrolRoute: boolean;
  linkedRoutes: string[];
  linkedConflicts: string[];
  linkedRuins: string[];
  controllingFactions: string[];
  localRivals: string[];

  dossierMarkdown?: string;
  metadata: Record<string, unknown>;
}

export function yamlString(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"");
}

export function yamlArray(values: unknown[] | undefined): string {
  const arr = Array.isArray(values) ? values : [];
  if (!arr.length) return "[]";
  return "[" + arr.map((v) => `"${yamlString(v)}"`).join(", ") + "]";
}

export function blockList(values: unknown[] | undefined, indent = 0): string {
  const arr = Array.isArray(values) ? values : [];
  const pad = " ".repeat(indent);
  if (!arr.length) return `${pad}[]`;
  return arr.map((v) => `${pad}- ${yamlString(v)}`).join("\n");
}

export function noExt(path: string): string {
  return String(path || "").replace(/\.md$/i, "");
}

export function wiki(path: string, label: string): string {
  return `[[${noExt(path)}|${label}]]`;
}

export function readString(meta: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = meta[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return fallback;
}

export function readNumber(meta: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = meta[key];
    if (value !== undefined && value !== null && !Number.isNaN(Number(value))) return Number(value);
  }
  return fallback;
}

export function readBoolean(meta: Record<string, unknown>, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (["true", "yes", "1"].includes(value.toLowerCase())) return true;
      if (["false", "no", "0"].includes(value.toLowerCase())) return false;
    }
  }
  return fallback;
}

export function readArray(meta: Record<string, unknown>, keys: string[], fallback: string[] = []): string[] {
  for (const key of keys) {
    const value = meta[key];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string" && value.trim()) {
      return value.split(",").map((x) => x.trim()).filter(Boolean);
    }
  }
  return fallback;
}

export function contextFromLoadedSystem(loadedSystem: LoadedSystem): TravellerTemplateContext {
  const meta = (loadedSystem.frontmatter ?? {}) as Record<string, unknown>;
  const nameRaw = readString(meta, ["mainworld", "world", "name"], loadedSystem.name);
  const name = nameRaw.replace(/\s+System$/i, "").replace(/^_/, "").trim() || loadedSystem.name;
  const systemName = readString(meta, ["system_name"], `${name} System`).replace(/\s+System\s+System$/i, " System");
  const uwp = readString(meta, ["mainworld_uwp", "uwp"], "X000000-0");

  const today = new Date().toISOString().slice(0, 10);

  return {
    loadedSystem,
    hex: readString(meta, ["hex", "system_hex"], loadedSystem.hex),
    name,
    systemName,
    systemFolder: loadedSystem.systemFolder,
    systemNotePath: loadedSystem.systemNotePath,
    mainworldPath: loadedSystem.mainworldPath,
    supportPaths: loadedSystem.supportPaths,
    date: today,

    uwp,
    starport: readString(meta, ["starport"], uwp[0] ?? "X"),
    size: readNumber(meta, ["size"], 0),
    atmosphere: readNumber(meta, ["atmosphere", "atm"], 0),
    hydrographics: readNumber(meta, ["hydrographics", "hydro"], 0),
    population: readNumber(meta, ["population", "pop"], 0),
    government: readNumber(meta, ["government", "gov"], 0),
    lawLevel: readNumber(meta, ["law_level", "law"], 0),
    techLevel: readNumber(meta, ["tech_level", "tl"], 0),

    tradeCodes: readArray(meta, ["trade_codes", "remarks"], []),
    bases: readArray(meta, ["bases"], []),
    baseCodes: readArray(meta, ["base_codes"], []),
    allegiance: readString(meta, ["allegiance"], "Independent"),
    allegianceCode: readString(meta, ["allegiance_code"], "In"),
    travelZone: readString(meta, ["travel_zone", "zone"], "Green"),
    pbg: readString(meta, ["pbg"], "000"),
    populationMultiplier: readNumber(meta, ["population_multiplier"], 0),
    belts: readNumber(meta, ["belts"], 0),
    gasGiants: readNumber(meta, ["gas_giants"], 0),
    stellarData: readString(meta, ["stellar_data", "stellar", "primary_star"], ""),
    worldCount: readNumber(meta, ["world_count"], 1),

    refinedFuel: readBoolean(meta, ["refined_fuel", "refined_fuel_available"], false),
    unrefinedFuel: readBoolean(meta, ["unrefined_fuel", "unrefined_fuel_available"], false),
    wildernessRefuelling: readBoolean(meta, ["wilderness_refuelling"], false),
    fuelSources: readArray(meta, ["fuel_sources"], []),
    repairCapacity: readString(meta, ["repair_capacity"], "Unknown"),
    salvageRating: readString(meta, ["salvage_rating"], "Unknown"),
    routeSecurity: readString(meta, ["route_security"], "Unknown"),
    fuelReliability: readString(meta, ["fuel_reliability"], "Unknown"),

    industrialDecay: readString(meta, ["industrial_decay"], "Unknown"),
    laborUnrest: readString(meta, ["labor_unrest"], "Unknown"),
    militiaStrength: readString(meta, ["militia_strength"], "Unknown"),
    blackMarketPresence: readString(meta, ["black_market_presence"], "Unknown"),
    collapseRisk: readString(meta, ["collapse_risk"], "Unknown"),
    autocracyPressure: readString(meta, ["autocracy_pressure"], "Unknown"),

    xboatRoute: readBoolean(meta, ["xboat_route"], false),
    tradeRoute: readBoolean(meta, ["trade_route"], false),
    patrolRoute: readBoolean(meta, ["patrol_route"], false),
    linkedRoutes: readArray(meta, ["linked_routes"], []),
    linkedConflicts: readArray(meta, ["linked_conflicts"], []),
    linkedRuins: readArray(meta, ["linked_ruins"], []),
    controllingFactions: readArray(meta, ["controlling_factions"], []),
    localRivals: readArray(meta, ["local_rivals"], []),

    metadata: meta,
  };
}
