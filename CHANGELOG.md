# Changelog

## 0.11.0 (2026-11-25)

- Aftermath tool: what a result sets in motion, as a list of outcomes, each rolled from a weighted pool,
  rerollable, changeable (kind selector), given to one character (recipient selector) and applied one
  by one or all at once. Each applied outcome posts a chat card.
- Good outcomes: an item (gear generator at the scene level), coins (or a Wealth tally mark without coins
  mode), a better relationship, a new lead (quest), an insight on a faction or an NPC secret.
  Bad outcomes: coins or Wealth lost, a worse relationship, a lead with a catch (the quest starts with
  3 Countdown marks), misleading information, combat (a creature of the scene level is created and
  the Combat flow opens against it), gear lost, a hazard (a wound and its sentence).
- Quest resolution now has a result: the roll sets the quest to completed (any success) or failed (Fail,
  and), the chat card states the Reward or Consequence, and the Aftermath opens by band: Success, and =
  two good, Success = one good, Success, but = one good and one bad, Fail, but = one bad, Fail, and =
  two bad.
- A task closed with Success, and offers one good outcome from a chat button.
- Players can apply outcomes only to characters they own; creating the combat creature needs a GM.
- Manual check list (not testable offline): resolve a quest at each band, split two outcomes between two
  characters, reroll and change kinds, apply a combat outcome, task Success, and button.

## 0.10.0 (2026-11-25)

- Quest tasks: the + on a quest's steps rolls a Verb Adjective Noun from the inspiration tables; edit the
  line or reroll it before adding, and reroll any open task later (dice icon).
- Investigating a quest's Plan no longer marks the tally: a success adds open tasks (1, 2 or 3 by band,
  capped by the Plan boxes still free). Location investigations still mark the Location tally.
- Closing a task takes a Task Roll (d20 on the task, in the quest sheet or the Quests tab). Success closes
  it, which marks the Plan and clears a Countdown mark (SRD); Success, but adds a complication from the
  inspiration table; Success, and clears one more Countdown mark; Fail, and presses the Countdown (once,
  also when the Game loop scene already serves the quest). Players can no longer tick tasks by hand.
- Hidden Location: every new quest rolls a Location (Sparks) kept out of sight. When the Location tally
  fills it is revealed: a chat card, a place journal and a row in the character's known places. The GM can
  reroll or reveal it earlier from the quest sheet.
- Manual check list (not testable offline): + on a quest, Investigate > Plan, rolling a task from the
  Quests tab, filling the Location tally, reveal as player and GM.

## 0.9.5 (2026-11-25)

- Campaign start rewinds the day to 1 and clears the scene history, so the Game loop starts at scene 1, day 1.

## 0.9.4 (2026-11-24)

- Campaign start also writes the Prophecy as the first page of the Campaign Chronicle (the separate
  prophecy journal in the campaign folder stays).
- Task roll dialog: toggling a tag or gear no longer scrolls the list back to the top.

## 0.9.3 (2026-11-24)

- Species & type builders on a character sheet now grant as you edit: abilities become trait tags, the
  weakness and extra-ability flaws become hindering flaw tags, renaming the tag renames the sentence
  slot, base MAI follows. A refresh button on the builder grants the current sheet at once (for species
  or types filled in before this release).
- Randomize character keeps the quests the character was given (grand quests, first quest, Augur
  quests); only the previous generated character arc is replaced.

## 0.9.2 (2026-11-24)

- Campaign start dialog laid out as a proper form (one row per field, the steps in a box). Starts by
  setting the Simple Calendar date and time when the module is active. If a campaign is ongoing it asks
  before deleting that campaign's journals (Chronicle, prophecy) and resetting the Game loop; actors stay.
  The four Oracle opening questions are gone.
- The Celtic Cross is replaced by the **Prophecy**: four verses rolled from the Sparks tables (an
  opposition, an escalation, a trigger, a finale), every bit rerollable, journaled as the prophecy, and
  turned into four grand quests (unmask the opposition, prevent the escalation, stop the trigger,
  achieve the finale) on a chosen character.
- Tarot "Apply to a character" now asks which character or NPC and confirms before replacing the
  sentence (it used to pick the character on its own). Every card also shows its SRD flaw.
- Species & type builders: the ability description field is gone; the flaw paying for a third or later
  ability is drawn from the SRD tarot flaws (dice beside it draws another).

## 0.9.1 (2026-11-24)

- 

## 0.9.0 (2026-11-24)

- **Species & type builders** (SRD guides): species and type umbrella tags carry the creation sheet: the
  sentence (aged / descriptor / cultural trait / feature, or descriptor / type / specializes in), languages
  or parent type, magic access with aspects and base MAI, one weakness and the abilities (two free, each
  one beyond two needs a flaw; the sheet flags the missing ones). Every field rerolls from Sparks; the wand
  regenerates the whole sheet. The Sparks Species and Type generators now create these items in a
  "Species & Types" Items folder (the library). Drop one on a character, or use the sheet's Apply button:
  the sentence slot and its old umbrella tag are replaced, the abilities become trait tags, the weakness
  and the extra flaws become hindering flaw tags, and the base MAI is the higher of species and type.
- **Campaign start** wizard (token controls, macro, `game.tagandtally.campaign.start()`): name and theme,
  N random characters added to the party, a journal folder and the Campaign Chronicle, a Celtic Cross
  prophecy journal plus a grand quest on each character, a first quest with its giver NPC already in
  everyone's relations, the opening scene in the game loop and four Oracle opening questions, then a
  chat card with the Augur Nexus checklist (region or star system, factions, starting location).
- **Tarot** app (token controls, macro, `game.tagandtally.tarot.open()`): the SRD's three decks (major
  arcana are descriptors, court cards are types, numbered cards are what the character does). Draw a
  character sentence from three cards, or a ten-card Celtic Cross with the position meanings; flip or
  redraw a card, send the reading to chat, journal it as a prophecy (optionally with a grand quest),
  or apply the sentence to a character. Card text from the SRD tarot generator (CC BY-SA).

## 0.8.3 (unreleased)

- Quest sheet is wider and lists the three tallies one per row, so the Countdown's ten boxes fit.
- Game loop shows the selected quest's tallies under the picker (click the name to open it).
- Countdown pressure: a Fail-and roll in the scene fills the scene's quest Countdown by 1; Advance time
  fills it by the scope's marks (day / week 1, month 2, year 3), like the factions. Both in config.
- Dropping an Augur Nexus person on an NPC sheet links the actor and imports the dossier.

## 0.8.2 (2026-11-24)

- Quests generated by Sparks (sheet wand, Sparks app, Game loop +) fill goal, reward and consequence from
  the SRD inspiration tables (motivation, benefit, complication) and add a verb / adjective / noun line
  with the giver's emotion to the description.
- SRD quest rules on the item: a completed step marks the Plan and clears one Countdown mark; completing
  the Plan or the Location clears one Countdown mark.
- Game loop Socialize lists only NPC actors (known people first); journals, item piles and other actors
  are no longer offered.
- Augur person import follows the dossier: role -> type, descriptor, ancestry -> species, traits ->
  specialty, current thread approach -> motivation, wants -> wants to; drive becomes a "pursues" tag.
  The import and link buttons replace the sentence fields (tags are still only added).
- With Simple Calendar, every closed scene also becomes a calendar note on its day, linking the
  Chronicle page.

## 0.8.1 (2026-11-24)

- Game loop: a scene action is spent when a roll resolves, wherever it was rolled (sheet, Workshop,
  Interact, Combat flow's Resolution…); opening a tool costs nothing; combat phases before the
  Resolution and yes / no rolls are free. A refund arrow gives back the last action.
- Investigate asks what is investigated: a quest's Plan or Location, an NPC's strength / weakness /
  secret, or a faction. The insights roll is level 5 (SRD); the band's tallies land on the target, a
  Subject / Modifier insight is rolled onto the card, and a Fail-and marks the current quest's Countdown.
- A + beside the quest picker creates a quest on a participant (Sparks-filled) and selects it.
- Simple Calendar (Reborn): the loop shows the calendar date and Advance time moves it by the scope
  (days, 4 hours for "a few hours", 10 minutes for "a fight").
- Quest sheet: tallies are clickable boxes (5 / 5 / 10) with the max beside them.
- The system now fires a `tagandtally.rollResolved` hook with every resolved roll.

## 0.8.0 (2026-11-24)

- **Game loop** (solo and play-by-post): a shared scene with level (SRD formula from the last scene),
  Sparks sentence, time of day / weather / season, a time scope (fight, hours, day, week, month, year),
  intent, stakes and the quest it serves. Each party member has 10 actions per scene (Investigate,
  Task, Socialize, Oracle, Travel, Combat, Workshop, Downtime) and a Ready flag; Advance time writes
  the scene to the Campaign Chronicle journal, moves the days, marks every faction's tally by the scope
  and rolls the next scene. Setting "Game loop writes a Chronicle"; macro and token-control button.

## 0.7.3 (2026-11-23)

- What the players know about an NPC or creature (revealed fields and insights) is kept on the world
  actor and shared by all of its unlinked tokens: revealing on a token sheet updates the actor and every
  other token of it; token copies still keep their own sentence fields. Fixes reveals that showed on
  one copy and not the other.

## 0.7.2 (2026-11-23)

- Fix: traits revealed on an unlinked token (the usual case for a placed creature) were missing from its
  roll dialog, which read the world actor's copy. The dialog now uses the rolling actor's own sentence
  and treats a field as visible when either copy has it revealed.

## 0.7.1 (2026-11-23)

- NPC and creature details follow the SRD sentences: players (and a veiled solo GM) see only the core
  sentence. Motivation, wants, attack and damage type on NPCs, plus special ability on creatures, are
  hidden until revealed by the eye beside each field; strength and weakness belong to creatures and
  the secret to NPCs, each with five insight boxes. The header sentence shows hidden parts as [?].
- The "Hide creature strengths and weaknesses" setting is now "Hide NPC and creature details from
  players" and covers all of the above.

## 0.7.0 (2026-11-23)

- **Solo veil** (world setting, off by default): NPC strengths, weaknesses and secrets and faction
  goals, secrets and headquarters are hidden from everyone, the GM included, until revealed by the
  eye toggle or by insights. Hidden strengths and weaknesses stay out of the creature's roll dialog.
- Generated NPCs no longer copy the whole sentence (secret included) into the biography.
- Augur imports (people and factions) fill only blank sentence fields; values that find no room
  become tags, and every faction tenet becomes a "believes in" tag. Goal and secret on a faction are
  never overwritten.

## 0.6.6 (2026-11-23)

- Character, NPC and Faction sheets get an Augur button: linked actors open their Nexus dossier (the
  import button stays beside it); unlinked characters and NPCs pick the Augur person they are, which
  links and imports them.

## 0.6.5 (unreleased)

- Relation rows (and the faction headquarters link) open the Augur Nexus dossier of NPCs, factions
  and locations instead of the journal page, falling back to the journal when Augur cannot.
- Faction sheet accepts drops: a place (Augur location, scene, site page or journal) becomes the
  headquarters (with open / unlink icons), another faction becomes a rival, an Augur faction
  journal is imported.
- Augur faction import follows the dossier: Type -> organization type, Disposition -> descriptor,
  Purpose tenet -> core function, The World tenet -> goal, Authority tenet -> secret; Drive, Action,
  Theme and Focus become tags on the faction (tags are listed on the sheet and can be added or
  removed by hand).
- Rival picker also offers Augur factions not yet imported (imports on pick) and explains what
  rivals are when there is nothing to pick.

## 0.6.4 (2026-11-23)

- Relation rows and the Interact dialog show the linked actor's current portrait, falling back to
  its token art when the actor image is the default.
- Travel: the terrain box is gone; the terrain is read off the map.

## 0.6.3 (2026-11-23)

- Fix: NPC and creature sentence words (descriptor, type, motivation, attack, strength, weakness…)
  are offered as tags in the Task Roll dialog, so a creature in the Combat flow can roll with them.
- Fix: the Interact dialog's portrait was unstyled (huge) and showed the relation's stored image
  instead of the NPC's current one.
- Fix: missing "Mode" label in the Workshop's Augment tab.
- Travel reworked around the map: movement points, pace and transport are gone. Explore hex rolls
  level, feature, landmark and event for the hex the party stands on (terrain comes from the map),
  each rerollable on its own by anyone, with Post to chat and Set as scene level. Rest checks
  unchanged. Travel points no longer wear down [Hangover] / [Sore Muscles]. Inline dice in table rows
  are rolled ("7 Room Dungeon") and a "Biome/District Event" expands into a verb-adjective-noun event
  for the terrain or district typed in the Travel window.

## 0.6.2 (2026-11-22)

- Manifest: Foundry v14 is now the minimum (v13 was never tested); cover and icon media for the
  package listing.
- GM manual (both languages) covers Relations and interactions, Downtime, Travel, the Workshop
  and Factions; macro list and session checklist updated.

## 0.6.1 (2026-11-22)

- Fix: the Workshop failed to open (it assigned a property ApplicationV2 reserves) and its tabs did
  not switch (the action name `tab` is handled by core).
- Augur Nexus faction import now reads the real record: profile type, drive, action and focus and
  the ideology tenets fill organization type, descriptor, goal and secret.
- Crafting a weapon or armor names the material after the base material; salvaging two properties
  prefills the second one from the item's augmentations.

## 0.6.0 (2026-11-22)

- **Crafting** (SRD optional module): a per-character Workshop opened from the Inventory tab, the
  token controls, a macro or the Downtime crafting / repair hours. Harvest rolls against a source
  level with a resource type (d8) and rarity (d4) and creates resource items; Craft turns a base
  material and an optional magical component into Level 1 gear (Cost 3) with a Sparks-prefilled
  sentence; Augment adds a tag and a level (two with rare / legendary material), Repair clears the
  new "broken" flag, and a salvaged property is applied with a Level 5 task; Salvage destroys an
  item to keep one (or two) of its properties. Every task goes through the Task Roll dialog with
  the SRD retry hindrance (+2 per failed attempt) and appends its outcome to the roll card.
- Gear gains rarity, augmentations (appended to the sentence), broken (eases nothing) and salvaged
  fields, all editable on the item sheet.
- **Factions** (SRD optional module): a new Faction actor type with the faction sentence, goal /
  secret / headquarters hidden from players until revealed, the six-phase goal timer (tally of 5,
  countdown of 10 once the goal is known, thwart on a full countdown), rival factions (the thwart
  mechanism), a log and chat cards (whispered until the goal is known). A GM overview lists every
  faction with Insight / Countdown buttons and a "Time passes" tick, and imports Augur Nexus faction
  journals. Dropping a faction actor on a character sheet adds it to the Factions relations.
- New macros: Workshop, Factions.

## 0.5.1 (2026-11-22)

- Travel and new-day chat cards now speak as "Travel" / "Downtime" instead of the GM's selected token.
- The Travel window refreshes when the scene level changes, so "Set as scene level" hides right after use.

## 0.5.0 (2026-11-22)

- **Downtime** (SRD optional module): shared tracker opened from the token controls, a macro or the
  Wounds tab. Every character gets 4 points a night; each activity button spends one hour and applies
  its effect at once (next-day condition tags, tiered [Hangover] / [Sore Muscles], tallies on tags,
  quest Plan / Location tallies, relationship tallies, SRD gambling against a new wealth tally with
  pips in the sheet header). The GM toggles safe zone / camp and starts a new day, which fades the
  next-day tags and refills downtime and travel points.
- **Travel** (SRD optional module): shared tracker with travel type, pace and transport setting the
  day's points; spend by hex difficulty or room; *Enter hex* rolls the new hex's level, terrain or
  district, feature (with its movement cost), landmark and event from the Sparks tables and can set
  the scene level; *Rest* rolls the SRD encounter checks (one fewer per watcher) with event and
  discovery follow-ups. Fast pace exhausts the party for the next day; every 2 points spent lower
  hangovers and sore muscles by a tier.
- Condition tags granted by downtime hinder by their tier (Hangover T3 hinders 3 steps).
- Macros added in later releases are now created on existing worlds too (Travel and Downtime appear in the Tag & Tally macro folder on first load).

## 0.4.1 (2026-11-22)

- Fix: the Interact dialog failed to open (property name clashed with ApplicationV2).

## 0.4.0 (2026-11-22)

- NPC interactions (SRD optional module): Interact button on Relations rows and on NPC sheets opens a dialog with the permanent disposition, the 2d6 Drift attitude for the scene, the approach pathways (1d10 when you approach, 1d6 when they do) with their prompts, a free-text question and the task level. The roll goes through the task dialog with the disposition modifier fixed; the outcome band's SRD consequence is appended to the roll card and applied (disposition ±1, attitude -1, insight buttons for the GM).
- Character sheet opens wider (880px) so the tab bar fits on one line.

## 0.3.2 (2026-11-22)

- Relations tab and quests accept drags from Augur Nexus itself (NPC, faction, location rows, place tree sites, quest cards), not only from the Journal sidebar.
- Log to journal: the current scene's Augur location(s) are listed first and preselected; portraits in logged cards are shrunk to 40px and use token art.
- Fix: Party Overview portrait no longer squashed.

## 0.3.1 (2026-11-22)

- Fix: Party Overview failed to open for the GM (template rendered two root elements after the add-member toolbar was added).

## 0.3.0 (2026-11-22)

- **Relations tab** replaces the "Known world" fields: Factions, People and Places lists.
  Drop Augur Nexus journals (factions, people, locations, ships), NPC actors or any journal
  entry on the character sheet to add a row; rows carry the SRD disposition ladder (Loathing
  to Unbreakable bond, with the social ease/hinder), a relationship tally for people, and
  visited/safe-zone toggles for places. Old text fields are migrated into rows and the
  character arc becomes a quest item.
- **Log to journal** button on every chat message: appends the message to an Augur entity's
  Journal page, any journal, or a per-character Chronicle journal (created on demand), with a
  Simple Calendar or real-time stamp, so the GM can write what happened next.
- **Augur quests**: drop an Augur quest journal on a character to create a linked quest item;
  the Quests tab shows its objectives read-only, with a button to copy them into the steps.
- **Party overview**: GM can add any character to the party or remove one; player-owned
  characters are still listed automatically.

## 0.2.2 (unreleased)

- Fix: a connective translated as empty (pt-BR "damage") no longer falls back to English.
- API: `game.tagandtally.augur` also exposes `findAugurPerson` and `mapAugurPerson`.
- Fix: Item Piles kept the old "Wealth" currency (picking up a pile gave +3 Wealth) because
  it only re-reads the system integration on a version bump. Now bumped; piles trade in coins.
  Unlinked pile tokens still holding Wealth 3 are migrated to 0. The "Default Item Pile" actor
  that Item Piles recreates was still born with Wealth 3 (dotted flag key); fixed and migrated again.
- Coins mode barter reworked: buying cashes out Wealth levels when the purse is short; selling
  keeps the SRD check and pays the full coin price on success, half on failure; the merchant
  cashes out their own Wealth to pay and goes broke when it runs out. The Wealth-only buttons
  are hidden in coins mode.
- The coins field in the character header widens with the amount and the climb cost is
  formatted with thousands separators.

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
