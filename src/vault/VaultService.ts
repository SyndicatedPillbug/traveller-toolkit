import { TFile, TFolder } from "obsidian";

export class VaultService {
  private app: any;

  constructor(app: any) {
    this.app = app;
  }

  get vault() {
    return this.app.vault;
  }

  get metadataCache() {
    return this.app.metadataCache;
  }

  get fileManager() {
    return this.app.fileManager;
  }

  /**
   * Check if an abstract file is a markdown TFile
   */
  isMarkdownFile(af: any): af is TFile {
    return af instanceof TFile && af.extension === "md";
  }

  /**
   * Get a file by exact vault-absolute path
   */
  getFile(path: string): TFile | null {
    const af = this.vault.getAbstractFileByPath(path);
    if (af instanceof TFile) {
      return af;
    }
    return null;
  }

  /**
   * Get a folder by exact vault-absolute path
   */
  getFolder(path: string): TFolder | null {
    const af = this.vault.getAbstractFileByPath(path);
    if (af && af instanceof TFile) {
      return null; // It's a file, not a folder
    }
    return af as TFolder | null;
  }

  /**
   * Check if a path exists as a file
   */
  async fileExists(path: string): Promise<boolean> {
    const af = this.vault.getAbstractFileByPath(path);
    return af instanceof TFile;
  }

  /**
   * Check if a path exists (file or folder)
   */
  async pathExists(path: string): Promise<boolean> {
    const af = this.vault.getAbstractFileByPath(path);
    return af !== null;
  }

  /**
   * Create a folder (including parent folders)
   */
  async ensureFolder(path: string): Promise<void> {
    const parts = path.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const existing = this.vault.getAbstractFileByPath(current);
      if (!existing) {
        await this.vault.createFolder(current);
      }
    }
  }

  /**
   * Create a file with content
   */
  async createFile(path: string, content: string): Promise<TFile> {
    await this.ensureFolder(this.getParentFolder(path));
    return await this.vault.create(path, content);
  }

  /**
   * Read file content
   */
  async readFile(file: TFile): Promise<string> {
    return await this.vault.read(file);
  }

  /**
   * Modify file content
   */
  async modifyFile(file: TFile, content: string): Promise<void> {
    await this.vault.modify(file, content);
  }

  /**
   * Get parent folder path from a file path
   */
  getParentFolder(path: string): string {
    const parts = path.split("/");
    if (parts.length <= 1) return "";
    return parts.slice(0, -1).join("/");
  }

  /**
   * Get all markdown files in the vault
   */
  getAllMarkdownFiles(): TFile[] {
    return this.vault.getMarkdownFiles();
  }

  /**
   * Create a file only if it doesn't exist
   */
  async createFileIfMissing(
    path: string,
    content: string
  ): Promise<{ file: TFile; wasCreated: boolean }> {
    const existing = this.getFile(path);
    if (existing) {
      return { file: existing, wasCreated: false };
    }

    const existsButNotFile = this.vault.getAbstractFileByPath(path);
    if (existsButNotFile) {
      throw new Error(`Path exists but is not a file: ${path}`);
    }

    const file = await this.createFile(path, content);
    return { file, wasCreated: true };
  }
}
