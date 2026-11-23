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
  // Sentence fields are only filled when blank: what is already on the sheet stays, and the Augur
  // value that could not land there becomes a tag instead (nothing from the dossier is lost).
  const update = {};
  const leftovers = [];
  const current = actor.system.sentence ?? {};
  const place = (key, value) => {
    if (!value) return;
    if (String(current[key] ?? "").trim()) { if (words(current[key]) !== words(value)) leftovers.push(value); return; }
    update[`system.sentence.${key}`] = value;
  };
  place("descriptor", descriptor);
  place("species", species);
  place("type", type);
  if (actor.type === "character") place("specialty", specialty);
  else {
    place("doesSomething", specialty);
    place("motivation", motivation);
    if (ce.flavor?.action || ce.flavor?.focus) place("quest", words(`${ce.flavor.action ?? ""} ${ce.flavor.focus ?? ""}`));
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
  for (const l of leftovers) push(l, actor.type === "character" ? "background" : "other", { category: "static" });
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

/** Augur person journals (NPC entities) not yet projected onto an actor, plus the one linked to `actor`. */
export function augurPersonJournals(actor = null) {
  return game.journal.filter((j) => {
    const ce = j.flags?.["augur-nexus"]?.campaignEntity;
    if (ce?.type !== "npc") return false;
    const projected = ce.projections?.actorUuid;
    return !projected || projected === actor?.uuid;
  });
}

/** Ask which Augur person this actor is, remember it on the actor (Augur's own flag) and import it. */
export async function linkAugurPerson(actor) {
  const options = augurPersonJournals(actor).sort((a, b) => a.name.localeCompare(b.name));
  if (!options.length) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Augur.NoPeople"));
  const byName = options.find((j) => j.name.toLowerCase() === actor.name.toLowerCase());
  const select = `<select name="journal" autofocus>${options.map((j) => `<option value="${j.uuid}" ${j === byName ? "selected" : ""}>${foundry.utils.escapeHTML(j.name)}</option>`).join("")}</select>`;
  const uuid = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("TAGANDTALLY.Augur.Link") },
    content: `<p>${game.i18n.format("TAGANDTALLY.Augur.LinkHint", { name: foundry.utils.escapeHTML(actor.name) })}</p><div class="form-group">${select}</div>`,
    ok: { label: game.i18n.localize("TAGANDTALLY.Augur.Link"), callback: (event, button) => button.form.elements.journal.value },
    rejectClose: false
  });
  if (!uuid) return null;
  await actor.setFlag("augur-nexus", "campaignEntityRef", { journalEntryUuid: uuid });
  const journal = await fromUuid(uuid);
  if (journal) await importAugurPerson(actor, { journal });
  return journal;
}
