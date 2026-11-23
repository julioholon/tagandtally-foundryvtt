# GM Manual: Tag & Tally in Foundry VTT

A quick guide for tables with several Gamemasters (or GMs who take turns) using the
Tag & Tally system in Foundry VTT v14. It assumes the world already exists with the system
installed.

## 1. The idea in one paragraph

In Tag & Tally everything is **a sentence and a level**. A character is "*Name* is a
[descriptor] [species] [type] who [specialty]". Each bracket is a **tag**; tags ease or
hinder tasks. Every task has a **level** from 1 to 10 and the **DC is 3 × level**. You always
roll **1d20**: a 1 is "Fail, and…"; up to DC-6 "Fail, but…"; DC-5 to DC-1 "Success, but…";
DC to DC+4 "Success"; DC+5 and up "Success, and…". There are no hit points: damage is a
**wound track**. There is no XP: tags rise in tier through **tallies** (a natural 1 or 20
while the tag is in use). The system automates all of that; the GM sets the level and
narrates.

## 2. Preparing the world

- **Language**: Foundry Settings → Language. English and Brazilian Portuguese are available.
  Note that the Sparks table content (the words inside the brackets) is English either way.
- **Default task level** (system settings): use 3 in new worlds.
- **Scene level**: in each scene, Configure → Basics tab → "Tag & Tally scene level". Every
  roll in that scene starts at this level and generated creatures are born with it. Raise it
  when the story heats up; it is the GM's main dial.
- **Automatic tallies**: leave on. On a natural 1 or 20 the system marks the tags for you.
- **Hide creature strengths and weaknesses**: leave on. Players only see them when revealed.
- **Coins mode** (optional, off by default): coins as a currency that climbs Wealth levels.
  See section 9.
- **Recommended modules**: Bar Brawl (vitality and strain bars on tokens), Health Estimate
  (severity text on hover), Dice So Nice, and the Augur family (Nexus, Hexlands, Fantasy,
  Instant Dungeons) for the world. Item Piles is optional: the system has its own
  **Barter** window.
- **System buttons**: the token controls (left column) carry three extra buttons:
  **Sparks** (wand), **Combat flow** (swords) and **Party overview** (people).
- **Macros**: on first load a "Tag & Tally" macro folder is created with one macro per tool.
  Drag them to the hotbar.

## 3. Creating characters with the players

1. Create an Actor of type **Character** and give the player ownership.
2. Click the **wand** next to the name. It generates a complete character: sentence, tags
   for every life stage up to the current one (Adult by default), four items, a personal
   quest (arc), appearance and name. No spells: whoever wants to cast adds them.
3. Each sentence field has a **die** that rerolls just that field. On the **Tags**, **Life
   stages**, **Inventory** and **Quests** tabs, every generated row has the same die.
   Clicking the wand again redoes everything (it asks first).
4. Ask the player to **edit what they do not like**: rename tags, change the specialty,
   write the biography. The sheet is a starting point, not a cage.
5. **Tiers and tallies**: on the Tags tab, the pips set the tier (T1 to T4) and the boxes are
   tallies. Five tallies raise a tier; five at tier 4 mark the tag as mastered.
6. **MAI** (Magical Aptitude Index): "Base MAI" on the Main tab (0 for non-magical
   characters; 3 is a fair start for magical species or types) plus 1 per magical sentence
   tag. Tags whose name looks magical (mage, arcane, witch…) come pre-flagged; for others,
   open the tag and tick "Magical".
7. **Wealth** starts at 3 ("Comfortable"). The − and + buttons in the header adjust it.

Tools: the **Life stages** tab shows what each stage granted and lets you roll more
backgrounds, skills, flaws or occupations per stage. **Party overview** lists every
player character in one table (sentence, wounds, wealth, MAI, loadout).

## 4. Rolling tasks

Click **Roll** in the sheet header, or the icon of any tag or item. In the dialog:

- **Task level** comes from the scene. Change it if this particular task is easier or harder.
- **Roll type**: Task is the default; the others (approaching an NPC, navigation, tracking,
  harvesting, crafting…) only change the outcome text on the chat card.
- Tick the **tags** that ease (down arrow) or hinder (up arrow). Flaws default to hinder.
- Tick **gear** as assets (at most two count).
- The system enforces the **tag threshold** by level (2 up to level 3, 3 up to 6, 4 up to 8,
  5 above) and shows what was ignored. Hindrances have no cap.
- The chat card shows the d20, the outcome band, the tags used and any tallies gained.

**Oracle** (Sparks window, Oracle tab): a question with likelihood 1 to 10, or a d6 yes/no.
Ideal when no GM knows the answer.

## 5. Wounds

Four tracks: **Strain** (5), **Lingering Trauma** (3), **Debilitating Injury** (2),
**Lasting Scar** (3). A full track overflows into the next. Three scars end the career:
retire or die.

- On the sheet, click boxes to mark or clear. The **+** beside a track applies a wound with
  overflow and generates a **wound sentence** (what it hinders).
- The header shows severity (Unscathed, Strained, Traumatized, Injured, Scarred) and the
  worst active wound. Health Estimate shows the same when hovering a token.
- **Rest** (Wounds tab): a safe zone heals all strain, or 1 trauma, or downgrades 1 injury to
  trauma. Field and professional treatment are ordinary rolls (level 5 and 3).
- **Roll injury**: one click resolves the wound of a confrontation without the combat flow.
  Use it when the scene calls for speed.

## 6. Combat

The SRD describes five phases, each a roll: **Opening, Maneuver, Attack, Counter,
Resolution**. The **Combat flow** window tracks them per participant.

- Add selected tokens or the combatants from the tracker. Set the opponent level (or select
  the enemy token and click the crosshair).
- **Any phase can be rolled in any order**, and rolled again. Opening feeds Maneuver;
  Maneuver feeds Attack and Counter; those two feed Resolution. The accumulated modifier and
  resulting DC show on each phase.
- Need speed? Jump straight to **Resolution** or use **Roll injury**. A full five-roll combat
  is for epic moments, not every skirmish.
- Equipped armor automatically eases the Counter phase (light 1, medium 2, heavy 3).
- Resolution: Fail, and… = Scar; Fail, but… = Injury; Success, but… = Trauma; Success =
  Strain; Success, and… = unscathed. **Apply wound** marks the track and generates the
  sentence.
- The flow state is **shared**: every GM and player sees the same panel.

## 7. Spells

**Spells** tab → **+ Spell**. The builder follows the SRD: pick a **base** (Order, Spirit,
Void, Chaos), **aspects** and **types** (more than one aspect or type requires Chaos),
**scope** (PM), **artifact** (ritual, encoded, channeled, manifestation) and **trigger**.
Points, level and DC are computed live. Sparks has a random **Spell** generator.

When **casting** (d20 icon) the system applies the MAI check (a spell at or above your MAI
hinders by 1 to 3 steps), the artifact modifier, overpowered states and blood magic.
"Fail, and…" offers a **Roll mishap** button.

## 8. Quests and arcs

**Quests** tab. Each quest has **Plan**, **Location** and **Countdown** tallies. Completing
Plan or Location reduces the Countdown by 1. The resolution roll (d20 icon) is eased by a
complete Plan and hindered by each missing mark. Tick "Character arc" for the personal
quest; resolving an arc earns a new tag. The GM decides when a quest starts: when the outcome
would change the character or the situation.

## 9. NPCs, creatures and trade

- Create an **NPC / Creature** actor. Tick **Creature** for monsters (disposition, type,
  motivation, attack, special ability) or leave it off for people (descriptor, species, type,
  motivation, wants, secret).
- The **wand** in the header generates the whole sentence with Sparks. Level comes from the
  scene.
- **Hidden from players**: strength, weakness and secret stay hidden until you click the eye,
  or until the players gather 5 **insights** (boxes beside each).
- **Barter**: button on the NPC's Main tab. Pick the buyer; buying below your Wealth is free,
  at or above it needs a Wealth check (level 3 + the difference) and, on success, the player
  chooses to lose 1 Wealth or become **In debt**. Selling works the other way round. No Item
  Piles needed; if you do use Item Piles, tick "Merchant".
- **Coins** (optional, system setting "Coins mode"): coins are tallies toward the next
  Wealth level. 10 coins take you from 0 to 1, 100 from 1 to 2, 1000 from 2 to 3. Once you
  have enough the level climbs by itself; the down arrow in the header **cashes out** one
  level into coins to spend. Items cost 10^cost coins (cost 2 = 100). Item Piles uses coins
  as the money of piles and shops.
- NPC tokens are unlinked by default: tags added to the world actor after the token was
  placed are picked up automatically by the roll dialog.

## 10. Relations and talking to NPCs

- The **Relations** tab lists the factions, people and places the character knows. Drag an
  NPC actor, a Faction actor, an Augur Nexus journal or any journal entry onto the sheet to
  add it. Clicking an Augur relation opens its Nexus dossier. Each row keeps the SRD **disposition** (Hostile to Devoted) and relationship
  tallies; five tallies move the disposition one step.
- **Interact** (button on a relation row or on the NPC sheet) runs an SRD conversation: the
  NPC's **Drift** attitude is rolled once per scene (2d6), then you pick an **approach**
  pathway and a question. The disposition modifier is applied to the task roll and the
  outcome band writes its consequence back to the relation (tally, disposition step, or a
  favor owed).
- Any chat card has a **Log to journal** button that appends it to the "Sparks" journal, so
  a conversation's outcomes stay with the campaign notes.

## 11. Downtime

- Open the **Downtime** tracker from the token controls, the Wounds tab or the macro. It is
  shared: everyone sees the same night. Add the characters once; each gets **4 points** a
  night.
- Each activity button spends one hour and applies the SRD effect: **sleep** grants
  [Refreshed] (and the rest healing in a safe zone), **research / study / workout /
  meditation** put tallies on tags and quests, **socializing** tallies a relationship,
  **dinner / drinking** grant [Well fed] / [Liquid Courage] with [Hangover] and [Sore
  Muscles] as the price, **gambling** plays against the wealth tally, **watch** feeds the
  travel encounter checks, **crafting / repair** open the Workshop.
- Next-day tags fade when you press **New day**, which also refills everyone's points. Tick
  **Safe zone** when the party sleeps somewhere safe.

## 12. Travel

- Open **Travel** from the token controls or the macro. Move the party on the map yourself
  (Augur Hexlands hexes, a drawn map, or nothing at all); the tracker does not count
  movement.
- When they stand on a new hex, press **Explore hex**: level (from the hex they left),
  feature, landmark and event come from the Sparks tables. Terrain is whatever the map
  shows. Each result has its own **reroll** die, so anyone can fish for a better idea. **Post to chat** shares the
  hex with the players; **Set as scene level** copies its level to the current scene.
- **Wilderness / urban / dungeon** only pick the tables: urban rolls districts' features,
  dungeon rolls the room's size, exits and contents instead.
- **Rest** rolls the SRD 2d6 encounter checks, one per party round minus the characters who
  kept watch tonight.

## 13. Crafting: the Workshop

- Open the **Workshop** from the Inventory tab, the token controls, the macro or the
  Downtime crafting / repair hours. One window per character, four tabs.
- **Harvest**: choose the source level, the resource type (d8) and the rarity (d4). Success
  creates a resource item; the band moves its level up or down.
- **Craft**: pick a base material from the inventory and, optionally, a magical component.
  The task is (level + rarity) x 3. Success asks for the item sentence (prefilled from the
  Sparks gear tables, the material named after the base) and creates Level 1 gear at Cost 3
  (Level 2 with a rare or legendary component), consuming the materials.
- **Augment / Repair**: add a tag to an item (+1 level, +2 with rare or legendary material),
  clear the **broken** flag, or apply a **salvaged property** as a Level 5 task. An item
  takes at most 9 augmentations.
- **Salvage**: destroy a magical item to keep one of its properties (two on a Success-and)
  as a salvaged resource.
- Every further attempt on the same target is hindered by 2, shown in the task line; the
  reset arrow clears it when the source changes. Outcomes are appended to the roll card.

## 14. Factions

- Create a **Faction** actor. The sentence ("a [descriptor] [organization] that [function]
  and [goal]; despite their reputation, they [secret]") comes from the **wand** or from an
  Augur Nexus faction journal (**Import** in the header, or drop the journal on the sheet):
  type and disposition fill the organization and descriptor, the Purpose, The World and
  Authority tenets fill function, goal and secret, and drive, action, theme and focus become
  **tags**. Drop an Augur location, scene or site page on the sheet to set the
  **headquarters**; drop another faction to add a **rival**. Goal, secret and headquarters
  stay hidden until you click the eye.
- The **phase timer**: seven phases from Shadows to End. Each **Insight** the players gain
  marks a tally; five complete the phase and post a card (whispered to the GMs until the
  goal is known). Once the players know the goal the **countdown** of 10 runs; when it fills
  first the faction is thwarted and its tally resets.
- **Rivals**: an insight into faction A also advances each rival's countdown, and when A
  completes a phase each rival's tally is sabotaged to zero.
- The **Factions** overview (token controls or macro) lists every faction with Insight and
  Countdown buttons, a **Time passes** tick that marks every faction, and the Augur journals
  still to import. Dropping a faction on a character sheet adds it to their Relations.

## 15. Sparks: the improvisation engine

**Sparks** button in the token controls. Three tabs:

- **Generators**: NPC, species, type, appearance, creature, armor, item, weapon, trap,
  consumable, resource, scene, location, dungeon, lair, room, quest, faction, insight,
  spell, wound. Pick the **theme** (fantasy, modern, monster hunter). Each result has
  buttons: post to chat, copy, **create actor**, **create item** (goes to the sheet currently
  open) or **create journal entry** (folder "Sparks").
- **Tables**: more than 550 tables to roll one at a time. **Import as RollTables** copies them
  into the world in subfolders; any RollTable with the same name as a table replaces the
  original. That is how you customize the content for your setting.
- **Oracle**: yes/no questions with likelihood.

Tip: generate a **scene** at the start of every session and a **faction** whenever the
players ask "who runs this place?".

## 16. Sparks with Augur

Augur is system-agnostic; the only part that does not work is the shop (Fantasy/Sci-Fi),
which only knows D&D 5e, PF2e, Shadowdark and OSE. Use the system's Barter instead.

Suggested workflow for building the world together:

1. **Hexlands** generates the region. For each important hex, generate a **Location** or
   **Dungeon** in Sparks and create the journal entry; link it to the Site in **Nexus**.
2. **Instant Dungeons** generates the map; Sparks generates **rooms**, **lairs** and
   **traps** to populate it and the **creature** generator for the boss. Generated creatures
   take the scene level.
3. **Augur Fantasy** handles settlements and factions on the map; the Sparks **faction**
   generator supplies the secret and the goal. Keep everything in the "Sparks" journal folder
   and link it in Nexus.
4. For each relevant NPC, generate with Sparks, create the actor and drag it into Nexus as a
   Person. Secrets stay hidden until discovered.
5. In the other direction, an **Augur-made Person** linked to an actor shows an import button
   in the sheet header: the sentence comes from descriptor, ancestry, role and drive; traits
   and beliefs become tags; portrait and pronoun are copied.

## 17. Playing with several GMs

The system does not enforce who "the" GM is: any Gamemaster user can do everything. What
works well in practice:

- **One narrating GM per scene**, agreed before starting. They control the scene level and
  the secrets. The other GMs act as **players or supporting cast** in that scene.
- **One support GM** runs Sparks: generates NPCs, rooms and complications when the narrator
  asks, and creates the journal entries. It keeps the narrator from stopping to roll tables.
- **Handing over**: when the narrator changes, the outgoing one leaves the scene with its
  level set, the relevant NPCs on the scene and a paragraph in the "Sparks" journal folder
  with the state. The next one reads and continues, keeping secrets already revealed (eye
  open on the NPC sheet).
- **Disputed calls** between GMs: use the **Oracle** and accept the result. Players watching
  the d20 land settles the argument.
- **Shared state**: combat flow, scene level, revealed secrets and imported tables apply to
  everyone. There is no "my version" of the tables: whoever edits a RollTable edits it for
  the whole table.
- **Conventions**: a prefix on test actors ("ZZ"), one journal folder per region, scenes with
  the level in the name ("Ruins of Kael (L5)"). Agree whether tallies may be granted outside
  a natural 1/20 (the SRD says no).
- **Play by post**: each GM resolves the players' rolls in their time window; the chat card
  is the record. Keep automatic tallies on and ask players to roll themselves, with the
  title filled in ("I climb the wall").

## 18. Shortcuts and macros

- On first load the system creates the **Tag & Tally** macro folder with one macro per tool:
  drag them to the hotbar.
- Drag a tag, item, spell or quest from a sheet to the **hotbar**: the macro opens the right
  roll.
- To write your own, the prefix is always `game.tagandtally.macros.`: `rollTask()`,
  `quickRoll(5)`, `oracle(7, "Are there guards?")`, `openSparks()`, `openCombatFlow()`,
  `openParty()`, `openBarter()`, `openDowntime()`, `openTravel()`, `openWorkshop("craft")`,
  `openFactions()`, `generateNPC()`, `generateCreature()`,
  `generateJournal("dungeon")`, `randomCharacter()`, `importAugur()`,
  `importSparkTables("creature")`.

## 19. Session checklist

1. Scene level set.
2. Narrator chosen; support GM with Sparks open.
3. The scene's NPCs in the right folder, secrets hidden.
4. Combat flow cleared (trash icon) before the first fight.
5. Factions ticked (**Time passes**) if the day moved on.
6. At the end: rest applied, Downtime night played, quests updated, handover paragraph in
   the journal.

Have a good session.
