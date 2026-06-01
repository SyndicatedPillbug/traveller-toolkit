# Views Module Operating Instructions

**Module**: `src/views/` - View components
**Purpose**: Sidebar view and view-related components
**Do not modify**: This file is for agent guidance only

## Module Overview

The `views` module contains the view components for the plugin's sidebar UI. Currently, there's a single main view (`ToolkitView`) that switches between different tools.

**Architecture**:
- Single sidebar view (ItemView extension)
- Dynamic tool switching
- Tool instances created on demand
- Clean separation between view and tools

## Key Files

### ToolkitView.ts

**Purpose**: Main sidebar view for the Traveller Toolkit plugin
**Extends**: `ItemView` (from obsidian)
**View Type**: `traveller-toolkit-view` (from viewTypes.ts)

**Properties**:
- `plugin: TravellerToolkitPlugin` - Reference to the plugin
- `currentTool: TravellerTool` - Currently active tool instance
- `state: any` - View state (currently used for tool switching)

**Lifecycle methods**:

#### onOpen()
```typescript
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
```

**Steps**:
1. Get the content container from ItemView
2. Clear existing content
3. Add root CSS class
4. Create header with title and subtitle
5. Create tool navigation buttons
6. Switch to default tool (home)

#### onClose()
```typescript
async onClose() {
  // Cleanup current tool if needed
  if (this.currentTool?.onUnload) {
    this.currentTool.onUnload();
  }
}
```

**Purpose**: Cleanup the current tool when view is closed

#### getViewType()
```typescript
getViewType(): string {
  return VIEW_TYPE_TRAVELLER_TOOLKIT;
}
```

**Returns**: "traveller-toolkit-view"
**Purpose**: Identify this view type to Obsidian

#### getDisplayText()
```typescript
getDisplayText(): string {
  return "Traveller Toolkit";
}
```

**Returns**: "Traveller Toolkit"
**Purpose**: Display name for the view tab

#### getIcon()
```typescript
getIcon(): string {
  return "dice";
}
```

**Returns**: "dice"
**Purpose**: Icon for the view tab

### createHeader(container: HTMLElement)

**Purpose**: Create the view header

**Creates**:
- `ttk-header` div
- `ttk-title` h2 element with text "Traveller Toolkit"
- `ttk-subtitle` div with description text

### createToolNavigation(container: HTMLElement)

**Purpose**: Create the tool navigation buttons

**Creates**:
- `ttk-nav` div containing navigation buttons
- Buttons for each tool:
  - Home (id: "home", icon: "home")
  - System Generator (id: "system-generator", icon: "dice")

**Button behavior**:
- Each button has `ttk-nav-button` class
- Contains icon span and click handler
- Click calls `this.switchTool(tool.id)`

### switchTool(toolId: string)

**Purpose**: Switch to a different tool

**Steps**:
1. Cleanup current tool (call onUnload if exists)
2. Get or create content area div with `ttk-content` class
3. Clear content area
4. Create new tool instance based on toolId
5. Store as currentTool
6. Call tool.render(contentArea)

**Tool creation**:
```typescript
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
```

### triggerLoadActiveNote()

**Purpose**: Handle "Load Active Note" command from plugin

**Behavior**:
1. If current tool is SystemGeneratorTool, call its loadActiveNote()
2. Otherwise, switch to System Generator tool, then call loadActiveNote()

**Use case**: User triggers "Traveller Toolkit: Load Active Note" command

## View Types

**File**: `src/views/viewTypes.ts`

**Exports**:
- `VIEW_TYPE_TRAVELLER_TOOLKIT = "traveller-toolkit-view"` - The view type constant
- `ToolViewState` type - State type for view

**Purpose**: Centralize view type constants

## CSS Classes

The view uses the following CSS classes (defined in styles.css with `.ttk-` prefix):

- `.ttk-root` - Root container for the view
- `.ttk-header` - View header container
- `.ttk-title` - View title (h2)
- `.ttk-subtitle` - View subtitle
- `.ttk-nav` - Tool navigation container
- `.ttk-nav-button` - Individual navigation button
- `.ttk-nav-icon` - Icon within navigation button
- `.ttk-content` - Content area for tools
- `.ttk-tool-*` - Tool-specific classes (e.g., `.ttk-tool-home`, `.ttk-tool-system-generator`)

## Module Rules

### Always Do

1. **Use plugin reference**: Access plugin via `this.plugin`
2. **Use services**: Access services via `this.plugin.services`
3. **Create tool instances**: Always create new tool instances when switching
4. **Cleanup tools**: Call onUnload when switching away from a tool
5. **Add CSS classes**: Use `.ttk-` prefixed classes for all elements
6. **Empty container**: Always empty container before rendering

### Never Do

1. **Don't access app directly**: Use `this.plugin.app` or services
2. **Don't modify DOM directly**: Use Obsidian's DOM creation methods (createDiv, createEl)
3. **Don't leak memory**: Always cleanup tools and event listeners
4. **Don't hardcode tool IDs**: Use constants or strings that match tool registry
5. **Don't assume container structure**: Use `this.containerEl.children[1]` for content area

### Avoid

1. **Large view classes**: Keep view logic minimal, delegate to tools
2. **Direct vault operations**: Use services layer via plugin
3. **Business logic in view**: Business logic should be in tools or services
4. **Tight coupling to tools**: View should know minimal about tool internals

## Integration with Other Modules

### With Plugin (src/app/TravellerToolkitPlugin.ts)

**Registration**:
```typescript
// In onload()
this.registerView(
  VIEW_TYPE_TRAVELLER_TOOLKIT,
  (leaf) => new ToolkitView(leaf, this)
);
```

**Activation**:
```typescript
// In activateView()
async activateView(data?: any) {
  const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TRAVELLER_TOOLKIT);
  let leaf = leaves[0];
  
  if (!leaf) {
    leaf = this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE_TRAVELLER_TOOLKIT, active: true });
  }
  
  this.app.workspace.revealLeaf(leaf);
  
  // Handle special activation data
  if (data?.loadActiveNote) {
    (leaf.view as ToolkitView).triggerLoadActiveNote();
  }
}
```

### With Tools (src/tools/)

**Tool creation**:
- View creates tool instances when switching
- View passes container HTMLElement to tool.render()
- View calls tool.onUnload() when switching away
- Tools don't know about the view

### With Vault (src/vault/)

**Indirect access**:
- View accesses services via `this.plugin.services`
- View doesn't import directly from vault module
- All vault operations go through services

## Common Patterns

### Creating DOM Elements

```typescript
// Create div with class
const container = this.containerEl.children[1];
const header = container.createDiv({ cls: "ttk-header" });

// Create element with text
header.createEl("h2", { text: "Title", cls: "ttk-title" });

// Create div with text
const subtitle = header.createDiv({
  text: "Subtitle text",
  cls: "ttk-subtitle"
});
```

### Adding Event Listeners

```typescript
// Click handler for navigation button
button.addEventListener("click", () => {
  this.switchTool(toolId);
});

// For tool-specific events, delegate to tool
```

### Switching Tools

```typescript
async switchTool(toolId: string) {
  // Cleanup current tool
  if (this.currentTool?.onUnload) {
    this.currentTool.onUnload();
  }
  
  // Get or create content area
  const container = this.containerEl.children[1];
  const contentArea = container.querySelector(".ttk-content") ||
    container.createDiv({ cls: "ttk-content" });
  contentArea.empty();
  
  // Create and render new tool
  switch (toolId) {
    case "home":
      this.currentTool = new HomeTool(this.plugin, this.plugin.services);
      break;
    // ... other tools
  }
  
  this.currentTool.render(contentArea);
}
```

### Handling Commands

```typescript
// In TravellerToolkitPlugin.onload()
this.addCommand({
  id: "traveller-toolkit-load-active-note",
  name: "Traveller Toolkit: Load Active Note",
  callback: () => this.activateView({ loadActiveNote: true }),
});

// In ToolkitView
triggerLoadActiveNote() {
  if (this.currentTool instanceof SystemGeneratorTool) {
    this.currentTool.loadActiveNote();
  } else {
    this.switchTool("system-generator");
    if (this.currentTool instanceof SystemGeneratorTool) {
      this.currentTool.loadActiveNote();
    }
  }
}
```

## Testing Checklist for This Module

### View Lifecycle
- [ ] View opens without errors
- [ ] onOpen() creates header correctly
- [ ] onOpen() creates navigation correctly
- [ ] onOpen() switches to default tool (home)
- [ ] onClose() cleans up current tool
- [ ] View can be opened multiple times
- [ ] View can be closed and reopened

### View UI
- [ ] Header displays title "Traveller Toolkit"
- [ ] Header displays subtitle
- [ ] Navigation buttons are visible
- [ ] Navigation buttons have correct labels
- [ ] Navigation buttons have correct icons
- [ ] View has dice icon in tab
- [ ] View tab shows "Traveller Toolkit"

### Tool Switching
- [ ] Clicking Home button switches to home tool
- [ ] Clicking System Generator button switches to system generator tool
- [ ] Switching tools cleans up previous tool
- [ ] Switching tools renders new tool
- [ ] Switching to same tool works
- [ ] Current tool state is preserved (where applicable)

### Command Integration
- [ ] Ribbon icon opens view
- [ ] "Open Traveller Toolkit" command opens view
- [ ] "Load Active Note" command triggers triggerLoadActiveNote()
- [ ] View opens when commands are triggered

### CSS Classes
- [ ] Root container has .ttk-root class
- [ ] Header has .ttk-header class
- [ ] Title has .ttk-title class
- [ ] Subtitle has .ttk-subtitle class
- [ ] Navigation has .ttk-nav class
- [ ] Navigation buttons have .ttk-nav-button class
- [ ] Content area has .ttk-content class

## Future Enhancements

1. **View state persistence**: Save which tool was active
2. **Multiple views**: Support multiple instances of the view
3. **View preferences**: Per-view settings (e.g., default tool)
4. **Responsive layout**: Better layout for different sidebar widths
5. **Theming**: Support for Obsidian theme variations
6. **Hotkeys**: Tool-specific hotkeys
7. **Context menu**: Right-click context menu for tools

## Promote Bug Fix: View's Role

The view plays a supporting role in the promote bug fix:

1. **Tool switching**: View switches to SystemGeneratorTool when user clicks System Generator card
2. **Command handling**: View forwards "Load Active Note" command to SystemGeneratorTool
3. **Service access**: View provides plugin.services to tools, enabling them to use FileDiscoveryService
4. **Clean architecture**: View's clean separation from tools allows SystemGeneratorTool to properly implement the fix

**Key point**: The view doesn't need to know about the promote logic. It just needs to:
- Create tools with access to services
- Forward commands to the appropriate tool
- Stay out of the way of tool business logic

## Debugging Tips

1. **Check container**: `console.log(this.containerEl)` to verify view structure
2. **Log tool switching**: Add logging to switchTool() to track tool changes
3. **Verify services**: `console.log(this.plugin.services)` to check services are available
4. **Check view registration**: Verify view is registered with correct type
5. **Test in isolation**: Open view manually to test without commands
