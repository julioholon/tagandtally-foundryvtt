import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";
import { generate, SparkGenerator } from "./engine.mjs";
import { sparkTables } from "./tables.mjs";

function theme() { return game.settings.get(SYSTEM_ID, "sparkTheme") ?? "fantasy"; }

/** Strip [brackets] and **bold** from a generated value. */
const plain = (v) => String(v ?? "").replace(/\*\*/g, "").replace(/^\[|\]$/g, "");

/* ------------------------------ Wounds ---------------------------------- */

/**
 * Generate a wound sentence and attach it to the actor as a wound item.
 * @param {Actor} actor
 * @param {object} o  injuryType (track key), damageType (optional Sparks damage name)
 */
export async function createWoundItemFromSpark(actor, { injuryType = "lingeringTrauma", damageType } = {}) {
  const values = { "wound-injury-type": TAGANDTALLY.woundTrackSparkNames[injuryType] };
  if (damageType) values["wound-damage"] = damageType;
  const r = await generate("wound", { theme: theme(), values });
  const v = r.values;
  const data = {
    name: `${plain(v["wound-descriptor"])} ${plain(v["wound-type-of-mark"])}`.trim() || game.i18n.localize("TAGANDTALLY.Wound.Wound"),
    type: "wound",
    system: {
      injuryType,
      damageType: plain(v["wound-damage"]),
      descriptor: plain(v["wound-descriptor"]),
      mark: plain(v["wound-type-of-mark"]),
      bodyPart: plain(v["wound-body-part"]),
      hinders: plain(Object.entries(v).find(([k]) => k.startsWith("wound-detriment-"))?.[1] ?? ""),
      description: `<p>${r.html}</p>`
    }
  };
  const [item] = await actor.createEmbeddedDocuments("Item", [data]);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="tagandtally chat-card"><h3>${game.i18n.localize(TAGANDTALLY.woundTracks[injuryType].label)}</h3><p>${r.html}</p></div>`
  });
  return item;
}

/* ---------------------------- Appearance -------------------------------- */

export async function generateAppearanceFor(actor) {
  const r = await generate("appearance", { theme: theme() });
  const v = r.values;
  const update = {
    "system.pronoun": plain(v["character-pronoun"]),
    "system.appearance.height": r.text.match(/Height:\s*(.+)/)?.[1]?.trim() ?? "",
    "system.appearance.build": plain(v["character-build-height"]),
    "system.appearance.hair": [v["character-hair-texture"], v["character-hair-style"], v["character-hair-color"]].map(plain).filter(Boolean).join(", "),
    "system.appearance.eyes": plain(v["character-eye-color"]),
    "system.appearance.skin": [v["character-skin-tone"], v["character-skin-complexion"]].map(plain).filter(Boolean).join(", "),
    "system.appearance.clothing": plain(v["character-clothing"]),
    "system.appearance.voice": plain(v["character-voice"]),
    "system.appearance.distinguishing": plain(v["character-distinguishing-feature"])
  };
  if (actor.type === "character") return actor.update(update);
  return actor.update({ "system.notes": `${actor.system.notes ?? ""}<p>${r.html}</p>` });
}

/* ----------------------------- Actors ----------------------------------- */

/** Build NPC/creature actor data from a generation result. */
export function npcDataFromGeneration(r, { creature = false } = {}) {
  const v = r.values;
  const tags = r.tags;
  const name = r.name ?? (creature ? "Creature" : "NPC");
  const level = Number(game.scenes?.active?.getFlag(SYSTEM_ID, "level")) || game.settings.get(SYSTEM_ID, "defaultLevel");
  const system = { creature, level, biography: `<p>${r.html}</p>` };
  if (creature) {
    system.sentence = {
      disposition: plain(v["creature-disposition"]),
      descriptor: plain(v["creature-descriptor"]),
      type: plain(v["creature-type"]),
      motivation: plain(v["creature-motivation"]),
      attack: plain(Object.entries(v).find(([k]) => k.startsWith("creature-attack-choice"))?.[1]),
      damageType: plain(v["damage-type"]),
      specialAbility: plain(Object.entries(v).find(([k]) => k.startsWith("creature-special-ability"))?.[1]),
      strength: plain(Object.entries(v).find(([k]) => k.startsWith("creature-strength"))?.[1]),
      weakness: plain(Object.entries(v).find(([k]) => k.startsWith("creature-weakness"))?.[1])
    };
  } else {
    system.sentence = {
      descriptor: plain(v["descriptor"]),
      species: plain(v["species"]),
      type: plain(Object.entries(v).find(([k]) => /^type(-|$)/.test(k) && k !== "type-option")?.[1] ?? tags[2]),
      doesSomething: plain(v["does-something"]),
      motivation: `${plain(v["character-motivation-verb"])} ${plain(v["character-motivation-noun"])}`.trim().toLowerCase(),
      quest: `${plain(v["quest-type"])} ${plain(Object.entries(v).find(([k]) => k.startsWith("quest-objective"))?.[1])}`.trim().toLowerCase(),
      secret: plain(v["character-secret"]),
      attack: plain(v["character-attack-choice"]),
      damageType: plain(v["wound-damage"])
    };
  }
  return { name, type: "npc", system, img: "icons/svg/mystery-man.svg" };
}

/** Create a new NPC/creature actor from a generator. */
export async function createActorFromSpark(generatorId, options = {}) {
  const r = await generate(generatorId, { theme: theme(), ...options });
  const data = npcDataFromGeneration(r, { creature: generatorId === "creature" });
  const actor = await Actor.create(data);
  actor.sheet.render({ force: true });
  return actor;
}

/** Overwrite an existing NPC's sentence from a generator. */
export async function generateInto(actor, generatorId) {
  const r = await generate(generatorId, { theme: theme() });
  const data = npcDataFromGeneration(r, { creature: generatorId === "creature" });
  return actor.update({ name: actor.name.startsWith("New") || !actor.name ? data.name : actor.name, system: { sentence: data.system.sentence, biography: data.system.biography } });
}

/* ------------------------------ Items ----------------------------------- */

const GEAR_SUBTYPE_TABLES = { armor: "armor-type", item: "item-type", weapon: "weapon-type", trap: "trap-type", consumable: "consumable-type", resource: "resource" };

export function itemDataFromGeneration(r, generator) {
  const v = r.values;
  const g = generator;
  if (g.itemType === "quest") {
    return { name: plain(`${v["quest-type"]} ${Object.entries(v).find(([k]) => k.startsWith("quest-objective"))?.[1] ?? ""}`), type: "quest",
      system: { questType: plain(v["quest-type"]), objective: plain(Object.entries(v).find(([k]) => k.startsWith("quest-objective"))?.[1]), description: `<p>${r.html}</p>` } };
  }
  if (g.itemType === "wound") {
    return { name: `${plain(v["wound-descriptor"] ?? v["wound-blood-magic-descriptor"])} ${plain(v["wound-type-of-mark"] ?? v["wound-blood-magic-mark"])}`.trim(), type: "wound",
      system: { description: `<p>${r.html}</p>`, hinders: plain(Object.entries(v).find(([k]) => k.includes("detriment"))?.[1]) } };
  }
  const gearType = g.gearType ?? "item";
  const subtype = plain(v[GEAR_SUBTYPE_TABLES[gearType]] ?? "");
  const descriptor = plain(v[`${gearType}-descriptor`] ?? v["resource.descriptor"] ?? "");
  const name = r.name ?? (`${descriptor} ${subtype}`.trim() || game.i18n.localize(TAGANDTALLY.gearTypes[gearType]));
  return {
    name, type: "gear",
    system: {
      gearType,
      descriptor,
      material: plain(v[`material-${gearType}`] ?? ""),
      subtype: gearType === "resource" ? plain(v["resource.resource-type"] ?? "") : subtype,
      special: plain(v[`${gearType}-special`] ?? v[`${gearType}-effect`] ?? v["resource.special"] ?? ""),
      damageType: plain(v["damage-type"] ?? ""),
      armorClass: gearType === "armor" ? (/heavy/i.test(subtype) ? "heavy" : /medium/i.test(subtype) ? "medium" : "light") : "none",
      level: Math.ceil(Math.random() * 6),
      sentence: r.text.replace(/\*\*/g, ""),
      description: `<p>${r.html}</p>`
    }
  };
}

export async function createItemFromSpark(generatorId, { actor, ...options } = {}) {
  const r = await generate(generatorId, { theme: theme(), ...options });
  const data = itemDataFromGeneration(r, r.generator);
  if (actor) {
    const [item] = await actor.createEmbeddedDocuments("Item", [data]);
    return item;
  }
  const item = await Item.create(data);
  item.sheet.render({ force: true });
  return item;
}

/** Regenerate an existing item's sentence from the matching generator. */
export async function generateIntoItem(item) {
  const generatorId = item.type === "gear" ? item.system.gearType : item.type === "quest" ? "quest" : item.type === "wound" ? "wound" : null;
  if (!generatorId) return item;
  const values = item.type === "wound" ? { "wound-injury-type": TAGANDTALLY.woundTrackSparkNames[item.system.injuryType] } : {};
  const r = await generate(generatorId, { theme: theme(), values });
  const data = itemDataFromGeneration(r, r.generator);
  delete data.type;
  if (item.type === "wound") data.system.injuryType = item.system.injuryType;
  return item.update(data);
}

/* ----------------------------- Journals --------------------------------- */

/** Create a journal entry (folder "Sparks") from a generated place/faction sentence. Augur Nexus can link these. */
export async function createJournalFromSpark(generatorId, options = {}) {
  const r = await generate(generatorId, { theme: theme(), ...options });
  let folder = game.folders.find((f) => f.type === "JournalEntry" && f.name === "Sparks");
  folder ??= await Folder.create({ name: "Sparks", type: "JournalEntry" });
  const label = game.i18n.localize(`TAGANDTALLY.Sparks.${r.generator.id.charAt(0).toUpperCase()}${r.generator.id.slice(1)}`);
  const name = r.name ?? `${label}: ${r.tags[0] ?? ""} ${r.tags[1] ?? ""}`.trim();
  const entry = await JournalEntry.create({
    name, folder: folder.id,
    pages: [{ name: label, type: "text", text: { content: `<p>${r.html}</p><p><em>${game.i18n.localize("TAGANDTALLY.Sparks.Tags")}:</em> ${r.tags.map((t) => `<span class="tt-tag">${foundry.utils.escapeHTML(t)}</span>`).join(" ")}</p>` } }],
    flags: { [SYSTEM_ID]: { spark: r.generator.id, tags: r.tags, text: r.text } }
  });
  entry.sheet.render({ force: true });
  return entry;
}

/** Post a generation result to chat with create buttons. */
export async function postSparkToChat(r, { theme: t } = {}) {
  const content = await foundry.applications.handlebars.renderTemplate("systems/tagandtally/templates/chat/spark-card.hbs", {
    r, label: r.generator.label, html: r.html, generator: r.generator, isGM: game.user.isGM
  });
  return ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker(),
    flags: { [SYSTEM_ID]: { type: "spark", generator: r.generator.id, text: r.text, values: r.values, theme: t ?? theme() } }
  });
}

/** Convenience: roll a single table and post it. */
export async function postTableRoll(name) {
  const r = await sparkTables.roll(name);
  if (!r) return ui.notifications.warn(game.i18n.format("TAGANDTALLY.Sparks.NoTable", { name }));
  const engine = new SparkGenerator({ theme: theme() });
  const text = await engine.render(r.value);
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content: `<div class="tagandtally chat-card spark"><h3>${foundry.utils.escapeHTML(name)}</h3><p>${SparkGenerator.toHTML(text)}</p>${r.total ? `<footer>${r.table?.formula ?? ""} = ${r.total}</footer>` : ""}</div>`
  });
}
