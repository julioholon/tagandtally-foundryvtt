import { SYSTEM_ID } from "./config.mjs";

/** Ready-made macros, created once in a "Tag & Tally" folder on first load. */
const MACROS = [
  { key: "RollTask", icon: "icons/svg/d20-highlight.svg", command: "game.tagandtally.macros.rollTask();" },
  { key: "Oracle", icon: "icons/svg/eye.svg", command: 'game.tagandtally.macros.oracle(5, "");' },
  { key: "Sparks", icon: "icons/svg/book.svg", command: "game.tagandtally.macros.openSparks();" },
  { key: "CombatFlow", icon: "icons/svg/combat.svg", command: "game.tagandtally.macros.openCombatFlow();" },
  { key: "RollInjury", icon: "icons/svg/blood.svg", command: "game.tagandtally.macros.rollInjury();" },
  { key: "Party", icon: "icons/svg/village.svg", command: "game.tagandtally.macros.openParty();" },
  { key: "Barter", icon: "icons/svg/coins.svg", command: "game.tagandtally.macros.openBarter();" },
  { key: "GenerateNPC", icon: "icons/svg/mystery-man.svg", command: "game.tagandtally.macros.generateNPC();" },
  { key: "GenerateCreature", icon: "icons/svg/pawprint.svg", command: "game.tagandtally.macros.generateCreature();" },
  { key: "RandomCharacter", icon: "icons/svg/upgrade.svg", command: "game.tagandtally.macros.randomCharacter();" },
  { key: "ImportAugur", icon: "icons/svg/direction.svg", command: "game.tagandtally.macros.importAugur();" }
];

export async function createDefaultMacros({ force = false } = {}) {
  if (!game.user.isGM) return 0;
  if (!force && game.settings.get(SYSTEM_ID, "macrosCreated")) return 0;
  const folderName = "Tag & Tally";
  let folder = game.folders.find((f) => f.type === "Macro" && f.name === folderName);
  folder ??= await Folder.create({ name: folderName, type: "Macro" });
  const data = MACROS.filter((m) => !game.macros.find((x) => x.folder?.id === folder.id && x.getFlag(SYSTEM_ID, "key") === m.key)).map((m) => ({
    name: game.i18n.localize(`TAGANDTALLY.Macros.${m.key}`),
    type: "script", img: m.icon, command: m.command, folder: folder.id,
    flags: { [SYSTEM_ID]: { key: m.key } }
  }));
  if (data.length) await Macro.createDocuments(data);
  await game.settings.set(SYSTEM_ID, "macrosCreated", true);
  return data.length;
}
