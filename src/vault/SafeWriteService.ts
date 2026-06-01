import { TFile } from "obsidian";
import { VaultService } from "./VaultService";
import { FrontmatterService } from "./FrontmatterService";

export class SafeWriteService {
  private vault: VaultService;
  private frontmatter: FrontmatterService;

  constructor(vault: VaultService, frontmatter: FrontmatterService) {
    this.vault = vault;
    this.frontmatter = frontmatter;
  }

  /**
   * Create a file only if it doesn't exist
   * Returns whether the file was newly created
   */
  async createFileIfMissing(
    path: string,
    content: string
  ): Promise<{ file: TFile; wasCreated: boolean }> {
    const existing = this.vault.getFile(path);
    if (existing) {
      return { file: existing, wasCreated: false };
    }

    const existsButNotFile = this.vault.vault.getAbstractFileByPath(path);
    if (existsButNotFile) {
      throw new Error(`Path exists but is not a file: ${path}`);
    }

    await this.vault.ensureFolder(this.vault.getParentFolder(path));
    const file = await this.vault.vault.create(path, content);
    return { file, wasCreated: true };
  }

  /**
   * Update a file's content safely
   */
  async safeModify(
    file: TFile,
    mutator: (content: string) => string
  ): Promise<void> {
    const content = await this.vault.readFile(file);
    const newContent = mutator(content);
    await this.vault.modifyFile(file, newContent);
  }

  /**
   * Update frontmatter safely
   */
  async safeUpdateFrontmatter(
    file: TFile,
    updates: Record<string, unknown>
  ): Promise<void> {
    await this.frontmatter.processFrontmatter(file, (fm) => {
      Object.assign(fm, updates);
    });
  }

  /**
   * Update frontmatter with a mutator function
   */
  async safeProcessFrontmatter(
    file: TFile,
    mutator: (fm: Record<string, unknown>) => void
  ): Promise<void> {
    await this.frontmatter.processFrontmatter(file, mutator);
  }

  /**
   * Create a folder safely (no error if already exists)
   */
  async safeEnsureFolder(path: string): Promise<void> {
    try {
      await this.vault.ensureFolder(path);
    } catch (err) {
      // Folder might already exist, which is fine
      console.debug(`SafeWriteService: ensureFolder for ${path} - ${err}`);
    }
  }
}
