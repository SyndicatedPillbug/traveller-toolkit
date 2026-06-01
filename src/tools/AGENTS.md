# Tools Module Operating Instructions

**Module**: `src/tools/` - Tool implementations
**Purpose**: Individual tool implementations for the plugin
**Do not modify**: This file is for agent guidance only

## Module Overview

The `tools` module contains individual tool implementations that can be registered with the ToolRegistry. Each tool is responsible for a specific feature area of the plugin.

**Architecture**: Tools follow the **tool pattern**:
1. Implement `TravellerTool` interface
2. Receive plugin and services via constructor
3. Render into provided container
4. Cleanup in onUnload if needed

## Tool Interface

```typescript
// From src/tools/registry.ts
export interface TravellerTool {
  id: string;                    // Unique tool identifier
  label: string;                 // Display label
  render(container: HTMLElement): void;  // Render tool UI
  onUnload?(): void;             // Optional cleanup
}
```

## Tool Registry

**File**: `src/tools/registry.ts`

**Purpose**: Central registry for all tools

**Class**: `ToolRegistry`

**Methods**:
- `register(tool: TravellerTool)` - Register a tool
- `registerDefinition(definition: ToolDefinition)` - Register tool metadata
- `getTool(id: string)` - Get tool by ID
- `getDefinition(id: string)` - Get tool definition by ID
- `getAllTools()` - Get all registered tools
- `getAllDefinitions()` - Get all registered definitions

**Key principle**: Tools are registered in `TravellerToolkitPlugin.onload()` before the view is registered.

## Current Tools

### HomeTool

**File**: `src/tools/home/HomeTool.ts`
**Status**: Active
**ID**: "home"
**Label**: "Home"

**Purpose**: Home screen displaying a grid of tool cards

**Features**:
- Shows active tools as clickable cards
- Shows planned tools as placeholder cards
- Clicking a card switches to that tool

**Current cards**:
- System Generator (active)
- Journal (planned)
- Characters (planned)

**Structure**:
```typescript
export class HomeTool implements TravellerTool {
  id = "home";
  label = "Home";
  
  constructor(
    private plugin: TravellerToolkitPlugin,
    private services: any
  ) {}
  
  render(container: HTMLElement): void {
    // Create grid of tool cards
    // Each card has icon, label, description
    // Active cards are clickable
    // Planned cards show status badge
  }
  
  onUnload(): void {
    // No cleanup needed
  }
}
```

### SystemGeneratorTool (NOT YET IMPLEMENTED)

**File**: `src/tools/system-generator/SystemGeneratorTool.ts`
**Status**: **PLANNED - KEY FOR PROMOTE BUG FIX**
**ID**: "system-generator"
**Label**: "System Generator"

**Purpose**: System creation, loading, and promotion

**This is the critical tool for fixing the promote bug**. It should:
1. Load systems by hex code
2. Load systems from active note
3. Promote loaded systems
4. Create new system folders
5. Generate system data
6. Create notes (system, mainworld, support)

**Key requirement**: Must use LoadedSystem as source of truth, NOT settings.systemsFolder

**Skeleton implementation**:
```typescript
import { TravellerTool } from "../registry";
import TravellerToolkitPlugin from "../../app/TravellerToolkitPlugin";
import { TravellerToolkitServices } from "../../vault/services";
import { TravellerToolkitSettingsManager } from "../../app/settings";
import { LoadedSystem } from "../../app/types";
import { SUPPORT_NOTES } from "../../app/constants";

export class SystemGeneratorTool implements TravellerTool {
  id = "system-generator";
  label = "System Generator";
  
  private loadedSystem: LoadedSystem | null = null;
  
  constructor(
    private plugin: TravellerToolkitPlugin,
    private services: TravellerToolkitServices,
    private settingsManager: TravellerToolkitSettingsManager
  ) {}
  
  render(container: HTMLElement): void {
    // Render UI with:
    // - Hex input/load controls
    // - Load active note button
    // - System display (if loaded)
    // - Promote button (if loaded)
    // - Status messages
  }
  
  async loadHex(hex: string): Promise<void> {
    const systemFile = await this.services.discovery.findSystemByHex(hex);
    if (!systemFile) {
      new Notice(`System with hex ${hex} not found`);
      return;
    }
    
    await this.loadSystem(systemFile, "loaded-by-hex", hex);
  }
  
  async loadActiveNote(): Promise<void> {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("No active file");
      return;
    }
    
    const systemFile = await this.services.discovery.findSystemFromActiveFile(activeFile);
    if (!systemFile) {
      new Notice("No system found for active note");
      return;
    }
    
    const hex = this.services.frontmatter.getFrontmatterValue<string>(systemFile, "hex") 
      ?? this.services.frontmatter.getFrontmatterValue<string>(systemFile, "system_hex")
      ?? "";
    
    await this.loadSystem(systemFile, "active-note", hex);
  }
  
  private async loadSystem(
    systemFile: TFile,
    source: LoadedSystem["source"],
    hex: string
  ): Promise<void> {
    const folder = this.services.vault.getParentFolder(systemFile.path);
    const name = this.services.frontmatter.getFrontmatterValue<string>(systemFile, "name") 
      ?? systemFile.basename.replace(/^_/, "");
    
    const supportPaths: Record<string, string> = {};
    for (const note of SUPPORT_NOTES) {
      supportPaths[note.id] = `${folder}/${note.fileName}`;
    }
    
    this.loadedSystem = {
      systemFile,
      systemFolder: folder,
      hex: hex.padStart(4, "0"),
      name,
      systemNotePath: systemFile.path,
      mainworldPath: `${folder}/${name}.md`,
      supportPaths,
      source,
      frontmatter: this.services.frontmatter.getFrontmatter(systemFile),
    };
    
    this.render();
  }
  
  async promoteLoadedSystem(): Promise<void> {
    if (!this.loadedSystem) {
      new Notice("No system loaded - load a system first");
      return;
    }
    
    // CRITICAL: Use loadedSystem.systemFolder, NOT settings.systemsFolder
    const folder = this.loadedSystem.systemFolder;
    
    try {
      // Update system note frontmatter
      await this.services.frontmatter.updateFrontmatter(
        this.loadedSystem.systemFile,
        {
          status: "playable",
          prep_status: "playable",
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
      
      // Create missing support notes
      const settings = this.settingsManager.get();
      
      if (settings.createSupportNotesOnPromote) {
        for (const [id, path] of Object.entries(this.loadedSystem.supportPaths)) {
          const { wasCreated } = await this.services.safeWrite.createFileIfMissing(
            path,
            this.getDefaultSupportContent(id)
          );
          if (wasCreated) {
            console.log(`[Traveller Toolkit] Created ${path}`);
          }
        }
      }
      
      // Create mainworld if needed
      if (settings.createMainworldOnPromote) {
        const { wasCreated } = await this.services.safeWrite.createFileIfMissing(
          this.loadedSystem.mainworldPath,
          this.getDefaultMainworldContent()
        );
        if (wasCreated) {
          console.log(`[Traveller Toolkit] Created ${this.loadedSystem.mainworldPath}`);
        }
      }
      
      new Notice("System promoted successfully");
      this.render();
      
    } catch (err) {
      console.error("[Traveller Toolkit] Promote failed:", err);
      new Notice("Promote failed - see console for details");
    }
  }
  
  private getDefaultSupportContent(noteId: string): string {
    // Return default content for each support note type
    const titles = {
      npcs: "NPCs",
      factions: "Factions",
      rumors: "Rumors",
      traffic: "Ships and Traffic",
      sessions: "Sessions",
    };
    return `# ${titles[noteId] || noteId}\n\n`;
  }
  
  private getDefaultMainworldContent(): string {
    return `# ${this.loadedSystem?.name || "Mainworld"}\n\n`;
  }
  
  onUnload(): void {
    // Cleanup if needed
  }
}
```

**Key promote logic**:
1. Always use `loadedSystem.systemFolder` for the target folder
2. Never use `settings.systemsFolder` when a system is loaded
3. Check if files exist before creating (SafeWriteService)
4. Update frontmatter with actual paths (not settings paths)
5. Use LinkService for wikilink creation
6. Handle errors with user notices

## Placeholder Tools

**Directory**: `src/tools/placeholders/`
**Status**: Empty (for future placeholder tool definitions)

**Purpose**: Define tool metadata for tools that are planned but not yet implemented.

## Module Rules

### Always Do

1. **Implement TravellerTool interface**: Every tool must have id, label, render, and optional onUnload
2. **Register tools**: Register in TravellerToolkitPlugin.onload()
3. **Use services**: Access vault operations via services, not app.vault directly
4. **Use LoadedSystem**: When working with loaded systems, use the LoadedSystem interface
5. **Handle errors**: Catch errors and notify users with Notice
6. **Debug logging**: Use console.log with prefix for debugging

### Never Do

1. **Don't use app.vault directly**: Use services.vault
2. **Don't hardcode paths**: Use VaultService methods
3. **Don't trust settings folder**: Use loadedSystem.systemFolder when available
4. **Don't silently fail**: Always notify user or log error
5. **Don't duplicate code**: Use shared utilities when possible

### Avoid

1. **Large tools**: Break complex tools into smaller components
2. **Direct Obsidian API access**: Use services layer
3. **Global state**: Use constructor parameters and class properties
4. **Synchronous vault operations**: Always use async/await

## Integration with Other Modules

### With Plugin (src/app/TravellerToolkitPlugin.ts)
- Tools are registered in onload() method
- Tools receive plugin reference in constructor
- Plugin passes services to tools

### With View (src/views/ToolkitView.ts)
- View creates tool instances when switching tools
- View passes container HTMLElement to tool.render()
- View calls tool.onUnload() when switching away
- View accesses tools via plugin.toolRegistry

### With Vault (src/vault/)
- Tools access services via constructor injection
- Tools use services for all vault operations
- Tools don't import directly from vault module

## Common Patterns

### Tool Registration

```typescript
// In TravellerToolkitPlugin.onload()
this.toolRegistry.register(new HomeTool(this, this.services));
this.toolRegistry.register(
  new SystemGeneratorTool(this, this.services, this.settingsManager)
);
```

### Tool Switching

```typescript
// In ToolkitView.switchTool()
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
}
this.currentTool.render(contentArea);
```

### Tool Rendering

```typescript
render(container: HTMLElement): void {
  container.empty();
  container.addClass("ttk-tool-${this.id}");
  
  // Create tool UI
  const header = container.createDiv({ cls: "ttk-tool-header" });
  header.createEl("h2", { text: this.label });
  
  // Add tool-specific content
  this.renderContent(container);
}
```

### Loading and Using LoadedSystem

```typescript
// In SystemGeneratorTool
private loadedSystem: LoadedSystem | null = null;

async loadHex(hex: string): Promise<void> {
  const systemFile = await this.services.discovery.findSystemByHex(hex);
  if (!systemFile) {
    new Notice(`System ${hex} not found`);
    return;
  }
  
  this.loadedSystem = {
    systemFile,
    systemFolder: this.services.vault.getParentFolder(systemFile.path),
    hex,
    name: this.services.frontmatter.getFrontmatterValue(systemFile, "name") ?? "",
    systemNotePath: systemFile.path,
    mainworldPath: `${folder}/${name}.md`,
    supportPaths: this.getSupportPaths(folder),
    source: "loaded-by-hex",
    frontmatter: this.services.frontmatter.getFrontmatter(systemFile),
  };
  
  this.render();
}

// In render() or other methods
if (this.loadedSystem) {
  // Use loadedSystem for all operations
  const folder = this.loadedSystem.systemFolder;
  // NOT: const folder = this.settingsManager.get().systemsFolder;
}
```

## Promote Bug Fix Checklist

For SystemGeneratorTool implementation:

- [ ] Uses FileDiscoveryService.findSystemByHex() for loading by hex
- [ ] Uses FileDiscoveryService.findSystemFromActiveFile() for loading active note
- [ ] Creates LoadedSystem with actual TFile and folder path
- [ ] Stores loadedSystem as class property
- [ ] Uses loadedSystem.systemFolder in promoteLoadedSystem()
- [ ] Does NOT use settings.systemsFolder when system is loaded
- [ ] Uses SafeWriteService.createFileIfMissing() for file creation
- [ ] Uses FrontmatterService.updateFrontmatter() for updates
- [ ] Uses LinkService.pathToWikilink() for wikilink creation
- [ ] Handles errors with try/catch and Notice
- [ ] Updates frontmatter with actual paths (not settings paths)
- [ ] Checks settings for createMainworldOnPromote and createSupportNotesOnPromote

## Testing Checklist for This Module

### HomeTool
- [ ] Renders grid of tool cards
- [ ] Displays active tools as clickable
- [ ] Displays planned tools with status badge
- [ ] Clicking active tool card switches to that tool
- [ ] Cards have correct icons, labels, descriptions

### SystemGeneratorTool (once implemented)
- [ ] Loads system by hex correctly
- [ ] Loads system from active note correctly
- [ ] Displays loaded system information
- [ ] Promote creates files in correct folder (loadedSystem.systemFolder)
- [ ] Promote doesn't use settings.systemsFolder
- [ ] Promote creates missing files only
- [ ] Promote doesn't overwrite existing files
- [ ] Promote updates frontmatter correctly
- [ ] Promote handles errors gracefully
- [ ] Promote works for moved systems
- [ ] Promote works when run twice

## Future Tools

Based on the original plugin, future tools to implement:

1. **Journal Tool** - Session logs and campaign notes
2. **Characters Tool** - NPC and character management
3. **Subsector Tool** - Subsector management and validation
4. **Map Tool** - Traveller Map integration
5. **Dossier Tool** - Dossier Engine v4 prose generation
6. **SEC Tool** - SEC format import/export
7. **Validation Tool** - System and subsector validation

Each tool should follow the same pattern: implement TravellerTool, register in plugin, use services for vault operations.
