import { TFile } from "obsidian";

// ============================================================================
// Core Types
// ============================================================================

export interface LoadedSystem {
  systemFile: TFile;
  systemFolder: string;
  hex: string;
  name: string;
  systemNotePath: string;
  mainworldPath: string;
  supportPaths: Record<string, string>;
  source: "created" | "loaded-by-hex" | "active-note" | "resolved";
  frontmatter?: Record<string, unknown>;
}

export interface TravellerToolkitSettings {
  systemsFolder: string;
  systemIndexPattern: string;
  mainworldPattern: string;
  createMainworldOnPromote: boolean;
  createSupportNotesOnPromote: boolean;
  debugMode: boolean;
}

export const DEFAULT_SETTINGS: TravellerToolkitSettings = {
  systemsFolder: "Traveller/Systems",
  systemIndexPattern: "_{name}",
  mainworldPattern: "{name}",
  createMainworldOnPromote: true,
  createSupportNotesOnPromote: true,
  debugMode: false,
};

// ============================================================================
// View Types
// ============================================================================

export const VIEW_TYPE_TRAVELLER_TOOLKIT = "traveller-toolkit-view";

// ============================================================================
// Tool Types
// ============================================================================

export interface ToolDefinition {
  id: string;
  label: string;
  status: "active" | "planned" | "placeholder";
  icon?: string;
  description?: string;
}

export interface TravellerTool {
  id: string;
  label: string;
  render(container: HTMLElement): void;
  onUnload?(): void;
}

// ============================================================================
// UWP Types
// ============================================================================

export interface UWP {
  starport: string;
  size: number;
  atmosphere: number;
  hydrographics: number;
  population: number;
  government: number;
  law: number;
  techLevel: number;
}

export interface SystemProfile {
  hex: string;
  name: string;
  uwp: UWP;
  allegiance: string;
  allegianceCode: string;
  zone: string;
  pbg: string;
  stellar: string;
  worldCount: number;
  importance: number;
  routeRole: string;
  prominence: string;
  status: string;
  prepStatus: string;
}

// ============================================================================
// Vault Service Types
// ============================================================================

export interface VaultServices {
  vault: any;
  metadataCache: any;
  fileManager: any;
}

// ============================================================================
// Status Types
// ============================================================================

export interface SystemStatus {
  mode: "empty" | "draft" | "created/loaded" | "promoted";
  loadedSource: string | null;
  systemNotePath: string | null;
  systemFolder: string | null;
  mainworldTarget: string | null;
  supportTargets: Record<string, boolean>;
  mainworldExists: boolean;
  supportCount: number;
  lastAction: string | null;
  lastError: string | null;
}
