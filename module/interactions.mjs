import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";
import { sceneLevel } from "./rolls/resolution.mjs";
import { TaskRollDialog } from "./rolls/task-roll-dialog.mjs";
import { findAugurPerson } from "./integrations/augur.mjs";
import { augurEntity, relationImage, currentSceneId, sceneAttitude } from "./relations.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * SRD NPC interactions: a character talks to a person or faction they have a
 * relation row for. Permanent disposition eases or hinders the task; the
 * 2d6 Drift roll sets a temporary attitude for the scene; the pathway gives
 * the question; the outcome band applies the SRD consequences.
 */

const stepClamp = (v) => Math.clamp(v, 0, TAGANDTALLY.relationSteps.length - 1);
const stepLabel = (v) => game.i18n.localize(TAGANDTALLY.relationSteps[stepClamp(v)].label);
const signed = (n) => (n > 0 ? `+${n}` : String(n));

/** World actor behind a (possibly synthetic token) actor. */
function baseActor(actor) {
  return actor?.isToken ? game.actors.get(actor.id) ?? actor : actor;
}

/** Locate the relation row on `actor` that stands for `target` (actor, journal entry or a name). */
export function findRelation(actor, target) {
  const uuids = new Set();
  if (target?.uuid) uuids.add(target.uuid);
  if (target?.documentName === "Actor") {
    const base = baseActor(target);
    if (base?.uuid) uuids.add(base.uuid);
    const person = findAugurPerson(base);
    if (person) uuids.add(person.uuid);
  }
  const name = String(target?.name ?? target ?? "").trim().toLowerCase();
  for (const kind of ["people", "factions"]) {
    const rows = actor.system.relations[kind];
    let index = rows.findIndex((r) => r.uuid && uuids.has(r.uuid));
    if (index < 0 && name) index = rows.findIndex((r) => r.name.trim().toLowerCase() === name);
    if (index >= 0) return { kind, index, row: rows[index] };
  }
  return null;
}

/** The relation row for `target`, created at Indifferent on a first meeting (SRD "First interaction"). */
export async function ensureRelation(actor, target, kind) {
  const found = findRelation(actor, target);
  if (found) return found;
  kind ??= augurEntity(target)?.type === "faction" || target?.type === "faction" ? "factions" : "people";
  const base = baseActor(target);
  const rows = actor.system.relations[kind].map((r) => foundry.utils.deepClone(r));
  rows.push({ ...actor.system.constructor.blankRelation(kind), uuid: base?.uuid ?? "", name: target.name ?? String(target), img: base ? relationImage(base) : "" });
  await actor.update({ [`system.relations.${kind}`]: rows });
  return { kind, index: rows.length - 1, row: actor.system.relations[kind].at(-1) };
}

async function updateRow(actor, kind, index, changes) {
  const rows = actor.system.relations[kind].map((r) => foundry.utils.deepClone(r));
  if (!rows[index]) return null;
  Object.assign(rows[index], changes);
  await actor.update({ [`system.relations.${kind}`]: rows });
  return actor.system.relations[kind][index];
}

/** SRD Drift roll: 2d6 moves the attitude for this scene up to two steps from the disposition. */
export async function rollDrift(actor, kind, index) {
  const row = actor.system.relations[kind][index];
  if (!row) return null;
  const roll = await new Roll("2d6").evaluate();
  const drift = TAGANDTALLY.interaction.drift.find((d) => roll.total >= d.min && roll.total <= d.max)?.steps ?? 0;
  const attitude = stepClamp(row.disposition + drift);
  await updateRow(actor, kind, index, { attitude, attitudeScene: currentSceneId() ?? "" });
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: game.i18n.format("TAGANDTALLY.Interaction.DriftResult", { name: row.name, drift: drift === 0 ? game.i18n.localize("TAGANDTALLY.Interaction.NoChange") : game.i18n.format("TAGANDTALLY.Interaction.Steps", { n: signed(drift) }), attitude: stepLabel(attitude) })
  });
  return { roll, drift, attitude };
}

/** Pathways for one side of the conversation, localized. */
function pathwayList(approach) {
  return TAGANDTALLY.interaction.pathways[approach].map((id, i) => ({
    id, n: i + 1,
    label: game.i18n.localize(`TAGANDTALLY.Interaction.Pathway.${id}.Label`),
    prompt: game.i18n.localize(`TAGANDTALLY.Interaction.Pathway.${id}.Prompt`)
  }));
}

/** Apply an outcome to the relation row and describe what changed. */
async function applyOutcome(actor, kind, index, effect) {
  const row = actor.system.relations[kind][index];
  if (!row) return null;
  switch (effect) {
    case "dispositionDown":
    case "dispositionUp": {
      const value = stepClamp(row.disposition + (effect === "dispositionUp" ? 1 : -1));
      if (value === row.disposition) return null;
      await updateRow(actor, kind, index, { disposition: value });
      return game.i18n.format("TAGANDTALLY.Interaction.Applied.Disposition", { from: stepLabel(row.disposition), to: stepLabel(value) });
    }
    case "attitudeDown": {
      const current = sceneAttitude(row);
      const value = stepClamp(current - 1);
      if (value === current) return null;
      await updateRow(actor, kind, index, { attitude: value, attitudeScene: currentSceneId() ?? "" });
      return game.i18n.format("TAGANDTALLY.Interaction.Applied.Attitude", { from: stepLabel(current), to: stepLabel(value) });
    }
    default:
      return null;
  }
}

/**
 * Run the interaction roll: task roll dialog with the disposition modifier
 * fixed, then the SRD outcome appended to the roll card and applied.
 */
export async function rollInteraction({ actor, target, kind, index, approach = "approach", pathway, question = "", level } = {}) {
  const row = actor.system.relations[kind][index];
  if (!row) return null;
  const modifier = TAGANDTALLY.relationSteps[row.disposition]?.modifier ?? 0;
  const dispositionName = game.i18n.format("TAGANDTALLY.Interaction.DispositionSource", { label: stepLabel(row.disposition) });
  const fixedEases = modifier > 0 ? [{ name: dispositionName, steps: modifier, source: "automatic" }] : [];
  const fixedHinders = modifier < 0 ? [{ name: dispositionName, steps: -modifier, source: "automatic" }] : [];
  const pathwayLabel = pathway ? game.i18n.localize(`TAGANDTALLY.Interaction.Pathway.${pathway}.Label`) : game.i18n.localize("TAGANDTALLY.Interaction.Conversation");
  const title = question ? `${pathwayLabel}: ${question}` : `${pathwayLabel} · ${row.name}`;
  const targetDoc = target ?? (row.uuid ? await fromUuid(row.uuid) : null);
  const interaction = { actorUuid: actor.uuid, targetUuid: targetDoc?.uuid ?? row.uuid, targetName: row.name, kind, index, approach, pathway, question };
  const result = await TaskRollDialog.prompt({ actor, level: level ?? defaultLevel(targetDoc), title, fixedEases, fixedHinders, context: { interaction } });
  if (!result) return null;

  const outcome = TAGANDTALLY.interaction.outcomes[approach][result.band.id];
  const applied = await applyOutcome(actor, kind, index, outcome.effect);
  const npcTarget = targetDoc?.documentName === "Actor" && targetDoc.type === "npc" && !targetDoc.system.creature ? targetDoc : null;
  const html = await foundry.applications.handlebars.renderTemplate("systems/tagandtally/templates/chat/interaction-outcome.hbs", {
    pathwayLabel, question, targetName: row.name,
    attitudeLabel: stepLabel(sceneAttitude(actor.system.relations[kind][index])),
    outcomeLabel: game.i18n.localize(outcome.label), outcomeText: game.i18n.localize(outcome.text),
    applied, insight: outcome.effect === "insight", npcTarget: Boolean(npcTarget)
  });
  await result.message.update({ content: `${result.message.content}${html}` });
  Hooks.callAll(`${SYSTEM_ID}.interaction`, { actor, target: targetDoc, kind, index, approach, pathway, question, result, outcome });
  return { ...result, outcome, applied };
}

function defaultLevel(target) {
  return target?.documentName === "Actor" && target.type === "npc" ? target.system.level : sceneLevel();
}

/** Which character interacts: the user's character, a controlled character token, or (GM) a pick. */
export async function pickCharacter() {
  const controlled = canvas?.tokens?.controlled.map((t) => t.actor).filter((a) => a?.type === "character") ?? [];
  if (controlled.length === 1) return controlled[0];
  if (game.user.character?.type === "character") return game.user.character;
  const { PartyOverview } = await import("./integrations/party.mjs");
  const candidates = game.actors.filter((a) => a.type === "character" && a.isOwner).sort((a, b) => Number(PartyOverview.isMember(b)) - Number(PartyOverview.isMember(a)) || a.name.localeCompare(b.name));
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];
  const options = candidates.map((a) => `<option value="${a.id}">${foundry.utils.escapeHTML(a.name)}</option>`).join("");
  const id = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("TAGANDTALLY.Interaction.Title") },
    content: `<div class="form-group"><label>${game.i18n.localize("TAGANDTALLY.Interaction.PickCharacter")}</label><select name="actor" autofocus>${options}</select></div>`,
    ok: { label: game.i18n.localize("TAGANDTALLY.Interaction.Interact"), callback: (ev, button) => button.form.elements.actor.value },
    rejectClose: false
  });
  return id ? game.actors.get(id) : null;
}

/** The Interact dialog. */
export class InteractDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, target, kind, index } = {}) {
    super({ window: { title: game.i18n.format("TAGANDTALLY.Interaction.WindowTitle", { name: actor.system.relations[kind][index]?.name ?? "?" }) } });
    this.actor = actor;
    this.target = target ?? null;
    this.kind = kind;
    this.index = index;
    this.talk = { approach: "approach", pathway: "", question: "", level: defaultLevel(target), rolled: null };
  }

  static DEFAULT_OPTIONS = {
    id: "tt-interact-{id}",
    classes: ["tagandtally", "interact"],
    tag: "form",
    position: { width: 560 },
    window: { icon: "fa-solid fa-comments", resizable: true },
    form: { handler: InteractDialog.#onSubmit, submitOnChange: false, closeOnSubmit: false },
    actions: {
      rollDrift: InteractDialog.#onRollDrift,
      pickPathway: InteractDialog.#onPickPathway,
      randomPathway: InteractDialog.#onRandomPathway,
      roll: InteractDialog.#onRoll,
      openTarget: InteractDialog.#onOpenTarget
    }
  };

  static PARTS = { form: { template: "systems/tagandtally/templates/apps/interact.hbs", scrollable: [".tt-interact-body"] } };

  /**
   * Open for a relation row ({actor, kind, index}) or for a target document
   * ({target, actor?}); the row is created on first contact.
   */
  static async open({ actor, target, kind, index } = {}) {
    if (!actor) actor = await pickCharacter();
    if (!actor) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Interaction.NoCharacter"));
    if (!actor.isOwner) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Interaction.NotOwner"));
    if (kind === undefined || index === undefined) {
      if (!target) return null;
      ({ kind, index } = await ensureRelation(actor, target, kind));
    }
    target ??= actor.system.relations[kind][index]?.uuid ? await fromUuid(actor.system.relations[kind][index].uuid) : null;
    const dialog = new InteractDialog({ actor, target, kind, index });
    return dialog.render({ force: true });
  }

  get row() { return this.actor.system.relations[this.kind][this.index]; }

  async _prepareContext() {
    const row = this.row;
    if (!row) { this.close(); return {}; }
    const attitude = sceneAttitude(row);
    const modifier = TAGANDTALLY.relationSteps[row.disposition]?.modifier ?? 0;
    const pathways = pathwayList(this.talk.approach).map((p) => ({ ...p, selected: p.id === this.talk.pathway }));
    return {
      row, actor: this.actor, target: this.target, talk: this.talk,
      img: row.img || this.target?.img || "icons/svg/mystery-man.svg",
      steps: TAGANDTALLY.relationSteps.map((s) => ({ ...s, label: game.i18n.localize(s.label), modifier: signed(s.modifier), selected: s.value === row.disposition })),
      modifier: signed(modifier), modifierClass: modifier > 0 ? "ease" : modifier < 0 ? "hinder" : "",
      attitudeLabel: stepLabel(attitude), attitudeDrifted: row.attitudeActive,
      pathways, isApproach: this.talk.approach === "approach", die: this.talk.approach === "approach" ? "1d10" : "1d6",
      levels: Object.entries(TAGANDTALLY.levels).map(([v, label]) => ({ value: Number(v), label: `${v}: ${game.i18n.localize(label)} (DC ${3 * v})`, selected: Number(v) === Number(this.talk.level) }))
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    // Listen inside the part (replaced on every render) so handlers do not pile up on the form root.
    this.element.querySelector(".tt-interact-part")?.addEventListener("change", async (ev) => {
      if (ev.target.name === "disposition") {
        await updateRow(this.actor, this.kind, this.index, { disposition: Number(ev.target.value) });
        return this.render();
      }
      this.#readForm();
      if (ev.target.name === "approach") { this.talk.pathway = ""; this.talk.question = ""; this.render(); }
    });
  }

  #readForm() {
    const data = new foundry.applications.ux.FormDataExtended(this.element).object;
    if (data.approach) this.talk.approach = data.approach;
    this.talk.question = data.question ?? this.talk.question;
    this.talk.level = Math.clamp(Number(data.level) || 1, 1, 10);
  }

  #setPathway(id) {
    this.talk.pathway = id;
    this.talk.question = game.i18n.localize(`TAGANDTALLY.Interaction.Pathway.${id}.Prompt`);
  }

  static async #onSubmit(event) { return InteractDialog.#onRoll.call(this, event); }

  static async #onRollDrift() {
    await rollDrift(this.actor, this.kind, this.index);
    this.render();
  }

  static #onPickPathway(event, target) {
    this.#readForm();
    this.#setPathway(target.dataset.id);
    this.render();
  }

  static async #onRandomPathway() {
    this.#readForm();
    const list = TAGANDTALLY.interaction.pathways[this.talk.approach];
    const roll = await new Roll(`1d${list.length}`).evaluate();
    this.#setPathway(list[roll.total - 1]);
    this.talk.rolled = roll.total;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: game.i18n.format("TAGANDTALLY.Interaction.PathwayRolled", { label: game.i18n.localize(`TAGANDTALLY.Interaction.Pathway.${this.talk.pathway}.Label`) }) });
    this.render();
  }

  static async #onOpenTarget() { return this.target?.sheet?.render({ force: true }); }

  static async #onRoll(event) {
    event?.preventDefault?.();
    this.#readForm();
    await this.close();
    return rollInteraction({ actor: this.actor, target: this.target, kind: this.kind, index: this.index, approach: this.talk.approach, pathway: this.talk.pathway, question: this.talk.question, level: this.talk.level });
  }
}

/** Chat buttons on interaction outcomes (GM: grant an insight on the NPC). */
export function registerInteractions() {
  Hooks.on(`${SYSTEM_ID}.chatAction`, async (action, message, el) => {
    if (action !== "interactionInsight") return;
    const key = el.dataset.key;
    const target = await fromUuid(message.getFlag(SYSTEM_ID, "interaction")?.targetUuid ?? "");
    if (!target || target.documentName !== "Actor" || !target.isOwner) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Chat.NoTarget"));
    const value = Math.min(TAGANDTALLY.insightsPerTally, (target.system.insights?.[key] ?? 0) + 1);
    await target.update({ [`system.insights.${key}`]: value, ...(value >= TAGANDTALLY.insightsPerTally ? { [`system.revealed.${key}`]: true } : {}) });
    ui.notifications.info(game.i18n.format("TAGANDTALLY.Interaction.InsightApplied", { name: target.name, key: game.i18n.localize(`TAGANDTALLY.Npc.${key}`) }));
  });
}
