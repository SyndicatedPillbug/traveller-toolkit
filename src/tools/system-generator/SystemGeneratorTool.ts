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

// SystemDraft imports
import {
  SystemDraft,
  createDefaultSystemDraft,
  normalizeDraft,
  populateDraftFromFrontmatter,
  getUwpFromDraft,
  getPbgFromDraft,
  getMapLineFromDraft,
  deriveTradeCodesFromUWP,
  deriveBaseCodesFromBases,
  normalizeHexForDraft,
  normalizeSystemName as normalizeDraftSystemName,
  clampNumber,
  hexDigit,
} from "./SystemDraft";

// Traveller rules imports
import {
  rollCompleteSystemDraft,
  suggestZoneForDraft,
  randomizeMapExtrasForDraft,
  deriveTradeCodesFromDraft,
  deriveBaseCodesFromDraft,
} from "./travellerRules";

// Name generator imports
import {
  generateRandomSystemName,
  generateNameFromUWP,
} from "./nameGenerator";

// Context builder import
import {
  buildTemplateContextFromDraft,
  SystemPaths,
} from "./systemDraftContext";

// ==========================================================================
// Helper functions
// ==========================================================================

function normalizeHex(value: unknown): string {
  const digits = String(value ?? "")
    .trim()
    .replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.padStart(4, "0").slice(-4);
}

function normalizeSystemName(value: unknown): string {
  return String(value ?? "")
    .replace(/^_/, "")
    .replace(/\s+System$/i, "")
    .trim();
}

/**
 * SystemGeneratorTool - Complete implementation with SystemDraft integration
 *
 * Single source of truth: this.draft
 * All UI controls read from and write to this.draft.
 * Create System uses this.draft.
 * Preview uses this.draft.
 * Load System populates this.draft from frontmatter.
 */
export class SystemGeneratorTool implements TravellerTool {
  id = "system-generator";
  label = "System Generator";

  // Single source of truth for new system creation
  private draft: SystemDraft = createDefaultSystemDraft();

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

  // Preview UI elements
  private previewSectionEl: HTMLElement | null = null;
  private uwpsDisplayEl: HTMLElement | null = null;
  private pbgDisplayEl: HTMLElement | null = null;
  private mapLineDisplayEl: HTMLElement | null = null;
  private tradeCodesDisplayEl: HTMLElement | null = null;
  private baseCodesDisplayEl: HTMLElement | null = null;
  private zoneDisplayEl: HTMLElement | null = null;
  private fuelSourcesDisplayEl: HTMLElement | null = null;
  private systemYamlPreviewEl: HTMLTextAreaElement | null = null;
  private mainworldPreviewEl: HTMLTextAreaElement | null = null;

  // Sliders for draft values
  private frontierCoreSlider: HTMLInputElement | null = null;
  private dangerLevelSlider: HTMLInputElement | null = null;
  private corporateInfluenceSlider: HTMLInputElement | null = null;
  private weirdnessLevelSlider: HTMLInputElement | null = null;
  private frontierCoreValueEl: HTMLElement | null = null;
  private dangerLevelValueEl: HTMLElement | null = null;
  private corporateInfluenceValueEl: HTMLElement | null = null;
  private weirdnessLevelValueEl: HTMLElement | null = null;

  // UI elements for persistence across re-renders
  private hexInput: HTMLInputElement | null = null;
  private nameInput: HTMLInputElement | null = null;
  private starportSelect: HTMLSelectElement | null = null;
  private sizeSelect: HTMLSelectElement | null = null;
  private atmosphereSelect: HTMLSelectElement | null = null;
  private hydroSelect: HTMLSelectElement | null = null;
  private popSelect: HTMLSelectElement | null = null;
  private govSelect: HTMLSelectElement | null = null;
  private lawSelect: HTMLSelectElement | null = null;
  private tlSelect: HTMLSelectElement | null = null;
  private pbgInput: HTMLInputElement | null = null;
  private popMultInput: HTMLInputElement | null = null;
  private beltsInput: HTMLInputElement | null = null;
  private ggInput: HTMLInputElement | null = null;
  private stellarInput: HTMLInputElement | null = null;
  private worldCountInput: HTMLInputElement | null = null;
  private refinedCheckbox: HTMLInputElement | null = null;
  private unrefinedCheckbox: HTMLInputElement | null = null;
  private wildCheckbox: HTMLInputElement | null = null;
  private sourcesInput: HTMLInputElement | null = null;
  private xboatCheckbox: HTMLInputElement | null = null;
  private tradeCheckbox: HTMLInputElement | null = null;
  private patrolCheckbox: HTMLInputElement | null = null;
  private navalCheckbox: HTMLInputElement | null = null;
  private scoutCheckbox: HTMLInputElement | null = null;
  private researchCheckbox: HTMLInputElement | null = null;
  private corpCheckbox: HTMLInputElement | null = null;
  private milCheckbox: HTMLInputElement | null = null;
  private styleSelect: HTMLSelectElement | null = null;
  private complexitySelect: HTMLSelectElement | null = null;
  private densitySelect: HTMLSelectElement | null = null;

  constructor(
    private plugin: TravellerToolkitPlugin,
    private services: TravellerToolkitServices,
    private settingsManager: TravellerToolkitSettingsManager
  ) {}

  // ==========================================================================
  // DRAFT MANAGEMENT HELPERS
  // ==========================================================================

  private setDraft(partial: Partial<SystemDraft>): void {
    this.draft = normalizeDraft({
      ...this.draft,
      ...partial,
    });
    this.draft.tradeCodes = deriveTradeCodesFromDraft(this.draft);
    this.draft.baseCodes = deriveBaseCodesFromDraft(this.draft);
    this.draft.pbg = getPbgFromDraft(this.draft);
    this.refreshDraftPreview();
  }

  private getDraftPaths(draft: SystemDraft = this.draft): SystemPaths {
    const settings = this.settingsManager.get();
    const baseFolder = settings.systemsFolder || "Traveller/Systems";
    const safeName = normalizeDraftSystemName(draft.name || "Unnamed");
    const systemFolder = `${baseFolder}/${draft.hex} - ${safeName}`;
    const systemNotePath = `${systemFolder}/_${safeName}.md`;
    const mainworldPath = `${systemFolder}/${safeName}.md`;
    const supportPaths: Record<string, string> = {};
    for (const note of SUPPORT_NOTES) {
      supportPaths[note.id] = `${systemFolder}/${note.fileName}`;
    }
    return { systemFolder, systemNotePath, mainworldPath, supportPaths };
  }

  private syncUIFromDraft(): void {
    if (!this.hexInput) return;
    this.hexInput.value = this.draft.hex;
    if (this.nameInput) this.nameInput.value = this.draft.name;
    if (this.starportSelect) this.starportSelect.value = this.draft.starport;
    if (this.sizeSelect) this.sizeSelect.value = String(this.draft.size);
    if (this.atmosphereSelect) this.atmosphereSelect.value = String(this.draft.atmosphere);
    if (this.hydroSelect) this.hydroSelect.value = String(this.draft.hydrographics);
    if (this.popSelect) this.popSelect.value = String(this.draft.population);
    if (this.govSelect) this.govSelect.value = String(this.draft.government);
    if (this.lawSelect) this.lawSelect.value = String(this.draft.lawLevel);
    if (this.tlSelect) this.tlSelect.value = String(this.draft.techLevel);
    if (this.pbgInput) this.pbgInput.value = this.draft.pbg;
    if (this.popMultInput) this.popMultInput.value = String(this.draft.popMultiplier);
    if (this.beltsInput) this.beltsInput.value = String(this.draft.belts);
    if (this.ggInput) this.ggInput.value = String(this.draft.gasGiants);
    if (this.stellarInput) this.stellarInput.value = this.draft.stellar;
    if (this.worldCountInput) this.worldCountInput.value = String(this.draft.worldCount);
    if (this.refinedCheckbox) this.refinedCheckbox.checked = this.draft.refinedFuel;
    if (this.unrefinedCheckbox) this.unrefinedCheckbox.checked = this.draft.unrefinedFuel;
    if (this.wildCheckbox) this.wildCheckbox.checked = this.draft.wildernessRefuelling;
    if (this.sourcesInput) this.sourcesInput.value = this.draft.fuelSources.join(", ");
    if (this.xboatCheckbox) this.xboatCheckbox.checked = this.draft.xboatRoute;
    if (this.tradeCheckbox) this.tradeCheckbox.checked = this.draft.tradeRoute;
    if (this.patrolCheckbox) this.patrolCheckbox.checked = this.draft.patrolRoute;
    if (this.navalCheckbox) this.navalCheckbox.checked = this.draft.bases.includes("Naval");
    if (this.scoutCheckbox) this.scoutCheckbox.checked = this.draft.bases.includes("Scout");
    if (this.researchCheckbox) this.researchCheckbox.checked = this.draft.bases.includes("Research");
    if (this.corpCheckbox) this.corpCheckbox.checked = this.draft.bases.includes("Corporate");
    if (this.milCheckbox) this.milCheckbox.checked = this.draft.bases.includes("Military");
    if (this.styleSelect) this.styleSelect.value = this.draft.dossierStyle;
    if (this.complexitySelect) this.complexitySelect.value = this.draft.dossierComplexity;
    if (this.densitySelect) this.densitySelect.value = String(this.draft.dossierDensity);
    if (this.frontierCoreSlider) {
      this.frontierCoreSlider.value = String(this.draft.frontierCore);
      if (this.frontierCoreValueEl) this.frontierCoreValueEl.setText(String(this.draft.frontierCore));
    }
    if (this.dangerLevelSlider) {
      this.dangerLevelSlider.value = String(this.draft.dangerLevel);
      if (this.dangerLevelValueEl) this.dangerLevelValueEl.setText(String(this.draft.dangerLevel));
    }
    if (this.corporateInfluenceSlider) {
      this.corporateInfluenceSlider.value = String(this.draft.corporateInfluence);
      if (this.corporateInfluenceValueEl) this.corporateInfluenceValueEl.setText(String(this.draft.corporateInfluence));
    }
    if (this.weirdnessLevelSlider) {
      this.weirdnessLevelSlider.value = String(this.draft.weirdnessLevel);
      if (this.weirdnessLevelValueEl) this.weirdnessLevelValueEl.setText(String(this.draft.weirdnessLevel));
    }
    this.updateUWPDisplay();
  }

  private updateUWPDisplay(): void {
    const uwp = getUwpFromDraft(this.draft);
    if (this.uwpsDisplayEl) {
      this.uwpsDisplayEl.setText(uwp);
    }
  }

  private refreshDraftPreview(): void {
    if (!this.previewSectionEl) return;
    this.updateUWPDisplay();
    const pbg = getPbgFromDraft(this.draft);
    const mapLine = getMapLineFromDraft(this.draft);
    const tradeCodes = this.draft.tradeCodes.join(" ");
    const baseCodes = this.draft.baseCodes.join("/");
    const zone = this.draft.travelZone;
    const fuelSources = this.draft.fuelSources.join(", ");
    if (this.pbgDisplayEl) this.pbgDisplayEl.setText(pbg);
    if (this.mapLineDisplayEl) this.mapLineDisplayEl.setText(mapLine);
    if (this.tradeCodesDisplayEl) this.tradeCodesDisplayEl.setText(tradeCodes || "-");
    if (this.baseCodesDisplayEl) this.baseCodesDisplayEl.setText(baseCodes || "-");
    if (this.zoneDisplayEl) this.zoneDisplayEl.setText(zone);
    if (this.fuelSourcesDisplayEl) this.fuelSourcesDisplayEl.setText(fuelSources || "-");
  }

  private buildPreviewContextFromDraft(): TravellerTemplateContext {
    const paths = this.getDraftPaths(this.draft);
    return buildTemplateContextFromDraft(this.draft, paths);
  }

  // ==========================================================================
  // ACTION HANDLERS
  // ==========================================================================

  private rollFullSystem(): void {
    const rolled = rollCompleteSystemDraft();
    this.draft = normalizeDraft({
      ...rolled,
      hex: this.draft.hex || rolled.hex,
      name: this.draft.name !== "Unnamed" ? this.draft.name : rolled.name,
    });
    this.syncUIFromDraft();
    new Notice("Rolled full system.");
  }

  private generateName(): void {
    const name = generateRandomSystemName(this.draft);
    this.setDraft({ name });
    this.syncUIFromDraft();
    new Notice(`Generated name: ${name}`);
  }

  private suggestZone(): void {
    const zone = suggestZoneForDraft(this.draft);
    this.setDraft({ travelZone: zone });
    this.syncUIFromDraft();
    new Notice(`Suggested zone: ${zone}`);
  }

  private randomizeExtras(): void {
    const randomized = randomizeMapExtrasForDraft(this.draft);
    this.draft = normalizeDraft({
      ...this.draft,
      ...randomized,
    });
    this.syncUIFromDraft();
    new Notice("Randomized map extras.");
  }

  private previewSystemYaml(): void {
    if (!this.systemYamlPreviewEl) return;
    const ctx = this.buildPreviewContextFromDraft();
    const yaml = buildSystemNote(ctx);
    this.systemYamlPreviewEl.value = yaml;
  }

  private previewMainworld(): void {
    if (!this.mainworldPreviewEl) return;
    const ctx = this.buildPreviewContextFromDraft();
    const mainworld = buildMainworldNote(ctx);
    this.mainworldPreviewEl.value = mainworld;
  }

  // ==========================================================================
  // CREATE SYSTEM - Uses this.draft
  // ==========================================================================
  async createSystem(): Promise<void> {
    const draft = normalizeDraft(this.draft);
    if (!draft.hex || !draft.name || draft.name === "Unnamed") {
      new Notice("Traveller Toolkit: Please enter both hex and name");
      return;
    }
    this.updateStatus({ lastAction: "creating", lastError: null });
    this.render();
    try {
      const normalizedHex = normalizeHexForDraft(draft.hex);
      if (!normalizedHex || !/^\d{4}$/.test(normalizedHex)) {
        this.updateStatus({ lastAction: "create", lastError: `"${draft.hex}" is not a valid hex.` });
        new Notice("Traveller Toolkit: Enter a valid hex, such as 0301");
        this.render();
        return;
      }
      const existingSystem = await this.services.discovery.findSystemByHex(normalizedHex);
      if (existingSystem) {
        this.updateStatus({ lastAction: "create", lastError: `System with hex ${normalizedHex} already exists at ${existingSystem.path}` });
        new Notice(`Traveller Toolkit: System ${normalizedHex} already exists`);
        this.render();
        return;
      }
      const paths = this.getDraftPaths(draft);
      await this.services.vault.ensureFolder(paths.systemFolder);
      const ctx = buildTemplateContextFromDraft(draft, paths);
      const systemFile = await this.services.vault.createFile(paths.systemNotePath, buildSystemNote(ctx));
      this.loadedSystem = {
        systemFile,
        systemFolder: paths.systemFolder,
        hex: normalizedHex,
        name: normalizeDraftSystemName(draft.name),
        systemNotePath: systemFile.path,
        mainworldPath: paths.mainworldPath,
        supportPaths: paths.supportPaths,
        source: "created",
        frontmatter: ctx.metadata || {},
      };
      const supportStatus: Record<string, boolean> = {};
      for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
        supportStatus[id] = this.services.vault.getFile(path) !== null;
      }
      this.status = {
        mode: "created/loaded",
        loadedSource: "created",
        systemNotePath: systemFile.path,
        systemFolder: paths.systemFolder,
        mainworldTarget: paths.mainworldPath,
        supportTargets: supportStatus,
        mainworldExists: false,
        supportCount: 0,
        lastAction: "created",
        lastError: null,
      };
      this.render();
      new Notice(`Traveller Toolkit: Created system ${normalizedHex} - ${draft.name}`);
    } catch (err) {
      console.error("[Traveller Toolkit] Create system failed:", err);
      this.updateStatus({ lastAction: "create", lastError: `Failed to create: ${err}` });
      this.render();
      new Notice("Traveller Toolkit: Create failed - see console for details");
    }
  }

  // ==========================================================================
  // LOAD SYSTEM
  // ==========================================================================
  async loadHex(hex: string): Promise<void> {
    this.updateStatus({ lastAction: "loading", lastError: null });
    this.render();
    try {
      const normalizedHex = normalizeHex(hex);
      if (!normalizedHex) {
        this.updateStatus({ lastAction: "load-hex", lastError: "Enter a valid hex, such as 0301" });
        new Notice("Traveller Toolkit: Enter a valid hex, such as 0301");
        this.render();
        return;
      }
      const systemFile = await this.services.discovery.findSystemByHex(normalizedHex);
      if (!systemFile) {
        this.updateStatus({ lastAction: "load-hex", lastError: `System with hex ${normalizedHex} not found.` });
        this.render();
        new Notice(`Traveller Toolkit: System with hex ${normalizedHex} not found`);
        return;
      }
      await this.loadSystem(systemFile, "loaded-by-hex", normalizedHex);
    } catch (err) {
      console.error("[Traveller Toolkit] Load hex failed:", err);
      this.updateStatus({ lastAction: "load-hex", lastError: `Failed to load: ${err}` });
      this.render();
      new Notice("Traveller Toolkit: Failed to load system - see console");
    }
  }

  async loadActiveNote(): Promise<void> {
    this.updateStatus({ lastAction: "loading", lastError: null });
    this.render();
    try {
      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (!activeFile) {
        this.updateStatus({ lastAction: "load-active", lastError: "No active file" });
        new Notice("Traveller Toolkit: No active file");
        this.render();
        return;
      }
      const systemFile = await this.services.discovery.findSystemFromActiveFile(activeFile);
      if (!systemFile) {
        this.updateStatus({ lastAction: "load-active", lastError: "No system found for active note" });
        new Notice("Traveller Toolkit: No system found for active note");
        this.render();
        return;
      }
      const fm = this.services.frontmatter.getFrontmatter(systemFile);
      const hex = normalizeHex(fm?.hex ?? fm?.system_hex ?? "");
      await this.loadSystem(systemFile, "active-note", hex);
    } catch (err) {
      console.error("[Traveller Toolkit] Load active note failed:", err);
      this.updateStatus({ lastAction: "load-active", lastError: `Failed to load: ${err}` });
      this.render();
      new Notice("Traveller Toolkit: Failed to load from active note - see console");
    }
  }

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
    this.draft = normalizeDraft(populateDraftFromFrontmatter(this.draft, fm));
    this.draft.hex = normalizedHex;
    this.draft.name = name;
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

  // ==========================================================================
  // PROMOTE SYSTEM
  // ==========================================================================
  async promoteLoadedSystem(): Promise<void> {
    if (!this.loadedSystem) {
      new Notice("Traveller Toolkit: No system loaded - load or create a system first");
      return;
    }
    this.updateStatus({ lastAction: "promoting", lastError: null });
    this.render();
    try {
      const folder = this.loadedSystem.systemFolder;
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
      this.updateStatus({ lastAction: "promote", lastError: `Failed to promote: ${err}` });
      this.render();
      new Notice("Traveller Toolkit: Promote failed - see console for details");
    }
  }

  private updateStatus(partial: Partial<SystemStatus>): void {
    this.status = { ...this.status, ...partial };
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
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

    // CREATE SYSTEM SECTION
    const createSection = target.createDiv({ cls: "ttk-section" });
    createSection.createEl("h3", { text: "Create New System" });

    // Hex input
    const hexRow = createSection.createDiv({ cls: "ttk-row" });
    hexRow.createEl("label", { text: "Hex: ", cls: "ttk-label" });
    const hexInputEl = hexRow.createEl("input", {
      type: "text",
      cls: "ttk-input ttk-input-hex",
      attr: { placeholder: "0301", maxlength: "4" },
    }) as HTMLInputElement;
    this.hexInput = hexInputEl;
    hexInputEl.value = this.draft.hex;
    hexInputEl.addEventListener("input", () => {
      this.setDraft({ hex: normalizeHexForDraft(hexInputEl.value) });
    });

    // Name input
    const nameRow = createSection.createDiv({ cls: "ttk-row" });
    nameRow.createEl("label", { text: "Name: ", cls: "ttk-label" });
    const nameInputEl = nameRow.createEl("input", {
      type: "text",
      cls: "ttk-input ttk-input-name",
      attr: { placeholder: "Milice" },
    }) as HTMLInputElement;
    this.nameInput = nameInputEl;
    nameInputEl.value = this.draft.name;
    nameInputEl.addEventListener("input", () => {
      this.setDraft({ name: normalizeDraftSystemName(nameInputEl.value) });
    });

    // GENERATION DIRECTION SLIDERS
    const slidersSection = createSection.createDiv({ cls: "ttk-section ttk-sliders-section" });
    slidersSection.createEl("h4", { text: "Generation Direction" });

    const frontierRow = slidersSection.createDiv({ cls: "ttk-row ttk-slider-row" });
    frontierRow.createEl("label", { text: "Frontier \u2190\u2192 Core", cls: "ttk-label" });
    const frontierSlider = frontierRow.createEl("input", {
      type: "range", cls: "ttk-slider",
      attr: { min: "0", max: "100", value: String(this.draft.frontierCore), step: "1" }
    }) as HTMLInputElement;
    this.frontierCoreSlider = frontierSlider;
    const frontierValue = frontierRow.createEl("span", { text: String(this.draft.frontierCore), cls: "ttk-slider-value" });
    this.frontierCoreValueEl = frontierValue;
    frontierSlider.addEventListener("input", () => {
      const value = Number(frontierSlider.value);
      this.setDraft({ frontierCore: value });
      frontierValue.setText(String(value));
    });

    const dangerRow = slidersSection.createDiv({ cls: "ttk-row ttk-slider-row" });
    dangerRow.createEl("label", { text: "Safe \u2190\u2192 Dangerous", cls: "ttk-label" });
    const dangerSlider = dangerRow.createEl("input", {
      type: "range", cls: "ttk-slider",
      attr: { min: "0", max: "100", value: String(this.draft.dangerLevel), step: "1" }
    }) as HTMLInputElement;
    this.dangerLevelSlider = dangerSlider;
    const dangerValue = dangerRow.createEl("span", { text: String(this.draft.dangerLevel), cls: "ttk-slider-value" });
    this.dangerLevelValueEl = dangerValue;
    dangerSlider.addEventListener("input", () => {
      const value = Number(dangerSlider.value);
      this.setDraft({ dangerLevel: value });
      dangerValue.setText(String(value));
    });

    const corporateRow = slidersSection.createDiv({ cls: "ttk-row ttk-slider-row" });
    corporateRow.createEl("label", { text: "Independent \u2190\u2192 Corporate", cls: "ttk-label" });
    const corporateSlider = corporateRow.createEl("input", {
      type: "range", cls: "ttk-slider",
      attr: { min: "0", max: "100", value: String(this.draft.corporateInfluence), step: "1" }
    }) as HTMLInputElement;
    this.corporateInfluenceSlider = corporateSlider;
    const corporateValue = corporateRow.createEl("span", { text: String(this.draft.corporateInfluence), cls: "ttk-slider-value" });
    this.corporateInfluenceValueEl = corporateValue;
    corporateSlider.addEventListener("input", () => {
      const value = Number(corporateSlider.value);
      this.setDraft({ corporateInfluence: value });
      corporateValue.setText(String(value));
    });

    const weirdnessRow = slidersSection.createDiv({ cls: "ttk-row ttk-slider-row" });
    weirdnessRow.createEl("label", { text: "Conventional \u2190\u2192 Weird", cls: "ttk-label" });
    const weirdnessSlider = weirdnessRow.createEl("input", {
      type: "range", cls: "ttk-slider",
      attr: { min: "0", max: "100", value: String(this.draft.weirdnessLevel), step: "1" }
    }) as HTMLInputElement;
    this.weirdnessLevelSlider = weirdnessSlider;
    const weirdnessValue = weirdnessRow.createEl("span", { text: String(this.draft.weirdnessLevel), cls: "ttk-slider-value" });
    this.weirdnessLevelValueEl = weirdnessValue;
    weirdnessSlider.addEventListener("input", () => {
      const value = Number(weirdnessSlider.value);
      this.setDraft({ weirdnessLevel: value });
      weirdnessValue.setText(String(value));
    });

    // MAINWORLD UWP FIELDS
    const uwpsSection = createSection.createDiv({ cls: "ttk-section ttk-uwp-section" });
    uwpsSection.createEl("h4", { text: "Mainworld UWP" });

    const starportRow = uwpsSection.createDiv({ cls: "ttk-row" });
    starportRow.createEl("label", { text: "Starport: ", cls: "ttk-label" });
    this.starportSelect = starportRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    ["X", "E", "D", "C", "B", "A"].forEach(opt => { this.starportSelect!.createEl("option", { text: opt, value: opt }); });
    this.starportSelect.value = this.draft.starport;
    this.starportSelect.addEventListener("change", () => { this.setDraft({ starport: this.starportSelect!.value }); });

    const sizeRow = uwpsSection.createDiv({ cls: "ttk-row" });
    sizeRow.createEl("label", { text: "Size: ", cls: "ttk-label" });
    this.sizeSelect = sizeRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) { this.sizeSelect.createEl("option", { text: String(i), value: String(i) }); }
    this.sizeSelect.value = String(this.draft.size);
    this.sizeSelect.addEventListener("change", () => { this.setDraft({ size: Number(this.sizeSelect!.value) }); });

    const atmRow = uwpsSection.createDiv({ cls: "ttk-row" });
    atmRow.createEl("label", { text: "Atmosphere: ", cls: "ttk-label" });
    this.atmosphereSelect = atmRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) { this.atmosphereSelect.createEl("option", { text: String(i), value: String(i) }); }
    this.atmosphereSelect.value = String(this.draft.atmosphere);
    this.atmosphereSelect.addEventListener("change", () => { this.setDraft({ atmosphere: Number(this.atmosphereSelect!.value) }); });

    const hydroRow = uwpsSection.createDiv({ cls: "ttk-row" });
    hydroRow.createEl("label", { text: "Hydro: ", cls: "ttk-label" });
    this.hydroSelect = hydroRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    for (let i = 0; i <= 10; i++) { this.hydroSelect.createEl("option", { text: String(i), value: String(i) }); }
    this.hydroSelect.value = String(this.draft.hydrographics);
    this.hydroSelect.addEventListener("change", () => { this.setDraft({ hydrographics: Number(this.hydroSelect!.value) }); });

    const popRow = uwpsSection.createDiv({ cls: "ttk-row" });
    popRow.createEl("label", { text: "Population: ", cls: "ttk-label" });
    this.popSelect = popRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) { this.popSelect.createEl("option", { text: String(i), value: String(i) }); }
    this.popSelect.value = String(this.draft.population);
    this.popSelect.addEventListener("change", () => { this.setDraft({ population: Number(this.popSelect!.value) }); });

    const govRow = uwpsSection.createDiv({ cls: "ttk-row" });
    govRow.createEl("label", { text: "Government: ", cls: "ttk-label" });
    this.govSelect = govRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) { this.govSelect.createEl("option", { text: String(i), value: String(i) }); }
    this.govSelect.value = String(this.draft.government);
    this.govSelect.addEventListener("change", () => { this.setDraft({ government: Number(this.govSelect!.value) }); });

    const lawRow = uwpsSection.createDiv({ cls: "ttk-row" });
    lawRow.createEl("label", { text: "Law: ", cls: "ttk-label" });
    this.lawSelect = lawRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) { this.lawSelect.createEl("option", { text: String(i), value: String(i) }); }
    this.lawSelect.value = String(this.draft.lawLevel);
    this.lawSelect.addEventListener("change", () => { this.setDraft({ lawLevel: Number(this.lawSelect!.value) }); });

    const tlRow = uwpsSection.createDiv({ cls: "ttk-row" });
    tlRow.createEl("label", { text: "TL: ", cls: "ttk-label" });
    this.tlSelect = tlRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) { this.tlSelect.createEl("option", { text: String(i), value: String(i) }); }
    this.tlSelect.value = String(this.draft.techLevel);
    this.tlSelect.addEventListener("change", () => { this.setDraft({ techLevel: Number(this.tlSelect!.value) }); });

    const uwpsDisplayRow = uwpsSection.createDiv({ cls: "ttk-row" });
    uwpsDisplayRow.createEl("label", { text: "UWP: ", cls: "ttk-label" });
    const uwpsDisplay = uwpsDisplayRow.createEl("span", { cls: "ttk-uwp-display" });
    this.uwpsDisplayEl = uwpsDisplay;
    uwpsDisplay.setText(getUwpFromDraft(this.draft));

    // MAP METADATA
    const mapSection = createSection.createDiv({ cls: "ttk-section ttk-map-section" });
    mapSection.createEl("h4", { text: "Map Metadata" });

    const pbgRow = mapSection.createDiv({ cls: "ttk-row" });
    pbgRow.createEl("label", { text: "PBG: ", cls: "ttk-label" });
    this.pbgInput = pbgRow.createEl("input", { type: "text", cls: "ttk-input ttk-input-short", attr: { placeholder: "101", maxlength: "3" } }) as HTMLInputElement;
    this.pbgInput.value = this.draft.pbg;
    this.pbgInput.addEventListener("input", () => { this.setDraft({ pbg: this.pbgInput!.value }); });

    const popMultRow = mapSection.createDiv({ cls: "ttk-row" });
    popMultRow.createEl("label", { text: "Pop Mult: ", cls: "ttk-label" });
    this.popMultInput = popMultRow.createEl("input", { type: "number", cls: "ttk-input ttk-input-short", attr: { placeholder: "0", min: "0" } }) as HTMLInputElement;
    this.popMultInput.value = String(this.draft.popMultiplier);
    this.popMultInput.addEventListener("input", () => { this.setDraft({ popMultiplier: Number(this.popMultInput!.value) }); });

    const beltsRow = mapSection.createDiv({ cls: "ttk-row" });
    beltsRow.createEl("label", { text: "Belts: ", cls: "ttk-label" });
    this.beltsInput = beltsRow.createEl("input", { type: "number", cls: "ttk-input ttk-input-short", attr: { placeholder: "0", min: "0" } }) as HTMLInputElement;
    this.beltsInput.value = String(this.draft.belts);
    this.beltsInput.addEventListener("input", () => { this.setDraft({ belts: Number(this.beltsInput!.value) }); });

    const ggRow = mapSection.createDiv({ cls: "ttk-row" });
    ggRow.createEl("label", { text: "Gas Giants: ", cls: "ttk-label" });
    this.ggInput = ggRow.createEl("input", { type: "number", cls: "ttk-input ttk-input-short", attr: { placeholder: "1", min: "0" } }) as HTMLInputElement;
    this.ggInput.value = String(this.draft.gasGiants);
    this.ggInput.addEventListener("input", () => { this.setDraft({ gasGiants: Number(this.ggInput!.value) }); });

    const stellarRow = mapSection.createDiv({ cls: "ttk-row" });
    stellarRow.createEl("label", { text: "Stellar: ", cls: "ttk-label" });
    this.stellarInput = stellarRow.createEl("input", { type: "text", cls: "ttk-input", attr: { placeholder: "G2 V" } }) as HTMLInputElement;
    this.stellarInput.value = this.draft.stellar;
    this.stellarInput.addEventListener("input", () => { this.setDraft({ stellar: this.stellarInput!.value }); });

    const worldCountRow = mapSection.createDiv({ cls: "ttk-row" });
    worldCountRow.createEl("label", { text: "Worlds: ", cls: "ttk-label" });
    this.worldCountInput = worldCountRow.createEl("input", { type: "number", cls: "ttk-input ttk-input-short", attr: { placeholder: "1", min: "1" } }) as HTMLInputElement;
    this.worldCountInput.value = String(this.draft.worldCount);
    this.worldCountInput.addEventListener("input", () => { this.setDraft({ worldCount: Number(this.worldCountInput!.value) }); });

    // FUEL/ROUTES
    const fuelSection = createSection.createDiv({ cls: "ttk-section ttk-fuel-section" });
    fuelSection.createEl("h4", { text: "Fuel, Port, Routes" });

    const refinedRow = fuelSection.createDiv({ cls: "ttk-row" });
    refinedRow.createEl("label", { text: "Refined Fuel: ", cls: "ttk-label" });
    this.refinedCheckbox = refinedRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox" }) as HTMLInputElement;
    this.refinedCheckbox.checked = this.draft.refinedFuel;
    this.refinedCheckbox.addEventListener("change", () => { this.setDraft({ refinedFuel: this.refinedCheckbox!.checked }); });

    const unrefinedRow = fuelSection.createDiv({ cls: "ttk-row" });
    unrefinedRow.createEl("label", { text: "Unrefined Fuel: ", cls: "ttk-label" });
    this.unrefinedCheckbox = unrefinedRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox" }) as HTMLInputElement;
    this.unrefinedCheckbox.checked = this.draft.unrefinedFuel;
    this.unrefinedCheckbox.addEventListener("change", () => { this.setDraft({ unrefinedFuel: this.unrefinedCheckbox!.checked }); });

    const wildRow = fuelSection.createDiv({ cls: "ttk-row" });
    wildRow.createEl("label", { text: "Wilderness Refuelling: ", cls: "ttk-label" });
    this.wildCheckbox = wildRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox" }) as HTMLInputElement;
    this.wildCheckbox.checked = this.draft.wildernessRefuelling;
    this.wildCheckbox.addEventListener("change", () => { this.setDraft({ wildernessRefuelling: this.wildCheckbox!.checked }); });

    const sourcesRow = fuelSection.createDiv({ cls: "ttk-row" });
    sourcesRow.createEl("label", { text: "Fuel Sources: ", cls: "ttk-label" });
    this.sourcesInput = sourcesRow.createEl("input", { type: "text", cls: "ttk-input", attr: { placeholder: "e.g., Water, Hydrogen" } }) as HTMLInputElement;
    this.sourcesInput.value = this.draft.fuelSources.join(", ");
    this.sourcesInput.addEventListener("input", () => {
      const sources = this.sourcesInput!.value.split(",").map(s => s.trim()).filter(Boolean);
      this.setDraft({ fuelSources: sources.length > 0 ? sources : ["gas giant"] });
    });

    const routesRow = fuelSection.createDiv({ cls: "ttk-row" });
    routesRow.createEl("label", { text: "Routes: ", cls: "ttk-label" });
    this.xboatCheckbox = routesRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox", attr: { id: "xboat" } }) as HTMLInputElement;
    routesRow.createEl("label", { text: "Xboat", cls: "ttk-checkbox-label", attr: { for: "xboat" } });
    this.xboatCheckbox.checked = this.draft.xboatRoute;
    this.xboatCheckbox.addEventListener("change", () => { this.setDraft({ xboatRoute: this.xboatCheckbox!.checked }); });

    this.tradeCheckbox = routesRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox", attr: { id: "trade" } }) as HTMLInputElement;
    routesRow.createEl("label", { text: "Trade", cls: "ttk-checkbox-label", attr: { for: "trade" } });
    this.tradeCheckbox.checked = this.draft.tradeRoute;
    this.tradeCheckbox.addEventListener("change", () => { this.setDraft({ tradeRoute: this.tradeCheckbox!.checked }); });

    this.patrolCheckbox = routesRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox", attr: { id: "patrol" } }) as HTMLInputElement;
    routesRow.createEl("label", { text: "Patrol", cls: "ttk-checkbox-label", attr: { for: "patrol" } });
    this.patrolCheckbox.checked = this.draft.patrolRoute;
    this.patrolCheckbox.addEventListener("change", () => { this.setDraft({ patrolRoute: this.patrolCheckbox!.checked }); });

    // BASES
    const basesSection = createSection.createDiv({ cls: "ttk-section ttk-bases-section" });
    basesSection.createEl("h4", { text: "Bases & Special Features" });
    const basesRow = basesSection.createDiv({ cls: "ttk-row" });
    const updateBases = (baseName: string, checkbox: HTMLInputElement) => {
      const bases = [...this.draft.bases];
      if (checkbox.checked && !bases.includes(baseName)) bases.push(baseName);
      else if (!checkbox.checked) { const idx = bases.indexOf(baseName); if (idx >= 0) bases.splice(idx, 1); }
      this.setDraft({ bases });
    };
    this.navalCheckbox = basesRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox", attr: { id: "naval" } }) as HTMLInputElement;
    basesRow.createEl("label", { text: "Naval", cls: "ttk-checkbox-label", attr: { for: "naval" } });
    this.navalCheckbox.checked = this.draft.bases.includes("Naval");
    this.navalCheckbox.addEventListener("change", () => updateBases("Naval", this.navalCheckbox!));
    this.scoutCheckbox = basesRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox", attr: { id: "scout" } }) as HTMLInputElement;
    basesRow.createEl("label", { text: "Scout", cls: "ttk-checkbox-label", attr: { for: "scout" } });
    this.scoutCheckbox.checked = this.draft.bases.includes("Scout");
    this.scoutCheckbox.addEventListener("change", () => updateBases("Scout", this.scoutCheckbox!));
    this.researchCheckbox = basesRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox", attr: { id: "research" } }) as HTMLInputElement;
    basesRow.createEl("label", { text: "Research", cls: "ttk-checkbox-label", attr: { for: "research" } });
    this.researchCheckbox.checked = this.draft.bases.includes("Research");
    this.researchCheckbox.addEventListener("change", () => updateBases("Research", this.researchCheckbox!));
    this.corpCheckbox = basesRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox", attr: { id: "corp" } }) as HTMLInputElement;
    basesRow.createEl("label", { text: "Corporate", cls: "ttk-checkbox-label", attr: { for: "corp" } });
    this.corpCheckbox.checked = this.draft.bases.includes("Corporate");
    this.corpCheckbox.addEventListener("change", () => updateBases("Corporate", this.corpCheckbox!));
    this.milCheckbox = basesRow.createEl("input", { type: "checkbox", cls: "ttk-checkbox", attr: { id: "mil" } }) as HTMLInputElement;
    basesRow.createEl("label", { text: "Military", cls: "ttk-checkbox-label", attr: { for: "mil" } });
    this.milCheckbox.checked = this.draft.bases.includes("Military");
    this.milCheckbox.addEventListener("change", () => updateBases("Military", this.milCheckbox!));

    // DOSSIER OPTIONS
    const dossierSection = createSection.createDiv({ cls: "ttk-section ttk-dossier-section" });
    dossierSection.createEl("h4", { text: "Dossier Options" });
    const styleRow = dossierSection.createDiv({ cls: "ttk-row" });
    styleRow.createEl("label", { text: "Style: ", cls: "ttk-label" });
    this.styleSelect = styleRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    ["Standard", "Detailed", "Concise", "Atmospheric"].forEach(opt => { this.styleSelect!.createEl("option", { text: opt, value: opt }); });
    this.styleSelect.value = this.draft.dossierStyle;
    this.styleSelect.addEventListener("change", () => { this.setDraft({ dossierStyle: this.styleSelect!.value }); });
    const complexityRow = dossierSection.createDiv({ cls: "ttk-row" });
    complexityRow.createEl("label", { text: "Complexity: ", cls: "ttk-label" });
    this.complexitySelect = complexityRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    ["Low", "Moderate", "High", "Very High"].forEach(opt => { this.complexitySelect!.createEl("option", { text: opt, value: opt }); });
    this.complexitySelect.value = this.draft.dossierComplexity;
    this.complexitySelect.addEventListener("change", () => { this.setDraft({ dossierComplexity: this.complexitySelect!.value }); });
    const densityRow = dossierSection.createDiv({ cls: "ttk-row" });
    densityRow.createEl("label", { text: "Density: ", cls: "ttk-label" });
    this.densitySelect = densityRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    for (let i = 1; i <= 5; i++) { this.densitySelect.createEl("option", { text: String(i), value: String(i) }); }
    this.densitySelect.value = String(this.draft.dossierDensity);
    this.densitySelect.addEventListener("change", () => { this.setDraft({ dossierDensity: Number(this.densitySelect!.value) }); });

    // ACTION BUTTONS
    const actionSection = createSection.createDiv({ cls: "ttk-section ttk-action-section" });
    actionSection.createEl("h4", { text: "Quick Actions" });
    const actionRow1 = actionSection.createDiv({ cls: "ttk-row ttk-action-row" });
    actionRow1.createEl("button", { text: "Roll Full System", cls: "ttk-button" }).addEventListener("click", () => this.rollFullSystem());
    actionRow1.createEl("button", { text: "Generate Name", cls: "ttk-button" }).addEventListener("click", () => this.generateName());
    actionRow1.createEl("button", { text: "Suggest Zone", cls: "ttk-button" }).addEventListener("click", () => this.suggestZone());
    actionRow1.createEl("button", { text: "Randomize Extras", cls: "ttk-button" }).addEventListener("click", () => this.randomizeExtras());
    const actionRow2 = actionSection.createDiv({ cls: "ttk-row ttk-action-row" });
    actionRow2.createEl("button", { text: "Preview System YAML", cls: "ttk-button" }).addEventListener("click", () => this.previewSystemYaml());
    actionRow2.createEl("button", { text: "Preview Mainworld Template", cls: "ttk-button" }).addEventListener("click", () => this.previewMainworld());

    // CREATE BUTTON
    createSection.createEl("button", { text: "Create System Folder + _Name.md", cls: "ttk-button ttk-button-create" }).addEventListener("click", async () => { await this.createSystem(); });

    // PREVIEW SECTION
    const previewSection = createSection.createDiv({ cls: "ttk-section ttk-preview-section" });
    previewSection.createEl("h4", { text: "Current Draft Preview" });
    this.previewSectionEl = previewSection;
    const previewGrid = previewSection.createDiv({ cls: "ttk-preview-grid" });
    const addPreview = (label: string, value: string) => {
      const row = previewGrid.createDiv({ cls: "ttk-preview-item" });
      row.createEl("span", { text: `${label}: `, cls: "ttk-preview-label" });
      const valEl = row.createEl("span", { text: value, cls: "ttk-preview-value" });
      return valEl;
    };
    this.uwpsDisplayEl = addPreview("UWP", getUwpFromDraft(this.draft));
    this.pbgDisplayEl = addPreview("PBG", getPbgFromDraft(this.draft));
    this.mapLineDisplayEl = addPreview("Map Line", getMapLineFromDraft(this.draft));
    this.tradeCodesDisplayEl = addPreview("Trade Codes", this.draft.tradeCodes.join(" ") || "-");
    this.baseCodesDisplayEl = addPreview("Base Codes", this.draft.baseCodes.join("/") || "-");
    this.zoneDisplayEl = addPreview("Zone", this.draft.travelZone);
    this.fuelSourcesDisplayEl = addPreview("Fuel Sources", this.draft.fuelSources.join(", ") || "-");
    previewSection.createDiv({ cls: "ttk-row" }).createEl("label", { text: "System YAML Preview:", cls: "ttk-label" });
    this.systemYamlPreviewEl = previewSection.createEl("textarea", { cls: "ttk-textarea ttk-preview-textarea", attr: { rows: "10", readonly: "true", placeholder: "Click 'Preview System YAML' to see output" } }) as HTMLTextAreaElement;
    previewSection.createDiv({ cls: "ttk-row" }).createEl("label", { text: "Mainworld Template Preview:", cls: "ttk-label" });
    this.mainworldPreviewEl = previewSection.createEl("textarea", { cls: "ttk-textarea ttk-preview-textarea", attr: { rows: "10", readonly: "true", placeholder: "Click 'Preview Mainworld Template' to see output" } }) as HTMLTextAreaElement;

    // LOAD SYSTEM SECTION
    const loadSection = target.createDiv({ cls: "ttk-section" });
    loadSection.createEl("h3", { text: "Load Existing System" });
    const loadHexRow = loadSection.createDiv({ cls: "ttk-row" });
    const loadHexInput = loadHexRow.createEl("input", { type: "text", cls: "ttk-input", attr: { placeholder: "Enter hex (e.g., 0301)", maxlength: "4" } }) as HTMLInputElement;
    loadHexRow.createEl("button", { text: "Load Hex", cls: "ttk-button" }).addEventListener("click", async () => {
      const hex = loadHexInput.value.trim().toUpperCase();
      if (hex) await this.loadHex(hex);
    });
    loadHexRow.createEl("button", { text: "Debug Find Hex", cls: "ttk-button ttk-button-debug" }).addEventListener("click", async () => {
      const hex = normalizeHex(loadHexInput.value.trim());
      const file = await this.services.discovery.findSystemByHex(hex);
      new Notice(file ? `Found: ${file.path}` : `No system found for ${hex}`);
    });
    const loadActiveRow = loadSection.createDiv({ cls: "ttk-row" });
    loadActiveRow.createEl("button", { text: "Load Active Note", cls: "ttk-button" }).addEventListener("click", async () => { await this.loadActiveNote(); });

    // PROMOTE SECTION (only when system loaded)
    if (this.loadedSystem) {
      const promoteSection = target.createDiv({ cls: "ttk-section" });
      promoteSection.createEl("h3", { text: "Promote System" });
      promoteSection.createEl("button", { text: "Promote Loaded System \u2014 Create Missing Notes Only", cls: "ttk-button ttk-button-primary ttk-button-promote" }).addEventListener("click", async () => { await this.promoteLoadedSystem(); });
      const previewPromoteSection = promoteSection.createDiv({ cls: "ttk-promote-preview" });
      previewPromoteSection.createEl("h4", { text: "Promote Preview" });
      const previewList = previewPromoteSection.createEl("ul", { cls: "ttk-promote-preview-list" });
      const preserveLi = previewList.createEl("li", { cls: "ttk-promote-preview-item" });
      preserveLi.createEl("span", { text: "Will preserve: ", cls: "ttk-promote-preview-label" });
      const preserveUl = preserveLi.createEl("ul", { cls: "ttk-promote-preview-sublist" });
      preserveUl.createEl("li", { text: "Existing mainworld note, if present" });
      preserveUl.createEl("li", { text: "Existing support notes, if present" });
      const createLi = previewList.createEl("li", { cls: "ttk-promote-preview-item" });
      createLi.createEl("span", { text: "Will create if missing: ", cls: "ttk-promote-preview-label" });
      const createUl = createLi.createEl("ul", { cls: "ttk-promote-preview-sublist" });
      createUl.createEl("li", { text: this.loadedSystem.mainworldPath });
      for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
        const noteName = SUPPORT_NOTES.find(n => n.id === id)?.label || id;
        createUl.createEl("li", { text: `${noteName}: ${path}` });
      }
      const updateLi = previewList.createEl("li", { cls: "ttk-promote-preview-item" });
      updateLi.createEl("span", { text: "Will update frontmatter on: ", cls: "ttk-promote-preview-label" });
      updateLi.createEl("span", { text: this.loadedSystem.systemNotePath });
      previewList.createEl("li", { cls: "ttk-promote-preview-item ttk-promote-preview-note" }).createEl("span", { text: "Existing notes will not be overwritten" });
    }

    // DEBUG PANEL - ALWAYS VISIBLE
    const debugPanel = target.createDiv({ cls: "ttk-debug-panel" });
    debugPanel.createEl("h3", { text: "\ud83d\udcb0 Debug: Loaded System State & Current Draft", cls: "ttk-debug-title" });
    this.renderDebugPanel(debugPanel);
    const draftPreview = debugPanel.createDiv({ cls: "ttk-debug-subtitle" });
    draftPreview.createEl("span", { text: "Current Draft Values:" });
    const draftGrid = debugPanel.createDiv({ cls: "ttk-debug-draft-grid" });
    const draftFields = [
      { label: "Hex", value: this.draft.hex },
      { label: "Name", value: this.draft.name },
      { label: "Starport", value: this.draft.starport },
      { label: "Size", value: String(this.draft.size) },
      { label: "Atm", value: String(this.draft.atmosphere) },
      { label: "Hydro", value: String(this.draft.hydrographics) },
      { label: "Pop", value: String(this.draft.population) },
      { label: "Gov", value: String(this.draft.government) },
      { label: "Law", value: String(this.draft.lawLevel) },
      { label: "TL", value: String(this.draft.techLevel) },
      { label: "Zone", value: this.draft.travelZone },
      { label: "Gas Giants", value: String(this.draft.gasGiants) },
      { label: "Bases", value: this.draft.bases.join(", ") || "-" },
      { label: "Trade Codes", value: this.draft.tradeCodes.join(" ") || "-" },
      { label: "Fuel Reliability", value: String(this.draft.fuelReliability) },
      { label: "Autocracy Pressure", value: String(this.draft.autocracyPressure) },
    ];
    for (const field of draftFields) {
      const row = draftGrid.createDiv({ cls: "ttk-debug-row" });
      row.createEl("span", { text: `${field.label}: `, cls: "ttk-debug-label" });
      row.createEl("span", { text: field.value, cls: "ttk-debug-value" });
    }

    // STATUS
    const statusDiv = target.createDiv({ cls: "ttk-status" });
    this.renderStatus(statusDiv);

    // LOADED SYSTEM INFO (when loaded)
    if (this.loadedSystem) {
      this.renderLoadedSystemInfo(target);
    }
  }

  private renderDebugPanel(container: HTMLElement): void {
    container.empty();
    const addDebugRow = (label: string, value: string | null, important: boolean = false) => {
      const row = container.createDiv({ cls: "ttk-debug-row" });
      row.createEl("span", { text: `${label}: `, cls: "ttk-debug-label" });
      row.createEl("span", { text: value || "null", cls: `ttk-debug-value${important ? " ttk-debug-important" : ""}` });
    };
    addDebugRow("Mode", this.status.mode);
    addDebugRow("Loaded Source", this.status.loadedSource);
    addDebugRow("System Note Path", this.status.systemNotePath, true);
    addDebugRow("System Folder", this.status.systemFolder, true);
    addDebugRow("Mainworld Target", this.status.mainworldTarget, true);
    if (this.loadedSystem) {
      addDebugRow("Hex", this.loadedSystem.hex, true);
      addDebugRow("Name", this.loadedSystem.name, true);
      addDebugRow("Actual systemFile.path", this.loadedSystem.systemFile?.path || null, true);
      addDebugRow("Actual systemFile.parent.path", this.loadedSystem.systemFile?.parent?.path || null, true);
      container.createDiv({ text: "\u2192 Promotion will use: loadedSystem.systemFolder", cls: "ttk-debug-note" });
      container.createDiv({ text: "\u2192 NOT using: settings.systemsFolder", cls: "ttk-debug-note" });
      container.createEl("div", { text: "Support Targets:", cls: "ttk-debug-subtitle" });
      for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
        addDebugRow(`  ${id}`, path);
      }
    } else {
      addDebugRow("Hex", null);
      addDebugRow("Name", null);
    }
    addDebugRow("Mainworld Exists", String(this.status.mainworldExists));
    addDebugRow("Support Count", String(this.status.supportCount));
    addDebugRow("Last Action", this.status.lastAction);
    if (this.status.lastError) {
      addDebugRow("Last Error", this.status.lastError, true);
    }
  }

  private renderStatus(container: HTMLElement): void {
    container.empty();
    const statusText = this.status.lastError
      ? `\u274c ${this.status.lastError}`
      : this.status.mode === "empty"
        ? "\u2713 Ready - Enter hex/name or load existing system"
        : this.status.mode === "draft"
          ? `\u2713 Created system ${this.loadedSystem?.hex} - ${this.loadedSystem?.name}`
          : this.status.mode === "created/loaded"
            ? `\u2713 Loaded system ${this.loadedSystem?.hex} - ${this.loadedSystem?.name}`
            : this.status.mode === "promoted"
              ? `\u2713 Promoted system ${this.loadedSystem?.hex} - ${this.loadedSystem?.name}`
              : `Mode: ${this.status.mode}`;
    container.createEl("p", { text: statusText, cls: `ttk-status-text ttk-status-${this.status.lastError ? "error" : "ok"}` });
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
    const supportSection = container.createDiv({ cls: "ttk-section" });
    supportSection.createEl("h3", { text: "Support Notes Status" });
    for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
      const noteName = SUPPORT_NOTES.find(n => n.id === id)?.label || id;
      const exists = this.services.vault.getFile(path) !== null;
      const statusText = exists ? "\u2713 Exists" : "\u2717 Missing";
      const statusCls = exists ? "ttk-status-exists" : "ttk-status-missing";
      const item = supportSection.createEl("p", { cls: "ttk-support-item" });
      item.createEl("span", { text: `${noteName}: ` });
      item.createEl("span", { text: statusText, cls: statusCls });
    }
  }

  onUnload(): void {
    this.containerEl = null;
    this.hexInput = null; this.nameInput = null;
    this.previewSectionEl = null; this.uwpsDisplayEl = null; this.pbgDisplayEl = null;
    this.mapLineDisplayEl = null; this.tradeCodesDisplayEl = null; this.baseCodesDisplayEl = null;
    this.zoneDisplayEl = null; this.fuelSourcesDisplayEl = null;
    this.systemYamlPreviewEl = null; this.mainworldPreviewEl = null;
    this.frontierCoreSlider = null; this.dangerLevelSlider = null;
    this.corporateInfluenceSlider = null; this.weirdnessLevelSlider = null;
    this.frontierCoreValueEl = null; this.dangerLevelValueEl = null;
    this.corporateInfluenceValueEl = null; this.weirdnessLevelValueEl = null;
    this.starportSelect = null; this.sizeSelect = null; this.atmosphereSelect = null;
    this.hydroSelect = null; this.popSelect = null; this.govSelect = null;
    this.lawSelect = null; this.tlSelect = null; this.pbgInput = null;
    this.popMultInput = null; this.beltsInput = null; this.ggInput = null;
    this.stellarInput = null; this.worldCountInput = null; this.refinedCheckbox = null;
    this.unrefinedCheckbox = null; this.wildCheckbox = null; this.sourcesInput = null;
    this.xboatCheckbox = null; this.tradeCheckbox = null; this.patrolCheckbox = null;
    this.navalCheckbox = null; this.scoutCheckbox = null; this.researchCheckbox = null;
    this.corpCheckbox = null; this.milCheckbox = null;
    this.styleSelect = null; this.complexitySelect = null; this.densitySelect = null;
  }
}
