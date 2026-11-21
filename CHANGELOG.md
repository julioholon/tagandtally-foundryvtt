# Changelog

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
