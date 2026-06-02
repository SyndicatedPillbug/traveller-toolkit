import { TFile } from "obsidian";

export class FrontmatterService {
  private app: any;

  constructor(app: any) {
    this.app = app;
  }

  /**
   * Get frontmatter from a file's cache
   */
  getFrontmatter(file: TFile): Record<string, unknown> {
    const cache = this.app.metadataCache.getFileCache(file);
    return cache?.frontmatter || {};
  }

  /**
   * Get a specific frontmatter value with type safety
   */
  getFrontmatterValue<T>(
    file: TFile,
    key: string,
    defaultValue?: T
  ): T | undefined {
    const fm = this.getFrontmatter(file);
    return (fm[key] as T) ?? defaultValue;
  }

  /**
   * Process frontmatter using Obsidian's API
   */
  async processFrontmatter(
    file: TFile,
    mutator: (fm: Record<string, unknown>) => void
  ): Promise<void> {
    if (this.app.fileManager?.processFrontMatter) {
      await this.app.fileManager.processFrontMatter(file, mutator);
    } else {
      // Fallback for older Obsidian versions
      const content = await this.app.vault.read(file);
      const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      const frontmatter = fmMatch ? this.parseYaml(fmMatch[1]) : {};
      
      mutator(frontmatter);
      
      const newContent = `---\n${this.stringifyYaml(frontmatter)}\n---\n` + 
        (fmMatch ? content.slice(fmMatch[0].length) : content);
      
      await this.app.vault.modify(file, newContent);
    }
  }

  /**
   * Update frontmatter values on a file
   */
  async updateFrontmatter(
    file: TFile,
    updates: Record<string, unknown>
  ): Promise<void> {
    await this.processFrontmatter(file, (fm) => {
      Object.assign(fm, updates);
    });
  }

  /**
   * Get frontmatter as YAML string
   */
  getFrontmatterYaml(file: TFile): string | null {
    const content = this.app.vault.read(file);
    if (!content) return null;
    
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    return fmMatch ? fmMatch[1] : null;
  }

  /**
   * Simple YAML parser (for fallback only)
   */
  private parseYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      
      const match = trimmed.match(/^([\w-]+):\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value: unknown = match[2]?.trim() || "";
        
        // Handle different types
        if (typeof value === "string") {
          if (value === "true" || value === "True") value = true;
          else if (value === "false" || value === "False") value = false;
          else if (value === "null" || value === "Null") value = null;
          else if (!isNaN(Number(value))) value = Number(value);
          else if (value.startsWith("[") && value.endsWith("]")) {
            // Simple array parsing
            value = value.slice(1, -1).split(",").map((v: string) => v.trim());
          }
        }
        
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Simple YAML stringifier (for fallback only)
   */
  private stringifyYaml(obj: Record<string, unknown>): string {
    const lines: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      let strValue: string;
      
      if (value === null || value === undefined) {
        strValue = "null";
      } else if (typeof value === "boolean") {
        strValue = value ? "true" : "false";
      } else if (typeof value === "number") {
        strValue = String(value);
      } else if (Array.isArray(value)) {
        strValue = `[${value.map((v) => String(v)).join(", ")}]`;
      } else {
        strValue = String(value);
      }
      
      lines.push(`${key}: ${strValue}`);
    }
    
    return lines.join("\n");
  }
}
