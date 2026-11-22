import { TAGANDTALLY } from "./config.mjs";

/**
 * Relations: factions, people and places a character knows, each row
 * optionally linked to a document (an Augur Nexus journal, a T&T actor, or
 * any journal entry). Rows are added by dropping documents on the sheet.
 */

/** Augur Nexus campaign entity record on a journal, if any. */
export function augurEntity(doc) {
  return doc?.flags?.["augur-nexus"]?.campaignEntity ?? null;
}

/** Which relation list a dropped document belongs to, or null when it is not a relation. */
export function relationKindFor(doc) {
  if (!doc) return null;
  if (doc.documentName === "Actor") return "people";
  const entity = augurEntity(doc);
  if (entity) {
    for (const [kind, def] of Object.entries(TAGANDTALLY.relationKinds)) {
      if (def.augurTypes.includes(entity.type)) return kind;
    }
    return null;
  }
  return doc.documentName === "JournalEntry" ? "ask" : null;
}

/** Thumbnail for a relation row. */
export function relationImage(doc) {
  const entity = augurEntity(doc);
  return entity?.display?.imageSrc || doc.img || doc.pages?.find((p) => p.type === "image")?.src || "icons/svg/book.svg";
}

/** Append a relation row for `doc` to the actor's list, unless it is already there. */
export async function addRelation(actor, kind, doc) {
  const rows = actor.system.relations[kind].map((r) => foundry.utils.deepClone(r));
  if (rows.some((r) => r.uuid === doc.uuid)) return ui.notifications.info(game.i18n.format("TAGANDTALLY.Relations.Already", { name: doc.name }));
  // A row typed by hand with the same name adopts the link instead of duplicating.
  const byName = rows.find((r) => !r.uuid && r.name.toLowerCase() === doc.name.toLowerCase());
  if (byName) { byName.uuid = doc.uuid; byName.img = relationImage(doc); }
  else rows.push({ ...actor.system.constructor.blankRelation(kind), uuid: doc.uuid, name: doc.name, img: relationImage(doc) });
  await actor.update({ [`system.relations.${kind}`]: rows });
  ui.notifications.info(game.i18n.format("TAGANDTALLY.Relations.Added", { name: doc.name, list: game.i18n.localize(TAGANDTALLY.relationKinds[kind].label) }));
  return true;
}

/** Ask which list a plain journal entry goes to. */
export async function askRelationKind(doc) {
  return foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("TAGANDTALLY.Relations.Title") },
    content: `<p>${game.i18n.format("TAGANDTALLY.Relations.WhichList", { name: foundry.utils.escapeHTML(doc.name) })}</p>`,
    buttons: Object.entries(TAGANDTALLY.relationKinds).map(([kind, def], i) => ({ action: kind, label: game.i18n.localize(def.label), icon: def.icon, default: i === 0 })),
    rejectClose: false
  });
}

/** Open the document behind a relation row. */
export async function openRelation(uuid) {
  const doc = uuid ? await fromUuid(uuid) : null;
  if (!doc) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Relations.Missing"));
  return doc.sheet.render({ force: true });
}

/**
 * Handle a drop on a character sheet. Returns true when the drop was consumed
 * (a relation row or a linked quest was created), false to let the sheet
 * handle it (items, folders...).
 */
export async function handleRelationDrop(actor, data) {
  if (!data?.type || !["Actor", "JournalEntry"].includes(data.type)) return false;
  const doc = await fromUuid(data.uuid);
  if (!doc || doc === actor) return false;
  const entity = augurEntity(doc);
  if (entity?.type === "quest") { await createQuestFromAugur(actor, doc); return true; }
  let kind = relationKindFor(doc);
  if (kind === "ask") kind = await askRelationKind(doc);
  if (!kind) return false;
  await addRelation(actor, kind, doc);
  return true;
}

/* --------------------------- Augur quests --------------------------- */

/** Objectives of an Augur quest journal as the current user may see them. */
export function augurQuestView(uuid) {
  const doc = uuid ? fromUuidSync(uuid) : null;
  const entity = augurEntity(doc);
  if (!entity || entity.type !== "quest") return null;
  const canSee = game.user.isGM || doc.testUserPermission(game.user, "OBSERVER");
  const objectives = (entity.objectives ?? [])
    .filter((o) => game.user.isGM || !o.hidden)
    .map((o) => ({ id: o.id, text: o.text || o.description || titleCase(o.intent), done: o.status === "complete" || o.status === "completed", status: o.status, hidden: o.hidden }));
  return { uuid, name: doc.name, status: entity.status, objectives: canSee ? objectives : [], canSee };
}

function titleCase(s) { return String(s ?? "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

/** Create (or focus) a quest item mirroring an Augur quest journal. */
export async function createQuestFromAugur(actor, journal) {
  const existing = actor.items.find((i) => i.type === "quest" && i.system.augurUuid === journal.uuid);
  if (existing) return existing.sheet.render({ force: true });
  const entity = augurEntity(journal);
  const steps = (entity.objectives ?? []).filter((o) => !o.hidden).map((o) => ({ text: o.text || o.description || titleCase(o.intent), done: o.status === "complete" || o.status === "completed" }));
  const [item] = await actor.createEmbeddedDocuments("Item", [{
    name: journal.name || entity.title || game.i18n.localize("TAGANDTALLY.Quest.Quest"),
    type: "quest",
    img: entity.image || journal.img || "icons/svg/book.svg",
    system: { augurUuid: journal.uuid, steps, status: entity.status === "completed" ? "completed" : "active" }
  }]);
  ui.notifications.info(game.i18n.format("TAGANDTALLY.Quest.AugurLinked", { name: item.name }));
  return item;
}

/** Copy the Augur objectives into the quest's steps (text and done state). Local notes on steps are kept by text match. */
export async function syncQuestFromAugur(item) {
  const view = augurQuestView(item.system.augurUuid);
  if (!view) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Relations.Missing"));
  const steps = view.objectives.map((o) => ({ text: o.text, done: o.done }));
  await item.update({ "system.steps": steps, "system.status": view.status === "completed" ? "completed" : item.system.status });
  ui.notifications.info(game.i18n.format("TAGANDTALLY.Quest.Synced", { name: item.name, count: steps.length }));
}
