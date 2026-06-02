/**
 * systemDraftContext.ts - Bridge between SystemDraft and TravellerTemplateContext
 * 
 * This module provides functions to build TravellerTemplateContext from SystemDraft
 * for use with template builders.
 */

import { SystemDraft } from "./SystemDraft";
import { TravellerTemplateContext } from "../../templates/core/templateTypes";
import {
  getUwpFromDraft,
  getPbgFromDraft,
  deriveTradeCodesFromUWP,
  deriveBaseCodesFromBases,
  normalizeDraft as normalizeSystemDraft,
  createDefaultSystemDraft
} from "./SystemDraft";

/**
 * Path configuration for system note generation
 */
export interface SystemPaths {
  systemFolder: string;
  systemNotePath: string;
  mainworldPath: string;
  supportPaths: Record<string, string>;
}

/**
 * Build a complete TravellerTemplateContext from a SystemDraft and paths.
 * This is the bridge that allows SystemDraft to be used with existing template builders.
 */
export function buildTemplateContextFromDraft(
  draft: Partial<SystemDraft>,
  paths: SystemPaths
): TravellerTemplateContext {
  // Normalize the draft first to ensure all derived fields are populated
  const normalized = normalizeSystemDraft(draft);
  
  const today = new Date().toISOString().slice(0, 10);
  
  // Re-derive trade codes from UWP fields
  const tradeCodes = deriveTradeCodesFromUWP({
    starport: normalized.starport,
    size: normalized.size,
    atmosphere: normalized.atmosphere,
    hydrographics: normalized.hydrographics,
    population: normalized.population,
    government: normalized.government,
    techLevel: normalized.techLevel,
  });
  
  // Re-derive base codes from bases
  const baseCodes = deriveBaseCodesFromBases(normalized.bases);
  
  // Get UWP and PBG strings
  const uwp = getUwpFromDraft(normalized);
  const pbg = getPbgFromDraft(normalized);
  
  return {
    loadedSystem: null,
    hex: normalized.hex,
    name: normalized.name,
    systemName: `${normalized.name} System`,
    systemFolder: paths.systemFolder,
    systemNotePath: paths.systemNotePath,
    mainworldPath: paths.mainworldPath,
    supportPaths: paths.supportPaths,
    date: today,
    
    // UWP fields
    uwp,
    starport: normalized.starport,
    size: normalized.size,
    atmosphere: normalized.atmosphere,
    hydrographics: normalized.hydrographics,
    population: normalized.population,
    government: normalized.government,
    lawLevel: normalized.lawLevel,
    techLevel: normalized.techLevel,
    
    // Trade codes (derived from UWP)
    tradeCodes,
    
    // Bases
    bases: normalized.bases,
    baseCodes,
    
    // Allegiance and zone
    allegiance: normalized.allegiance,
    allegianceCode: normalized.allegianceCode,
    travelZone: normalized.travelZone,
    
    // PBG
    pbg,
    populationMultiplier: normalized.popMultiplier,
    belts: normalized.belts,
    gasGiants: normalized.gasGiants,
    
    // Stellar data
    stellarData: normalized.stellar,
    worldCount: normalized.worldCount,
    
    // Fuel
    refinedFuel: normalized.refinedFuel,
    unrefinedFuel: normalized.unrefinedFuel,
    wildernessRefuelling: normalized.wildernessRefuelling,
    fuelSources: normalized.fuelSources,
    
    // Routes
    xboatRoute: normalized.xboatRoute,
    tradeRoute: normalized.tradeRoute,
    patrolRoute: normalized.patrolRoute,
    
    // Ardress pressure profile (numeric values converted to strings for template compatibility)
    routeSecurity: String(normalized.routeSecurity),
    fuelReliability: String(normalized.fuelReliability),
    repairCapacity: normalized.repairCapacity,
    salvageRating: String(normalized.salvageRating),
    industrialDecay: String(normalized.industrialDecay),
    laborUnrest: String(normalized.laborUnrest),
    militiaStrength: String(normalized.militiaStrength),
    blackMarketPresence: String(normalized.blackMarketPresence),
    collapseRisk: String(normalized.collapseRisk),
    autocracyPressure: String(normalized.autocracyPressure),
    
    // Linked references (empty for new systems)
    linkedRoutes: [],
    linkedConflicts: [],
    linkedRuins: [],
    controllingFactions: [],
    localRivals: [],
    
    // Dossier options - at top level for template access
    dossierStyle: normalized.dossierStyle,
    dossierComplexity: normalized.dossierComplexity,
    dossierDensity: normalized.dossierDensity,
    
    // Generation direction sliders - at top level for template access
    frontierCore: normalized.frontierCore,
    dangerLevel: normalized.dangerLevel,
    corporateInfluence: normalized.corporateInfluence,
    weirdnessLevel: normalized.weirdnessLevel,
    
    metadata: {
      dossier_style: normalized.dossierStyle,
      dossier_complexity: normalized.dossierComplexity,
      dossier_density: normalized.dossierDensity,
      frontier_core: normalized.frontierCore,
      danger_level: normalized.dangerLevel,
      corporate_influence: normalized.corporateInfluence,
      weirdness_level: normalized.weirdnessLevel,
    },
  };
}
