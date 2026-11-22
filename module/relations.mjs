import { TAGANDTALLY } from "./config.mjs";

const AUGUR = "augur-nexus";

/**
 * Relations: factions, people and places a character knows, each row
 * optionally linked to a document (an Augur Nexus journal, a T&T actor, or
 * any journal entry). Rows are added by dropping documents on the sheet.
 */

/** Scene the client is looking at; attitudes drifted in another scene no longer apply. */
export function currentSceneId() {
  return canvas?.scene?.id ?? game.scenes?.active?.id ?? null;
}

/** Attitude of a people/faction row for the current scene: the drifted value, else the disposition. */
export function sceneAttitude(row, sceneId = currentSceneId()) {
  if (row.attitude === null || row.attitude === undefined) return row.disposition;
  if (row.attitudeScene && sceneId && row.attitudeScene !== sceneId) return row.disposition;
  return row.attitude;
}

/** Augur Nexus campaign entity record on a journal, if any. */
export function augurEntity(doc) {
  return doc?.flags?.["augur-nexus"]?.campaignEntity ?? null;
}

/** Journal entry behind an Augur entity id (Nexus browser drags carry the entity id, not a uuid). */
export function augurJournalForEntity(entityId) {
  if (!entityId) return null;
  return game.journal.get(entityId) ?? game.journal.find((j) => augurEntity(j)?.id === entityId) ?? null;
}

function augurLocations() {
  return game.journal.filter((j) => augurEntity(j)?.type === "location");
}

/** Augur locations placed as site markers with this site id (a region site can hold several). */
export function augurLocationsForSite(siteId) {
  if (!siteId) return [];
  return augurLocations().filter((j) => { const p = augurEntity(j).hierarchy?.parent; return p?.kind === "site" && p.siteId === siteId; });
}

/**
 * Augur location journals for a scene: one that owns the scene outright
 * (scenes.primarySceneId), those placed on the site the scene was generated
 * for, or failing that the same for the nearest ancestor scene.
 */
export function augurLocationsForScene(scene) {
  const seen = new Set();
  for (let s = scene; s && !seen.has(s.id); ) {
    seen.add(s.id);
    const flags = s.flags?.[AUGUR] ?? {};
    const owner = augurLocations().find((j) => augurEntity(j).scenes?.primarySceneId === s.id);
    if (owner) return [owner];
    const placed = augurLocationsForSite(flags.site?.siteId);
    if (placed.length) return placed;
    const viaParent = augurLocationsForSite(flags.lineage?.parentSiteId);
    if (viaParent.length) return viaParent;
    const parentId = flags.lineage?.parentSceneId;
    s = parentId ? game.scenes.get(parentId) : null;
  }
  return [];
}

/** The journal page Augur keeps for a site placed on a scene. */
function augurSitePage(parentSceneId, siteId) {
  const journalId = game.scenes.get(parentSceneId)?.getFlag(AUGUR, "siteJournalId");
  const journal = journalId ? game.journal.get(journalId) : null;
  return journal?.pages.find((p) => p.flags?.[AUGUR]?.siteId === siteId) ?? null;
}

/**
 * Resolve a drag started inside Augur Nexus (browser rows, place tree, quest
 * cards) to a document. Those drags do not use Foundry's {type, uuid} payload.
 */
export async function resolveAugurDrag(event, data) {
  const questId = event?.dataTransfer?.getData?.("application/x-augur-quest");
  if (questId) return game.journal.get(questId) ?? null;
  if (!data) return null;
  if (data.type === "AugurNexusEntity" || data.kind === "nexus-entity") {
    return (data.uuid ? await fromUuid(data.uuid) : null) ?? augurJournalForEntity(data.entityId);
  }
  if (data.type === "AugurNexusNode") {
    if (data.siteId) {
      const placed = augurLocationsForSite(data.siteId);
      const hit = (placed.length === 1 ? placed[0] : null) ?? (data.parentSceneId ? augurSitePage(data.parentSceneId, data.siteId) : null) ?? placed[0];
      if (hit) return hit;
    }
    const scene = game.scenes.get(data.sceneId ?? data.parentSceneId);
    return (scene && augurLocationsForScene(scene)[0]) ?? scene ?? null;
  }
  return null;
}

/** Which relation list a dropped document belongs to, or null when it is not a relation. */
export function relationKindFor(doc) {
  if (!doc) return null;
  if (doc.documentName === "Actor") return "people";
  if (doc.documentName === "Scene" || doc.documentName === "JournalEntryPage") return "places";
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
  if (doc.documentName === "Scene") return doc.thumb || doc.background?.src || "icons/svg/direction.svg";
  if (doc.documentName === "JournalEntryPage") return doc.flags?.[AUGUR]?.siteIconSrc || doc.src || "icons/svg/direction.svg";
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
  if (doc.documentName === "JournalEntryPage") return doc.parent.sheet.render({ force: true, pageId: doc.id });
  return doc.sheet.render({ force: true });
}

/**
 * Handle a drop on a character sheet. Returns true when the drop was consumed
 * (a relation row or a linked quest was created), false to let the sheet
 * handle it (items, folders...). Accepts Foundry {type, uuid} payloads and
 * Augur Nexus's own drag payloads (pass the drop event for the latter).
 */
export async function handleRelationDrop(actor, data, event = null) {
  const doc = ["Actor", "JournalEntry"].includes(data?.type) ? await fromUuid(data.uuid) : await resolveAugurDrag(event, data);
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
