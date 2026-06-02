import { TravellerTemplateContext, yamlString, yamlArray, blockList, wiki } from "./templateTypes";

export function buildMainworldNote(ctx: TravellerTemplateContext): string {
  const dossier = ctx.dossierMarkdown?.trim() || defaultStarterDossier(ctx);
  return `---
tags:
  - ardress/world
  - traveller
  - traveller/mainworld
record_type: world
type: mainworld
status: Draft
system_hex: "${yamlString(ctx.hex)}"
system: "${yamlString(ctx.systemName)}"
system_name: "${yamlString(ctx.systemName)}"
system_folder: "${yamlString(ctx.systemFolder)}"
system_note: "${yamlString(wiki(ctx.systemNotePath, ctx.systemName))}"
mainworld_note: "${yamlString(wiki(ctx.mainworldPath, ctx.name))}"
hex: "${yamlString(ctx.hex)}"
uwp: "${yamlString(ctx.uwp)}"
starport: ${yamlString(ctx.starport)}
size: ${ctx.size}
atmosphere: ${ctx.atmosphere}
hydrographics: ${ctx.hydrographics}
population: ${ctx.population}
government: ${ctx.government}
law_level: ${ctx.lawLevel}
tech_level: ${ctx.techLevel}
trade_codes: ${yamlArray(ctx.tradeCodes)}
bases: ${yamlArray(ctx.bases)}
base_codes: ${yamlArray(ctx.baseCodes)}
allegiance: "${yamlString(ctx.allegiance)}"
allegiance_code: "${yamlString(ctx.allegianceCode)}"
travel_zone: ${yamlString(ctx.travelZone)}
pbg: "${yamlString(ctx.pbg)}"
population_multiplier: ${ctx.populationMultiplier}
belts: ${ctx.belts}
gas_giants: ${ctx.gasGiants}
gas_giant: ${ctx.gasGiants > 0}
stellar_data: "${yamlString(ctx.stellarData)}"
world_count: ${ctx.worldCount}
mainworld: true
refined_fuel: ${ctx.refinedFuel}
unrefined_fuel: ${ctx.unrefinedFuel}
wilderness_refuelling: ${ctx.wildernessRefuelling}
fuel_sources:
${blockList(ctx.fuelSources, 2)}
salvage_rating: ${yamlString(ctx.salvageRating)}
repair_capacity: ${yamlString(ctx.repairCapacity)}
industrial_decay: ${yamlString(ctx.industrialDecay)}
labor_unrest: ${yamlString(ctx.laborUnrest)}
militia_strength: ${yamlString(ctx.militiaStrength)}
black_market_presence: ${yamlString(ctx.blackMarketPresence)}
collapse_risk: ${yamlString(ctx.collapseRisk)}
autocracy_pressure: ${yamlString(ctx.autocracyPressure)}
route_security: ${yamlString(ctx.routeSecurity)}
fuel_reliability: ${yamlString(ctx.fuelReliability)}
controlling_factions:
${blockList(ctx.controllingFactions, 2)}
local_rivals:
${blockList(ctx.localRivals, 2)}
linked_routes:
${blockList(ctx.linkedRoutes, 2)}
linked_conflicts:
${blockList(ctx.linkedConflicts, 2)}
linked_ruins:
${blockList(ctx.linkedRuins, 2)}
created: ${ctx.date}
updated: ${ctx.date}
---
# ${ctx.name}

## System
${wiki(ctx.systemNotePath, ctx.systemName)}

${dossier}

## Traveller record

- Hex: ${ctx.hex}
- UWP: ${ctx.uwp}
- Trade codes: ${ctx.tradeCodes.join(", ") || "None recorded"}
- Bases: ${ctx.bases.join(", ") || "None recorded"}
- Allegiance: ${ctx.allegiance} (${ctx.allegianceCode})
- Travel zone: ${ctx.travelZone}
- PBG: ${ctx.pbg}
- Stellar data: ${ctx.stellarData || "Unknown"}

## Ardress pressure profile

- Salvage value: ${ctx.salvageRating}
- Repair capacity: ${ctx.repairCapacity}
- Industrial decay: ${ctx.industrialDecay}
- Labor unrest: ${ctx.laborUnrest}
- Militia strength: ${ctx.militiaStrength}
- Black market presence: ${ctx.blackMarketPresence}
- Collapse risk: ${ctx.collapseRisk}
- Autocracy pressure: ${ctx.autocracyPressure}
- Route security: ${ctx.routeSecurity}
- Fuel reliability: ${ctx.fuelReliability}

## Political economy

Who owns what, who pretends to own what, and who can actually enforce that claim?

## Ports, fuel, and logistics

What can travellers buy, repair, refuel, smuggle, or fake here?

## People and institutions

- Key NPCs: [[NPCs]]
- Local government:
- Corporate interests:
- Criminal interests:
- Labor groups:
- Militias:

## Rumors

- See [[Rumors]]

## Adventure hooks

-

## Referee truth

What is really going on.
`;
}

function defaultStarterDossier(ctx: TravellerTemplateContext): string {
  const fuel = ctx.fuelSources.length ? ctx.fuelSources.join(", ") : "not yet mapped";
  const traffic = [ctx.tradeRoute ? "trade route" : "", ctx.patrolRoute ? "patrol route" : "", ctx.xboatRoute ? "xboat route" : ""].filter(Boolean).join(", ") || "local traffic";
  return `## Official survey summary

Registry data lists **${ctx.name}** at hex **${ctx.hex}** with UWP **${ctx.uwp}**. The official record emphasizes starport class **${ctx.starport}**, travel zone **${ctx.travelZone}**, and allegiance to **${ctx.allegiance}**.

## Actual situation

The useful story is still unwritten. Start by asking who controls fuel, permits, cargo priority, local security, and access to offworld routes. Current traffic context: ${traffic}. Fuel context: ${fuel}.

## First View from Orbit

What does an arriving crew notice before landing: traffic, weather, industrial scars, patrol patterns, empty space, belts, moons, or the mainworld itself?

## Surface Reality

What does daily life feel like here? What is scarce, what is routine, and what do locals know that offworld visitors miss?

## Government and Law

Government code **${ctx.government}**, law level **${ctx.lawLevel}**. Describe how authority actually touches visitors: port procedure, weapons restrictions, customs, permits, debt, security, or informal power.

## Culture

What local courtesies matter? What marks someone as competent, rude, rich, desperate, dangerous, or useful?

## Locations

1. **Arrival Point** — Where crews first meet the system's practical limits.
2. **Public Exchange** — Where rumors, cargo, introductions, and obligations move.
3. **Pressure Institution** — The office, yard, court, cooperative, or company desk that controls a scarce resource.
4. **System-Space Site** — A belt, moon, station, refuelling lane, or traffic point that matters beyond the mainworld.
5. **Referee Site** — A place whose official explanation is incomplete.

## Referee Secrets

- Someone benefits from the public record staying narrower than the truth.
- A mundane logistical system is hiding a political, criminal, or survival problem.
- A local with practical authority knows more than they can safely say in an official room.`;
}
