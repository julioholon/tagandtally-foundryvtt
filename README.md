# Tag & Tally for Foundry VTT

An unofficial [Foundry Virtual Tabletop](https://foundryvtt.com) game system for
[**Tag & Tally**](https://tagandtally.quest), the tag-driven tabletop RPG where every
thing is "a sentence and a level", damage is a wound track, and characters grow through
tallies instead of XP.

Built for Foundry **v14**. English and Brazilian Portuguese. Status: early, playable,
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
| NPCs / creatures | Creature or NPC sentence, level and DC; players see only the core sentence until the GM reveals motivation, wants, attack, damage type or special ability; a creature's strength and weakness and an NPC's secret also reveal through five insights |
| Sparks | 530+ random tables from the official Obsidian vault, 22 sentence generators (NPC, creature, species, gear, places, factions, quests, wounds, appearance), oracle, table browser, create actors / items / journals from results |
| Relations | Factions, people and places the character knows, dropped from Augur Nexus journals, NPC actors or any journal; SRD disposition ladder and relationship tallies; Augur quests link to quest items; any chat card can be logged to a journal |
| NPC interactions | Interact from a relation row or an NPC sheet: 2d6 Drift attitude per scene, approach pathways (1d10 / 1d6) with prompts, typed question, disposition modifier applied, SRD outcome consequences applied to the relation |
| Game loop | Shared scene-by-scene loop for solo and play-by-post: a rolled scene (level from the last scene, Sparks sentence, time of day / weather / season), its time scope (a fight, hours, a day, week, month, year), intent, stakes and the quest it serves; every character has 10 actions in the scene (Investigate, Task, Socialize, Oracle, Travel, Combat, Workshop, Downtime open the matching tool); a Ready check per character gates Advance time, which writes the scene to the Campaign Chronicle journal, moves the days, marks every faction's phase tally by the scope and rolls the next scene |
| Downtime | Shared tracker: 4 downtime points a night per character, the SRD activities (sleep, research, study, workout, meditation, socializing, dinner, drinking, gambling, watch, crafting, repair) with their effects applied: next-day tags ([Refreshed], [Zen], [Well fed], [Liquid Courage]), tiered [Hangover] and [Sore Muscles], tallies on tags, quests and relationships, gambling against the wealth tally; GM starts a new day to fade yesterday's tags |
| Travel | Shared exploration tracker: move the party on the map by hand (Augur hexes or any scene), then Explore hex rolls what the SRD asks for the hex they stand on: level (from the hex they left), feature, landmark and event from the Sparks tables, each rerollable on its own; wilderness / urban / dungeon pick the tables; rest rolls the SRD 2d6 encounter checks (fewer with watchers) |
| Crafting | Per-character Workshop (inventory tab, token controls, macro, or the Downtime crafting / repair hours): Harvest resources by source level and rarity, Craft gear from a base material and a magical component, Augment or Repair gear, Salvage a magical item's properties; every task is a Task Roll with the SRD retry hindrance, outcomes create, change or destroy items |
| Factions | Faction actors with the SRD sentence, hidden goal / secret / headquarters, the six-phase goal timer (tally of 5 a phase, countdown of 10 once the goal is known), rival factions (insights fill their countdowns, a completed phase sabotages their tally), a log and chat cards; GM overview app; import from Augur Nexus faction journals (type, disposition and the Purpose / The World / Authority tenets fill the sentence, drive / action / theme / focus become tags); drop a place for the headquarters or a faction for a rival; relation and headquarters links open the Nexus dossier |
| Party | Built-in party overview: sentence, wounds, wealth, MAI, loadout, tags, quests; GM adds or removes members |
| GM tools | Scene level in Scene Config, world RollTable overrides for any Spark table, bulk import to RollTables |
| Species & types | SRD species and type creation on umbrella tag items (sentence, languages / parent type, magic access, base MAI, weakness, abilities with a flaw per extra); Sparks generators fill the "Species & Types" library; drop one on a character to apply it (abilities as traits, weakness as a flaw, base MAI = the higher of the two) |
| Campaign start | Wizard that sets the Sparks theme and calendar date, rolls the party, creates the journal folder and Chronicle, rolls the Prophecy (journal + four grand quests), rolls the first quest and its giver NPC and sets the opening scene; cleans up an ongoing campaign's journals first; ends with the Augur Nexus checklist |
| Tarot | The SRD's three decks with their flaws: draw a character sentence from three cards and apply it to a character or NPC after confirming; the Prophecy rolls four verses (opposition, escalation, trigger, finale) from the Sparks tables, rerollable bit by bit, journaled or turned into four grand quests |
| Solo play | "Solo veil" world setting: NPC strengths, weaknesses and secrets and faction goals, secrets and headquarters stay hidden from everyone, the GM included, until revealed by the eye toggle or by insights; Sparks and Augur still fill them, so a solo GM discovers the world as a player would |

## GM manual

A quick manual for tables with several Gamemasters: [docs/gm-manual.md](docs/gm-manual.md)
(English) and [docs/manual-mestre.pt-BR.md](docs/manual-mestre.pt-BR.md) (Portuguese).

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
game.tagandtally.macros.openTravel();                // shared travel tracker
game.tagandtally.macros.openGameLoop();              // scene-by-scene game loop
game.tagandtally.macros.openDowntime();              // shared downtime tracker
game.tagandtally.macros.openWorkshop("craft");       // crafting workshop for the selected token's actor
game.tagandtally.macros.openFactions();              // faction overview (GM)
await game.tagandtally.factions.addInsight(game.actors.getName("The Cult"));
await game.tagandtally.travel.rollHex({ mode: "wilderness", fromLevel: 4 });   // level, feature, landmark, event
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
- Downtime: 4 points a night, 1 point = 1 hour. Sleep grants [Refreshed] and, in a safe zone,
  the SRD rest healing on its first hour. Next-day tags last through the following day and are
  removed when the GM starts the day after. Gambling: pick a number (+2 / -1) or even-odd
  (+1 / -1) on a d20 against a wealth tally; 5 marks climb a Wealth level, dropping below 0
  loses one.
- Travel: movement is tracked on the map, not in points. Hex level from the hex you leave: 1-2 -> 1d4+2, 3-4 -> 1d6+2, 5-6 -> 1d8+2, 7-10 -> 1d10+2
  (capped at 10). Rest: 1 + party rounds, minus watchers, each a 2d6 check (wilderness: 6-10
  encounter, 11-12 discovery; safe zone: 2-5 encounter, 11-12 discovery).
- Crafting: harvest DC = source level x 3; craft and augment DC = (level + rarity) x 3 with rarity
  Common 1 / Uncommon 2 / Rare 3 / Legendary 4; salvage DC = item level x 3. Every further attempt
  on the same target is hindered by 2. Crafted gear is Level 1 (2 with a rare or legendary
  component) and Cost 3. Augmenting adds a tag and +1 level (+2 rare or legendary), up to 9.
  Repair is an augment without rarity. A salvaged property is applied with a Level 5 augment.
- Factions: phases Shadows, Whispers, Signs, Omens, Manifestation, The Brink, End. A full tally
  (5) starts the next phase and resets the countdown; the countdown (10) only runs while the
  players know the goal and, when it fills first, resets the phase tally (and itself, unless the
  faction's "countdown resets" toggle is off). An insight for faction A marks A's tally and each
  rival's countdown; when A's phase completes, each rival's current tally is reset.

Where the SRD contradicts itself the formula wins over the cheat sheet; see `PLAN.md`.

## Release notes

Full history in [`CHANGELOG.md`](CHANGELOG.md). Latest:

- **0.6.1** (2026-11-22): the Workshop opens again and its tabs switch (two ApplicationV2
  traps hit on the 0.6.0 build); the Augur Nexus faction import reads the real journal record
  (profile type, drive, action, focus and ideology tenets); crafted weapons and armor are named
  after the base material; the second salvaged property is prefilled from the item's
  augmentations.
- **0.6.0** (2026-11-22): Crafting Workshop (harvest, craft, augment, repair, salvage) and
  Faction actors with the goal timer, rivals, log and Augur import. Gear gains rarity,
  augmentations, broken and salvaged fields.
- **0.5.x** (2026-11-22): Downtime tracker and Travel (hexes, encounters, rest checks).
- **0.4.x**: NPC interactions. **0.3.x**: Relations tab.

## Development

No build step. To cut a release, merge the PR and run `scripts/release.sh 0.3.0` from any
branch with a clean tree: it switches to `main`, pulls, stamps the version into `system.json`
and `CHANGELOG.md`, commits, tags `v0.3.0`, pushes branch and tag, and watches the GitHub
Action until the release is published (`--no-watch` to skip). Then update the system from
Foundry's setup screen. Edit, reload Foundry. `node --check` the modules and run
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
