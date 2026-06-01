# App Module Operating Instructions

**Module**: `src/app/` - Core plugin module
**Purpose**: Plugin lifecycle, types, constants, settings
**Do not modify**: This file is for agent guidance only

## Module Overview

The `app` module contains the core plugin infrastructure:
- **TravellerToolkitPlugin** - Main plugin class (entry point from main.ts)
- **types.ts** - Core type definitions (LoadedSystem, Settings, UWP, etc.)
- **constants.ts** - Traveller constants (STARPORTS, ATMOSPHERES, etc.)
- **settings.ts** - Settings management

## Key Files

### TravellerToolkitPlugin.ts

**Purpose**: Main plugin class, Obsidian integration
**Extends**: `Plugin` (from obsidian)

**Lifecycle methods**:
- `onload()` - Plugin initialization
- `onunload()` - Plugin cleanup

**Properties**:
- `settingsManager: TravellerToolkitSettingsManager` - Manages plugin settings
- `services: TravellerToolkitServices` - Container for all vault services
- `toolRegistry: ToolRegistry` - Registry for all tools

**Integration points**:
- `registerView()` - Registers the sidebar view
- `addRibbonIcon()` - Adds ribbon icon (dice)
- `addCommand()` - Adds command palette entries
- `activateView()` - Opens/reveals the sidebar view

**Key principle**: All plugin-wide state and services are initialized here and passed down to views and tools.

### types.ts

**Purpose**: Core type definitions for the entire plugin

**Key interfaces**:

1. **LoadedSystem** - Source of truth for loaded systems
   ```typescript
   {
     systemFile: TFile;              // The actual TFile
     systemFolder: string;           // Vault-absolute path
     hex: string;                   // 4-digit hex code
     name: string;                  // System name
     systemNotePath: string;        // Path to system note
     mainworldPath: string;         // Path to mainworld note
     supportPaths: Record<string, string>;  // NPCs.md, Factions.md, etc.
     source: "created" | "loaded-by-hex" | "active-note" | "resolved";
     frontmatter?: Record<string, unknown>;
   }
   ```
   
2. **TravellerToolkitSettings** - Plugin configuration
   ```typescript
   {
     systemsFolder: string;          // Default: "Traveller/Systems"
     systemIndexPattern: string;     // Default: "_{name}"
     mainworldPattern: string;      // Default: "{name}"
     createMainworldOnPromote: boolean;
     createSupportNotesOnPromote: boolean;
     debugMode: boolean;
   }
   ```

3. **SystemProfile** - Complete system data
4. **UWP** - Universal World Profile
5. **ToolDefinition** - Tool metadata
6. **TravellerTool** - Tool interface
7. **SystemStatus** - Status tracking

**Key principle**: LoadedSystem is the single source of truth for any loaded system. Once loaded, always use `loadedSystem.systemFile` and `loadedSystem.systemFolder` instead of settings or frontmatter paths.

### constants.ts

**Purpose**: Traveller RPG constants and lookup tables

**Categories**:
- `HEX` - Valid hex characters
- `STARPORTS` - Starport quality codes and descriptions
- `ATMOSPHERES` - Atmosphere codes and descriptions
- `GOVERNMENTS` - Government codes and descriptions
- `TRAVEL_ZONES` - Travel zone colors
- `BASE_OPTIONS` - Base types
- `BASE_CODES` - Base short codes
- `SUPPORT_NOTES` - Support note definitions
- `DEFAULT_ALLEGIANCES` - Default allegiance options
- `CSS_PREFIX` - "ttk" (CSS class prefix)
- `PLUGIN_ID` - "traveller-toolkit"
- `VIEW_TYPE` - "traveller-toolkit-view"

**Usage**: Import constants directly from this file. Don't duplicate lookup tables.

### settings.ts

**Purpose**: Plugin settings management with persistence

**Class**: `TravellerToolkitSettingsManager`

**Methods**:
- `load(app)` - Load settings from Obsidian plugin data
- `save(app)` - Save settings to Obsidian plugin data
- `get()` - Get current settings
- `set(partial)` - Update settings
- `getSetting<K>(key)` - Get specific setting
- `setSetting<K>(key, value)` - Set specific setting

**Key principle**: Settings are loaded on plugin startup and saved automatically. Changes to settings should go through this manager.

## Module Rules

### Always Do

1. **Use LoadedSystem as source of truth**: When a system is loaded, use `loadedSystem.systemFile` and `loadedSystem.systemFolder`
2. **Pass dependencies via constructor**: Don't use static properties for dependencies
3. **Import from this module**: Use `import { LoadedSystem } from "./types"` in other modules
4. **Use constants**: Import and use constants instead of duplicating values
5. **Type everything**: Even when using `any` for Obsidian API types

### Never Do

1. **Don't duplicate types**: All core types should be in types.ts
2. **Don't duplicate constants**: All Traveller constants should be in constants.ts
3. **Don't hardcode plugin ID**: Use PLUGIN_ID constant
4. **Don't hardcode view type**: Use VIEW_TYPE constant
5. **Don't access settings directly**: Use SettingsManager methods

### Avoid

1. **Circular dependencies**: This module should not depend on views, tools, or vault
2. **Direct Obsidian API access**: Use services layer instead
3. **Global state**: Use plugin properties and method parameters

## Integration with Other Modules

### With Views (src/views/)
- ToolkitView receives plugin reference in constructor
- Views access services via `this.plugin.services`
- Views trigger tool actions which use plugin's toolRegistry

### With Tools (src/tools/)
- Tools receive plugin and services via constructor
- Tools access settings via `this.settingsManager` or `this.plugin.settingsManager`
- Tools can access all services via `this.services`

### With Vault (src/vault/)
- This module does NOT directly import from vault
- Vault services are created in TravellerToolkitPlugin and passed to views/tools
- Services are defined by interfaces in vault/services.ts

## Common Patterns

### Accessing Settings

```typescript
// In plugin or tool
const settings = this.settingsManager.get();
const folder = settings.systemsFolder;

// Setting a specific value
this.settingsManager.setSetting("debugMode", true);

// Getting a specific value
const debug = this.settingsManager.getSetting("debugMode");
```

### Creating LoadedSystem

```typescript
const systemFile: TFile = ...;
const hex: string = ...;
const folder = this.services.vault.getParentFolder(systemFile.path);
const name = this.services.frontmatter.getFrontmatterValue(systemFile, "name") ?? "";

const loadedSystem: LoadedSystem = {
  systemFile,
  systemFolder: folder,
  hex,
  name,
  systemNotePath: systemFile.path,
  mainworldPath: `${folder}/${name}.md`,
  supportPaths: {
    npcs: `${folder}/NPCs.md`,
    factions: `${folder}/Factions.md`,
    rumors: `${folder}/Rumors.md`,
    traffic: `${folder}/Ships and Traffic.md`,
    sessions: `${folder}/Sessions.md`,
  },
  source: "loaded-by-hex",
  frontmatter: this.services.frontmatter.getFrontmatter(systemFile),
};
```

### Using LoadedSystem

```typescript
// When promoting or creating files, ALWAYS use loadedSystem.systemFolder
const folder = this.loadedSystem!.systemFolder;
const mainworldPath = this.loadedSystem!.mainworldPath;

// NOT settings.systemsFolder
// const folder = this.settingsManager.get().systemsFolder;  // WRONG!
```

## Module Dependencies

This module has **no dependencies** on other src/ modules. It's the foundation.

```
app/
  -> types.ts (no dependencies)
  -> constants.ts (no dependencies)
  -> settings.ts (depends on types.ts)
  -> TravellerToolkitPlugin.ts (depends on types.ts, constants.ts, settings.ts)
```

## File Modification Guide

### types.ts
- **Add new types**: Add to this file
- **Modify existing types**: Update carefully, may affect many files
- **New interfaces**: Add with JSDoc comments
- **Type aliases**: Use for simple types

### constants.ts
- **Add new constants**: Add to this file
- **Modify existing constants**: Only if the value is wrong
- **New categories**: Group related constants together
- **Lookup tables**: Use Record<T, string> or Map<T, string>

### settings.ts
- **Add new settings**: Add to TravellerToolkitSettings interface in types.ts, then here
- **Modify defaults**: Update DEFAULT_SETTINGS in types.ts
- **New methods**: Add to SettingsManager class

### TravellerToolkitPlugin.ts
- **Add new commands**: Add to onload() method
- **Add new tools**: Register in onload(), import from tools module
- **Add new services**: Create in onload(), add to createServices() in vault/services.ts
- **Modify lifecycle**: Be careful with async operations

## Testing Checklist for This Module

- [ ] Plugin loads without errors
- [ ] Settings load correctly on startup
- [ ] Settings persist across plugin reloads
- [ ] View registers and opens correctly
- [ ] Ribbon icon appears and works
- [ ] Commands register and work
- [ ] Tool registry has all expected tools
- [ ] Services are created and available
