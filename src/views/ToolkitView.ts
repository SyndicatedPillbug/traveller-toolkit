import { setIcon, ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_TRAVELLER_TOOLKIT } from "./viewTypes";
import TravellerToolkitPlugin from "../app/TravellerToolkitPlugin";
import { HomeTool } from "../tools/home/HomeTool";
import { SystemGeneratorTool } from "../tools/system-generator/SystemGeneratorTool";

export class ToolkitView extends ItemView {
  plugin: TravellerToolkitPlugin;
  currentTool: any;
  state: any;

  constructor(leaf: WorkspaceLeaf, plugin: TravellerToolkitPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.state = {};
  }

  getViewType(): string {
    return VIEW_TYPE_TRAVELLER_TOOLKIT;
  }

  getDisplayText(): string {
    return "Traveller Toolkit";
  }

  getIcon(): string {
    return "dice";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("ttk-root");

    // Create header
    this.createHeader(container);

    // Create tool navigation
    this.createToolNavigation(container);

    // Default to home tool
    this.switchTool("home");
  }

  async onClose() {
    // Cleanup current tool if needed
    if (this.currentTool?.onUnload) {
      this.currentTool.onUnload();
    }
  }

  createHeader(container: HTMLElement) {
    const header = container.createDiv({ cls: "ttk-header" });
    header.createEl("h2", { text: "Traveller Toolkit", cls: "ttk-title" });
    header.createDiv({
      text: "Traveller campaign tools for systems, journals, characters, and procedural referee prep.",
      cls: "ttk-subtitle",
    });
  }

  createToolNavigation(container: HTMLElement) {
    const nav = container.createDiv({ cls: "ttk-nav" });

    const tools = [
      { id: "home", label: "Home", icon: "home" },
      { id: "system-generator", label: "System Generator", icon: "dice" },
    ];

    tools.forEach((tool) => {
      const button = nav.createEl("button", {
        text: tool.label,
        cls: "ttk-nav-button",
      });
      const icon = button.createSpan({ cls: "ttk-nav-icon" });
      setIcon(icon, tool.icon);
      button.addEventListener("click", () => this.switchTool(tool.id));
    });
  }

  async switchTool(toolId: string) {
    // Cleanup current tool
    if (this.currentTool?.onUnload) {
      this.currentTool.onUnload();
    }

    const container = this.containerEl.children[1];
    const contentArea = container.querySelector(".ttk-content") ||
      container.createDiv({ cls: "ttk-content" });
    contentArea.empty();

    // Switch to new tool
    switch (toolId) {
      case "home":
        this.currentTool = new HomeTool(this.plugin, this.plugin.services);
        break;
      case "system-generator":
        this.currentTool = new SystemGeneratorTool(
          this.plugin,
          this.plugin.services,
          this.plugin.settingsManager
        );
        break;
      default:
        this.currentTool = new HomeTool(this.plugin, this.plugin.services);
    }

    this.currentTool.render(contentArea);
  }

  triggerLoadActiveNote() {
    // Forward to System Generator if it's the current tool
    if (this.currentTool instanceof SystemGeneratorTool) {
      this.currentTool.loadActiveNote();
    } else {
      // Switch to System Generator and trigger
      this.switchTool("system-generator");
      if (this.currentTool instanceof SystemGeneratorTool) {
        this.currentTool.loadActiveNote();
      }
    }
  }
}
