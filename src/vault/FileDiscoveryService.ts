import { TFile } from "obsidian";
import { VaultService } from "./VaultService";
import { LinkService } from "./LinkService";
import { LoadedSystem } from "../app/types";

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
   * Find a system file by hex code
   * Uses metadata-first search: frontmatter hex match, then folder name pattern
   */
  async findSystemByHex(hex: string): Promise<TFile | null> {
    const normalizedHex = String(hex).padStart(4, "0");
    const files = this.vault.getAllMarkdownFiles();

    // 1. Prefer explicit system frontmatter match
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      if (!fm) continue;

      const type = String(fm.type ?? fm.record_type ?? "").toLowerCase();
      const fmHex = String(fm.hex ?? fm.system_hex ?? "").trim();

      if (
        fmHex === normalizedHex &&
        (type === "system" || type === "traveller_system" || fm.record_type === "system")
      ) {
        return file;
      }
    }

    // 2. Fallback: folder name matches hex pattern "0301 - Name"
    for (const file of files) {
      const parts = file.path.split("/");
      const folderName = parts[parts.length - 2] ?? "";
      
      if (folderName.startsWith(`${normalizedHex} - `) && file.basename.startsWith("_")) {
        return file;
      }
    }

    // 3. Legacy: _System.md in folder named "HEX - Name"
    for (const file of files) {
      if (file.basename === "_System.md" || file.basename === "_system.md") {
        const parts = file.path.split("/");
        const folderName = parts[parts.length - 2] ?? "";
        const folderHex = folderName.match(/^(\d{4})\s*-/)?.[1];
        
        if (folderHex === normalizedHex) {
          return file;
        }
      }
    }

    return null;
  }

  /**
   * Find the system file from an active file (mainworld, support note, etc.)
   */
  async findSystemFromActiveFile(file: TFile): Promise<TFile | null> {
    const cache = this.app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter || {};

    // If it's already a system note
    const type = String(fm.type ?? fm.record_type ?? "").toLowerCase();
    if (type === "system" || type === "traveller_system") {
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
      const hex = String(fm.system_hex || fm.hex).trim();
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

    for (const parentFile of parentFiles) {
      if (parentFile.basename.startsWith("_")) {
        const parentCache = this.app.metadataCache.getFileCache(parentFile);
        const parentFm = parentCache?.frontmatter || {};
        const parentType = String(parentFm.type ?? parentFm.record_type ?? "").toLowerCase();
        
        if (parentType === "system" || parentType === "traveller_system") {
          return parentFile;
        }
      }
    }

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
      const folderInfo = this.parseSystemFolderPath(file.path);

      const type = String(fm.type ?? fm.record_type ?? "").toLowerCase();
      const hex = String(fm.hex ?? fm.system_hex ?? folderInfo?.hex ?? "").trim();

      // Check if this is a system note
      const isSystem = 
        type === "system" || 
        type === "traveller_system" ||
        (folderInfo && file.basename.startsWith("_"));

      if (isSystem && hex && /^[0-9]{4}$/.test(hex)) {
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
