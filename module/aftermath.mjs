import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";
import { sceneLevel } from "./rolls/resolution.mjs";
import { PartyOverview } from "./integrations/party.mjs";
import { allFactions, addInsight } from "./factions.mjs";
import { applyWealthTally } from "./downtime.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const T = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Aftermath.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Aftermath.${k}`));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const theme = () => game.settings.get(SYSTEM_ID, "sparkTheme");
const coinsMode = () => game.settings.get(SYSTEM_ID, "coinsMode");
const plain = (v) => String(v ?? "").replace(/\*\*/g, "").replace(/[\[\]]/g, "").trim();
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const stepLabel = (v) => game.i18n.localize(TAGANDTALLY.relationSteps[Math.clamp(v, 0, TAGANDTALLY.relationSteps.length - 1)].label);

/**
 * Aftermath: what a result sets in motion. A band decides how many outcomes and their sign;
 * each line is rolled from a weighted pool, can be rerolled or changed, is given to one character
 * and is applied on its own (or all at once).
 */
export const AFTERMATH = {
  /** Outcomes by quest resolution band: "+" good, "-" bad. */
  quest: { successAnd: ["+", "+"], success: ["+"], successBut: ["+", "-"], failBut: ["-"], failAnd: ["-", "-"] },
  /** A task closed with "Success, and" offers one good outcome. */
  task: { successAnd: ["+"] },
  pools: {
    "+": { item: 4, coins: 3, relationUp: 2, lead: 2, info: 2, place: 1, npc: 1 },
    "-": { coinsLost: 2, relationDown: 2, leadCatch: 1, infoFalse: 1, combat: 2, gearLost: 2, hazard: 2 }
  },
  icons: { place: "fa-map-location-dot", npc: "fa-user-plus", item: "fa-gem", coins: "fa-coins", relationUp: "fa-handshake", lead: "fa-scroll", info: "fa-lightbulb", coinsLost: "fa-money-bill-transfer", relationDown: "fa-heart-crack", leadCatch: "fa-scroll", infoFalse: "fa-mask", combat: "fa-swords", gearLost: "fa-bag-shopping", hazard: "fa-skull-crossbones" },
  /** Spoils and looting (a Task Roll): a smaller, more material pool than a quest's. */
  loot: {
    good: { item: 4, coins: 4 },
    extra: { lead: 2, info: 2, npc: 1, place: 1 },
    bad: { combat: { hazard: 2, gearLost: 1 }, search: { hazard: 2, combat: 2, gearLost: 1 } }
  },
  gearGenerators: ["item", "item", "weapon", "armor", "consumable", "resource"]
};

function weighted(pool) {
  const entries = Object.entries(pool);
  let n = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) { n -= w; if (n < 0) return k; }
  return entries[0][0];
}

/** Characters this user may give outcomes to. */
function recipients(base) {
  const list = game.actors.filter((a) => a.type === "character" && a.isOwner && (PartyOverview.isMember(a) || a === base));
  return list.length ? list : (base ? [base] : []);
}

/** Open insight targets: factions that are still running and NPC secrets not yet revealed. */
function insightTargets() {
  const out = [];
  for (const f of allFactions()) if (!f.system.isEnd) out.push({ kind: "faction", doc: f });
  for (const n of game.actors.filter((x) => x.type === "npc")) for (const key of n.system.hiddenDef.insight) if (!n.system.revealed[key]) out.push({ kind: "npc", doc: n, key });
  return out;
}

async function insightSentence() {
  const { generate } = await import("./sparks/engine.mjs");
  const r = await generate("insight", { theme: theme() }).catch(() => null);
  return r?.html ?? "";
}

/* ------------------------------- Kinds ---------------------------------- */

/** Roll a kind's content for a recipient. Returns { html, payload } or null when it cannot apply. */
const KINDS = {
  async item({ level }) {
    const { generate } = await import("./sparks/engine.mjs");
    const { itemDataFromGeneration } = await import("./sparks/create.mjs");
    const r = await generate(pick(AFTERMATH.gearGenerators), { theme: theme() });
    const data = itemDataFromGeneration(r, r.generator);
    data.system.level = Math.clamp(level - Math.floor(Math.random() * 2), 1, 10);
    return { html: `<strong>${esc(data.name)}</strong> <small>${esc(game.i18n.localize(TAGANDTALLY.gearTypes[data.system.gearType] ?? ""))} L${data.system.level}</small>`, payload: { data } };
  },
  async coins({ level }) {
    if (!coinsMode()) return { html: T("WealthUp"), payload: { tally: 1 } };
    const cost = Math.clamp(Math.ceil(level / 2), 1, 5);
    const amount = TAGANDTALLY.coins.priceForCost(cost) * (1 + Math.floor(Math.random() * 3));
    return { html: T("CoinsGained", { n: amount }), payload: { coins: amount } };
  },
  async coinsLost({ level, actor }) {
    if (!coinsMode()) return { html: T("WealthDown"), payload: { tally: -1 } };
    const have = actor.system.wealth.coins;
    if (have <= 0) return null;
    const cost = Math.clamp(Math.ceil(level / 2) - 1, 1, 5);
    const amount = Math.min(have, TAGANDTALLY.coins.priceForCost(cost) * (1 + Math.floor(Math.random() * 3)));
    return { html: T("CoinsLost", { n: amount }), payload: { coins: -amount } };
  },
  relationUp: ({ actor }) => relationChange(actor, 1),
  relationDown: ({ actor }) => relationChange(actor, -1),
  async lead({ actor, level }) { return leadData(actor, level, false); },
  async leadCatch({ actor, level }) { return leadData(actor, level, true); },
  async info() {
    const target = pick(insightTargets());
    if (!target) return null;
    const label = target.kind === "faction" ? `${target.doc.name} · ${game.i18n.localize("TAGANDTALLY.Faction.Insight")}` : `${target.doc.name} · ${game.i18n.localize(`TAGANDTALLY.Npc.${target.key}`)}`;
    return { html: `<strong>${esc(label)}</strong> ${await insightSentence()}`, payload: { uuid: target.doc.uuid, kind: target.kind, key: target.key ?? "" } };
  },
  async infoFalse() {
    const text = await insightSentence();
    return text ? { html: `${text} <em>(${esc(T("MaybeFalse"))})</em>`, payload: { text } } : null;
  },
  async place() {
    const { generate } = await import("./sparks/engine.mjs");
    const r = await generate("location", { theme: theme() });
    const name = plain(r.tags.slice(0, 2).join(" ")).toLowerCase().replace(/^./, (c) => c.toUpperCase());
    const text = plain(r.text);
    return { html: `<strong>${esc(name)}</strong> ${esc(text)}`, payload: { name, text } };
  },
  async npc({ level }) {
    const { generate } = await import("./sparks/engine.mjs");
    const { npcDataFromGeneration } = await import("./sparks/create.mjs");
    const r = await generate("npc", { theme: theme() });
    const data = npcDataFromGeneration(r, { creature: false });
    data.system.level = Math.clamp(level, 1, 10);
    return { html: `<strong>${esc(data.name)}</strong> ${r.html}`, payload: { data } };
  },
  async combat({ level }) {
    const { generate } = await import("./sparks/engine.mjs");
    const { npcDataFromGeneration } = await import("./sparks/create.mjs");
    const r = await generate("creature", { theme: theme() });
    const data = npcDataFromGeneration(r, { creature: true });
    data.system.level = Math.clamp(level, 1, 10);
    return { html: `<strong>${esc(data.name)}</strong> ${r.html} <small>L${data.system.level}</small>`, payload: { data } };
  },
  async gearLost({ actor }) {
    const gear = actor.items.filter((i) => i.type === "gear");
    const item = pick(gear);
    return item ? { html: `<strong>${esc(item.name)}</strong>`, payload: { itemId: item.id } } : null;
  },
  async hazard({ level }) {
    const injuryType = level >= 6 ? "lingeringTrauma" : "strain";
    return { html: T("Hazard", { track: game.i18n.localize(TAGANDTALLY.woundTracks[injuryType].label) }), payload: { injuryType } };
  }
};

async function relationChange(actor, dir) {
  const rows = [];
  for (const kind of ["people", "factions"]) actor.system.relations[kind].forEach((row, index) => {
    const to = row.disposition + dir;
    if (to >= 0 && to < TAGANDTALLY.relationSteps.length) rows.push({ kind, index, row, to });
  });
  const c = pick(rows);
  if (!c) return null;
  return { html: `<strong>${esc(c.row.name)}</strong>: ${esc(stepLabel(c.row.disposition))} → ${esc(stepLabel(c.to))}`, payload: { kind: c.kind, index: c.index, name: c.row.name, to: c.to } };
}

async function leadData(actor, level, withCatch) {
  const { generate } = await import("./sparks/engine.mjs");
  const { itemDataFromGeneration, inspireQuest } = await import("./sparks/create.mjs");
  const r = await generate("quest", { theme: theme() });
  const data = await inspireQuest(itemDataFromGeneration(r, r.generator));
  data.system.status = "active";
  if (withCatch) data.system.tallies = { countdown: { value: 3, max: TAGANDTALLY.questTallies.countdown.max, enabled: true } };
  return { html: `<strong>${esc(data.name)}</strong>${withCatch ? ` <em>(${esc(T("HeadStart"))})</em>` : ""}`, payload: { data } };
}

/** Make a kind's change happen. Returns a summary line. */
const APPLY = {
  async item({ actor, payload }) { const [it] = await actor.createEmbeddedDocuments("Item", [payload.data]); return T("GotItem", { name: esc(it.name) }); },
  async coins({ actor, payload }) {
    if (payload.tally) { await applyWealthTally(actor, payload.tally); return T("WealthUp"); }
    await actor.update({ "system.wealth.coins": actor.system.wealth.coins + payload.coins });
    return T("CoinsGained", { n: payload.coins });
  },
  async coinsLost({ actor, payload }) {
    if (payload.tally) { await applyWealthTally(actor, payload.tally); return T("WealthDown"); }
    await actor.update({ "system.wealth.coins": Math.max(0, actor.system.wealth.coins + payload.coins) }, { ttNoClimb: true });
    return T("CoinsLost", { n: -payload.coins });
  },
  async relation({ actor, payload }) {
    const rows = actor.system.relations[payload.kind].map((r) => foundry.utils.deepClone(r));
    if (!rows[payload.index]) return null;
    rows[payload.index].disposition = payload.to;
    await actor.update({ [`system.relations.${payload.kind}`]: rows });
    return `${esc(payload.name)}: ${esc(stepLabel(payload.to))}`;
  },
  async lead({ actor, payload }) { const [q] = await actor.createEmbeddedDocuments("Item", [payload.data]); return T("GotQuest", { name: esc(q.name) }); },
  async info({ payload }) {
    const target = await fromUuid(payload.uuid);
    if (!target) return null;
    if (payload.kind === "faction") await addInsight(target, { reason: T("Title") });
    else {
      const k = target.knowledgeActor ?? target;
      const v = Math.min(TAGANDTALLY.insightsPerTally, k.system.insights[payload.key] + 1);
      await k.update({ [`system.insights.${payload.key}`]: v, ...(v >= TAGANDTALLY.insightsPerTally ? { [`system.revealed.${payload.key}`]: true } : {}) });
    }
    return T("InsightOn", { name: esc(target.name) });
  },
  async infoFalse({ payload }) { return payload.text; },
  async place({ actor, payload, ctx }) {
    const { addKnownPlace } = await import("./quest-tasks.mjs");
    await addKnownPlace(actor, payload.name, payload.text, ctx.title ?? "");
    return T("GotPlace", { name: esc(payload.name) });
  },
  async npc({ actor, payload }) {
    if (!game.user.can("ACTOR_CREATE")) { ui.notifications.warn(T("NeedGM")); return null; }
    const npc = await Actor.create(payload.data);
    const { ensureRelation } = await import("./interactions.mjs");
    await ensureRelation(actor, npc, "people");
    return T("GotNpc", { name: esc(npc.name) });
  },
  async combat({ actor, payload, ctx }) {
    if (!game.user.can("ACTOR_CREATE")) { ui.notifications.warn(T("NeedGM")); return null; }
    const creature = await Actor.create(payload.data);
    const { CombatFlow } = await import("./combat/combat-flow.mjs");
    await CombatFlow.addActors([actor]);
    const state = CombatFlow.state;
    const p = state.participants[actor.uuid];
    if (p) { p.opponentLevel = Math.clamp(ctx.level, 1, 10); p.opponentUuid = creature.uuid; }
    await CombatFlow.setState(state);
    CombatFlow.open();
    return T("Fight", { name: esc(creature.name) });
  },
  async gearLost({ actor, payload }) {
    const item = actor.items.get(payload.itemId);
    if (!item) return null;
    const name = item.name;
    if ((item.system.quantity ?? 1) > 1) await item.update({ "system.quantity": item.system.quantity - 1 });
    else await item.delete();
    return T("Lost", { name: esc(name) });
  },
  async hazard({ actor, payload }) {
    await actor.applyWound(payload.injuryType);
    const { createWoundItemFromSpark } = await import("./sparks/create.mjs");
    await createWoundItemFromSpark(actor, { injuryType: payload.injuryType });
    return T("Hazard", { track: game.i18n.localize(TAGANDTALLY.woundTracks[payload.injuryType].label) });
  }
};
APPLY.relationUp = APPLY.relation;
APPLY.relationDown = APPLY.relation;
APPLY.leadCatch = APPLY.lead;

let nextLine = 1;

/* -------------------------------- App ----------------------------------- */

export class AftermathApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["tagandtally", "aftermath"],
    position: { width: 640, height: "auto" },
    window: { title: "TAGANDTALLY.Aftermath.Title", icon: "fa-solid fa-hourglass-end", resizable: true },
    actions: { reroll: AftermathApp.#onReroll, apply: AftermathApp.#onApply, skip: AftermathApp.#onSkip, applyAll: AftermathApp.#onApplyAll, add: AftermathApp.#onAdd }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/aftermath.hbs", scrollable: [".tt-aftermath-lines"] } };

  /**
   * @param {object} ctx  { actor, level, polarities: ["+","-"], title, note }
   */
  constructor(ctx, options = {}) {
    super(options);
    this.ctx = { level: sceneLevel(), ...ctx };
    this.lines = [];
  }

  /** Open an Aftermath and roll its lines. */
  static async open(ctx) {
    const app = new AftermathApp(ctx);
    const base = ctx.actor?.isToken ? game.actors.get(ctx.actor.id) ?? ctx.actor : ctx.actor;
    app.ctx.actor = base;
    const specs = ctx.lines ?? (ctx.polarities ?? ["+"]).map((pol) => ({ pol }));
    for (const spec of specs) await app.addLine(spec.pol, { pool: spec.pool });
    await app.render({ force: true });
    return app;
  }

  /** Roll one line of a sign for `recipient` (default: the roller). */
  async addLine(pol, { kind, recipient, pool } = {}) {
    const actor = recipient ?? this.ctx.actor;
    const line = { id: nextLine++, pol, pool, kind: null, recipient: actor?.uuid, html: "", payload: null, status: "pending" };
    this.lines.push(line);
    await this.fill(line, kind);
    return line;
  }

  /** (Re)roll a line's content, either for `kind` or a fresh weighted pick. Returns false when nothing fits. */
  async fill(line, kind) {
    const actor = await fromUuid(line.recipient);
    const pool = { ...(line.pool ?? AFTERMATH.pools[line.pol]) };
    for (let i = 0; i < 8; i++) {
      const k = kind ?? weighted(pool);
      const result = await KINDS[k]?.({ actor, level: this.ctx.level, ctx: this.ctx }).catch((err) => { console.warn(`${SYSTEM_ID} | aftermath ${k}`, err); return null; });
      if (result) { Object.assign(line, { kind: k, html: result.html, payload: result.payload, status: "pending" }); return true; }
      if (kind) return false;
      delete pool[k];
      if (!Object.keys(pool).length) break;
    }
    Object.assign(line, { kind: null, html: esc(T("Nothing")), payload: null });
    return false;
  }

  async _prepareContext() {
    const base = this.ctx.actor;
    const options = recipients(base);
    const lines = this.lines.map((l) => ({
      ...l,
      icon: l.kind ? AFTERMATH.icons[l.kind] : "fa-ban",
      sign: l.pol === "+" ? "pos" : "neg",
      kinds: Object.keys(AFTERMATH.pools[l.pol]).map((k) => ({ value: k, label: T(`Kind.${k}`), selected: k === l.kind })),
      recipients: options.map((a) => ({ value: a.uuid, label: a.name, selected: a.uuid === l.recipient })),
      done: l.status === "applied", skipped: l.status === "skipped",
      canApply: l.status === "pending" && Boolean(l.kind)
    }));
    return { title: this.ctx.title ?? "", note: this.ctx.note ?? "", lines, pending: lines.some((l) => l.canApply) };
  }

  _onRender() {
    this.element.querySelectorAll("select[data-kind]").forEach((el) => el.addEventListener("change", async (ev) => {
      const line = this.lines.find((l) => l.id === Number(el.dataset.kind));
      if (!line) return;
      if (!(await this.fill(line, ev.target.value))) ui.notifications.warn(T("CannotApply"));
      this.render();
    }));
    this.element.querySelectorAll("select[data-recipient]").forEach((el) => el.addEventListener("change", async (ev) => {
      const line = this.lines.find((l) => l.id === Number(el.dataset.recipient));
      if (!line) return;
      line.recipient = ev.target.value;
      await this.fill(line, line.kind ?? undefined);
      this.render();
    }));
  }

  line(target) { return this.lines.find((l) => l.id === Number(target.closest("[data-line]")?.dataset.line)); }

  static async #onReroll(event, target) {
    const line = this.line(target);
    if (!line || line.status !== "pending") return;
    await this.fill(line);
    return this.render();
  }

  static async #onSkip(event, target) {
    const line = this.line(target);
    if (line) line.status = "skipped";
    return this.render();
  }

  async applyLine(line) {
    if (!line?.kind || line.status !== "pending") return;
    const actor = await fromUuid(line.recipient);
    if (!actor?.isOwner) return ui.notifications.warn(T("NotOwner"));
    let summary = null;
    try { summary = await APPLY[line.kind]({ actor, payload: line.payload, ctx: this.ctx }); }
    catch (err) { console.error(`${SYSTEM_ID} | aftermath apply`, err); ui.notifications.error(T("ApplyFailed")); return; }
    if (summary === null || summary === undefined) return;
    line.status = "applied";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="tagandtally chat-card tt-aftermath-card ${line.pol === "+" ? "pos" : "neg"}"><h3><i class="fa-solid ${AFTERMATH.icons[line.kind]}"></i> ${esc(T("Title"))} · ${esc(actor.name)}</h3><p>${summary}</p></div>`
    });
  }

  static async #onApply(event, target) {
    await this.applyLine(this.line(target));
    return this.render();
  }

  static async #onApplyAll() {
    for (const line of this.lines) await this.applyLine(line);
    return this.render();
  }

  static async #onAdd(event, target) {
    await this.addLine(target.dataset.pol);
    return this.render();
  }
}

/* ------------------------------ Entry points ---------------------------- */

/**
 * A quest resolution roll: the quest is closed (completed on a success, failed on "Fail, and"),
 * the chat card states reward or consequence, and the Aftermath opens with the band's outcomes.
 */
export async function afterQuestResolution(quest, result) {
  const band = result.band?.id ?? result.band;
  const polarities = AFTERMATH.quest[band];
  if (!polarities) return;
  const system = quest.system;
  const status = ["success", "successBut", "successAnd"].includes(band) ? "completed" : band === "failAnd" ? "failed" : null;
  if (status && system.status === "active") await quest.update({ "system.status": status }, { ttNoQuestRules: true });
  const lines = [];
  if (status === "completed" && system.reward) lines.push(`<strong>${esc(game.i18n.localize("TAGANDTALLY.Quest.Reward"))}:</strong> ${esc(system.reward)}`);
  if (["successBut", "failAnd", "failBut"].includes(band) && system.consequence) lines.push(`<strong>${esc(game.i18n.localize("TAGANDTALLY.Quest.Consequence"))}:</strong> ${esc(system.consequence)}`);
  lines.push(esc(T(`QuestStatus.${status ?? "open"}`)));
  if (result.message) await result.message.update({ content: `${result.message.content}<div class="tagandtally tt-loop-outcome">${lines.map((l) => `<p>${l}</p>`).join("")}</div>` });
  return AftermathApp.open({ actor: result.actor ?? quest.actor, polarities, title: quest.name, note: T(`QuestNote.${band}`) });
}

/**
 * Spoils or a search: a Task Roll at `level`, then an Aftermath by band. `source` is "combat"
 * (after a fight) or "search" (an explored place); it sets the bad side of the pool.
 */
export async function rollSpoils({ actor, level = sceneLevel(), source = "search", title = "" } = {}) {
  const { TaskRollDialog } = await import("./rolls/task-roll-dialog.mjs");
  const result = await TaskRollDialog.prompt({ actor, level, rollType: "task", title: title || T(`Spoils.${source}`) });
  if (!result) return null;
  const band = result.band?.id ?? result.band;
  const good = { pol: "+", pool: AFTERMATH.loot.good };
  const bad = { pol: "-", pool: AFTERMATH.loot.bad[source] ?? AFTERMATH.loot.bad.search };
  const lines = {
    failAnd: [bad],
    failBut: [{ pol: "+", pool: { coins: 1 } }],
    successBut: [good, bad],
    success: [good, good],
    successAnd: [good, good, { pol: "+", pool: AFTERMATH.loot.extra }]
  }[band];
  if (lines) await AftermathApp.open({ actor: result.actor ?? actor, lines, level, title: title || T(`Spoils.${source}`), note: T(`SpoilsNote.${band}`) });
  return result;
}

/** A chat button that opens an Aftermath for a roll (set up with `offerAftermath`). */
export async function offerAftermath(message, { polarities, title }) {
  if (!message) return;
  await message.setFlag(SYSTEM_ID, "aftermath", { polarities, title: title ?? "" });
  await message.update({ content: `${message.content}<div class="tagandtally tt-loop-outcome"><p><button type="button" data-action="openAftermath"><i class="fa-solid fa-hourglass-end"></i> ${esc(T("Open"))}</button></p></div>` });
}

export function registerAftermath() {
  Hooks.on(`${SYSTEM_ID}.chatAction`, async (action, message, el, actor) => {
    if (action !== "openAftermath") return;
    const data = message.getFlag(SYSTEM_ID, "aftermath");
    if (!data) return;
    if (!actor?.isOwner) return ui.notifications.warn(T("NotOwner"));
    el.disabled = true;
    return AftermathApp.open({ actor, polarities: data.polarities, title: data.title });
  });
}
