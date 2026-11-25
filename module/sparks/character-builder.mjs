import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";
import { generate, SparkGenerator } from "./engine.mjs";
import { sparkTables } from "./tables.mjs";
import { createItemFromSpark, generateAppearanceFor, itemDataFromGeneration } from "./create.mjs";

const plain = (v) => String(v ?? "").replace(/\*\*/g, "").replace(/^\[|\]$/g, "").trim();
function theme() { return game.settings.get(SYSTEM_ID, "sparkTheme") ?? "fantasy"; }

/** Table used for each sentence slot (theme-aware logical names). */
export const SLOT_TABLES = {
  descriptor: "descriptor",
  species: "species",
  type: "type-[type-option]",
  specialty: "does-something"
};

/**
 * What each life stage grants, in creation order. Each entry is a tag spec:
 * tagType, table (logical Spark name), and an optional tier.
 * Based on the SRD life-stage tables; "additional" tags alternate skills and traits.
 */
export const LIFE_STAGE_PLAN = {
  childhood: [
    { tagType: "background", table: "life-background-childhood" },
    { tagType: "flaw", table: "life-flaw" },
    { tagType: "trait", table: "life-trait" },
    { tagType: "skill", table: "life-skill" }
  ],
  adolescence: [
    { tagType: "background", table: "life-background-adolescence" },
    { tagType: "flaw", table: "life-flaw" },
    { tagType: "skill", table: "life-skill", tier: 2 },
    { tagType: "trait", table: "life-trait" }
  ],
  youngAdult: [
    { tagType: "background", table: "life-background-young-adult" },
    { tagType: "occupation", table: "life-occupation" },
    { tagType: "flaw", table: "life-flaw" },
    { tagType: "skill", table: "life-skill", tier: 3 },
    { tagType: "skill", table: "life-skill", tier: 2 }
  ],
  adult: [
    { tagType: "occupation", table: "life-occupation" },
    { tagType: "flaw", table: "life-flaw" },
    { tagType: "skill", table: "life-skill", tier: 2 },
    { tagType: "skill", table: "life-skill" }
  ],
  elder: [
    { tagType: "flaw", table: "life-flaw" },
    { tagType: "experience", table: "life-experience" }
  ]
};

export const LIFE_STAGE_ORDER = ["childhood", "adolescence", "youngAdult", "adult", "elder"];
const AGE_RANGES = { childhood: [6, 10], adolescence: [11, 18], youngAdult: [19, 25], adult: [26, 50], elder: [51, 75] };

/** Roll a logical table (theme-aware) and return plain text, avoiding values already used. */
async function rollUnique(logical, used, t) {
  const engine = new SparkGenerator({ theme: t });
  for (let i = 0; i < 6; i++) {
    const text = plain(await engine.render(`{${logical}}`));
    if (text && !text.startsWith("[missing") && !used.has(text.toLowerCase())) { used.add(text.toLowerCase()); return text; }
  }
  return plain(await engine.render(`{${logical}}`));
}

/**
 * Replace the actor's content with a complete random character.
 * @param {Actor} actor
 * @param {object} o  lifeStage (default adult), theme, keepName
 */
export async function buildRandomCharacter(actor, { lifeStage = "adult", theme: t = theme(), keepName = false, itemCount = 4 } = {}) {
  await sparkTables.load();
  const used = new Set();
  const stageIndex = LIFE_STAGE_ORDER.indexOf(lifeStage);
  const stages = LIFE_STAGE_ORDER.slice(0, stageIndex + 1);

  // Wipe previous content, but keep quests the character was given (grand quests, first quest,
  // Augur quests): only the previous generated character arc goes.
  const keep = (i) => i.type === "quest" && !(i.system.isArc && i.system.source === "quest");
  await actor.deleteEmbeddedDocuments("Item", actor.items.filter((i) => !keep(i)).map((i) => i.id));

  // Sentence.
  const sentence = {};
  for (const [slot, table] of Object.entries(SLOT_TABLES)) sentence[slot] = await rollUnique(table, used, t);
  const umbrella = Object.entries(sentence).map(([slot, name]) => ({
    name, type: "tag",
    system: { tagType: slot, category: "umbrella", source: SLOT_TABLES[slot], magical: /\b(mag|arcan|wizard|sorcer|witch|warlock|druid|cleric|priest|mystic|shaman|spell)/i.test(name) }
  }));

  // Life stages.
  const tags = [];
  for (const stage of stages) {
    for (const spec of LIFE_STAGE_PLAN[stage]) {
      const name = await rollUnique(spec.table, used, t);
      tags.push({ name, type: "tag", system: { tagType: spec.tagType, lifeStage: stage, source: spec.table, tier: spec.tier ?? 1, hinders: TAGANDTALLY.hinderingTagTypes.includes(spec.tagType) } });
    }
  }

  // Gear: weapon, armor, item, consumable (levels 1d6 by the generator).
  const gearIds = ["weapon", "armor", "item", "consumable"].slice(0, itemCount);
  const gear = [];
  for (const id of gearIds) {
    const r = await generate(id, { theme: t });
    const data = itemDataFromGeneration(r, r.generator);
    data.system.source = id;
    gear.push(data);
  }

  // Personal quest (character arc).
  const q = await generate("quest", { theme: t });
  const quest = itemDataFromGeneration(q, q.generator);
  quest.name = `${game.i18n.localize("TAGANDTALLY.Quest.Arc")}: ${quest.name}`;
  quest.system.isArc = true;
  quest.system.source = "quest";

  const [min, max] = AGE_RANGES[lifeStage];
  const age = min + Math.floor(Math.random() * (max - min + 1));
  const update = {
    system: {
      sentence, lifeStage, age,
      wealth: { value: 3, inDebt: false, qualityOfLife: 0 },
      mai: { base: umbrella.some((u) => u.system.magical) ? 3 : 0 }
    }
  };
  if (!keepName) {
    const engine = new SparkGenerator({ theme: t });
    update.name = plain(await engine.render("{name-patterns|title}"));
  }
  await actor.update(update, { ttSentenceSync: false });
  await actor.createEmbeddedDocuments("Item", [...umbrella, ...tags, ...gear, quest]);
  await generateAppearanceFor(actor);
  return actor;
}

/** Reroll one sentence slot (updates the field; the umbrella tag is renamed by the sync). */
export async function rerollSlot(actor, slot) {
  const table = SLOT_TABLES[slot];
  if (!table) return;
  const used = new Set(Object.values(actor.system.sentence).map((v) => String(v).toLowerCase()));
  // The current value is in the set, so the reroll always changes it when the table has alternatives.
  const value = await rollUnique(table, used, theme());
  return actor.update({ [`system.sentence.${slot}`]: value });
}

/** Reroll a tag/gear/quest created by the builder, using its recorded source table. */
export async function rerollItem(item) {
  const source = item.system.source;
  if (!source) return item;
  const actor = item.actor;
  if (item.type === "tag") {
    const used = new Set(actor?.items.filter((i) => i.type === "tag").map((i) => i.name.toLowerCase()) ?? [item.name.toLowerCase()]);
    const name = await rollUnique(source, used, theme());
    await item.update({ name });
    // Umbrella tags also live in the sentence.
    if (actor && TAGANDTALLY.umbrellaTagTypes.includes(item.system.tagType)) await actor.update({ [`system.sentence.${item.system.tagType}`]: name }, { ttSentenceSync: false });
    return item;
  }
  if (item.type === "gear" || item.type === "quest") {
    const r = await generate(source, { theme: theme() });
    const data = itemDataFromGeneration(r, r.generator);
    delete data.type;
    data.system.source = source;
    if (item.type === "quest") { data.name = `${game.i18n.localize("TAGANDTALLY.Quest.Arc")}: ${data.name}`; data.system.isArc = item.system.isArc; }
    return item.update(data);
  }
  return item;
}

/** Add one random tag of a given spec to a life stage. */
export async function addRandomStageTag(actor, stage, tagType = "skill") {
  const spec = LIFE_STAGE_PLAN[stage]?.find((s) => s.tagType === tagType) ?? { tagType, table: tagType === "flaw" ? "life-flaw" : tagType === "occupation" ? "life-occupation" : tagType === "trait" ? "life-trait" : tagType === "background" ? `life-background-${stage === "youngAdult" ? "young-adult" : stage}` : "life-skill" };
  const used = new Set(actor.items.filter((i) => i.type === "tag").map((i) => i.name.toLowerCase()));
  const name = await rollUnique(spec.table, used, theme());
  return actor.createEmbeddedDocuments("Item", [{ name, type: "tag", system: { tagType: spec.tagType, lifeStage: stage, source: spec.table, tier: spec.tier ?? 1, hinders: TAGANDTALLY.hinderingTagTypes.includes(spec.tagType) } }]);
}
