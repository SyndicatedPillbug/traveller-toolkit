/**
 * Service for converting between file paths and wikilinks
 */
export class LinkService {
  /**
   * Convert a vault-absolute file path to a wikilink
   * @param path - The file path (e.g., "Traveller/Systems/0301 - Milice/_Milice.md")
   * @param label - Optional display label
   * @returns Wikilink format: [[path|label]] or [[path]]
   */
  pathToWikilink(path: string, label?: string): string {
    // Remove .md extension for wikilinks
    const cleanPath = path.replace(/\.md$/, "");
    
    if (label) {
      return `[[${cleanPath}|${label}]]`;
    }
    return `[[${cleanPath}]]`;
  }

  /**
   * Convert a wikilink to a file path
   * @param wikilink - The wikilink (e.g., "[[Traveller/Systems/0301 - Milice/_Milice|Milice System]]")
   * @returns The file path with .md extension, or null if not parseable
   */
  wikilinkToPath(wikilink: string): string | null {
    // Match wikilink format: [[path]] or [[path|label]]
    const match = wikilink.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    
    if (!match) return null;
    
    let path = match[1].trim();
    
    // Add .md extension if not present
    if (!path.endsWith(".md")) {
      path = `${path}.md`;
    }
    
    return path;
  }

  /**
   * Extract the path from a wikilink without the label
   */
  extractPathFromWikilink(wikilink: string): string | null {
    const path = this.wikilinkToPath(wikilink);
    return path ? path.replace(/\.md$/, "") : null;
  }

  /**
   * Create a wikilink to a system note
   */
  systemNoteLink(systemFile: any, label?: string): string {
    const path = systemFile.path || String(systemFile);
    return this.pathToWikilink(path, label);
  }

  /**
   * Create a wikilink to a mainworld note
   */
  mainworldNoteLink(mainworldPath: string, label?: string): string {
    return this.pathToWikilink(mainworldPath, label);
  }
}
