import { setIcon, Notice, TFile } from "obsidian";
import { TravellerTool } from "../registry";
import TravellerToolkitPlugin from "../../app/TravellerToolkitPlugin";
import { TravellerToolkitServices } from "../../vault/services";
import { TravellerToolkitSettingsManager } from "../../app/settings";
import { LoadedSystem, SystemStatus } from "../../app/types";
import { SUPPORT_NOTES } from "../../app/constants";
import { contextFromLoadedSystem, TravellerTemplateContext } from "../../templates/core/templateTypes";
import { buildMainworldNote } from "../../templates/core/mainworldTemplate";
import { buildSystemNote } from "../../templates/core/systemTemplate";
import { buildSupportNote } from "../../templates/support/supportTemplates";

// ==========================================================================
// Helper functions
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
 * Normalize a system name for use in file names.
 * Removes leading underscore, strips trailing "System" suffix, trims.
 */
function normalizeSystemName(value: unknown): string {
  return String(value ?? "")
    .replace(/^_/, "")
    .replace(/\s+System$/i, "")
    .trim();
}

/**
 * SystemGeneratorTool - Minimal vertical slice implementation
 * 
 * Features:
 * 1. Open Traveller Toolkit view
 * 2. Show Home dashboard (via HomeTool)
 * 3. Open System Generator
 * 4. Create system folder + _Name.md
 * 5. Load system by hex using metadata scan
 * 6. Promote loaded system using loaded TFile and actual parent folder
 * 7. Confirm mainworld and support notes created in loaded folder
 * 8. Visible status/debug panel showing exact loaded path and promotion target
 */
export class SystemGeneratorTool implements TravellerTool {
  id = "system-generator";
  label = "System Generator";
  
  private loadedSystem: LoadedSystem | null = null;
  private containerEl: HTMLElement | null = null;
  private status: SystemStatus = {
    mode: "empty",
    loadedSource: null,
    systemNotePath: null,
    systemFolder: null,
    mainworldTarget: null,
    supportTargets: {},
    mainworldExists: false,
    supportCount: 0,
    lastAction: null,
    lastError: null,
  };
  
  // UI elements for persistence across re-renders
  private hexInput: HTMLInputElement | null = null;
  private nameInput: HTMLInputElement | null = null;
  
  constructor(
    private plugin: TravellerToolkitPlugin,
    private services: TravellerToolkitServices,
    private settingsManager: TravellerToolkitSettingsManager
  ) {}
  
  render(container?: HTMLElement): void {
    if (container) {
      this.containerEl = container;
    }

    const target = container ?? this.containerEl;

    if (!target) {
      console.warn("[Traveller Toolkit] SystemGeneratorTool.render called before container was set");
      return;
    }

    target.empty();
    target.addClass("ttk-tool-system-generator");
    
    // Header
    const header = target.createDiv({ cls: "ttk-tool-header" });
    header.createEl("h2", { text: "System Generator" });
    
    // ========================================================================
    // CREATE SYSTEM SECTION
    // ========================================================================
    const createSection = target.createDiv({ cls: "ttk-section" });
    createSection.createEl("h3", { text: "Create New System" });
    
    // Hex input
    const hexRow = createSection.createDiv({ cls: "ttk-row" });
    hexRow.createEl("label", { text: "Hex: ", cls: "ttk-label" });
    const hexInputEl = hexRow.createEl("input", {
      type: "text",
      cls: "ttk-input ttk-input-hex",
      attr: { 
        placeholder: "0301",
        "maxlength": "4"
      },
    }) as HTMLInputElement;
    this.hexInput = hexInputEl;
    
    // Name input
    const nameRow = createSection.createDiv({ cls: "ttk-row" });
    nameRow.createEl("label", { text: "Name: ", cls: "ttk-label" });
    const nameInputEl = nameRow.createEl("input", {
      type: "text",
      cls: "ttk-input ttk-input-name",
      attr: { 
        placeholder: "Milice"
      },
    }) as HTMLInputElement;
    this.nameInput = nameInputEl;
    
    // Create button
    const createButton = createSection.createEl("button", {
      text: "Create System Folder + _Name.md",
      cls: "ttk-button ttk-button-create",
    });
    createButton.addEventListener("click", async () => {
      const hex = hexInputEl.value.trim().toUpperCase();
      const name = nameInputEl.value.trim();
      await this.createSystem(hex, name);
    });
    
    // ========================================================================
    // LOAD SYSTEM SECTION
    // ========================================================================
    const loadSection = target.createDiv({ cls: "ttk-section" });
    loadSection.createEl("h3", { text: "Load Existing System" });
    
    // Hex load
    const loadHexRow = loadSection.createDiv({ cls: "ttk-row" });
    const loadHexInput = loadHexRow.createEl("input", {
      type: "text",
      cls: "ttk-input",
      attr: { 
        placeholder: "Enter hex (e.g., 0301)",
        "maxlength": "4"
      },
    }) as HTMLInputElement;
    
    const loadHexButton = loadHexRow.createEl("button", {
      text: "Load Hex",
      cls: "ttk-button",
    });
    loadHexButton.addEventListener("click", async () => {
      const hex = loadHexInput.value.trim().toUpperCase();
      if (hex) {
        await this.loadHex(hex);
      }
    });
    
    // Debug Find Hex button
    const debugFindButton = loadHexRow.createEl("button", {
      text: "Debug Find Hex",
      cls: "ttk-button ttk-button-debug",
    });
    debugFindButton.addEventListener("click", async () => {
      const hex = normalizeHex(loadHexInput.value.trim());
      console.log("[Traveller Toolkit] Debug Find Hex clicked", { hex });
      const file = await this.services.discovery.findSystemByHex(hex);
      console.log("[Traveller Toolkit] Debug Find Hex result", file?.path ?? null);
      new Notice(file ? `Found: ${file.path}` : `No system found for ${hex}`);
    });
    
    // Load active note button
    const loadActiveRow = loadSection.createDiv({ cls: "ttk-row" });
    const loadActiveButton = loadActiveRow.createEl("button", {
      text: "Load Active Note",
      cls: "ttk-button",
    });
    loadActiveButton.addEventListener("click", async () => {
      await this.loadActiveNote();
    });
    
    // ========================================================================
    // PROMOTE SECTION (only when system loaded)
    // ========================================================================
    if (this.loadedSystem) {
      const promoteSection = target.createDiv({ cls: "ttk-section" });
      promoteSection.createEl("h3", { text: "Promote System" });
      
      const promoteButton = promoteSection.createEl("button", {
        text: "Promote Loaded System — Create Missing Notes Only",
        cls: "ttk-button ttk-button-primary ttk-button-promote",
      });
      promoteButton.addEventListener("click", async () => {
        await this.promoteLoadedSystem();
      });
    }
    
    // ========================================================================
    // DEBUG PANEL - ALWAYS VISIBLE
    // ========================================================================
    const debugPanel = target.createDiv({ cls: "ttk-debug-panel" });
    debugPanel.createEl("h3", { 
      text: "🐛 Debug: Loaded System State",
      cls: "ttk-debug-title"
    });
    this.renderDebugPanel(debugPanel);
    
    // ========================================================================
    // STATUS
    // ========================================================================
    const statusDiv = target.createDiv({ cls: "ttk-status" });
    this.renderStatus(statusDiv);
    
    // ========================================================================
    // LOADED SYSTEM INFO (when loaded)
    // ========================================================================
    if (this.loadedSystem) {
      this.renderLoadedSystemInfo(target);
    }
  }
  
  private renderDebugPanel(container: HTMLElement): void {
    container.empty();
    
    const addDebugRow = (label: string, value: string | null, important: boolean = false) => {
      const row = container.createDiv({ cls: "ttk-debug-row" });
      row.createEl("span", { 
        text: `${label}: `, 
        cls: "ttk-debug-label"
      });
      const valueEl = row.createEl("span", { 
        text: value || "null",
        cls: `ttk-debug-value${important ? " ttk-debug-important" : ""}`
      });
      return valueEl;
    };
    
    // Mode
    addDebugRow("Mode", this.status.mode);
    
    // Source
    addDebugRow("Loaded Source", this.status.loadedSource);
    
    // CRITICAL: Exact paths
    addDebugRow("System Note Path", this.status.systemNotePath, true);
    addDebugRow("System Folder", this.status.systemFolder, true);
    addDebugRow("Mainworld Target", this.status.mainworldTarget, true);
    
    // Loaded system details
    if (this.loadedSystem) {
      addDebugRow("Hex", this.loadedSystem.hex, true);
      addDebugRow("Name", this.loadedSystem.name, true);
      addDebugRow("Actual systemFile.path", this.loadedSystem.systemFile?.path, true);
      addDebugRow("Actual systemFile.parent.path", this.loadedSystem.systemFile?.parent?.path, true);
      
      // Promotion target confirmation
      container.createDiv({ 
        text: "→ Promotion will use: loadedSystem.systemFolder",
        cls: "ttk-debug-note"
      });
      container.createDiv({ 
        text: "→ NOT using: settings.systemsFolder",
        cls: "ttk-debug-note"
      });
    } else {
      addDebugRow("Hex", null);
      addDebugRow("Name", null);
    }
    
    // Support notes targets
    if (this.loadedSystem) {
      container.createEl("div", { text: "Support Targets:", cls: "ttk-debug-subtitle" });
      for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
        addDebugRow(`  ${id}`, path);
      }
    }
    
    // Status flags
    addDebugRow("Mainworld Exists", String(this.status.mainworldExists));
    addDebugRow("Support Count", String(this.status.supportCount));
    
    // Last action
    addDebugRow("Last Action", this.status.lastAction);
    
    // Error
    if (this.status.lastError) {
      addDebugRow("Last Error", this.status.lastError, true);
    }
  }
  
  private renderStatus(container: HTMLElement): void {
    container.empty();
    
    const statusText = this.status.lastError 
      ? `❌ ${this.status.lastError}` 
      : this.status.mode === "empty" 
        ? "✓ Ready - Enter hex/name or load existing system"
        : this.status.mode === "created" 
          ? `✓ Created system ${this.loadedSystem?.hex} - ${this.loadedSystem?.name}`
          : this.status.mode === "created/loaded" 
            ? `✓ Loaded system ${this.loadedSystem?.hex} - ${this.loadedSystem?.name}`
            : this.status.mode === "promoted" 
              ? `✓ Promoted system ${this.loadedSystem?.hex} - ${this.loadedSystem?.name}`
              : `Mode: ${this.status.mode}`;
    
    container.createEl("p", { 
      text: statusText, 
      cls: `ttk-status-text ttk-status-${this.status.lastError ? "error" : "ok"}`
    });
  }
  
  private renderLoadedSystemInfo(container: HTMLElement): void {
    if (!this.loadedSystem) return;
    
    const infoSection = container.createDiv({ cls: "ttk-section ttk-system-info" });
    infoSection.createEl("h3", { text: "Loaded System Details" });
    
    const infoList = infoSection.createEl("ul", { cls: "ttk-info-list" });
    
    const addInfo = (label: string, value: string) => {
      const item = infoList.createEl("li", { cls: "ttk-info-item" });
      item.createEl("span", { text: `${label}: `, cls: "ttk-info-label" });
      item.createEl("span", { text: value, cls: "ttk-info-value" });
    };
    
    addInfo("Hex", this.loadedSystem.hex);
    addInfo("Name", this.loadedSystem.name);
    addInfo("System Note", this.loadedSystem.systemNotePath);
    addInfo("Folder", this.loadedSystem.systemFolder);
    addInfo("Mainworld Path", this.loadedSystem.mainworldPath);
    addInfo("Source", this.loadedSystem.source);
    
    // Support notes status
    const supportSection = container.createDiv({ cls: "ttk-section" });
    supportSection.createEl("h3", { text: "Support Notes Status" });
    
    for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
      const noteName = SUPPORT_NOTES.find(n => n.id === id)?.label || id;
      const exists = this.services.vault.getFile(path) !== null;
      const statusText = exists ? "✓ Exists" : "✗ Missing";
      const statusCls = exists ? "ttk-status-exists" : "ttk-status-missing";
      
      const item = supportSection.createEl("p", { cls: "ttk-support-item" });
      item.createEl("span", { text: `${noteName}: ` });
      item.createEl("span", { text: statusText, cls: statusCls });
    }
  }
  
  // ========================================================================
  // CREATE SYSTEM - NEW
  // ========================================================================
  /**
   * Create a new system folder with _Name.md
   */
  async createSystem(hex: string, name: string): Promise<void> {
    if (!hex || !name) {
      new Notice("Traveller Toolkit: Please enter both hex and name");
      return;
    }
    
    this.updateStatus({ lastAction: "creating", lastError: null });
    this.render();
    
    try {
      const normalizedHex = normalizeHex(hex);
      if (!normalizedHex || !/^\d{4}$/.test(normalizedHex)) {
        this.updateStatus({ 
          lastAction: "create", 
          lastError: `"${hex}" is not a valid hex. Use 4 hex digits like 0301.`
        });
        new Notice("Traveller Toolkit: Enter a valid hex, such as 0301");
        this.render();
        return;
      }
      
      const folderName = `${normalizedHex} - ${name}`;
      const settings = this.settingsManager.get();
      const baseFolder = settings.systemsFolder || "Traveller/Systems";
      const folderPath = `${baseFolder}/${folderName}`;
      const systemNotePath = `${folderPath}/_${name}.md`;
      const mainworldPath = `${folderPath}/${name}.md`;
      
      // Check if system already exists
      const existingSystem = await this.services.discovery.findSystemByHex(normalizedHex);
      if (existingSystem) {
        this.updateStatus({ 
          lastAction: "create", 
          lastError: `System with hex ${normalizedHex} already exists at ${existingSystem.path}` 
        });
        new Notice(`Traveller Toolkit: System ${normalizedHex} already exists`);
        this.render();
        return;
      }
      
      // Create folder
      await this.services.vault.ensureFolder(folderPath);
      
      // Create system note using template
      const ctx: TravellerTemplateContext = {
        loadedSystem: null,
        hex: normalizedHex,
        name: normalizeSystemName(name),
        systemName: `${normalizeSystemName(name)} System`,
        systemFolder: folderPath,
        systemNotePath: systemNotePath,
        mainworldPath: mainworldPath,
        supportPaths: supportPaths,
        date: new Date().toISOString().slice(0, 10),
        uwp: "X000000-0",
        starport: "X",
        size: 0,
        atmosphere: 0,
        hydrographics: 0,
        population: 0,
        government: 0,
        lawLevel: 0,
        techLevel: 0,
        tradeCodes: [],
        bases: [],
        baseCodes: [],
        allegiance: "Independent",
        allegianceCode: "In",
        travelZone: "Green",
        pbg: "000",
        populationMultiplier: 0,
        belts: 0,
        gasGiants: 0,
        stellarData: "",
        worldCount: 1,
        refinedFuel: false,
        unrefinedFuel: false,
        wildernessRefuelling: false,
        fuelSources: [],
        routeSecurity: "Unknown",
        fuelReliability: "Unknown",
        repairCapacity: "Unknown",
        salvageRating: "Unknown",
        industrialDecay: "Unknown",
        laborUnrest: "Unknown",
        militiaStrength: "Unknown",
        blackMarketPresence: "Unknown",
        collapseRisk: "Unknown",
        autocracyPressure: "Unknown",
        xboatRoute: false,
        tradeRoute: false,
        patrolRoute: false,
        linkedRoutes: [],
        linkedConflicts: [],
        linkedRuins: [],
        controllingFactions: [],
        localRivals: [],
        metadata: {},
      };
      const systemFile = await this.services.vault.createFile(systemNotePath, buildSystemNote(ctx));
      
      // Create LoadedSystem
      const supportPaths: Record<string, string> = {};
      for (const note of SUPPORT_NOTES) {
        supportPaths[note.id] = `${folderPath}/${note.fileName}`;
      }
      
      this.loadedSystem = {
        systemFile,
        systemFolder: folderPath,
        hex: normalizedHex,
        name: normalizeSystemName(name),
        systemNotePath: systemFile.path,
        mainworldPath,
        supportPaths,
        source: "created",
        frontmatter: {
          type: "system",
          hex: normalizedHex,
          name: normalizeSystemName(name),
          mainworld: normalizeSystemName(name),
        },
      };
      
      // Check file existence
      const supportStatus: Record<string, boolean> = {};
      for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
        supportStatus[id] = this.services.vault.getFile(path) !== null;
      }
      
      this.status = {
        mode: "created",
        loadedSource: "created",
        systemNotePath: systemFile.path,
        systemFolder: folderPath,
        mainworldTarget: mainworldPath,
        supportTargets: supportStatus,
        mainworldExists: false,
        supportCount: 0,
        lastAction: "created",
        lastError: null,
      };
      
      this.render();
      new Notice(`Traveller Toolkit: Created system ${normalizedHex} - ${name}`);
      
    } catch (err) {
      console.error("[Traveller Toolkit] Create system failed:", err);
      this.updateStatus({ 
        lastAction: "create", 
        lastError: `Failed to create: ${err}` 
      });
      this.render();
      new Notice("Traveller Toolkit: Create failed - see console for details");
    }
  }
  
  /**
   * Get default content for new system note
  // ========================================================================
  /**
   * Load a system by hex code
   */
  async loadHex(hex: string): Promise<void> {
    this.updateStatus({ lastAction: "loading", lastError: null });
    this.render();
    
    try {
      const normalizedHex = normalizeHex(hex);

      console.log("[Traveller Toolkit] loadHex", {
        input: hex,
        normalizedHex,
      });

      if (!normalizedHex) {
        this.updateStatus({ 
          lastAction: "load-hex", 
          lastError: "Enter a valid hex, such as 0301"
        });
        new Notice("Traveller Toolkit: Enter a valid hex, such as 0301");
        this.render();
        return;
      }
      
      const systemFile = await this.services.discovery.findSystemByHex(normalizedHex);
      
      if (!systemFile) {
        this.updateStatus({ 
          lastAction: "load-hex", 
          lastError: `System with hex ${normalizedHex} not found. Checked frontmatter and folder names across the vault.` 
        });
        this.render();
        new Notice(`Traveller Toolkit: System with hex ${normalizedHex} not found`);
        return;
      }
      
      await this.loadSystem(systemFile, "loaded-by-hex", normalizedHex);
      
    } catch (err) {
      console.error("[Traveller Toolkit] Load hex failed:", err);
      this.updateStatus({ 
        lastAction: "load-hex", 
        lastError: `Failed to load: ${err}` 
      });
      this.render();
      new Notice("Traveller Toolkit: Failed to load system - see console");
    }
  }
  
  /**
   * Load the system from the active note
   */
  async loadActiveNote(): Promise<void> {
    this.updateStatus({ lastAction: "loading", lastError: null });
    this.render();
    
    try {
      const activeFile = this.plugin.app.workspace.getActiveFile();
      
      if (!activeFile) {
        this.updateStatus({ 
          lastAction: "load-active", 
          lastError: "No active file" 
        });
        new Notice("Traveller Toolkit: No active file");
        this.render();
        return;
      }
      
      const systemFile = await this.services.discovery.findSystemFromActiveFile(activeFile);
      
      if (!systemFile) {
        this.updateStatus({ 
          lastAction: "load-active", 
          lastError: "No system found for active note" 
        });
        new Notice("Traveller Toolkit: No system found for active note");
        this.render();
        return;
      }
      
      // Get hex from frontmatter
      const fm = this.services.frontmatter.getFrontmatter(systemFile);
      const hex = normalizeHex(fm?.hex ?? fm?.system_hex ?? "");
      
      await this.loadSystem(systemFile, "active-note", hex);
      
    } catch (err) {
      console.error("[Traveller Toolkit] Load active note failed:", err);
      this.updateStatus({ 
        lastAction: "load-active", 
        lastError: `Failed to load: ${err}` 
      });
      this.render();
      new Notice("Traveller Toolkit: Failed to load from active note - see console");
    }
  }
  
  /**
   * Load a system from a TFile
   */
  private async loadSystem(
    systemFile: TFile,
    source: LoadedSystem["source"],
    hex: string
  ): Promise<void> {
    const folder = this.services.vault.getParentFolder(systemFile.path);
    
    const fm = this.services.frontmatter.getFrontmatter(systemFile) || {};
    
    const rawName =
      this.services.frontmatter.getFrontmatterValue<string>(systemFile, "mainworld") ??
      this.services.frontmatter.getFrontmatterValue<string>(systemFile, "name") ??
      systemFile.basename.replace(/^_/, "");

    const name = normalizeSystemName(rawName) || normalizeSystemName(systemFile.basename) || "Unnamed";
    const normalizedHex = normalizeHex(hex || (fm as any).hex || (fm as any).system_hex);
    
    const supportPaths: Record<string, string> = {};
    for (const note of SUPPORT_NOTES) {
      supportPaths[note.id] = `${folder}/${note.fileName}`;
    }
    
    this.loadedSystem = {
      systemFile,
      systemFolder: folder,
      hex: normalizedHex,
      name,
      systemNotePath: systemFile.path,
      mainworldPath: `${folder}/${name}.md`,
      supportPaths,
      source,
      frontmatter: fm,
    };
    
    // Check which files exist
    const mainworldExists = this.services.vault.getFile(this.loadedSystem.mainworldPath) !== null;
    const supportStatus: Record<string, boolean> = {};
    for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
      supportStatus[id] = this.services.vault.getFile(path) !== null;
    }
    
    this.status = {
      mode: "created/loaded",
      loadedSource: source,
      systemNotePath: systemFile.path,
      systemFolder: folder,
      mainworldTarget: this.loadedSystem.mainworldPath,
      supportTargets: supportStatus,
      mainworldExists,
      supportCount: Object.values(supportStatus).filter(Boolean).length,
      lastAction: "loaded",
      lastError: null,
    };
    
    this.render();
    new Notice(`Traveller Toolkit: Loaded system ${normalizedHex} - ${name}`);
  }
  
  // ========================================================================
  // PROMOTE SYSTEM
  // ========================================================================
  /**
   * Promote the loaded system
   * 
   * CRITICAL: This uses loadedSystem.systemFolder, NOT settings.systemsFolder
   * This is the fix for the promote bug.
   */
  async promoteLoadedSystem(): Promise<void> {
    if (!this.loadedSystem) {
      new Notice("Traveller Toolkit: No system loaded - load or create a system first");
      return;
    }
    
    this.updateStatus({ lastAction: "promoting", lastError: null });
    this.render();
    
    try {
      // CRITICAL: Use loadedSystem.systemFolder, NOT settings.systemsFolder
      const folder = this.loadedSystem.systemFolder;
      
      console.log(`[Traveller Toolkit Promote] Using folder: ${folder}`);
      console.log(`[Traveller Toolkit Promote] System file: ${this.loadedSystem.systemFile.path}`);
      console.log(`[Traveller Toolkit Promote] Mainworld target: ${this.loadedSystem.mainworldPath}`);
      
      // Update system note frontmatter with actual paths
      await this.services.frontmatter.updateFrontmatter(
        this.loadedSystem.systemFile,
        {
          status: "playable",
          prep_status: "playable",
          prominence: "important",
          promoted: true,
          promoted_at: new Date().toISOString(),
          system_folder: folder,
          system_note: this.services.link.pathToWikilink(
            this.loadedSystem.systemNotePath,
            `${this.loadedSystem.name} System`
          ),
          mainworld_note: this.services.link.pathToWikilink(
            this.loadedSystem.mainworldPath,
            this.loadedSystem.name
          ),
        }
      );
      
      // Create missing support notes - ALWAYS create missing ones
      // Existing notes are preserved (createFileIfMissing won't overwrite)
      const context = contextFromLoadedSystem(this.loadedSystem);
      for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
        const { wasCreated } = await this.services.safeWrite.createFileIfMissing(
          path,
          buildSupportNote(id, context)
        );

        if (wasCreated) {
          console.log(`[Traveller Toolkit] Created support note: ${path}`);
        } else {
          console.log(`[Traveller Toolkit] Support note already exists: ${path}`);
        }

        this.status.supportTargets[id] = true;
      }
      
      // Create mainworld if missing - ALWAYS create if missing
      // Existing mainworld is preserved (createFileIfMissing won't overwrite)
      const { wasCreated: mainworldWasCreated } = await this.services.safeWrite.createFileIfMissing(
        this.loadedSystem.mainworldPath,
        buildMainworldNote(context)
      );

      if (mainworldWasCreated) {
        console.log(`[Traveller Toolkit] Created mainworld note: ${this.loadedSystem.mainworldPath}`);
      } else {
        console.log(`[Traveller Toolkit] Mainworld note already exists: ${this.loadedSystem.mainworldPath}`);
      }

      this.status.mainworldExists = true;
      
      this.status.mode = "promoted";
      this.status.lastAction = "promoted";
      this.render();
      
      new Notice(`Traveller Toolkit: System promoted to ${folder}`);
      
    } catch (err) {
      console.error("[Traveller Toolkit] Promote failed:", err);
      this.updateStatus({ 
        lastAction: "promote", 
        lastError: `Failed to promote: ${err}` 
      });
      this.render();
      new Notice("Traveller Toolkit: Promote failed - see console for details");
    }
  }
  
  /**
   * Get default content for a support note
  /**
   * Update status and trigger re-render
   */
  private updateStatus(partial: Partial<SystemStatus>): void {
    this.status = { ...this.status, ...partial };
  }
  
  onUnload(): void {
    this.containerEl = null;
    this.hexInput = null;
    this.nameInput = null;
    // It is acceptable to clear loadedSystem only when leaving the tool.
    // Do not call onUnload during normal refreshes.
  }
}
