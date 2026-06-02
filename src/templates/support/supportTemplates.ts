import { TravellerTemplateContext, yamlString, wiki } from "../core/templateTypes";

export function buildSupportNote(noteId: string, ctx: TravellerTemplateContext): string {
  switch (noteId) {
    case "npcs": return buildNpcsSupportNote(ctx);
    case "factions": return buildFactionsSupportNote(ctx);
    case "rumors": return buildRumorsSupportNote(ctx);
    case "traffic":
    case "ships_traffic": return buildShipsTrafficSupportNote(ctx);
    case "sessions": return buildSessionsSupportNote(ctx);
    default: return buildGenericSupportNote(noteId, ctx);
  }
}

function supportYaml(ctx: TravellerTemplateContext, supportType: string, title: string, extraTags: string[] = []): string {
  const tags = ["traveller", "traveller/support", `traveller/${supportType}`, ...extraTags];
  return `---
tags:
${tags.map(t => `  - ${t}`).join("\n")}
record_type: system_support
type: system_support
support_type: ${supportType}
status: Draft
system_hex: "${yamlString(ctx.hex)}"
system: "${yamlString(ctx.systemName)}"
mainworld: "${yamlString(ctx.name)}"
system_folder: "${yamlString(ctx.systemFolder)}"
system_note: "${yamlString(wiki(ctx.systemNotePath, ctx.systemName))}"
mainworld_note: "${yamlString(wiki(ctx.mainworldPath, ctx.name))}"
created: ${ctx.date}
updated: ${ctx.date}
---
# ${title} — ${ctx.systemName}

`;
}

function buildNpcsSupportNote(ctx: TravellerTemplateContext): string {
  return supportYaml(ctx, "npcs", "NPCs", ["ardress/npc-index"]) + `This is a system-level NPC index and seed note. Use the full **NPC Template** when creating individual named NPC records.

## Likely NPC Types

- **Port gatekeeper or traffic controller** — Knows arrivals, delays, fuel access, and which captains are lying.
- **Local broker or fixer** — Useful for cargo, permits, rumors, introductions, and quiet warnings about the real power structure.
- **Authority figure** — A magistrate, administrator, security chief, cooperative chair, company officer, or commandant.
- **Working specialist** — Mechanic, medic, survey tech, crop forecaster, belt prospector, comms operator, or life-support engineer.
- **Pressure-point NPC** — Someone caught between local obligations and offworld leverage.

## NPC Template Fields To Decide

- Role:
- Affiliation:
- Home:
- Attitude to crew:
- Wants:
- Fears:
- Leverage:
- Secrets:
- Linked factions:
- Linked conflicts:

## Named NPCs

-

## Relationship Notes

-
`;
}

function buildFactionsSupportNote(ctx: TravellerTemplateContext): string {
  return supportYaml(ctx, "factions", "Factions", ["ardress/faction-index"]) + `This is a system-level faction index. Use **Faction Template**, **Corporation Template**, or **Criminal Organization Template** when creating individual records.

## Likely Faction Shapes

- **Local authority** — Courts, customs, licenses, emergency services, security, or civic order.
- **Corporate interest** — Freight combine, port operator, extraction outfit, agricultural buyer, insurance office, or maintenance contractor.
- **Criminal organization** — Black market brokers, smugglers, protection networks, forged permit sellers, salvage thieves, or route parasites.
- **Labor or survival group** — Unions, cooperatives, filter guilds, belter associations, farmers, repair crews, or mutual-aid networks.
- **Security or militia force** — Port security, patrol auxiliaries, private security, local militia, or Autocracy-linked enforcement.
- **Offworld interest** — Patron, rival polity, Sallowfall contact, Autocracy office, scout service, naval concern, or route investor.

## Pressure Fields To Track

- Militia strength: ${ctx.militiaStrength}
- Black market presence: ${ctx.blackMarketPresence}
- Autocracy pressure: ${ctx.autocracyPressure}
- Route security: ${ctx.routeSecurity}
- Collapse risk: ${ctx.collapseRisk}

## Faction Records

-

## Conflicts and Leverage

-
`;
}

function buildRumorsSupportNote(ctx: TravellerTemplateContext): string {
  return supportYaml(ctx, "rumors", "Rumors", ["ardress/rumor-index"]) + `This is a rumor index for ${ctx.systemName}. Use the full **Rumor Template** when a rumor becomes an individual record.

## Rumor Seeds

- A routine port procedure is being used to measure loyalty, debt, or leverage.
- Someone has edited a record most visitors would assume is boring: traffic, harvest, weather, fuel, claims, repair tags, or cargo seals.
- The public explanation for the ${ctx.travelZone} travel zone is incomplete or politically convenient.
- A respected local knows more than they can safely say in an official room.
- The useful rumor is circulating among crews, brokers, technicians, claimants, or local workers rather than officials.

## Rumor Template Fields To Decide

- Rumor type:
- Location:
- Source:
- Reliability:
- Urgency:
- Linked worlds:
- Linked factions:
- Linked jobs:
- Truth:
- How it becomes a job:

## Rumors As Heard

-

## Truth Ledger

-
`;
}

function buildShipsTrafficSupportNote(ctx: TravellerTemplateContext): string {
  return supportYaml(ctx, "ships_traffic", "Ships and Traffic", ["ardress/ship-index", "ardress/route-index"]) + `This is the system traffic index. Use **Ship Template**, **Station Template**, and **Trade Route Template** when creating individual records.

## Traffic Snapshot

- UWP: ${ctx.uwp}
- Starport: ${ctx.starport}
- Fuel sources: ${ctx.fuelSources.join(", ") || "None recorded"}
- Refined fuel: ${ctx.refinedFuel ? "yes" : "no"}
- Unrefined fuel: ${ctx.unrefinedFuel ? "yes" : "no"}
- Wilderness refuelling: ${ctx.wildernessRefuelling ? "yes" : "no"}
- Gas giants: ${ctx.gasGiants}
- Belts: ${ctx.belts}
- Route security: ${ctx.routeSecurity}
- Fuel reliability: ${ctx.fuelReliability}
- Repair capacity: ${ctx.repairCapacity}

## Expected Traffic

- Free traders:
- Local shuttles:
- Corporate traffic:
- Patrol or militia movement:
- Belter/survey traffic:
- Smugglers or undocumented traffic:

## Ship Records

-

## Stations and Facilities

-

## Route Records

-

## Traffic Questions

- Which ship arrived recently enough that everyone noticed?
- Which cargo would make locals nervous if it appeared on a manifest?
- Which route matters more than the official map admits?
`;
}

function buildSessionsSupportNote(ctx: TravellerTemplateContext): string {
  return supportYaml(ctx, "sessions", "Sessions", ["ardress/session-index"]) + `Use this note to track what happened when the Travellers visited ${ctx.name}.

## Visit Log

### Session:

- Date:
- Arrival point:
- Job or complication:
- NPCs met:
- Factions affected:
- Ships encountered:
- Rumors learned:
- Consequences:

## Open Threads

- What did the crew change in the port, local economy, or rumor network?
- Which NPCs now owe them, resent them, or need them?
- Did they create a new route, expose a secret, damage a faction, or make a future visit harder?

## Follow-up Hooks

-
`;
}

function buildGenericSupportNote(noteId: string, ctx: TravellerTemplateContext): string {
  return supportYaml(ctx, noteId, noteId) + `## Notes

Add system support details here.
`;
}
