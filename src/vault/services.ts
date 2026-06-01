import { VaultService } from "./VaultService";
import { FrontmatterService } from "./FrontmatterService";
import { LinkService } from "./LinkService";
import { FileDiscoveryService } from "./FileDiscoveryService";
import { SafeWriteService } from "./SafeWriteService";

export interface TravellerToolkitServices {
  vault: VaultService;
  frontmatter: FrontmatterService;
  link: LinkService;
  discovery: FileDiscoveryService;
  safeWrite: SafeWriteService;
}

export function createServices(app: any, settingsManager: any): TravellerToolkitServices {
  const vault = new VaultService(app);
  const frontmatter = new FrontmatterService(app);
  const link = new LinkService();
  const discovery = new FileDiscoveryService(app, vault, link);
  const safeWrite = new SafeWriteService(vault, frontmatter);

  return {
    vault,
    frontmatter,
    link,
    discovery,
    safeWrite,
  };
}
