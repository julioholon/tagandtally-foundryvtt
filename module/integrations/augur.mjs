import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";

/**
 * Import an Augur Nexus "Person" into a Tag & Tally actor.
 * Augur stores people as JournalEntries with flags["augur-nexus"].campaignEntity
 * (display, identity, role, personality.traitIds, ideology.selections, flavor, tags)
 * and links the projected actor through flags["augur-nexus"].campaignEntityRef.
 */
const title = (s) => String(s ?? "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
const words = (s) => String(s ?? "").replace(/[-_]+/g, " ").trim().toLowerCase();

/** Find the Augur person journal for an actor, if any. */
export function findAugurPerson(actor) {
  const uuid = actor.flags?.["augur-nexus"]?.campaignEntityRef?.journalEntryUuid;
  if (uuid) {
    const doc = fromUuidSync(uuid);
    if (doc?.flags?.["augur-nexus"]?.campaignEntity) return doc;
  }
  return game.journal.find((j) => j.flags?.["augur-nexus"]?.campaignEntity?.projections?.actorUuid === actor.uuid) ?? null;
}

export function hasAugurPerson(actor) {
  return Boolean(game.modules.get("augur-nexus")?.active && findAugurPerson(actor));
}

/**
 * Build the sentence, tags and portrait from the person record.
 * Returns { update, tags } without applying anything.
 */
export function mapAugurPerson(actor, entity) {
  const ce = entity;
  const descriptor = words(ce.flavor?.descriptor);
  const species = ce.identity?.ancestryLabel ?? title(ce.identity?.ancestryId);
  const type = ce.role?.roleLabel ?? title(ce.role?.roleId);
  const drive = words(ce.flavor?.drive);
  const tenets = (ce.ideology?.selections ?? []).map((s) => words(String(s.tenetId ?? "").split(".").pop()));
  const traits = (ce.personality?.traitIds ?? []).map(title);
  const keywords = (ce.tags ?? []).map(words).filter((k) => k && k !== words(species) && !["fantasy", "scifi", "modern"].includes(k));
  const specialty = drive ? `${game.i18n.localize("TAGANDTALLY.Augur.PursuesPrefix")} ${drive}` : "";
  const motivation = tenets[0] ? `${game.i18n.localize("TAGANDTALLY.Augur.BelievesPrefix")} ${tenets[0]}` : "";
  const update = {};
  if (actor.type === "character") {
    update["system.sentence"] = { descriptor, species, type, specialty };
  } else {
    update["system.sentence.descriptor"] = descriptor;
    update["system.sentence.species"] = species;
    update["system.sentence.type"] = type;
    update["system.sentence.doesSomething"] = specialty;
    update["system.sentence.motivation"] = motivation;
    if (ce.flavor?.action || ce.flavor?.focus) update["system.sentence.quest"] = words(`${ce.flavor.action ?? ""} ${ce.flavor.focus ?? ""}`);
  }
  if (ce.identity?.gender) update["system.pronoun"] = game.i18n.localize(`TAGANDTALLY.Augur.Pronoun.${ce.identity.gender}`) ?? ce.identity.gender;
  if (ce.display?.imageSrc && (actor.img === Actor.DEFAULT_ICON || actor.img === "icons/svg/mystery-man.svg")) update.img = ce.display.imageSrc;
  if (ce.flavor?.description) update["system.biography"] = `${actor.system.biography ?? ""}<p>${foundry.utils.escapeHTML(ce.flavor.description)}</p>`;

  const existing = new Set(actor.items.filter((i) => i.type === "tag").map((i) => i.name.toLowerCase()));
  const tags = [];
  const push = (name, tagType, extra = {}) => {
    if (!name || existing.has(name.toLowerCase())) return;
    existing.add(name.toLowerCase());
    tags.push({ name, type: "tag", system: { tagType, source: "", ...extra } });
  };
  if (actor.type === "character") {
    push(descriptor, "descriptor", { category: "umbrella" });
    push(species, "species", { category: "umbrella" });
    push(type, "type", { category: "umbrella" });
    push(specialty, "specialty", { category: "umbrella" });
  }
  for (const t of traits) push(t, "trait");
  for (const t of tenets) push(`${game.i18n.localize("TAGANDTALLY.Augur.BelievesPrefix")} ${t}`, "trait");
  for (const k of keywords) push(title(k), "background");
  return { update, tags, person: ce.display?.name ?? entity.name };
}

/** Apply the import to the actor. */
export async function importAugurPerson(actor, { journal } = {}) {
  journal ??= findAugurPerson(actor);
  if (!journal) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Augur.NotLinked"));
  const { update, tags, person } = mapAugurPerson(actor, journal.flags["augur-nexus"].campaignEntity);
  await actor.update(update, { ttSentenceSync: false });
  if (tags.length) await actor.createEmbeddedDocuments("Item", tags);
  ui.notifications.info(game.i18n.format("TAGANDTALLY.Augur.Imported", { name: actor.name, person, count: tags.length }));
  return actor;
}
