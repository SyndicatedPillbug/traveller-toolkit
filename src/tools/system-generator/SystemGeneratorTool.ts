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
    
    // ======================================================================
    // GENERATION DIRECTION SLIDERS
    // ======================================================================
    const slidersSection = createSection.createDiv({ cls: "ttk-section ttk-sliders-section" });
    slidersSection.createEl("h4", { text: "Generation Direction" });
    
    // Frontier/Core slider
    const frontierRow = slidersSection.createDiv({ cls: "ttk-row ttk-slider-row" });
    frontierRow.createEl("label", { text: "Frontier ←→ Core", cls: "ttk-label" });
    const frontierSlider = frontierRow.createEl("input", {
      type: "range",
      cls: "ttk-slider",
      attr: { min: "0", max: "10", value: "5", step: "1" }
    }) as HTMLInputElement;
    frontierRow.createEl("span", { text: "5", cls: "ttk-slider-value" });
    
    // Danger slider
    const dangerRow = slidersSection.createDiv({ cls: "ttk-row ttk-slider-row" });
    dangerRow.createEl("label", { text: "Safe ←→ Dangerous", cls: "ttk-label" });
    const dangerSlider = dangerRow.createEl("input", {
      type: "range",
      cls: "ttk-slider",
      attr: { min: "0", max: "10", value: "5", step: "1" }
    }) as HTMLInputElement;
    dangerRow.createEl("span", { text: "5", cls: "ttk-slider-value" });
    
    // Corporate slider
    const corporateRow = slidersSection.createDiv({ cls: "ttk-row ttk-slider-row" });
    corporateRow.createEl("label", { text: "Independent ←→ Corporate", cls: "ttk-label" });
    const corporateSlider = corporateRow.createEl("input", {
      type: "range",
      cls: "ttk-slider",
      attr: { min: "0", max: "10", value: "5", step: "1" }
    }) as HTMLInputElement;
    corporateRow.createEl("span", { text: "5", cls: "ttk-slider-value" });
    
    // Weirdness slider
    const weirdnessRow = slidersSection.createDiv({ cls: "ttk-row ttk-slider-row" });
    weirdnessRow.createEl("label", { text: "Conventional ←→ Weird", cls: "ttk-label" });
    const weirdnessSlider = weirdnessRow.createEl("input", {
      type: "range",
      cls: "ttk-slider",
      attr: { min: "0", max: "10", value: "5", step: "1" }
    }) as HTMLInputElement;
    weirdnessRow.createEl("span", { text: "5", cls: "ttk-slider-value" });
    
    // ======================================================================
    // MAINWORLD UWP FIELDS
    // ======================================================================
    const uwpsSection = createSection.createDiv({ cls: "ttk-section ttk-uwp-section" });
    uwpsSection.createEl("h4", { text: "Mainworld UWP" });
    
    // Starport
    const starportRow = uwpsSection.createDiv({ cls: "ttk-row" });
    starportRow.createEl("label", { text: "Starport: ", cls: "ttk-label" });
    this.starportSelect = starportRow.createEl("select", {
      cls: "ttk-select"
    }) as HTMLSelectElement;
    ["X", "E", "D", "C", "B", "A"].forEach(opt => {
      starportSelectEl.createEl("option", { text: opt, value: opt });
    });
    starportSelectEl.value = "C";
    
    // Size
    const sizeRow = uwpsSection.createDiv({ cls: "ttk-row" });
    sizeRow.createEl("label", { text: "Size: ", cls: "ttk-label" });
    const sizeSelectEl = sizeRow.createEl("select", {
      cls: "ttk-select"
    }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) {
      sizeSelectEl.createEl("option", { text: String(i), value: String(i) });
    }
    sizeSelectEl.value = "7";
    
    // Atmosphere
    const atmRow = uwpsSection.createDiv({ cls: "ttk-row" });
    atmRow.createEl("label", { text: "Atmosphere: ", cls: "ttk-label" });
    const atmSelectEl = atmRow.createEl("select", {
      cls: "ttk-select"
    }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) {
      atmSelectEl.createEl("option", { text: String(i), value: String(i) });
    }
    atmSelectEl.value = "6";
    
    // Hydrographics
    const hydroRow = uwpsSection.createDiv({ cls: "ttk-row" });
    hydroRow.createEl("label", { text: "Hydro: ", cls: "ttk-label" });
    const hydroSelectEl = hydroRow.createEl("select", {
      cls: "ttk-select"
    }) as HTMLSelectElement;
    for (let i = 0; i <= 10; i++) {
      hydroSelectEl.createEl("option", { text: String(i), value: String(i) });
    }
    hydroSelectEl.value = "7";
    
    // Population
    const popRow = uwpsSection.createDiv({ cls: "ttk-row" });
    popRow.createEl("label", { text: "Population: ", cls: "ttk-label" });
    const popSelectEl = popRow.createEl("select", {
      cls: "ttk-select"
    }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) {
      popSelectEl.createEl("option", { text: String(i), value: String(i) });
    }
    popSelectEl.value = "6";
    
    // Government
    const govRow = uwpsSection.createDiv({ cls: "ttk-row" });
    govRow.createEl("label", { text: "Government: ", cls: "ttk-label" });
    const govSelectEl = govRow.createEl("select", {
      cls: "ttk-select"
    }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) {
      govSelectEl.createEl("option", { text: String(i), value: String(i) });
    }
    govSelectEl.value = "4";
    
    // Law Level
    const lawRow = uwpsSection.createDiv({ cls: "ttk-row" });
    lawRow.createEl("label", { text: "Law: ", cls: "ttk-label" });
    const lawSelectEl = lawRow.createEl("select", {
      cls: "ttk-select"
    }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) {
      lawSelectEl.createEl("option", { text: String(i), value: String(i) });
    }
    lawSelectEl.value = "5";
    
    // Tech Level
    const tlRow = uwpsSection.createDiv({ cls: "ttk-row" });
    tlRow.createEl("label", { text: "TL: ", cls: "ttk-label" });
    const tlSelectEl = tlRow.createEl("select", {
      cls: "ttk-select"
    }) as HTMLSelectElement;
    for (let i = 0; i <= 15; i++) {
      tlSelectEl.createEl("option", { text: String(i), value: String(i) });
    }
    tlSelectEl.value = "8";
    
    // UWP Display
    const uwpsDisplayRow = uwpsSection.createDiv({ cls: "ttk-row" });
    uwpsDisplayRow.createEl("label", { text: "UWP: ", cls: "ttk-label" });
    const uwpsDisplay = uwpsDisplayRow.createEl("span", {
      cls: "ttk-uwp-display"
    });
    uwpsDisplay.setText("C767645-8");
    
    // Update UWP display when selects change
    const updateUWP = () => {
      const uwp = `${starportSelectEl.value}${sizeSelectEl.value}${atmSelectEl.value}${hydroSelectEl.value}${popSelectEl.value}${govSelectEl.value}${lawSelectEl.value}-${tlSelectEl.value}`;
      uwpsDisplay.setText(uwp);
    };
    starportSelectEl.addEventListener("change", updateUWP);
    sizeSelectEl.addEventListener("change", updateUWP);
    atmSelectEl.addEventListener("change", updateUWP);
    hydroSelectEl.addEventListener("change", updateUWP);
    popSelectEl.addEventListener("change", updateUWP);
    govSelectEl.addEventListener("change", updateUWP);
    lawSelectEl.addEventListener("change", updateUWP);
    tlSelectEl.addEventListener("change", updateUWP);
    
    // ======================================================================
    // MAP METADATA
    // ======================================================================
    const mapSection = createSection.createDiv({ cls: "ttk-section ttk-map-section" });
    mapSection.createEl("h4", { text: "Map Metadata" });
    
    // PBG
    const pbgRow = mapSection.createDiv({ cls: "ttk-row" });
    pbgRow.createEl("label", { text: "PBG: ", cls: "ttk-label" });
    const pbgInput = pbgRow.createEl("input", {
      type: "text",
      cls: "ttk-input ttk-input-short",
      attr: { placeholder: "101", maxlength: "3" }
    }) as HTMLInputElement;
    pbgInput.value = "101";
    
    // Pop Multiplier
    const popMultRow = mapSection.createDiv({ cls: "ttk-row" });
    popMultRow.createEl("label", { text: "Pop Mult: ", cls: "ttk-label" });
    const popMultInput = popMultRow.createEl("input", {
      type: "number",
      cls: "ttk-input ttk-input-short",
      attr: { placeholder: "0", min: "0" }
    }) as HTMLInputElement;
    popMultInput.value = "0";
    
    // Belts
    const beltsRow = mapSection.createDiv({ cls: "ttk-row" });
    beltsRow.createEl("label", { text: "Belts: ", cls: "ttk-label" });
    const beltsInput = beltsRow.createEl("input", {
      type: "number",
      cls: "ttk-input ttk-input-short",
      attr: { placeholder: "0", min: "0" }
    }) as HTMLInputElement;
    beltsInput.value = "0";
    
    // Gas Giants
    const ggRow = mapSection.createDiv({ cls: "ttk-row" });
    ggRow.createEl("label", { text: "Gas Giants: ", cls: "ttk-label" });
    const ggInput = ggRow.createEl("input", {
      type: "number",
      cls: "ttk-input ttk-input-short",
      attr: { placeholder: "1", min: "0" }
    }) as HTMLInputElement;
    ggInput.value = "1";
    
    // Stellar
    const stellarRow = mapSection.createDiv({ cls: "ttk-row" });
    stellarRow.createEl("label", { text: "Stellar: ", cls: "ttk-label" });
    const stellarInput = stellarRow.createEl("input", {
      type: "text",
      cls: "ttk-input",
      attr: { placeholder: "G2 V" }
    }) as HTMLInputElement;
    stellarInput.value = "G2 V";
    
    // World Count
    const worldCountRow = mapSection.createDiv({ cls: "ttk-row" });
    worldCountRow.createEl("label", { text: "Worlds: ", cls: "ttk-label" });
    const worldCountInput = worldCountRow.createEl("input", {
      type: "number",
      cls: "ttk-input ttk-input-short",
      attr: { placeholder: "1", min: "1" }
    }) as HTMLInputElement;
    worldCountInput.value = "1";
    
    // ======================================================================
    // FUEL/ROUTES
    // ======================================================================
    const fuelSection = createSection.createDiv({ cls: "ttk-section ttk-fuel-section" });
    fuelSection.createEl("h4", { text: "Fuel, Port, Routes" });
    
    // Refined Fuel
    const refinedRow = fuelSection.createDiv({ cls: "ttk-row" });
    refinedRow.createEl("label", { text: "Refined Fuel: ", cls: "ttk-label" });
    const refinedCheckbox = refinedRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox"
    }) as HTMLInputElement;
    refinedCheckbox.checked = true;
    
    // Unrefined Fuel
    const unrefinedRow = fuelSection.createDiv({ cls: "ttk-row" });
    unrefinedRow.createEl("label", { text: "Unrefined Fuel: ", cls: "ttk-label" });
    const unrefinedCheckbox = unrefinedRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox"
    }) as HTMLInputElement;
    
    // Wilderness Refuelling
    const wildRow = fuelSection.createDiv({ cls: "ttk-row" });
    wildRow.createEl("label", { text: "Wilderness Refuelling: ", cls: "ttk-label" });
    const wildCheckbox = wildRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox"
    }) as HTMLInputElement;
    
    // Fuel Sources
    const sourcesRow = fuelSection.createDiv({ cls: "ttk-row" });
    sourcesRow.createEl("label", { text: "Fuel Sources: ", cls: "ttk-label" });
    const sourcesInput = sourcesRow.createEl("input", {
      type: "text",
      cls: "ttk-input",
      attr: { placeholder: "e.g., Water, Hydrogen" }
    }) as HTMLInputElement;
    
    // Routes
    const routesRow = fuelSection.createDiv({ cls: "ttk-row" });
    routesRow.createEl("label", { text: "Routes: ", cls: "ttk-label" });
    const xboatCheckbox = routesRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox",
      attr: { id: "xboat" }
    }) as HTMLInputElement;
    routesRow.createEl("label", { text: "Xboat", cls: "ttk-checkbox-label", attr: { for: "xboat" } });
    const tradeCheckbox = routesRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox",
      attr: { id: "trade" }
    }) as HTMLInputElement;
    routesRow.createEl("label", { text: "Trade", cls: "ttk-checkbox-label", attr: { for: "trade" } });
    const patrolCheckbox = routesRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox",
      attr: { id: "patrol" }
    }) as HTMLInputElement;
    routesRow.createEl("label", { text: "Patrol", cls: "ttk-checkbox-label", attr: { for: "patrol" } });
    
    // ======================================================================
    // BASES & SPECIAL FEATURES
    // ======================================================================
    const basesSection = createSection.createDiv({ cls: "ttk-section ttk-bases-section" });
    basesSection.createEl("h4", { text: "Bases & Special Features" });
    
    const basesRow = basesSection.createDiv({ cls: "ttk-row" });
    const navalCheckbox = basesRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox",
      attr: { id: "naval" }
    }) as HTMLInputElement;
    basesRow.createEl("label", { text: "Naval", cls: "ttk-checkbox-label", attr: { for: "naval" } });
    const scoutCheckbox = basesRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox",
      attr: { id: "scout" }
    }) as HTMLInputElement;
    basesRow.createEl("label", { text: "Scout", cls: "ttk-checkbox-label", attr: { for: "scout" } });
    const researchCheckbox = basesRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox",
      attr: { id: "research" }
    }) as HTMLInputElement;
    basesRow.createEl("label", { text: "Research", cls: "ttk-checkbox-label", attr: { for: "research" } });
    const corpCheckbox = basesRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox",
      attr: { id: "corp" }
    }) as HTMLInputElement;
    basesRow.createEl("label", { text: "Corporate", cls: "ttk-checkbox-label", attr: { for: "corp" } });
    const milCheckbox = basesRow.createEl("input", {
      type: "checkbox",
      cls: "ttk-checkbox",
      attr: { id: "mil" }
    }) as HTMLInputElement;
    basesRow.createEl("label", { text: "Military", cls: "ttk-checkbox-label", attr: { for: "mil" } });
    
    // ======================================================================
    // DOSSIER OPTIONS
    // ======================================================================
    const dossierSection = createSection.createDiv({ cls: "ttk-section ttk-dossier-section" });
    dossierSection.createEl("h4", { text: "Dossier Options" });
    
    const styleRow = dossierSection.createDiv({ cls: "ttk-row" });
    styleRow.createEl("label", { text: "Style: ", cls: "ttk-label" });
    const styleSelect = styleRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    ["Standard", "Detailed", "Concise", "Atmospheric"].forEach(opt => {
      styleSelect.createEl("option", { text: opt, value: opt });
    });
    styleSelect.value = "Standard";
    
    const complexityRow = dossierSection.createDiv({ cls: "ttk-row" });
    complexityRow.createEl("label", { text: "Complexity: ", cls: "ttk-label" });
    const complexitySelect = complexityRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    ["Low", "Moderate", "High", "Very High"].forEach(opt => {
      complexitySelect.createEl("option", { text: opt, value: opt });
    });
    complexitySelect.value = "Moderate";
    
    const densityRow = dossierSection.createDiv({ cls: "ttk-row" });
    densityRow.createEl("label", { text: "Density: ", cls: "ttk-label" });
    const densitySelect = densityRow.createEl("select", { cls: "ttk-select" }) as HTMLSelectElement;
    for (let i = 1; i <= 5; i++) {
      densitySelect.createEl("option", { text: String(i), value: String(i) });
    }
    densitySelect.value = "3";
    
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
      
      // Promote Preview
      const previewSection = promoteSection.createDiv({ cls: "ttk-promote-preview" });
      previewSection.createEl("h4", { text: "Promote Preview" });
      
      const previewList = previewSection.createEl("ul", { cls: "ttk-promote-preview-list" });
      
      // Will preserve
      const preserveLi = previewList.createEl("li", { cls: "ttk-promote-preview-item" });
      preserveLi.createEl("span", { text: "Will preserve: ", cls: "ttk-promote-preview-label" });
      const preserveUl = preserveLi.createEl("ul", { cls: "ttk-promote-preview-sublist" });
      preserveUl.createEl("li", { text: "Existing mainworld note, if present" });
      preserveUl.createEl("li", { text: "Existing support notes, if present" });
      
      // Will create if missing
      const createLi = previewList.createEl("li", { cls: "ttk-promote-preview-item" });
      createLi.createEl("span", { text: "Will create if missing: ", cls: "ttk-promote-preview-label" });
      const createUl = createLi.createEl("ul", { cls: "ttk-promote-preview-sublist" });
      createUl.createEl("li", { text: this.loadedSystem.mainworldPath });
      for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
        const noteName = SUPPORT_NOTES.find(n => n.id === id)?.label || id;
        createUl.createEl("li", { text: `${noteName}: ${path}` });
      }
      
      // Will update
      const updateLi = previewList.createEl("li", { cls: "ttk-promote-preview-item" });
      updateLi.createEl("span", { text: "Will update frontmatter on: ", cls: "ttk-promote-preview-label" });
      updateLi.createEl("span", { text: this.loadedSystem.systemNotePath });
      
      const noteLi = previewList.createEl("li", { cls: "ttk-promote-preview-item ttk-promote-preview-note" });
      noteLi.createEl("span", { text: "Existing notes will not be overwritten" });
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
