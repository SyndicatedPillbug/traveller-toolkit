import { TravellerTemplateContext, yamlString, yamlArray, blockList, wiki } from "./templateTypes";

export function buildSystemNote(ctx: TravellerTemplateContext): string {
  return `---
tags:
  - traveller
  - traveller/system
  - ardress/system
record_type: system
type: system
status: draft
prep_status: draft
prominence: minor
hex: "${yamlString(ctx.hex)}"
name: "${yamlString(ctx.systemName)}"
system_name: "${yamlString(ctx.systemName)}"
mainworld: "${yamlString(ctx.name)}"
mainworld_uwp: "${yamlString(ctx.uwp)}"
starport: "${yamlString(ctx.starport)}"
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
travel_zone: "${yamlString(ctx.travelZone)}"
pbg: "${yamlString(ctx.pbg)}"
population_multiplier: ${ctx.populationMultiplier}
belts: ${ctx.belts}
gas_giants: ${ctx.gasGiants}
gas_giant: ${ctx.gasGiants > 0}
stellar_data: "${yamlString(ctx.stellarData)}"
world_count: ${ctx.worldCount}
refined_fuel_available: ${ctx.refinedFuel}
unrefined_fuel_available: ${ctx.unrefinedFuel}
wilderness_refuelling: ${ctx.wildernessRefuelling}
fuel_sources:
${blockList(ctx.fuelSources, 2)}
route_security: ${yamlString(ctx.routeSecurity)}
fuel_reliability: ${yamlString(ctx.fuelReliability)}
system_folder: "${yamlString(ctx.systemFolder)}"
system_note: "${yamlString(wiki(ctx.systemNotePath, ctx.systemName))}"
mainworld_note: "${yamlString(wiki(ctx.mainworldPath, ctx.name))}"
created: ${ctx.date}
updated: ${ctx.date}
---
# ${ctx.systemName} — Hex ${ctx.hex}

## Map Line

\`${ctx.hex} ${ctx.name} ${ctx.uwp} ${ctx.bases.join("/") || "-"} ${ctx.tradeCodes.join(" ") || "-"} ${ctx.travelZone} ${ctx.pbg} ${ctx.allegianceCode} ${ctx.stellarData}\`

${uwpReference(ctx)}

## Primary Bodies

- Mainworld: ${wiki(ctx.mainworldPath, ctx.name)}
- Gas giants: ${ctx.gasGiants}
- Belts: ${ctx.belts}
- Other worlds/bodies: ${Math.max(0, ctx.worldCount - 1)}
- Stellar data: ${ctx.stellarData || "Unknown"}

## Fuel and Traffic

- Refined fuel: ${ctx.refinedFuel ? "Yes" : "No"}
- Unrefined fuel: ${ctx.unrefinedFuel ? "Yes" : "No"}
- Wilderness refuelling: ${ctx.wildernessRefuelling ? "Yes" : "No"}
- Fuel sources: ${ctx.fuelSources.join(", ") || "None recorded"}
- Route security: ${ctx.routeSecurity}
- Fuel reliability: ${ctx.fuelReliability}

## System Support

- NPCs: [[NPCs]]
- Factions: [[Factions]]
- Rumors: [[Rumors]]
- Ships and Traffic: [[Ships and Traffic]]
- Sessions: [[Sessions]]

## System Notes

Use this as the system index. The mainworld has its own note; stations, factions, ships, routes, and NPCs should be linked here as they become important.
`;
}

function uwpReference(ctx: TravellerTemplateContext): string {
  return `## UWP Code Reference

The mainworld UWP is **${ctx.uwp}**. Read it as **Starport / Size / Atmosphere / Hydrographics / Population / Government / Law - Tech Level**.

| Field | Code / Value | Notes |
|---|---:|---|
| Starport | ${ctx.starport} | Best generally available port class in the system record. |
| Size | ${ctx.size} | Mainworld size code. |
| Atmosphere | ${ctx.atmosphere} | Mainworld atmosphere code. |
| Hydrographics | ${ctx.hydrographics} | Mainworld surface water code. |
| Population | ${ctx.population} | Population exponent. |
| Government | ${ctx.government} | Broad government type. Treat as a prompt, not a straitjacket. |
| Law Level | ${ctx.lawLevel} | Restrictiveness of law and enforcement. |
| Tech Level | ${ctx.techLevel} | Local technology base. |

This describes the **mainworld**, not every body in the system. Gas giants, belts, routes, bases, fuel, stations, and secondary worlds are tracked separately.`;
}
