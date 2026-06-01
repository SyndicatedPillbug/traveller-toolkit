import TravellerToolkitPlugin from "../app/TravellerToolkitPlugin";
import { ToolDefinition, TravellerTool } from "../app/types";

export class ToolRegistry {
  private plugin: TravellerToolkitPlugin;
  private services: any;
  private tools: Map<string, TravellerTool> = new Map();
  private definitions: Map<string, ToolDefinition> = new Map();

  constructor(plugin: TravellerToolkitPlugin, services: any) {
    this.plugin = plugin;
    this.services = services;
  }

  register(tool: TravellerTool) {
    this.tools.set(tool.id, tool);
  }

  registerDefinition(definition: ToolDefinition) {
    this.definitions.set(definition.id, definition);
  }

  getTool(id: string): TravellerTool | undefined {
    return this.tools.get(id);
  }

  getDefinition(id: string): ToolDefinition | undefined {
    return this.definitions.get(id);
  }

  getAllTools(): TravellerTool[] {
    return Array.from(this.tools.values());
  }

  getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.definitions.values());
  }
}
