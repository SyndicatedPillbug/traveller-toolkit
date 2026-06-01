import { TFile } from "obsidian";
import { VaultService } from "./VaultService";
import { LinkService } from "./LinkService";
import { LoadedSystem } from "../app/types";

// ==========================================================================
// Helper functions for hex and system matching
// ==========================================================================

/**
 * Normalize a hex value to a 4-digit string.
 * Trims, removes non-digits, pads with leading zeros.
 */
function normalizeHex(value: unknown): string {
  const digits = String(value ?? "")
    .trim()
    .replace(/[^0-9]/g, "");

  if (!digits) return "";

  return digits.padStart(4, "0").slice(-4);
}

/**
 * Check if frontmatter indicates a system note.
 */
function isSystemFrontmatter(fm: any): boolean {
  const type = String(fm?.type ?? fm?.record_type ?? "")
    .trim()
    .toLowerCase();

  return (
    type === "system" ||
    type === "traveller_system" ||
    String(fm?.record_type ?? "").trim().toLowerCase() === "system"
  );
}

/**
 * Parse a system folder path to extract hex and name.
 * e.g., "Traveller/Systems/0301 - Milice/_Milice.md" -> { hex: "0301", name: "Milice" }
 */
function parseSystemFolderNameFromPath(path: string): { hex: string; name: string } | null {
  const parts = String(path || "").split("/");
  const folderName = parts[parts.length - 2] ?? "";
  const match = folderName.match(/^(\d{4})\s*-\s*(.+)$/);

  if (!match) return null;

  return {
    hex: match[1],
    name: match[2],
  };
}

export interface SystemRecord {
  file: TFile;
  path: string;
  folder: string;
  hex: string;
  name: string;
  systemName: string;
  uwp?: string;
  allegiance?: string;
  allegianceCode?: string;
  zone?: string;
  routeRole?: string;
  importance?: number;
  bases?: string[];
  tradeCodes?: string[];
  gasGiants?: number;
  belts?: number;
  pbg?: string;
  stellar?: string;
  xboatRoute?: boolean;
  tradeRoute?: boolean;
  patrolRoute?: boolean;
  prominence?: string;
  status?: string;
}

export class FileDiscoveryService {
  private app: any;
  private vault: VaultService;
  private link: LinkService;

  constructor(app: any, vault: VaultService, link?: LinkService) {
    this.app = app;
    this.vault = vault;
    this.link = link || new LinkService();
  }

  /**
   * Find a system file by hex code.
   *
   * This must be path-resilient. It scans all markdown files and does not assume
   * the system still lives under the configured settings folder.
   */
  async findSystemByHex(hex: string): Promise<TFile | null> {
    const normalizedHex = normalizeHex(hex);
    const files = this.vault.getAllMarkdownFiles();

    console.log("[Traveller Toolkit] findSystemByHex:start", {
      input: hex,
      normalizedHex,
      markdownFileCount: files.length,
    });

    if (!normalizedHex || !/^\d{4}$/.test(normalizedHex)) {
      console.warn("[Traveller Toolkit] findSystemByHex:invalid hex", {
        input: hex,
        normalizedHex,
      });
      return null;
    }

    // 1. Prefer explicit system frontmatter match.
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      if (!fm) continue;

      const fmHex = normalizeHex(fm.hex ?? fm.system_hex ?? "");

      if (fmHex === normalizedHex && isSystemFrontmatter(fm)) {
        console.log("[Traveller Toolkit] findSystemByHex:matched frontmatter", {
          path: file.path,
          fmHex,
          type: fm.type,
          record_type: fm.record_type,
        });
        return file;
      }
    }

    // 2. Fallback: any underscore markdown file in a folder named "0301 - Name".
    // This catches _Milice.md even if frontmatter is stale, missing, or not yet indexed.
    for (const file of files) {
      const folderInfo = parseSystemFolderNameFromPath(file.path);
      if (!folderInfo) continue;

      if (folderInfo.hex === normalizedHex && file.basename.startsWith("_")) {
        console.log("[Traveller Toolkit] findSystemByHex:matched folder/index pattern", {
          path: file.path,
          folderInfo,
          basename: file.basename,
        });
        return file;
      }
    }

    // 3. Legacy fallback: old _System.md convention.
    // Note: TFile.basename does NOT include ".md".
    for (const file of files) {
      const folderInfo = parseSystemFolderNameFromPath(file.path);
      if (!folderInfo) continue;

      const basename = String(file.basename || "").toLowerCase();

      if (folderInfo.hex === normalizedHex && (basename === "_system" || basename.startsWith("_"))) {
        console.log("[Traveller Toolkit] findSystemByHex:matched legacy fallback", {
          path: file.path,
          folderInfo,
          basename: file.basename,
        });
        return file;
      }
    }

    console.warn("[Traveller Toolkit] findSystemByHex:not found", {
      input: hex,
      normalizedHex,
      scannedFiles: files.length,
      candidateSystemFolders: files
        .map((f) => ({ path: f.path, folderInfo: parseSystemFolderNameFromPath(f.path), basename: f.basename }))
        .filter((x) => x.folderInfo)
        .slice(0, 25),
    });

    return null;
  }

  /**
   * Find the system file from an active file (mainworld, support note, etc.)
   */
  async findSystemFromActiveFile(file: TFile): Promise<TFile | null> {
    const cache = this.app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter || {};

    // If it's already a system note
    if (isSystemFrontmatter(fm)) {
      return file;
    }

    // Try to find system_note reference
    if (fm.system_note) {
      const systemPath = this.link.wikilinkToPath(String(fm.system_note));
      if (systemPath) {
        const systemFile = this.vault.getFile(systemPath);
        if (systemFile) return systemFile;
      }
    }

    // Try system_hex reference
    if (fm.system_hex || fm.hex) {
      const hex = normalizeHex(fm.system_hex || fm.hex);
      if (hex) {
        const systemFile = await this.findSystemByHex(hex);
        if (systemFile) return systemFile;
      }
    }

    // Try to find _*.md system note in parent folder
    const parentFolder = this.vault.getParentFolder(file.path);
    const parentFiles = this.vault
      .getAllMarkdownFiles()
      .filter((f) => this.vault.getParentFolder(f.path) === parentFolder);

    // Prefer a system-marked underscore note in the same folder.
    for (const parentFile of parentFiles) {
      if (!parentFile.basename.startsWith("_")) continue;

      const parentCache = this.app.metadataCache.getFileCache(parentFile);
      const parentFm = parentCache?.frontmatter || {};

      if (isSystemFrontmatter(parentFm)) {
        return parentFile;
      }
    }

    // If no frontmatter-marked system file is found, fall back to the first underscore note.
    // This handles moved folders and stale metadata.
    const underscoreIndex = parentFiles.find((f) => f.basename.startsWith("_"));
    if (underscoreIndex) return underscoreIndex;

    return null;
  }

  /**
   * Find all system notes in the vault
   */
  async findAllSystems(): Promise<SystemRecord[]> {
    const files = this.vault.getAllMarkdownFiles();
    const systems: SystemRecord[] = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter || {};
      const folderInfo = parseSystemFolderNameFromPath(file.path);

      const type = String(fm.type ?? fm.record_type ?? "").toLowerCase();
      const hex = normalizeHex(fm.hex ?? fm.system_hex ?? folderInfo?.hex ?? "");

      // Check if this is a system note
      const isSystem = 
        isSystemFrontmatter(fm) ||
        (folderInfo && file.basename.startsWith("_"));

      if (isSystem && hex && /^\d{4}$/.test(hex)) {
        const folder = this.vault.getParentFolder(file.path);
        
        systems.push({
          file,
          path: file.path,
          folder,
          hex,
          name: String(fm.mainworld || fm.name || folderInfo?.name || file.basename.replace(/^_/, "")),
          systemName: String(fm.system_name || fm.name || `${String(fm.mainworld || file.basename.replace(/^_/, ""))} System`),
          uwp: String(fm.mainworld_uwp || fm.uwp || ""),
          allegiance: String(fm.allegiance || ""),
          allegianceCode: String(fm.allegiance_code || ""),
          zone: String(fm.travel_zone || fm.zone || "Green"),
          routeRole: String(fm.route_role || ""),
          importance: Number(fm.importance || 0),
          bases: Array.isArray(fm.bases) ? fm.bases as string[] : [],
          tradeCodes: Array.isArray(fm.trade_codes) ? fm.trade_codes as string[] : [],
          gasGiants: Number(fm.gas_giants || (fm.gas_giant ? 1 : 0)),
          belts: Number(fm.belts || 0),
          pbg: String(fm.pbg || ""),
          stellar: String(fm.stellar || fm.primary_star || ""),
          xboatRoute: Boolean(fm.xboat_route),
          tradeRoute: Boolean(fm.trade_route),
          patrolRoute: Boolean(fm.patrol_route),
          prominence: String(fm.prominence || ""),
          status: String(fm.status || fm.prep_status || ""),
        });
      }
    }

    return systems;
  }

  /**
   * Find support notes for a loaded system
   */
  async findSupportNotes(loaded: LoadedSystem): Promise<Record<string, TFile | null>> {
    const results: Record<string, TFile | null> = {};

    for (const note of Object.keys(loaded.supportPaths)) {
      const path = loaded.supportPaths[note];
      results[note] = this.vault.getFile(path);
    }

    return results;
  }

  /**
   * Parse folder path to extract system info
   * e.g., "Traveller/Systems/0301 - Milice/_Milice.md" -> { hex: "0301", name: "Milice" }
   * 
   * @deprecated Use parseSystemFolderNameFromPath instead
   */
  private parseSystemFolderPath(path: string): { hex?: string; name?: string } | null {
    const parts = path.split("/");
    const folderName = parts[parts.length - 2] ?? "";
    
    const match = folderName.match(/^(\d{4})\s*-\s*(.+)$/);
    if (match) {
      return {
        hex: match[1],
        name: match[2],
      };
    }
    
    return null;
  }
}
