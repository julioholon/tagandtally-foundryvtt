# Tag & Tally for Foundry VTT: build plan

Reference implementation studied: mrkwnzl/cyphersystem-foundryvtt (structure, roll
engine, integrations, release flow). Tag & Tally shares none of Cypher's data model,
so only the architecture is borrowed.

## Decisions (2026-11-20)

| Topic | Decision |
| --- | --- |
| Foundry | v14 (user on build 370); minimum 13 declared, verified 14 |
| Package | Game system, id `tagandtally` |
| Settings | Ship fantasy, modern, monster-hunter tables; world RollTables can override any Spark table |
| Character sheet | Freeform tags (Items), no guided builder yet |
| Roll dialog | Task level defaults to the scene's level flag; tags ticked as easing/hindering; Task Threshold and 2-gear cap enforced; natural 1/20 auto-adds tallies |
| Combat | Five-phase tracked flow per PC vs creature, plus a one-click injury roll |
| NPC sheet | Strength and weakness hidden from players until revealed by GM or 5 insights |
| Spells | MAI rules, spell builder (base/aspects/types/scope/artifact/trigger), spells tab |
| Wounds | Four tracks; derived severity (0-4) and worst-wound text; `wounds.vitality` for token bars |
| Inventory | Gear items with slots, level, wealth 0-6 as currency; Item Piles integration |
| Party | Built-in Party Overview app (sentence, wounds, wealth, gear) |
| Drag Ruler | Skipped |
| Augur | Treated as compatible; generators output journal entries Augur can link |
| Sparks | Tables synced from the Obsidian vault JSON; generator engine ported |
| License | CC BY-SA 4.0 (code and content), attribution to Tag & Tally and 5e SRD 5.2.1 |
| Release | GitHub Actions on tag push: zip + system.json release assets |

## Layout

```
system.json              manifest (DataModel based, no template.json)
tagandtally.mjs          entry point: registers models, sheets, hooks, API
module/config.mjs        constants: levels, bands, tiers, thresholds, spell points
module/data/*.mjs        TypeDataModels for actors (character, npc) and items
module/documents/*.mjs   Actor and Item subclasses (derived data, tallies, wounds)
module/sheets/*.mjs      ApplicationV2 sheets (Handlebars)
module/rolls/*.mjs       resolution bands, task roll dialog, chat cards
module/combat/*.mjs      five-phase combat flow application
module/spells/*.mjs      spell point/level calculator and casting
module/sparks/*.mjs      table store, generator engine, Sparks app, importer
module/integrations/*    Bar Brawl, Item Piles, scene level, party overview
data/sparks/             tables (synced from vault) and generators.json
templates/, styles/, lang/
scripts/sync-sparks.sh   re-sync tables from ~/src/obsidian-tag-and-tally
```

## Rules reference

- DC = 3 x level. Bands: 1 = Fail-and; 2..DC-6 = Fail-but; DC-5..DC-1 = Success-but;
  DC..DC+4 = Success; DC+5+ = Success-and.
- Task Threshold (max tags counted): level 1-3 = 2, 4-6 = 3, 7-8 = 4, 9-10 = 5.
  Max 2 gear assets. Hindrances uncapped and applied after easing.
- Tallies: natural 1 or 20 while using a tag gives each used tiered tag 1 tally.
  5 tallies = next tier (max 4). Tier 4 + 5 tallies = Mastered.
- Wounds: Strain 5, Lingering Trauma 3, Debilitating Injury 2, Lasting Scar 3.
  Overflow fills the next track down. Three scars end the character.
- Combat resolution: Fail-and = Scar, Fail-but = Injury, Success-but = Trauma,
  Success = Strain, Success-and = Unscathed.
- Spells: points = base + aspects + types + axis cost (1/2/5 beyond two axes);
  points to level table; final level = level + scope PM; MAI check hinders by
  (level - MAI) bracket; triggers reduce level.
- Wealth 0-6, purchases at or above wealth need a check at level 3 + difference.

## Not in v0.1 (candidates for later)

Guided character creation, Zone inventory slots, rulebook browser (vault ships
rulebook.json), pt-BR localization, Drag Ruler, LevelDB compendium packs.
