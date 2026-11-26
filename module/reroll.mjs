import { SYSTEM_ID, TAGANDTALLY } from "./config.mjs";
import { sparkTables } from "./sparks/tables.mjs";

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
/** Roll a value a few times until it differs from the current one (short tables repeat often). */
async function freshValue(roll, current) {
  let value;
  for (let i = 0; i < 5; i++) {
    value = await roll();
    if (value && String(value).trim().toLowerCase() !== String(current ?? "").trim().toLowerCase()) return value;
  }
  return value;
}

async function drawPlain(table) {
  if (!sparkTables.has(table) && !sparkTables.worldOverride(table)) return "";
  return plain((await sparkTables.roll(table))?.value);
}

/** One rolled value for an actor field (see rerollField). */
async function actorFieldValue(actor, path, group, key) {
  const { generate } = await import("./sparks/engine.mjs");
  if (group === "appearance") {
    const { appearanceUpdate } = await import("./sparks/create.mjs");
    return appearanceUpdate(await generate("appearance", { theme: theme() }))[path];
  }
  if (actor.type === "faction") return factionSentence((await generate("faction", { theme: theme() })).values ?? {})[key];
  if (actor.type === "npc") {
    const { npcDataFromGeneration } = await import("./sparks/create.mjs");
    const creature = Boolean(actor.system.creature);
    const s = actor.system.sentence;
    const values = creature ? { "creature-type": plain(s.type), "damage-type": plain(s.damageType) } : {};
    const r = await generate(creature ? "creature" : "npc", { theme: theme(), values });
    return npcDataFromGeneration(r, { creature }).system.sentence[key];
  }
  return undefined;
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
  const value = await freshValue(() => actorFieldValue(actor, path, group, key), foundry.utils.getProperty(actor, path));
  if (value === undefined || value === "") return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Reroll.Nothing"));
  return actor.update({ [path]: value });
}

/** One rolled value for an item field (see rerollItemField). */
async function itemFieldValue(item, key) {
  const { generate, findGenerator } = await import("./sparks/engine.mjs");
  const { itemDataFromGeneration } = await import("./sparks/create.mjs");
  const s = item.system;
  if (item.type === "quest") {
    const tables = { goal: "inspiration-motivation", reward: "inspiration-benefit", consequence: "inspiration-complication" };
    if (tables[key]) return drawPlain(tables[key]);
    // The objective follows the quest's current type.
    const values = key === "objective" && s.questType ? { "quest-type": s.questType } : {};
    const r = await generate("quest", { theme: theme(), values });
    return itemDataFromGeneration(r, r.generator).system[key];
  }
  if (item.type === "gear") {
    await import("./sparks/engine.mjs").then((e) => e.loadGeneratorDefs());
    const id = findGenerator(s.gearType) ? s.gearType : "item";
    const r = await generate(id, { theme: theme() });
    return itemDataFromGeneration(r, r.generator).system[key];
  }
  if (item.type === "spell") {
    const r = await generate("spell", { theme: theme() });
    return itemDataFromGeneration(r, r.generator).system[key];
  }
  if (item.type === "wound") {
    const values = { "wound-injury-type": TAGANDTALLY.woundTrackSparkNames[s.injuryType] };
    const v = (await generate("wound", { theme: theme(), values })).values ?? {};
    return {
      descriptor: plain(v["wound-descriptor"]), mark: plain(v["wound-type-of-mark"]), bodyPart: plain(v["wound-body-part"]),
      damageType: plain(v["wound-damage"]), hinders: plain(Object.entries(v).find(([k]) => k.startsWith("wound-detriment-"))?.[1] ?? "")
    }[key];
  }
  return undefined;
}

/**
 * Reroll one tag-like field of an item from its Sparks tables: a quest's type, objective, goal,
 * reward or consequence; a gear's descriptor, material, subtype, special or damage type; a spell's
 * descriptor; a wound's descriptor, mark, body part, damage type or hindrance.
 * @param {Item} item
 * @param {string} path  e.g. "system.objective"
 */
export async function rerollItemField(item, path) {
  const key = String(path).replace(/^system\./, "");
  if (!/^\w+$/.test(key)) return null;
  const value = await freshValue(() => itemFieldValue(item, key), item.system[key]);
  if (value === undefined || value === "") return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Reroll.Nothing"));
  return item.update({ [path]: value });
}
