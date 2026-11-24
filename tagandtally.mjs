/**
 * Tag & Tally for Foundry VTT
 * An unofficial game system for the Tag & Tally RPG (https://tagandtally.quest).
 * Licensed CC BY-SA 4.0. See README.md for attribution.
 */
import { TAGANDTALLY, SYSTEM_ID } from "./module/config.mjs";
import * as models from "./module/data/_module.mjs";
import TagAndTallyActor from "./module/documents/actor.mjs";
import TagAndTallyItem from "./module/documents/item.mjs";
import CharacterSheet from "./module/sheets/character-sheet.mjs";
import NpcSheet from "./module/sheets/npc-sheet.mjs";
import TagAndTallyItemSheet from "./module/sheets/item-sheet.mjs";
import { registerSettings } from "./module/settings.mjs";
import { registerMigrationSetting, migrateWorld } from "./module/migration.mjs";
import { registerHandlebarsHelpers, preloadTemplates } from "./module/handlebars.mjs";
import { registerChatHooks } from "./module/rolls/chat.mjs";
import { InteractDialog, rollDrift, rollInteraction, registerInteractions } from "./module/interactions.mjs";
import { registerJournalLog, logMessageToJournal } from "./module/journal-log.mjs";
import * as relations from "./module/relations.mjs";
import { resolveRoll, rollOracle, rollYesNo, bandFor, computeEffectiveLevel, sceneLevel } from "./module/rolls/resolution.mjs";
import { TaskRollDialog } from "./module/rolls/task-roll-dialog.mjs";
import { CombatFlow, registerCombatFlowSocket } from "./module/combat/combat-flow.mjs";
import { WorldState } from "./module/world-state.mjs";
import { GameLoopApp, registerGameLoop, rollScene } from "./module/game-loop.mjs";
import { DowntimeApp, registerDowntime, grantDayTag, reduceDayTag, applyWealthTally } from "./module/downtime.mjs";
import { TravelApp, registerTravel, rollHex, rollHexLevel, rollDiscovery } from "./module/travel.mjs";
import { WorkshopApp, registerWorkshop } from "./module/workshop.mjs";
import * as factions from "./module/factions.mjs";
import FactionSheet from "./module/sheets/faction-sheet.mjs";
import { sparkTables } from "./module/sparks/tables.mjs";
import { generate, SparkGenerator, loadGeneratorDefs } from "./module/sparks/engine.mjs";
import { SparksApp } from "./module/sparks/sparks-app.mjs";
import * as create from "./module/sparks/create.mjs";
import { computeSpell, maiCheck } from "./module/spells/spell-calc.mjs";
import { registerBarBrawl, resetBarBrawlDefaults } from "./module/integrations/bar-brawl.mjs";
import { registerItemPiles } from "./module/integrations/item-piles.mjs";
import { registerSceneLevel } from "./module/integrations/scene-level.mjs";
import { PartyOverview, registerPartyOverview } from "./module/integrations/party.mjs";
import { BarterApp } from "./module/integrations/barter.mjs";
import { importAugurPerson, hasAugurPerson, findAugurPerson, mapAugurPerson } from "./module/integrations/augur.mjs";
import { createDefaultMacros } from "./module/macros.mjs";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initializing Tag & Tally`);
  CONFIG.TAGANDTALLY = TAGANDTALLY;

  CONFIG.Actor.documentClass = TagAndTallyActor;
  CONFIG.Item.documentClass = TagAndTallyItem;
  CONFIG.Actor.dataModels = { character: models.CharacterData, npc: models.NpcData, faction: models.FactionData };
  CONFIG.Item.dataModels = { tag: models.TagData, gear: models.GearData, spell: models.SpellData, quest: models.QuestData, wound: models.WoundData };

  // Token bar attributes shown in the token config.
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["wounds.vitality", "wounds.strain", "wounds.lingeringTrauma", "wounds.debilitatingInjury", "wounds.lastingScar", "wounds.total"], value: ["wounds.severity", "wealth.value", "mai.total"] },
    npc: { bar: ["wounds.vitality", "wounds.strain", "wounds.lingeringTrauma", "wounds.debilitatingInjury", "wounds.lastingScar", "wounds.total"], value: ["wounds.severity", "level", "wealth.value"] },
    faction: { bar: [], value: ["phase", "tally", "countdown"] }
  };

  // Initiative: creatures act by level, characters roll a d20.
  CONFIG.Combat.initiative = { formula: "1d20", decimals: 0 };

  const { Actors, Items } = foundry.documents.collections;
  Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  Actors.registerSheet(SYSTEM_ID, CharacterSheet, { types: ["character"], makeDefault: true, label: "TAGANDTALLY.Sheet.Character" });
  Actors.registerSheet(SYSTEM_ID, NpcSheet, { types: ["npc"], makeDefault: true, label: "TAGANDTALLY.Sheet.Npc" });
  Actors.registerSheet(SYSTEM_ID, FactionSheet, { types: ["faction"], makeDefault: true, label: "TAGANDTALLY.Sheet.Faction" });
  Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  Items.registerSheet(SYSTEM_ID, TagAndTallyItemSheet, { makeDefault: true, label: "TAGANDTALLY.Sheet.Item" });

  registerSettings();
  registerMigrationSetting();
  CombatFlow.registerSetting();
  DowntimeApp.registerSetting();
  GameLoopApp.registerSetting();
  TravelApp.registerSetting();
  registerHandlebarsHelpers();
  registerChatHooks();
  registerJournalLog();
  registerInteractions();
  registerDowntime();
  registerGameLoop();
  registerTravel();
  registerWorkshop();
  factions.registerFactions();
  registerBarBrawl();
  registerItemPiles();
  registerSceneLevel();
  registerPartyOverview();

  // Public API, mirroring the Cypher system's game.<system> macro surface.
  game.tagandtally = {
    config: TAGANDTALLY,
    documents: { TagAndTallyActor, TagAndTallyItem },
    sheets: { CharacterSheet, NpcSheet, TagAndTallyItemSheet },
    apps: { TaskRollDialog, GameLoopApp, CombatFlow, SparksApp, PartyOverview, BarterApp, InteractDialog, DowntimeApp, TravelApp, WorkshopApp, FactionsApp: factions.FactionsApp },
    rolls: { resolveRoll, rollOracle, rollYesNo, bandFor, computeEffectiveLevel, sceneLevel },
    sparks: { tables: sparkTables, generate, SparkGenerator, loadGeneratorDefs, ...create },
    spells: { computeSpell, maiCheck },
    augur: { importAugurPerson, hasAugurPerson, findAugurPerson, mapAugurPerson },
    macros: {
      /** Open the task roll dialog for the selected token's actor (or the user's character). */
      rollTask: (options = {}) => {
        const actor = canvas.tokens?.controlled[0]?.actor ?? game.user.character;
        if (!actor) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Chat.NoTarget"));
        return actor.rollTask(options);
      },
      quickRoll: (level, options = {}) => resolveRoll({ actor: canvas.tokens?.controlled[0]?.actor ?? game.user.character, level: level ?? sceneLevel(), ...options }),
      oracle: (level = 5, question = "") => rollOracle({ level, question }),
      yesNo: (question = "") => rollYesNo({ question }),
      openSparks: () => SparksApp.open({ actor: canvas.tokens?.controlled[0]?.actor ?? game.user.character }),
      openCombatFlow: () => CombatFlow.open({ actors: canvas.tokens?.controlled.map((t) => t.actor).filter(Boolean) ?? [] }),
      openParty: () => PartyOverview.open(),
      openDowntime: () => DowntimeApp.open(),
      openGameLoop: () => GameLoopApp.open(),
      openTravel: () => TravelApp.open(),
      /** Crafting workshop for the selected token's actor or your character. */
      openWorkshop: (tab) => WorkshopApp.open({ tab }),
      openFactions: () => factions.FactionsApp.open(),
      /** Barter with the selected NPC token (buyer = your character or another selected character token). */
      openBarter: () => BarterApp.open({ merchant: canvas.tokens?.controlled.map((t) => t.actor).find((a) => a?.type === "npc") }),
      /** Build a complete random character on the selected token's actor or your character. */
      importAugur: () => importAugurPerson(canvas.tokens?.controlled[0]?.actor ?? game.user.character),
      createDefaultMacros: () => createDefaultMacros({ force: true }),
      randomCharacter: (options) => import("./module/sparks/character-builder.mjs").then((m) => m.buildRandomCharacter(canvas.tokens?.controlled[0]?.actor ?? game.user.character, options)),
      rollInjury: (level) => CombatFlow.rollInjury(canvas.tokens?.controlled[0]?.actor ?? game.user.character, { level }),
      resetBarBrawlDefaults,
      importSparkTables: (group) => sparkTables.importToWorld({ group }),
      generateNPC: (options) => create.createActorFromSpark("npc", options),
      generateCreature: (options) => create.createActorFromSpark("creature", options),
      generateJournal: (generatorId, options) => create.createJournalFromSpark(generatorId, options),
      logToJournal: (message) => logMessageToJournal(message ?? game.messages.contents.at(-1)),
      /** Interact with the selected NPC token as your character (or a selected character token). */
      interact: () => {
        const target = canvas.tokens?.controlled.map((t) => t.actor).find((a) => a?.type === "npc");
        if (!target) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Chat.NoTarget"));
        return InteractDialog.open({ target });
      }
    },
    interactions: { InteractDialog, rollDrift, rollInteraction },
    loop: { GameLoopApp, rollScene, advance: () => GameLoopApp.open() },
    downtime: { DowntimeApp, grantDayTag, reduceDayTag, applyWealthTally, newDay: () => DowntimeApp.newDay() },
    travel: { TravelApp, rollHex, rollHexLevel, rollDiscovery, rest: () => TravelApp.rest() },
    crafting: { WorkshopApp },
    factions,
    relations,
    journal: { logMessageToJournal }
  };

  return preloadTemplates();
});

let sparksLoading = Promise.resolve();
Hooks.once("setup", () => {
  sparksLoading = Promise.all([sparkTables.load(), loadGeneratorDefs()]).catch((err) => console.error(`${SYSTEM_ID} | Sparks data failed to load`, err));
  game.tagandtally.sparks.ready = sparksLoading;
});

Hooks.once("ready", async () => {
  await sparksLoading;
  registerCombatFlowSocket();
  WorldState.registerSocket();
  await migrateWorld();
  const created = await createDefaultMacros();
  if (created) ui.notifications.info(game.i18n.format("TAGANDTALLY.Macros.Created", { count: created }));
  // Scene controls: Sparks and Combat Flow buttons on the token layer.
  if (!game.settings.get(SYSTEM_ID, "welcomeShown") && game.user.isGM) {
    await ChatMessage.create({
      content: `<div class="tagandtally chat-card welcome"><h3>${game.i18n.localize("TAGANDTALLY.Welcome.Title")}</h3>${game.i18n.localize("TAGANDTALLY.Welcome.Body")}</div>`,
      whisper: game.users.filter((u) => u.isGM).map((u) => u.id)
    });
    await game.settings.set(SYSTEM_ID, "welcomeShown", true);
  }
});

/* Scene control buttons (v13+ SceneControls use a record of tools). */
Hooks.on("getSceneControlButtons", (controls) => {
  const tokens = controls.tokens;
  if (!tokens?.tools) return;
  tokens.tools.ttSparks = {
    name: "ttSparks", title: "TAGANDTALLY.Sparks.Title", icon: "fa-solid fa-wand-magic-sparkles", button: true, order: 90,
    onChange: () => SparksApp.open({ actor: canvas.tokens?.controlled[0]?.actor })
  };
  tokens.tools.ttCombat = {
    name: "ttCombat", title: "TAGANDTALLY.Combat.Title", icon: "fa-solid fa-swords", button: true, order: 91,
    onChange: () => CombatFlow.open({ actors: canvas.tokens?.controlled.map((t) => t.actor).filter(Boolean) ?? [] })
  };
  tokens.tools.ttParty = {
    name: "ttParty", title: "TAGANDTALLY.Party.Title", icon: "fa-solid fa-people-group", button: true, order: 92,
    onChange: () => PartyOverview.open()
  };
  tokens.tools.ttTravel = {
    name: "ttTravel", title: "TAGANDTALLY.Travel.Title", icon: "fa-solid fa-route", button: true, order: 93,
    onChange: () => TravelApp.open()
  };
  tokens.tools.ttWorkshop = {
    name: "ttWorkshop", title: "TAGANDTALLY.Workshop.Title", icon: "fa-solid fa-hammer", button: true, order: 95,
    onChange: () => WorkshopApp.open()
  };
  tokens.tools.ttGameLoop = {
    name: "ttGameLoop", title: "TAGANDTALLY.Loop.Title", icon: "fa-solid fa-arrows-spin", button: true, order: 90,
    onChange: () => GameLoopApp.open()
  };
  tokens.tools.ttDowntime = {
    name: "ttDowntime", title: "TAGANDTALLY.Downtime.Title", icon: "fa-solid fa-bed", button: true, order: 94,
    onChange: () => DowntimeApp.open()
  };
});

/* Hotbar: dropping an item creates a macro that uses it. */
Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type !== "Item") return;
  (async () => {
    const item = await fromUuid(data.uuid);
    if (!item?.actor) return;
    const command = `const item = await fromUuid("${item.uuid}");\nif (item) item.use();`;
    let macro = game.macros.find((m) => m.name === item.name && m.command === command);
    macro ??= await Macro.create({ name: item.name, type: "script", img: item.img, command, flags: { [SYSTEM_ID]: { itemMacro: true } } });
    game.user.assignHotbarMacro(macro, slot);
  })();
  return false;
});

/* Creatures use their level for initiative; characters roll. */
Hooks.on("preCreateCombatant", (combatant) => {
  const actor = combatant.actor;
  if (actor?.type === "npc" && actor.system.creature) combatant.updateSource({ initiative: actor.system.level });
});

/* Items dropped on an actor from compendia/world: nothing special needed; sheets handle sorting. */

/* Health Estimate and other modules read the primary bar; keep vitality in sync is derived, nothing to do. */

/* Expose for debugging */
Hooks.once("ready", () => console.log(`${SYSTEM_ID} | Ready. ${sparkTables.tables.size} Spark tables loaded.`));
