export type EntityTemplateKind =
  | "npc"
  | "faction"
  | "corporation"
  | "criminal_organization"
  | "patron_job"
  | "rumor"
  | "ship"
  | "station"
  | "trade_route"
  | "world";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildEntityTemplate(kind: EntityTemplateKind, title = "{{title}}"): string {
  switch (kind) {
    case "npc": return npcTemplate(title);
    case "faction": return factionTemplate(title);
    case "corporation": return corporationTemplate(title);
    case "criminal_organization": return criminalOrganizationTemplate(title);
    case "patron_job": return patronJobTemplate(title);
    case "rumor": return rumorTemplate(title);
    case "ship": return shipTemplate(title);
    case "station": return stationTemplate(title);
    case "trade_route": return tradeRouteTemplate(title);
    case "world": return worldTemplate(title);
  }
}

export function npcTemplate(title = "{{title}}"): string { return `---
tags:
  - ardress/npc
record_type: npc
status: Draft
role: ""
affiliation: ""
home: ""
species: Human
upp: "777777"
skills: []
attitude_to_crew: Neutral
wants: ""
fears: ""
leverage: ""
secrets: ""
linked_worlds: []
linked_factions: []
linked_conflicts: []
created: ${today()}
updated: ${today()}
---
# ${title}

## First impression

## What they want

## What they can offer

## What they are hiding

## Game notes
`; }

export function factionTemplate(title = "{{title}}"): string { return `---
tags:
  - ardress/faction
record_type: faction
status: Draft
faction_type: ""
allegiance_code: ""
ideology: ""
scale: Local
home_base: ""
territory: []
assets: []
enemies: []
allies: []
corruption: Unknown
militia_strength: Unknown
autocracy_pressure: Unknown
public_legitimacy: Unknown
black_market_presence: Unknown
linked_worlds: []
linked_conflicts: []
created: ${today()}
updated: ${today()}
---
# ${title}

## Public face

## Real agenda

## Assets and leverage

## Enemies and rivals

## What they want from travellers

## Referee truth
`; }

export function corporationTemplate(title = "{{title}}"): string { return `---
tags:
  - ardress/corporation
record_type: corporation
status: Draft
corporation_type: ""
headquarters: ""
operating_worlds: []
industries: []
assets: []
private_security: Unknown
labor_relations: Unknown
corruption: Unknown
autocracy_ties: Unknown
black_market_ties: Unknown
salvage_interest: Unknown
linked_conflicts: []
created: ${today()}
updated: ${today()}
---
# ${title}

## Corporate profile

## Public services

## Real business

## Political protection

## Labor and security

## Adventure hooks
`; }

export function criminalOrganizationTemplate(title = "{{title}}"): string { return `---
tags:
  - ardress/criminal-organization
record_type: criminal_organization
status: Draft
organization_type: ""
base_of_operations: ""
operating_worlds: []
markets: []
violence_level: Unknown
black_market_presence: Unknown
corruption_network: Unknown
militia_ties: Unknown
autocracy_pressure: Unknown
rivals: []
allies: []
created: ${today()}
updated: ${today()}
---
# ${title}

## Public myth

## Actual operation

## Markets and routes

## Protection and corruption

## Hooks
`; }

export function patronJobTemplate(title = "{{title}}"): string { return `---
tags:
  - ardress/job
record_type: patron_job
status: Draft
patron: ""
location: ""
job_type: ""
payout: ""
legality: Grey
risk_level: Moderate
time_pressure: ""
linked_worlds: []
linked_factions: []
linked_conflicts: []
linked_rumors: []
created: ${today()}
updated: ${today()}
---
# ${title}

## Offer

## What the patron says

## What is really going on

## Complications

## Rewards

## Fallout
`; }

export function rumorTemplate(title = "{{title}}"): string { return `---
tags:
  - ardress/rumor
record_type: rumor
status: Active
rumor_type: ""
location: ""
source: ""
reliability: Unknown
urgency: Low
linked_worlds: []
linked_factions: []
linked_jobs: []
created: ${today()}
updated: ${today()}
---
# ${title}

## Rumor as heard

> 

## Who believes it

## Truth

## How it becomes a job
`; }

export function shipTemplate(title = "{{title}}"): string { return `---
tags:
  - ardress/ship
record_type: ship
status: Draft
designation: ""
ship_class: ""
hull_tons: 0
age_years: 0
condition: Aging
owner: ""
operator: ""
home_port: ""
allegiance: ""
jump: 0
thrust: 0
armour: 0
weapons: []
quirks: []
damage_notes: ""
reputation: ""
legal_status: Clean
repair_dm: 0
sensor_dm: 0
linked_factions: []
linked_npcs: []
created: ${today()}
updated: ${today()}
---
# ${title}

## Ship profile

## Known quirks

## Mechanical notes

## Reputation

## Crew

## Jobs and complications
`; }

export function stationTemplate(title = "{{title}}"): string { return `---
tags:
  - ardress/station
record_type: station
status: Draft
location_hex: "0000"
parent_world: ""
station_type: ""
owner: ""
operator: ""
population: 0
tech_level: 0
port_class: ""
refined_fuel: false
repair_capacity: Unknown
salvage_rating: Unknown
black_market_presence: Unknown
security_level: Unknown
autocracy_pressure: Unknown
route_security: Unknown
linked_routes: []
linked_factions: []
created: ${today()}
updated: ${today()}
---
# ${title}

## Official registry entry

## Actual condition

## Facilities

## Security and control

## Services

## Rumors and hooks
`; }

export function tradeRouteTemplate(title = "{{title}}"): string { return `---
tags:
  - ardress/route
record_type: trade_route
status: Draft
route_code: ""
origin: ""
destination: ""
intermediate_stops: []
distance_parsecs: 0
jump_requirement: 1
route_type: Local
route_security: Unknown
piracy_level: Unknown
fuel_reliability: Unknown
traffic_level: Unknown
autocracy_patrols: Unknown
militia_interference: Unknown
major_cargoes: []
linked_worlds: []
linked_factions: []
linked_conflicts: []
created: ${today()}
updated: ${today()}
---
# ${title}

## Route summary

## Official status

## Actual hazards

## Traffic and cargo

## People who care

## Hooks
`; }

export function worldTemplate(title = "{{title}}"): string { return `---
tags:
  - ardress/world
record_type: world
status: Draft
hex: "0000"
uwp: "X000000-0"
starport: X
size: 0
atmosphere: 0
hydrographics: 0
population: 0
government: 0
law_level: 0
tech_level: 0
trade_codes: []
bases: []
allegiance: AUTC
travel_zone: Green
pbg: "000"
gas_giants: 0
stellar_data: ""
mainworld: true
refined_fuel: false
salvage_rating: Unknown
repair_capacity: Unknown
industrial_decay: Unknown
labor_unrest: Unknown
militia_strength: Unknown
black_market_presence: Unknown
collapse_risk: Unknown
autocracy_pressure: Unknown
route_security: Unknown
fuel_reliability: Unknown
controlling_factions: []
local_rivals: []
linked_routes: []
linked_conflicts: []
linked_ruins: []
created: ${today()}
updated: ${today()}
---
# ${title}

## Official survey summary

What the Autocracy, the port authority, or the subsector registry claims is true.

## Actual situation

What is actually happening on the ground, in orbit, or along the route network.

## Traveller record

- Hex:
- UWP:
- Trade codes:
- Bases:
- Allegiance:
- Travel zone:
- PBG:
- Stellar data:

## Ardress pressure profile

- Salvage value:
- Repair capacity:
- Industrial decay:
- Labor unrest:
- Militia strength:
- Black market presence:
- Collapse risk:
- Autocracy pressure:
- Route security:
- Fuel reliability:

## Political economy

Who owns what, who pretends to own what, and who can actually enforce that claim?

## Ports, fuel, and logistics

What can travellers buy, repair, refuel, smuggle, or fake here?

## People and institutions

- Key NPCs:
- Local government:
- Corporate interests:
- Criminal interests:
- Labor groups:
- Militias:

## Rumors

- 

## Adventure hooks

- 

## Referee truth

What is really going on.
`; }
