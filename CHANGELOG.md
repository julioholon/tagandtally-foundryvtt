# Changelog

## 0.2.1 (unreleased)

- Generated sentences follow the interface language: connectives in sheets and chat and the Sparks generator templates have pt-BR variants (table content stays English).
- English GM manual (docs/gm-manual.md).

- Fix: Item Piles piles and merchants no longer start with Wealth 3 (existing piles are
  migrated to 0). Item Piles now trades in coins, priced at 10^cost per item.
- Optional **coins mode** (world setting): coins are tallies toward the next Wealth level
  (10, 100, 1000…), climbing automatically; cash out one level for its coins from the
  sheet header. Barter gets pay-in-coins buttons beside the SRD Wealth checks.
- Ready-made macros ("Tag & Tally" Macro folder) created on first load;
  `game.tagandtally.macros.createDefaultMacros()` recreates them.
- Import an **Augur Nexus person** into a character or NPC: sentence from descriptor,
  ancestry, role and drive; traits and beliefs as tags; portrait and pronoun.

## 0.2.0 (2026-11-21)

- **Random character builder.** The wand button in the character header generates a complete
  character: sentence (descriptor, species, type, specialty), life-stage tags from childhood
  up to the chosen stage, four gear items, a personal quest arc, appearance, name. Every
  generated tag, item and quest has a reroll die; sentence slots reroll individually.
- **Life stages tab** showing what each stage granted, with random-tag buttons per stage.
- **Barter** window on NPC sheets: buy and sell with Wealth checks per the SRD, no Item
  Piles required. `game.tagandtally.macros.openBarter()`.
- **Combat flow**: phases can be rolled in any order or skipped; modifiers flow along the
  SRD chain (Opening to Maneuver, Maneuver to Attack and Counter, both to Resolution).
- **Fix**: gear sentence now follows the structured fields; the free-text sentence is only
  used when the fields are empty.
- **Fix**: rolls for unlinked NPC tokens whose copy has no tags fall back to the world actor's
  tags (tallies go to the world actor).
- **pt-BR translation.**
- Fix: rerolling a tag always picks a different value when the table has alternatives.
- New extra tables: life-stage backgrounds, occupations, flaws, skills, traits, experiences.

## 0.1.3

- Fix: combat flow level dropdown showed level 1 regardless of the stored level; phases now numbered 1-5.
- `system.json` version is now bumped in git so migrations also run on git-clone installs. New `scripts/release.sh`.

## 0.1.2

- Fix: sentence fields created duplicate umbrella tags when the same user had two windows open.
- Fix: generators reading extra columns (spell scope, height, resource rarity) failed when the table had been imported as a world RollTable.
- Migration: tags created before 0.1.1 get their broken icon replaced on world load.

## 0.1.1

- Fix: every roll (task, injury, spell, quest, combat phase) failed because the roll
  dialog overwrote ApplicationV2's reserved `state` property.
- Fix: tag items used a non-existent core icon.
- Fix: dragging tags, gear, spells and quests from a sheet to the hotbar now works.
- Sentence fields on the character header create or rename the matching umbrella tag
  items, so a "Mage" type can be marked Magical for MAI without re-typing it.
- Sparks: new random Spell generator that creates ready-to-use spell items.
- Sparks: importing tables creates one RollTable subfolder per table group.
- Scene level field inserts more robustly into Scene Config.

## 0.1.0 (unreleased)

First playable version.

- Character and NPC/creature actors with the Tag & Tally sentence, life stage, wealth,
  MAI, appearance and known-world fields.
- Tag items with tiers, tallies, mastery, temporary and reverse (hindering) tags.
- Task roll dialog: level from the scene, tag/gear selection with Task Threshold and
  two-asset cap, manual steps, 20+ roll types from the Sparks resolution tables,
  outcome bands, automatic tallies on natural 1 or 20.
- Wound tracks (Strain, Lingering Trauma, Debilitating Injury, Lasting Scar) with overflow,
  severity, token bar attribute, wound sentences generated from Sparks, rest actions.
- Five-phase combat flow tracker, plus a one-click injury roll.
- Spells: builder with base, aspects, types, scope, artifact, trigger, mastery and blood
  magic; MAI checks and overpowered hindrances applied when casting; mishap roll.
- Quests with Plan/Location/Countdown tallies and resolution roll modifiers.
- Gear with levels, kinds, cost, armor class, consumables; loadout counter.
- Sparks: 530+ random tables, 22 sentence generators, oracle, table browser, world
  RollTable overrides and import, create actors/items/journals from results.
- Party overview app. Scene level field in Scene Config.
- Integrations: Bar Brawl default bars, Item Piles (gear + Wealth currency), token
  bar for Health Estimate, hotbar item macros, `game.tagandtally` API.
