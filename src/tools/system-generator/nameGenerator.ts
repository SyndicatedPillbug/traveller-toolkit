/**
 * nameGenerator.ts - Name generation utilities for system creation
 */

import { SystemDraft } from "./SystemDraft";

/**
 * Generate a random system name
 */
export function generateRandomSystemName(draft?: Partial<SystemDraft>): string {
  const names = [
    "Milice", "Cigrdu", "Dengiz", "Ardress", "Vland", "Glisten", "Biter", 
    "Mare", "Trin", "Nix", "Pole", "Roug", "Zhdant", "Lunion", "Fornine",
    "Regina", "Capital", "Glisten", "Biter", "Draylen", "Spinward", "Core",
    "Rim", "Frontier", "Reach", "Sector", "Gateway", "Crossing", "Nexus",
    "Haven", "Refuge", "Outpost", "Station", "Port", "Hub", "Terminal"
  ];
  
  // If draft is provided, use sliders to influence name style
  if (draft) {
    const { frontierCore = 50, weirdnessLevel = 50 } = draft;
    
    // More frontier -> more exotic names
    // More weird -> more unusual names
    const frontierFactor = frontierCore / 100;
    const weirdFactor = weirdnessLevel / 100;
    
    // Combine factors for a weighted random selection
    const combined = (frontierFactor + weirdFactor) / 2;
    
    // Split names into "normal" and "exotic" categories
    const normalNames = names.slice(0, 15);
    const exoticNames = names.slice(15);
    
    // Use combined factor to choose between normal and exotic
    if (combined > 0.7) {
      // High frontier/weird -> pick from exotic
      return exoticNames[Math.floor(Math.random() * exoticNames.length)];
    } else if (combined < 0.3) {
      // Low frontier/weird -> pick from normal
      return normalNames[Math.floor(Math.random() * normalNames.length)];
    } else {
      // Mixed -> pick from all
      return names[Math.floor(Math.random() * names.length)];
    }
  }
  
  // No draft provided, just pick randomly
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Generate a system name based on UWP characteristics
 */
export function generateNameFromUWP(uwp: {
  starport: string;
  size: number;
  atmosphere: number;
  hydrographics: number;
  population: number;
  government: number;
  techLevel: number;
}): string {
  const { starport, size, atmosphere, hydrographics, population, government, techLevel } = uwp;
  
  // Starport quality influences name style
  const starportQuality = ["X", "E", "D", "C", "B", "A"].indexOf(starport);
  
  // Population influences density
  const popLevel = Math.min(5, Math.floor(population / 3));
  
  // Tech level influences modernity
  const techLevelGroup = Math.min(3, Math.floor(techLevel / 4));
  
  // Build a name based on these characteristics
  const prefixes: string[] = ["New", "Old", "High", "Low", "Great", "Lesser", "North", "South", "East", "West"];
  const suffixes: string[] = ["port", "haven", "reach", "gate", "world", "system", "station", "hub", "nexus", "crossing"];
  const bases: string[] = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa"];
  
  const nameParts: string[] = [];
  
  // Add a prefix based on characteristics
  if (starportQuality >= 3) {
    nameParts.push(prefixes[Math.floor(Math.random() * 4)]); // New, Old, High, Low
  }
  
  // Main name
  nameParts.push(bases[Math.floor(Math.random() * bases.length)]);
  
  // Add a suffix based on population
  if (popLevel >= 3) {
    nameParts.push(suffixes[Math.floor(Math.random() * suffixes.length)]);
  }
  
  return nameParts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Generate a unique system name that doesn't conflict with existing systems
 * Note: This function requires access to the vault services to check for conflicts
 * For now, we'll just generate a name and let the caller handle conflict detection
 */
export function generateUniqueSystemName(existingNames: string[]): string {
  const adjectives = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa",
                     "New", "Old", "North", "South", "East", "West", "Central", "Outer", "Inner", "Deep"];
  const nouns = ["Port", "Haven", "Reach", "Gate", "World", "System", "Station", "Hub", "Nexus", "Crossing",
                "Outpost", "Refuge", "Terminal", "Junction", "Waypoint", "Beacon", "Relay", "Depot"];
  
  const usedNames = new Set(existingNames.map(n => n.toLowerCase()));
  
  // Try a few combinations before giving up
  for (let i = 0; i < 100; i++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const name = `${adj} ${noun}`;
    
    if (!usedNames.has(name.toLowerCase())) {
      return name;
    }
  }
  
  // If we can't find a unique name, just return a random one with a number
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${Math.floor(Math.random() * 1000)}`;
}
