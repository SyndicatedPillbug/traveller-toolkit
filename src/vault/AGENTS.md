# Vault Services Module Operating Instructions

**Module**: `src/vault/` - Vault services for file operations
**Purpose**: Abstraction layer over Obsidian's vault API
**Do not modify**: This file is for agent guidance only

## Module Overview

The `vault` module provides a **service layer** that abstracts Obsidian's vault API, providing:
- Consistent, type-safe interfaces
- Centralized error handling
- Reduced dependency on Obsidian API internals
- Enablers for testing (mocking)

This is **critical for the promote bug fix** - the FileDiscoveryService allows finding systems even when moved.

## Service Architecture

All services follow the **service pattern**:
1. Single responsibility per service
2. Dependencies passed via constructor
3. App reference stored but not exposed in public API
4. Methods are pure where possible (no side effects on app)

```
┌─────────────────────────────────────────────────────────┐
│                    createServices()                        │
│  (src/vault/services.ts)                                   │
│                                                         │
│  returns TravellerToolkitServices = {                     │
│    vault: VaultService          # Core file operations   │
│    frontmatter: FrontmatterService  # Frontmatter handling │
│    link: LinkService           # Wikilink ↔ path         │
│    discovery: FileDiscoveryService  # Find systems      │
│    safeWrite: SafeWriteService # Safe file operations    │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

## Service Files

### services.ts

**Purpose**: Service factory and interface definitions

**Exports**:
- `TravellerToolkitServices` interface - Container for all services
- `createServices(app, settingsManager)` - Factory function

**Key principle**: Services are created here and returned as a single object. This is the only place that knows about all services together.

### VaultService.ts

**Purpose**: Core vault operations
**Key methods**:

| Method | Purpose | Returns |
|--------|---------|---------|
| `get vault()` | Access app.vault | any (TAppVault) |
| `get metadataCache()` | Access app.metadataCache | any |
| `get fileManager()` | Access app.fileManager | any |
| `isMarkdownFile(af)` | Check if abstract file is markdown TFile | boolean |
| `getFile(path)` | Get TFile by exact path | TFile \| null |
| `getFolder(path)` | Get TFolder by exact path | TFolder \| null |
| `fileExists(path)` | Check if file exists | Promise<boolean> |
| `pathExists(path)` | Check if path exists (file or folder) | Promise<boolean> |
| `ensureFolder(path)` | Create folder and parents | Promise<void> |
| `createFile(path, content)` | Create file with content | Promise<TFile> |
| `readFile(file)` | Read file content | Promise<string> |
| `modifyFile(file, content)` | Modify file content | Promise<void> |
| `getParentFolder(path)` | Get parent folder from path | string |
| `getAllMarkdownFiles()` | Get all markdown files in vault | TFile[] |
| `createFileIfMissing(path, content)` | Create file only if doesn't exist | Promise<{file, wasCreated}> |

**Key principle**: Always use VaultService methods instead of `app.vault` directly. This provides type safety and consistent behavior.

### FrontmatterService.ts

**Purpose**: Frontmatter parsing, updating, and processing
**Key methods**:

| Method | Purpose | Notes |
|--------|---------|-------|
| `getFrontmatter(file)` | Parse frontmatter from file cache | Uses metadataCache |
| `getFrontmatterValue<T>(file, key, defaultValue?)` | Get typed frontmatter value | Generic type parameter |
| `processFrontmatter(file, mutator)` | Process frontmatter with Obsidian API | Has fallback for older Obsidian |
| `updateFrontmatter(file, updates)` | Update frontmatter values | Convenience method |
| `getFrontmatterYaml(file)` | Get frontmatter as YAML string | Returns null if no frontmatter |

**Fallback**: Includes simple YAML parser and stringifier for older Obsidian versions that don't have `fileManager.processFrontMatter`.

**Key principle**: Always use FrontmatterService, never parse YAML manually (except in fallback). This ensures consistency and handles edge cases.

### LinkService.ts

**Purpose**: Wikilink ↔ path conversion
**No dependencies**: This service doesn't need app or vault references

**Key methods**:

| Method | Purpose | Example |
|--------|---------|---------|
| `pathToWikilink(path, label?)` | Convert path to wikilink format | `"[[Traveller/Systems/0301 - Milice/_Milice]]"` |
| `wikilinkToPath(wikilink)` | Convert wikilink to file path | `"Traveller/Systems/0301 - Milice/_Milice.md"` |
| `extractPathFromWikilink(wikilink)` | Extract path without .md | `"Traveller/Systems/0301 - Milice/_Milice"` |
| `systemNoteLink(systemFile, label?)` | Create wikilink to system note | Uses systemFile.path |
| `mainworldNoteLink(mainworldPath, label?)` | Create wikilink to mainworld | Uses mainworldPath |

**Key principle**: Always use LinkService, never manipulate wikilink strings manually. This handles edge cases like missing .md extensions, escaped characters, etc.

### FileDiscoveryService.ts

**Purpose**: Find systems by hex, active file, or scan vault
**CRITICAL FOR PROMOTE BUG FIX**

This service implements **metadata-first search**, which allows finding systems even when they've been moved from one folder to another.

**Key methods**:

#### findSystemByHex(hex: string): Promise<TFile \| null>

**Algorithm** (in priority order):
1. **Primary**: Match frontmatter `hex` or `system_hex` field where `type` is "system" or "traveller_system"
2. **Fallback**: Match folder name pattern `{normalizedHex} - {name}` with file starting with `_`
3. **Legacy**: Match `_System.md` or `_system.md` in folder named `{hex} - {name}`

**Why this works for moved systems**:
- If a system is moved from `Systems/0301 - Milice/` to `Traveller/Systems/0301 - Milice/`, the frontmatter hex field is still "0301"
- The metadata-first search finds it regardless of folder location
- This fixes the promote bug where settings.systemsFolder was hardcoded

#### findSystemFromActiveFile(file: TFile): Promise<TFile \| null>

**Algorithm**:
1. If file is already a system note (type: system), return it
2. Try system_note reference in frontmatter (convert wikilink to path)
3. Try system_hex or hex reference in frontmatter, then find by hex
4. Look for system note (starting with `_`) in parent folder

**Use cases**:
- User opens a mainworld note and clicks "Load Active Note"
- User opens a support note and wants to load the system
- System note is referenced from another note

#### findAllSystems(): Promise<SystemRecord[]>

**Purpose**: Scan entire vault for all system notes
**Returns**: Array of SystemRecord objects with parsed metadata

**SystemRecord interface**:
```typescript
{
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
```

#### findSupportNotes(loaded: LoadedSystem): Promise<Record<string, TFile \| null>>

**Purpose**: Find existing support notes for a loaded system
**Returns**: Object mapping note IDs to TFile or null

**Note IDs**: From SUPPORT_NOTES constant: npcs, factions, rumors, traffic, sessions

### SafeWriteService.ts

**Purpose**: Safe file creation and modification
**Dependencies**: VaultService, FrontmatterService

**Key methods**:

| Method | Purpose | Safety |
|--------|---------|--------|
| `createFileIfMissing(path, content)` | Create file only if doesn't exist | Won't overwrite |
| `safeModify(file, mutator)` | Modify file content safely | Validates file type |
| `safeUpdateFrontmatter(file, updates)` | Update frontmatter safely | Uses processFrontmatter |
| `safeProcessFrontmatter(file, mutator)` | Process frontmatter safely | Uses processFrontmatter |
| `safeEnsureFolder(path)` | Ensure folder exists | No error if exists |

**Key principle**: Always use SafeWriteService for file operations to prevent accidental overwrites and ensure consistent error handling.

## Module Rules

### Always Do

1. **Use VaultService**: For all vault operations (getFile, getFolder, fileExists, etc.)
2. **Use FrontmatterService**: For all frontmatter operations (get, update, process)
3. **Use LinkService**: For all wikilink ↔ path conversions
4. **Use FileDiscoveryService**: For finding systems (don't re-implement the search logic)
5. **Use SafeWriteService**: For all file creation/modification
6. **Check types**: Always check `instanceof TFile` before treating as file
7. **Handle nulls**: Metadata cache may be null for newly created files

### Never Do

1. **Don't use app.vault directly**: Always use VaultService
2. **Don't parse frontmatter manually**: Use FrontmatterService
3. **Don't manipulate wikilinks manually**: Use LinkService
4. **Don't create files without checking**: Use SafeWriteService
5. **Don't assume file types**: Always check instanceof TFile
6. **Don't trust folder patterns blindly**: Use FileDiscoveryService for robustness

### Avoid

1. **Re-implementing search logic**: FileDiscoveryService already handles system finding
2. **Direct metadata cache access**: Use FrontmatterService which has fallbacks
3. **Synchronous file operations**: Always use async/await
4. **Silent failures**: Log errors and notify users

## Integration with Other Modules

### With App (src/app/)
- Services are created in TravellerToolkitPlugin.onload()
- Services receive `app` and `settingsManager` in createServices()
- Plugin stores services in `this.services` and passes to views/tools

### With Views (src/views/)
- Views access services via `this.plugin.services`
- Views use services for all vault operations
- Views don't import directly from vault module

### With Tools (src/tools/)
- Tools access services via `this.services` (passed in constructor)
- Tools use services for all vault operations
- Tools don't import directly from vault module

## Common Patterns

### Finding a System

```typescript
// Always use FileDiscoveryService
const systemFile = await this.services.discovery.findSystemByHex(hex);
if (!systemFile) {
  new Notice(`System with hex ${hex} not found`);
  return;
}

// Get the folder from the file
const folder = this.services.vault.getParentFolder(systemFile.path);
```

### Reading Frontmatter

```typescript
// Get all frontmatter
const fm = this.services.frontmatter.getFrontmatter(file);

// Get specific value with type
const hex = this.services.frontmatter.getFrontmatterValue<string>(file, "hex");
const pop = this.services.frontmatter.getFrontmatterValue<number>(file, "population");

// With default
const name = this.services.frontmatter.getFrontmatterValue(file, "name", "Unknown");
```

### Updating Frontmatter

```typescript
// Update multiple fields
await this.services.frontmatter.updateFrontmatter(file, {
  status: "promoted",
  promoted: true,
  promoted_at: new Date().toISOString(),
});

// Process with mutator
await this.services.frontmatter.processFrontmatter(file, (fm) => {
  fm.status = "promoted";
  fm.promoted = true;
  if (!fm.promoted_at) {
    fm.promoted_at = new Date().toISOString();
  }
});
```

### Converting Wikilinks

```typescript
// Path to wikilink
const wikilink = this.services.link.pathToWikilink(
  "Traveller/Systems/0301 - Milice/_Milice.md",
  "Milice System"
);
// Result: "[[Traveller/Systems/0301 - Milice/_Milice|Milice System]]"

// Wikilink to path
const path = this.services.link.wikilinkToPath(
  "[[Traveller/Systems/0301 - Milice/_Milice|Milice System]]"
);
// Result: "Traveller/Systems/0301 - Milice/_Milice.md"
```

### Creating Files Safely

```typescript
// Create only if missing
const { file, wasCreated } = await this.services.safeWrite.createFileIfMissing(
  "Traveller/Systems/0301 - Milice/NPCs.md",
  "# NPCs\n\n"
);

if (wasCreated) {
  console.log("Created NPCs.md");
} else {
  console.log("NPCs.md already exists");
}

// Safe modification
await this.services.safeWrite.safeModify(file, (content) => {
  return content + "\n\nNew content";
});
```

## Promote Bug Fix: The Critical Path

The promote bug is fixed by using FileDiscoveryService and LoadedSystem correctly:

```typescript
// WRONG - uses settings folder
const folder = this.settingsManager.get().systemsFolder;  // "Traveller/Systems"
const mainworldPath = `${folder}/${name}.md`;  // Always creates in default folder

// CORRECT - uses actual loaded system folder
const folder = this.loadedSystem.systemFolder;  // "Traveller/Systems/0301 - Milice"
const mainworldPath = this.loadedSystem.mainworldPath;

// The flow:
// 1. User loads hex "0301"
// 2. FileDiscoveryService.findSystemByHex("0301") finds the system
//    - Even if it's at Traveller/Systems/0301 - Milice/_Milice.md
// 3. LoadedSystem is created with:
//    - systemFile: the actual TFile
//    - systemFolder: TFile.parent.path ("Traveller/Systems/0301 - Milice")
// 4. Promote uses loadedSystem.systemFolder
//    - Creates files in the correct folder
//    - Updates frontmatter with correct paths
```

## Testing Checklist for This Module

### VaultService
- [ ] getFile() returns correct TFile for existing paths
- [ ] getFile() returns null for non-existent paths
- [ ] getFolder() returns correct TFolder
- [ ] fileExists() returns true for existing files
- [ ] pathExists() returns true for existing paths
- [ ] ensureFolder() creates nested folders
- [ ] createFile() creates file at correct path
- [ ] readFile() returns correct content
- [ ] modifyFile() updates content
- [ ] createFileIfMissing() doesn't overwrite
- [ ] getAllMarkdownFiles() returns all markdown files
- [ ] getParentFolder() returns correct parent
- [ ] isMarkdownFile() correctly identifies markdown files

### FrontmatterService
- [ ] getFrontmatter() parses YAML correctly
- [ ] getFrontmatterValue() returns typed values
- [ ] getFrontmatterValue() returns default when missing
- [ ] processFrontmatter() updates frontmatter correctly
- [ ] updateFrontmatter() adds new fields
- [ ] Fallback parser handles simple YAML
- [ ] Fallback stringifier produces valid YAML

### LinkService
- [ ] pathToWikilink() creates valid wikilinks
- [ ] wikilinkToPath() extracts paths correctly
- [ ] extractPathFromWikilink() removes label
- [ ] systemNoteLink() creates system wikilinks
- [ ] mainworldNoteLink() creates mainworld wikilinks

### FileDiscoveryService
- [ ] findSystemByHex() finds by frontmatter hex
- [ ] findSystemByHex() finds by folder pattern
- [ ] findSystemByHex() finds legacy _System.md
- [ ] findSystemByHex() returns null when not found
- [ ] findSystemFromActiveFile() returns system when file IS system
- [ ] findSystemFromActiveFile() finds via system_note
- [ ] findSystemFromActiveFile() finds via system_hex
- [ ] findSystemFromActiveFile() finds in parent folder
- [ ] findAllSystems() returns all systems
- [ ] findSupportNotes() finds existing support notes

### SafeWriteService
- [ ] createFileIfMissing() creates when missing
- [ ] createFileIfMissing() returns existing when exists
- [ ] safeModify() applies mutator correctly
- [ ] safeUpdateFrontmatter() updates frontmatter
- [ ] safeProcessFrontmatter() processes frontmatter
- [ ] safeEnsureFolder() creates folder

## Performance Considerations

1. **Caching**: getMarkdownFiles() can be expensive for large vaults
2. **Cache results**: Consider caching FileDiscoveryService.findAllSystems() results
3. **Lazy loading**: Only scan vault when needed, not on plugin startup
4. **Debounce**: Consider debouncing rapid file operations
