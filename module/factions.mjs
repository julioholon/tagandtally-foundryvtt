import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";
import { augurEntity, augurApiUrl } from "./relations.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const T = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Faction.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Faction.${k}`));

/**
 * SRD Factions: goals progress through six phases to an End state regardless of player
 * involvement. Each phase is a tally of 5; once the players learn the goal a countdown of 10
 * also runs and, when it fills first, thwarts the phase. Rival factions' insights accelerate
 * each other's countdowns (thwart mechanism).
 */

/** The world day from the Downtime tracker, for log entries. */
function worldDay() {
  try { return Number(game.settings.get(SYSTEM_ID, "downtime")?.day) || 1; } catch { return 0; }
}

function phaseLabel(n) {
  const def = TAGANDTALLY.faction.phases[n - 1];
  return def ? `${def.end ? "" : `${n}. `}${game.i18n.localize(def.label)}` : String(n);
}

/** Resolve a faction actor from an actor, uuid or id. */
export function resolveFaction(ref) {
  if (!ref) return null;
  if (ref.documentName === "Actor") return ref.type === "faction" ? ref : null;
  const doc = fromUuidSync(String(ref)) ?? game.actors.get(String(ref));
  return doc?.type === "faction" ? doc : null;
}

export function allFactions() {
  return game.actors.filter((a) => a.type === "faction");
}

/** Post a faction event card: public when the goal is known to the players, else whispered to GMs. */
export async function postFactionCard(faction, title, lines = [], { force = null } = {}) {
  const known = force ?? faction.system.revealed.goal;
  const content = `<div class="tagandtally chat-card tt-faction-card"><h3><i class="fa-solid fa-flag"></i> ${esc(faction.name)} · ${esc(title)}</h3>${lines.map((l) => `<p>${l}</p>`).join("")}</div>`;
  return ChatMessage.create({ content, speaker: { alias: faction.name }, whisper: known ? [] : game.users.filter((u) => u.isGM).map((u) => u.id) });
}

async function appendLog(faction, text, update = {}) {
  const log = [...faction.system.log.map((l) => ({ ...l })), { text, phase: faction.system.phase, day: worldDay() }].slice(-40);
  return faction.update({ ...update, "system.log": log });
}

/** Move to the next phase: tally and countdown reset; rivals' phase tallies are sabotaged. */
export async function nextPhase(faction, { reason = "" } = {}) {
  const F = TAGANDTALLY.faction;
  const sys = faction.system;
  if (sys.isEnd) return faction;
  const phase = Math.min(sys.phase + 1, F.phases.length);
  const def = F.phases[phase - 1];
  await appendLog(faction, reason ? `${T("PhaseReached", { phase: phaseLabel(phase) })} (${reason})` : T("PhaseReached", { phase: phaseLabel(phase) }), {
    "system.phase": phase, "system.tally": 0, "system.countdown": 0
  });
  await postFactionCard(faction, T("PhaseReached", { phase: phaseLabel(phase) }), [
    `<em>${esc(game.i18n.localize(def.vibe))}</em> ${esc(game.i18n.localize(def.text))}`
  ]);
  // Thwart: a completed tally sabotages each rival's current task.
  for (const uuid of sys.rivals) {
    const rival = resolveFaction(uuid);
    if (!rival || rival.system.isEnd || !rival.system.tally) continue;
    await appendLog(rival, T("Sabotaged", { by: faction.name }), { "system.tally": 0 });
    await postFactionCard(rival, T("SabotagedTitle"), [esc(T("Sabotaged", { by: faction.name }))]);
  }
  Hooks.callAll(`${SYSTEM_ID}.factionPhase`, faction, phase);
  return faction;
}

/** The countdown filled before the phase did: the plan is thwarted and the phase begins anew. */
export async function thwart(faction, { reason = "" } = {}) {
  const sys = faction.system;
  const countdown = sys.countdownResets ? 0 : sys.countdown;
  await appendLog(faction, reason ? `${T("Thwarted")} (${reason})` : T("Thwarted"), { "system.tally": 0, "system.countdown": countdown });
  await postFactionCard(faction, T("ThwartedTitle"), [esc(T("ThwartedText", { phase: phaseLabel(sys.phase) }))]);
  Hooks.callAll(`${SYSTEM_ID}.factionThwarted`, faction);
  return faction;
}

/** Add marks to the phase tally; a full tally starts the next phase. */
export async function addTally(faction, n = 1, { reason = "" } = {}) {
  const sys = faction.system;
  if (sys.isEnd) return faction;
  const max = TAGANDTALLY.faction.tallyMax;
  const value = Math.clamp(sys.tally + n, 0, max);
  if (value >= max) return nextPhase(faction, { reason });
  await appendLog(faction, reason ? `${T("TallyMark", { value, max })} (${reason})` : T("TallyMark", { value, max }), { "system.tally": value });
  return faction;
}

/** Advance the countdown; a full countdown thwarts the phase. Only runs while the goal is known. */
export async function addCountdown(faction, n = 1, { reason = "" } = {}) {
  const sys = faction.system;
  if (sys.isEnd || !sys.revealed.goal) return faction;
  const max = TAGANDTALLY.faction.countdownMax;
  const value = Math.clamp(sys.countdown + n, 0, max);
  if (value >= max) return thwart(faction, { reason });
  await appendLog(faction, reason ? `${T("CountdownMark", { value, max })} (${reason})` : T("CountdownMark", { value, max }), { "system.countdown": value });
  return faction;
}

/**
 * A Goal / Plan insight was found for this faction: one mark on its tally and one on each
 * rival's countdown (the thwart mechanism). `reason` names where the insight came from.
 */
export async function addInsight(faction, { reason = "" } = {}) {
  const rivals = faction.system.rivals.map(resolveFaction).filter(Boolean);
  await addTally(faction, 1, { reason: reason || T("InsightReason") });
  for (const rival of rivals) await addCountdown(rival, 1, { reason: T("RivalInsight", { name: faction.name }) });
  return faction;
}

/** Reset the current phase (tally and countdown to zero) without advancing. */
export async function resetPhase(faction) {
  return appendLog(faction, T("PhaseReset"), { "system.tally": 0, "system.countdown": 0 });
}

/** Set the phase directly (GM stepping back or forward). */
export async function setPhase(faction, phase) {
  phase = Math.clamp(Number(phase) || 1, 1, TAGANDTALLY.faction.phases.length);
  if (phase === faction.system.phase) return faction;
  return appendLog(faction, T("PhaseSet", { phase: phaseLabel(phase) }), { "system.phase": phase, "system.tally": 0, "system.countdown": 0 });
}

/* ------------------------------- Augur Nexus ----------------------------- */

const title = (s) => String(s ?? "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
const words = (s) => String(s ?? "").replace(/[-_]+/g, " ").trim().toLowerCase();

/** Augur faction journals in the world. */
export function augurFactionJournals() {
  return game.journal.filter((j) => augurEntity(j)?.type === "faction");
}

export function findAugurFaction(actor) {
  const uuid = actor.system?.augurUuid;
  const doc = uuid ? fromUuidSync(uuid) : null;
  if (augurEntity(doc)?.type === "faction") return doc;
  return augurFactionJournals().find((j) => j.name === actor.name) ?? null;
}

/** Tenet label from an ideology selection ("purpose.survival-above-principle" -> "Survival Above Principle"), or the catalog label when known. */
function tenetLabel(sel, catalog = {}) {
  const id = String(sel?.tenetId ?? "");
  return catalog[id] ?? title(id.split(".").pop());
}

/** Augur's ideology catalog as { tenetId: label }, when the module exposes it. */
export async function augurTenetLabels() {
  try {
    const api = await import(augurApiUrl("ideologies"));
    const topics = await api.getIdeologyTopics?.();
    const out = {};
    for (const topic of Array.isArray(topics) ? topics : Object.values(topics ?? {})) for (const t of topic?.tenets ?? []) if (t?.id && t?.label) out[t.id] = t.label;
    return out;
  } catch { return {}; }
}

/**
 * Map an Augur faction entity onto the faction sentence:
 * Type -> organization type, Disposition -> descriptor, Purpose tenet -> core function,
 * The World tenet -> goal, Authority tenet -> secret. Every read is defensive (fields vary by Augur version).
 */
export function mapAugurFaction(actor, journal, { tenetLabels = {} } = {}) {
  const ce = augurEntity(journal) ?? {};
  const profile = ce.profile ?? {};
  const flavor = ce.flavor ?? {};
  const pick = (...vals) => vals.find((v) => typeof v === "string" && v.trim()) ?? "";
  const selections = ce.ideology?.selections ?? [];
  const tenet = (topic) => { const sel = selections.find((x) => (x.topicId ?? String(x.tenetId ?? "").split(".")[0]) === topic); return sel ? tenetLabel(sel, tenetLabels) : ""; };
  const disposition = Object.values(ce.moduleData ?? {}).map((m) => m?.dispositionId ?? m?.disposition).find((v) => typeof v === "string" && v);
  const update = {
    "system.augurUuid": journal.uuid,
    "system.sentence.descriptor": words(pick(disposition, profile.drive, flavor.descriptor, ce.descriptor)),
    "system.sentence.organizationType": words(pick(profile.type, ce.role?.roleLabel, title(ce.role?.roleId), ce.organizationType, ce.subtype, ce.kind)),
    "system.sentence.coreFunction": words(pick(tenet("purpose"), profile.method, profile.theme, flavor.focus, flavor.function, ce.purpose)),
    "system.sentence.goal": words(pick(tenet("world"), profile.action && profile.focus ? `${profile.action} ${profile.focus}` : "", flavor.goal, ce.goal?.text, ce.goal)),
    "system.sentence.secret": words(pick(tenet("authority"), flavor.secret, ce.secret?.text, ce.secret, selections.length ? tenetLabel(selections.at(-1), tenetLabels) : ""))
  };
  const description = pick(flavor.description, ce.description, journal.pages?.find((p) => p.type === "text")?.text?.content);
  if (description && !actor.system.biography) update["system.biography"] = /<[a-z][\s\S]*>/i.test(description) ? description : `<p>${esc(description)}</p>`;
  const img = ce.display?.imageSrc ?? journal.pages?.find((p) => p.type === "image")?.src;
  if (img && (actor.img === Actor.DEFAULT_ICON || /mystery-man|tower\.svg/.test(actor.img))) update.img = img;
  return update;
}

/** Drive, Action, Theme and Focus of an Augur faction become tags on the faction actor. */
export function augurFactionTags(journal) {
  const profile = augurEntity(journal)?.profile ?? {};
  return ["drive", "action", "theme", "focus"].map((k) => String(profile[k] ?? "").trim()).filter(Boolean);
}

/** Add tag items by name to a faction, skipping names it already has. Returns the number created. */
export async function addFactionTags(actor, names) {
  const have = new Set(actor.items.filter((i) => i.type === "tag").map((i) => i.name.toLowerCase()));
  const creates = [...new Set(names.map((n) => n.trim()).filter(Boolean))].filter((n) => !have.has(n.toLowerCase())).map((name) => ({ name, type: "tag", system: { tagType: "other", category: "static" } }));
  if (creates.length) await actor.createEmbeddedDocuments("Item", creates);
  return creates.length;
}

/** Add a rival (faction actor or uuid) to a faction, both ways are not implied: rivalry is directional in the SRD. */
export async function addRival(actor, rival) {
  const r = resolveFaction(rival);
  if (!r || r.id === actor.id || actor.system.rivals.includes(r.uuid)) return false;
  await actor.update({ "system.rivals": [...actor.system.rivals, r.uuid] });
  ui.notifications.info(T("RivalAdded", { name: r.name, faction: actor.name }));
  return true;
}

/** A place (Augur location journal, scene, site page) becomes the headquarters. */
export async function setHeadquarters(actor, doc) {
  const name = doc?.name ?? "";
  if (!name) return false;
  await actor.update({ "system.headquarters": name, "system.headquartersUuid": doc.uuid ?? "" });
  ui.notifications.info(T("HeadquartersSet", { name, faction: actor.name }));
  return true;
}

export async function importAugurFaction(actor, { journal } = {}) {
  journal ??= findAugurFaction(actor);
  if (!journal) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Augur.NotLinked"));
  const tenetLabels = await augurTenetLabels();
  await actor.update(mapAugurFaction(actor, journal, { tenetLabels }), { ttSentenceSync: false });
  await addFactionTags(actor, augurFactionTags(journal));
  ui.notifications.info(game.i18n.format("TAGANDTALLY.Faction.Imported", { name: actor.name, journal: journal.name }));
  return actor;
}

/** Create a faction actor from an Augur faction journal (or focus the existing one). */
export async function createFactionFromAugur(journal, { render = true } = {}) {
  const existing = allFactions().find((a) => a.system.augurUuid === journal.uuid);
  if (existing) { if (render) existing.sheet.render({ force: true }); return existing; }
  const actor = await Actor.create({ name: journal.name, type: "faction", img: augurEntity(journal)?.display?.imageSrc || "icons/svg/tower.svg" });
  await importAugurFaction(actor, { journal });
  if (render) actor.sheet.render({ force: true });
  return actor;
}

/* ------------------------------ Overview app ----------------------------- */

/** GM overview of every faction: phase, tally, countdown and the insight / countdown buttons. */
export class FactionsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance;

  static DEFAULT_OPTIONS = {
    id: "tt-factions",
    classes: ["tagandtally", "tt-factions"],
    position: { width: 620, height: "auto" },
    window: { title: "TAGANDTALLY.Faction.Overview", icon: "fa-solid fa-flag", resizable: true },
    actions: {
      open: FactionsApp.#onOpen,
      insight: FactionsApp.#onInsight,
      countdown: FactionsApp.#onCountdown,
      tick: FactionsApp.#onTick,
      create: FactionsApp.#onCreate,
      importAugur: FactionsApp.#onImportAugur
    }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/factions.hbs", scrollable: [".tt-faction-list"] } };

  static open() {
    FactionsApp.#instance ??= new FactionsApp();
    return FactionsApp.#instance.render({ force: true });
  }

  static refresh() { FactionsApp.#instance?.render(); }

  async _prepareContext() {
    const factions = allFactions()
      .filter((a) => game.user.isGM || a.testUserPermission(game.user, "OBSERVER"))
      .map((a) => ({
        id: a.id, name: a.name, img: a.img, phase: a.system.phase, phaseLabel: phaseLabel(a.system.phase), isEnd: a.system.isEnd,
        vibe: game.i18n.localize(a.system.phaseDef.vibe), tallyBoxes: a.system.tallyBoxes, countdownBoxes: a.system.countdownBoxes,
        known: a.system.revealed.goal, rivals: a.system.rivals.map(resolveFaction).filter(Boolean).map((r) => r.name).join(", ")
      }));
    const linked = new Set(allFactions().map((a) => a.system.augurUuid));
    const augur = game.user.isGM ? augurFactionJournals().filter((j) => !linked.has(j.uuid)).map((j) => ({ id: j.id, name: j.name })) : [];
    return { factions, augur, isGM: game.user.isGM };
  }

  static #onOpen(event, target) { return game.actors.get(target.dataset.id)?.sheet.render({ force: true }); }
  static #onInsight(event, target) { const f = game.actors.get(target.dataset.id); return f && addInsight(f); }
  static #onCountdown(event, target) { const f = game.actors.get(target.dataset.id); return f && addCountdown(f, 1, { reason: T("TimePasses") }); }
  /** Time passes: one mark on every faction's tally (the world moves regardless of the players). */
  static async #onTick() {
    if (!game.user.isGM) return;
    for (const f of allFactions()) if (!f.system.isEnd) await addTally(f, 1, { reason: T("TimePasses") });
  }
  static async #onCreate() {
    const actor = await Actor.create({ name: game.i18n.format("TAGANDTALLY.NewItem", { type: game.i18n.localize("TYPES.Actor.faction") }), type: "faction", img: "icons/svg/tower.svg" });
    return actor?.sheet.render({ force: true });
  }
  static #onImportAugur(event, target) { const j = game.journal.get(target.dataset.id); return j && createFactionFromAugur(j); }
}

export function registerFactions() {
  for (const hook of ["createActor", "updateActor", "deleteActor"]) Hooks.on(hook, (doc) => { if (doc.type === "faction") FactionsApp.refresh(); });
}
