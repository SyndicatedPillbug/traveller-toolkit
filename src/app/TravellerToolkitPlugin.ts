import { Plugin, Notice, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_TRAVELLER_TOOLKIT } from "../views/viewTypes";
import { TravellerToolkitSettingsManager } from "./settings";
import { ToolkitView } from "../views/ToolkitView";
import { ToolRegistry } from "../tools/registry";
import { HomeTool } from "../tools/home/HomeTool";
import { SystemGeneratorTool } from "../tools/system-generator/SystemGeneratorTool";
import { createServices } from "../vault/services";

export default class TravellerToolkitPlugin extends Plugin {
  settingsManager: TravellerToolkitSettingsManager;
  services: any;
  toolRegistry: ToolRegistry;

  async onload() {
    console.log("Traveller Toolkit: Loading plugin");

    // Initialize settings
    this.settingsManager = new TravellerToolkitSettingsManager();
    await this.settingsManager.load(this);

    // Create services
    this.services = createServices(this.app, this.settingsManager);

    // Create tool registry
    this.toolRegistry = new ToolRegistry(this, this.services);

    // Register tools
    this.toolRegistry.register(new HomeTool(this, this.services));
    this.toolRegistry.register(
      new SystemGeneratorTool(this, this.services, this.settingsManager)
    );

    // Register view
    this.registerView(
      VIEW_TYPE_TRAVELLER_TOOLKIT,
      (leaf) => new ToolkitView(leaf, this)
    );

    // Add ribbon icon
    this.addRibbonIcon(
      "dice",
      "Open Traveller Toolkit",
      () => this.activateView()
    );

    // Add commands
    this.addCommand({
      id: "open-traveller-toolkit",
      name: "Open Traveller Toolkit",
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: "traveller-toolkit-load-active-note",
      name: "Traveller Toolkit: Load Active Note",
      callback: () => this.activateView({ loadActiveNote: true }),
    });

    console.log("Traveller Toolkit: Plugin loaded");
  }

  async onunload() {
    console.log("Traveller Toolkit: Unloading plugin");
    // Cleanup will be handled by Obsidian
  }

  async activateView(data?: any) {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TRAVELLER_TOOLKIT);
    let leaf: WorkspaceLeaf | null = leaves[0];

    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) {
        new Notice("Could not open Traveller Toolkit sidebar.");
        return;
      }
      await leaf.setViewState({
        type: VIEW_TYPE_TRAVELLER_TOOLKIT,
        active: true,
      });
    }

    this.app.workspace.revealLeaf(leaf);

    // If we need to trigger an action after the view opens
    if (data?.loadActiveNote) {
      // The view will handle this via state
      (leaf.view as any).triggerLoadActiveNote?.();
    }
  }
}
