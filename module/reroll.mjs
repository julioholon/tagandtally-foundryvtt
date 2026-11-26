import { SYSTEM_ID } from "./config.mjs";

const theme = () => game.settings.get(SYSTEM_ID, "sparkTheme") ?? "fantasy";
const plain = (s) => String(s ?? "").replace(/[`*\[\]]/g, "").trim();

/** The faction sentence fields of a generated faction (values keyed by table). */
export function factionSentence(v) {
  return {
    descriptor: plain(v["faction-descriptor"]),
    organizationType: plain(v["faction-organization-type"]),
    coreFunction: plain(v["faction-core-function"]),
    goal: plain(`${v["faction-goal-verb"] ?? ""} ${v["faction-goal-noun"] ?? ""}`).toLowerCase(),
    secret: plain(`${v["faction-secret-verb"] ?? ""} ${v["faction-secret-noun"] ?? ""}`).toLowerCase()
  };
}

/**
 * Reroll one field of an actor from the Sparks generator it came from: an NPC / creature sentence
 * field, a faction sentence field, or a character's appearance field. A creature's attack, ability,
 * strength and weakness are rolled for its current type and damage type.
 * @param {Actor} actor
 * @param {string} path  e.g. "system.sentence.attack" or "system.appearance.hair"
 */
export async function rerollField(actor, path) {
  const m = String(path).match(/^system\.(sentence|appearance)\.(\w+)$/);
  if (!m) return null;
  const [, group, key] = m;
  const { generate } = await import("./sparks/engine.mjs");
  let value;
  if (group === "appearance") {
    const { appearanceUpdate } = await import("./sparks/create.mjs");
    value = appearanceUpdate(await generate("appearance", { theme: theme() }))[path];
  } else if (actor.type === "faction") {
    value = factionSentence((await generate("faction", { theme: theme() })).values ?? {})[key];
  } else if (actor.type === "npc") {
    const { npcDataFromGeneration } = await import("./sparks/create.mjs");
    const creature = Boolean(actor.system.creature);
    const s = actor.system.sentence;
    const values = creature ? { "creature-type": plain(s.type), "damage-type": plain(s.damageType) } : {};
    const r = await generate(creature ? "creature" : "npc", { theme: theme(), values });
    value = npcDataFromGeneration(r, { creature }).system.sentence[key];
  }
  if (value === undefined || value === "") return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Reroll.Nothing"));
  return actor.update({ [path]: value });
}
