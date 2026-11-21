# Tag & Tally for Foundry VTT

An unofficial [Foundry Virtual Tabletop](https://foundryvtt.com) game system for
[**Tag & Tally**](https://tagandtally.quest), the tag-driven tabletop RPG where every
thing is "a sentence and a level", damage is a wound track, and characters grow through
tallies instead of XP.

Built for Foundry **v14** (v13 declared as minimum, untested). English and Brazilian Portuguese. Status: early, playable,
smoke-tested by hand. Issues and pull requests welcome.

## Install

Paste this manifest URL into Foundry's *Install System* dialog:

```
https://github.com/julioholon/tagandtally-foundryvtt/releases/latest/download/system.json
```

Or download the latest `tagandtally.zip` from the releases page and unzip it into
`Data/systems/tagandtally`.

## What you get

| Area | Features |
| --- | --- |
| Characters | Sentence header (descriptor, species, type, specialty), life stage, wealth 0-6 with debt, MAI, appearance, known world, arc, biography |
| Tags | Items with type, tier 1-4, tallies, mastery, temporary and reverse (hindering) tags; click pips and boxes on the sheet |
| Character builder | One click builds a complete random character (sentence, life-stage tags, gear, personal quest, appearance); reroll any piece individually. Life stages tab shows what each stage granted |
| Rolls | Dialog with task level (defaults to the scene level), tags and gear as easing or hindering, Task Threshold and two-asset cap enforced, 20+ roll types with Sparks outcome text, natural 1/20 auto-tallies |
| Wounds | Strain 5 / Lingering Trauma 3 / Debilitating Injury 2 / Lasting Scar 3 with overflow, severity label, worst-wound text, generated wound sentences, rest actions |
| Combat | Five-phase flow (Opening, Maneuver, Attack, Counter, Resolution) per participant, any phase in any order, modifiers chained per the SRD, wound application; one-click injury roll |
| Spells | Builder for base / aspects / types / scope / artifact / trigger, points to level, PM and TM, overpowered states, MAI check hindrances, blood magic, mishap roll |
| Quests | Plan / Location / Countdown tallies, steps, status, resolution roll with plan modifier |
| Gear | Weapons, armor, items, consumables, containers, resources, traps, kits; level 1-10, kind, cost, equipped, quantities; loadout counter |
| Barter | Buy from and sell to NPC merchants with Wealth checks per the SRD, no extra module needed |
| NPCs / creatures | Creature or NPC sentence, level and DC, strength / weakness / secret hidden from players until revealed or learned via insights |
| Sparks | 530+ random tables from the official Obsidian vault, 22 sentence generators (NPC, creature, species, gear, places, factions, quests, wounds, appearance), oracle, table browser, create actors / items / journals from results |
| Party | Built-in party overview: sentence, wounds, wealth, MAI, loadout, tags, quests |
| GM tools | Scene level in Scene Config, world RollTable overrides for any Spark table, bulk import to RollTables |

## Guia do Mestre (pt-BR)

Um manual rápido para mesas com vários Mestres está em
[docs/manual-mestre.pt-BR.md](docs/manual-mestre.pt-BR.md).

## Using Sparks

Open **Sparks** from the token controls (wand icon), a character sheet, or
`game.tagandtally.macros.openSparks()`.

- **Generators**: pick a theme (fantasy, modern, monster hunter) and a generator, press
  Generate. Results can be posted to chat, copied, or turned into an actor (NPC,
  creature), an item (gear, quest, wound) or a journal entry (scene, location, dungeon,
  lair, room, faction). Journal entries land in a "Sparks" folder so you can link them
  from Augur Nexus sites or paste them into Hexlands hexes.
- **Tables**: browse and roll any table. *Import as RollTables* copies them into your
  world. Any world RollTable with the same name as a bundled table replaces it, which is
  how you customize Sparks content.
- **Oracle**: likelihood as a level, or a plain d6 yes/no.

Table data is synced from the Obsidian plugin's vault with `scripts/sync-sparks.sh`.

## Module integrations

| Module | Status |
| --- | --- |
| Bar Brawl | New tokens get a vitality bar (`wounds.vitality`) and a strain bar. Toggle in settings. `game.tagandtally.macros.resetBarBrawlDefaults()` re-applies to selected tokens. |
| Health Estimate | Works with its generic provider through the primary token bar (`wounds.vitality`). |
| Item Piles | Gear is tradeable and lootable, Wealth (0-6) is the currency, items priced by cost level. Mark an NPC as *Merchant* on its sheet, then make it a merchant in Item Piles. |
| Party Overview | Not integrated (no public per-system API). Use the built-in party overview instead. |
| Drag Ruler | Not integrated; Tag & Tally has no movement bands. |
| Augur (Nexus, Hexlands, Fantasy, Sci-Fi, Instant Dungeons) | System-agnostic parts work as normal. Augur Fantasy / Sci-Fi marketplace transactions only support dnd5e, pf2e, Shadowdark and OSE and will not work here. |

## API and macros

Everything lives under `game.tagandtally`:

```js
game.tagandtally.macros.rollTask();                 // dialog for the selected token / your character
game.tagandtally.macros.quickRoll(4);               // roll against level 4 without a dialog
game.tagandtally.macros.oracle(7, "Is it trapped?");
game.tagandtally.macros.openCombatFlow();
game.tagandtally.macros.openParty();
game.tagandtally.macros.generateNPC();              // creates an NPC actor from Sparks
game.tagandtally.macros.generateCreature({ values: { "creature-type": "Undead" } });
game.tagandtally.macros.generateJournal("dungeon");
game.tagandtally.macros.importSparkTables("creature");
await game.tagandtally.sparks.generate("faction", { theme: "modern" });
game.tagandtally.rolls.computeEffectiveLevel(5, [{ steps: 2, source: "tag" }], []);
```

Dropping a tag, gear, spell or quest on the hotbar creates a macro that uses it.

## Rules implemented

- DC = 3 x level. Bands: 1 Fail-and; 2 to DC-6 Fail-but; DC-5 to DC-1 Success-but;
  DC to DC+4 Success; DC+5 and up Success-and.
- Task Threshold by level (2 / 3 / 4 / 5 easing sources), two gear assets max,
  hindrances uncapped. Scene and automatic modifiers do not count toward the threshold.
- Tallies: natural 1 or 20 while using tags gives each tiered tag used one tally.
  Five tallies raise the tier (max 4); five at tier 4 marks the tag Mastered.
- Wounds overflow from a full track into the next. Three Lasting Scars end the character.
- Combat resolution band to wound: Fail-and Scar, Fail-but Injury, Success-but Trauma,
  Success Strain, Success-and unscathed. Armor eases the Counter phase by its class.
- Spells follow the SRD point system and the MAI hindrance brackets (1-3 / 4-6 / 7-9).

Where the SRD contradicts itself the formula wins over the cheat sheet; see `PLAN.md`.

## Development

No build step. To cut a release run `scripts/release.sh 0.2.0` on `main`: it stamps the
version into `system.json` and `CHANGELOG.md`, commits, tags `v0.2.0` and pushes; the GitHub
Action then publishes the release assets. Edit, reload Foundry. `node --check` the modules and run
`scripts/sync-sparks.sh [vault-path]` to refresh table data. Releases are built by the
GitHub Action on a `v*` tag.

## License and attribution

This system is licensed **CC BY-SA 4.0**. It is based on *Tag & Tally* © 2025-2026,
licensed CC BY-SA 4.0 (https://tagandtally.quest), and uses content from the Tag & Tally
Obsidian plugin (content CC BY-SA 4.0, code MIT © 2026 Alicia Wilkerson). Tag & Tally
includes material from the SRD 5.2.1 by Wizards of the Coast LLC, licensed CC BY 4.0.
See `LICENSE.md`.

This project is not affiliated with the Tag & Tally author or Foundry Gaming, LLC.

### Checks

```bash
node scripts/validate.mjs .
```

```bash
node scripts/test-sparks.mjs .
```

The first checks localization keys and template paths; the second renders every Sparks
generator in every theme with Foundry mocked out. The two "missing" keys it reports for
`TAGANDTALLY.Appearance.` and `TAGANDTALLY.Npc.` are prefixes built with `concat` and are
expected.
