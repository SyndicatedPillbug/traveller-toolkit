import { setIcon } from "obsidian";
import { TravellerTool } from "../registry";
import TravellerToolkitPlugin from "../../app/TravellerToolkitPlugin";

export class HomeTool implements TravellerTool {
  id: string = "home";
  label: string = "Home";
  private plugin: TravellerToolkitPlugin;
  private services: any;

  constructor(plugin: TravellerToolkitPlugin, services: any) {
    this.plugin = plugin;
    this.services = services;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("ttk-home");

    // Create grid of tool buttons
    const grid = container.createDiv({ cls: "ttk-home-grid" });

    const tools = [
      {
        id: "system-generator",
        label: "System Generator",
        description: "Create and manage Traveller star systems",
        icon: "dice",
        status: "active",
      },
      {
        id: "journal",
        label: "Journal",
        description: "Session logs and campaign notes",
        icon: "book-open",
        status: "planned",
      },
      {
        id: "characters",
        label: "Characters",
        description: "NPC and character management",
        icon: "users",
        status: "planned",
      },
    ];

    tools.forEach((tool) => {
      const card = grid.createDiv({ cls: `ttk-home-card ttk-home-card-${tool.status}` });
      
      const icon = card.createDiv({ cls: "ttk-home-card-icon" });
      setIcon(icon, tool.icon);
      
      const header = card.createDiv({ cls: "ttk-home-card-header" });
      header.createEl("h3", { text: tool.label });
      
      const desc = card.createDiv({ cls: "ttk-home-card-description" });
      desc.setText(tool.description);

      if (tool.status === "active") {
        card.addEventListener("click", () => {
          this.plugin.activateView();
          // Switch to the tool - this will be handled by the view
          (this.plugin.app.workspace.getLeavesOfType("traveller-toolkit-view")[0]?.view as any)?.switchTool?.(tool.id);
        });
        card.addClass("ttk-home-card-clickable");
      } else {
        card.addClass("ttk-home-card-placeholder");
        const badge = card.createDiv({ cls: "ttk-home-card-badge" });
        badge.setText(tool.status.toUpperCase());
      }
    });
  }

  onUnload?(): void {
    // Nothing to cleanup
  }
}
