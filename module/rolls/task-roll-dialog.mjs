import { TAGANDTALLY } from "../config.mjs";
import { computeEffectiveLevel, resolveRoll, sceneLevel } from "./resolution.mjs";
import { sparkTables } from "../sparks/tables.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * The task roll dialog: pick the task level, tick the tags and gear that
 * apply (easing or hindering), see the Task Threshold and DC update live, roll.
 */
export class TaskRollDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, level, rollType = "task", title, preselected = [], fixedEases = [], fixedHinders = [], item, context = {}, resolve } = {}) {
    super({ window: { title: title ?? game.i18n.localize("TAGANDTALLY.Roll.Task") } });
    this.actor = actor;
    // Unlinked tokens get a copy of the actor at placement time; if that copy has no tags, read them from the world actor.
    const base = actor?.isToken ? game.actors.get(actor.id) : null;
    this.itemActor = base && !actor.items.some((i) => i.type === "tag") ? base : actor;
    this.item = item;
    this.rollContext = context;
    this.resolvePromise = resolve;
    this.fixedEases = fixedEases;
    this.fixedHinders = fixedHinders;
    this.lockRollType = rollType !== "task";
    this.rollState = {
      title: title ?? "",
      rollType,
      level: level ?? sceneLevel(),
      manualEase: 0,
      manualHinder: 0,
      /** itemId -> "ease" | "hinder" | "" */
      selection: {}
    };
    for (const id of preselected) {
      const it = this.itemActor?.items.get(id);
      if (it) this.rollState.selection[id] = it.system.hinders ? "hinder" : "ease";
    }
  }

  static DEFAULT_OPTIONS = {
    id: "tt-task-roll-{id}",
    classes: ["tagandtally", "task-roll"],
    tag: "form",
    position: { width: 520 },
    window: { icon: "fa-solid fa-dice-d20", resizable: true },
    form: { handler: TaskRollDialog.#onSubmit, submitOnChange: false, closeOnSubmit: false },
    actions: {
      roll: TaskRollDialog.#onRoll,
      toggle: TaskRollDialog.#onToggle,
      stepLevel: TaskRollDialog.#onStepLevel
    }
  };

  static PARTS = {
    form: { template: "systems/tagandtally/templates/apps/task-roll.hbs", scrollable: [".tt-roll-body"] }
  };

  /** Open the dialog and resolve with the roll result (or null when closed). */
  static prompt(options = {}) {
    return new Promise((resolve) => {
      const dialog = new TaskRollDialog({ ...options, resolve });
      dialog.render({ force: true });
    });
  }

  /** Gather eases/hinders from state. */
  collect() {
    const eases = [...this.fixedEases];
    const hinders = [...this.fixedHinders];
    for (const [id, mode] of Object.entries(this.rollState.selection)) {
      if (!mode) continue;
      const virtual = this.sentenceTags().find((t) => t.id === id);
      if (virtual) { (mode === "hinder" ? hinders : eases).push({ name: virtual.name, steps: virtual.steps, source: "tag", itemId: id }); continue; }
      const it = this.itemActor?.items.get(id);
      if (!it) continue;
      const entry = { name: it.name, steps: it.system.steps ?? 1, source: it.type === "gear" ? "gear" : it.system.tagType === "scene" ? "scene" : "tag", itemId: id };
      (mode === "hinder" ? hinders : eases).push(entry);
    }
    if (this.rollState.manualEase > 0) eases.push({ name: game.i18n.localize("TAGANDTALLY.Roll.ManualEase"), steps: this.rollState.manualEase, source: "manual" });
    if (this.rollState.manualHinder > 0) hinders.push({ name: game.i18n.localize("TAGANDTALLY.Roll.ManualHinder"), steps: this.rollState.manualHinder, source: "manual" });
    return { eases, hinders };
  }

  /**
   * NPC and creature sentence words are tags (SRD): offer every filled sentence
   * field as a one-step tag. The weakness hinders by default.
   */
  sentenceTags() {
    const actor = this.itemActor;
    if (actor?.type !== "npc") return [];
    const hidden = new Set(["secret"]);
    return Object.entries(actor.system.sentence ?? {})
      .filter(([key, value]) => String(value ?? "").trim() && !hidden.has(key))
      .filter(([key]) => actor.system.canSee?.(key) !== false)
      .map(([key, value]) => ({
        id: `sentence:${key}`, name: String(value).trim(), steps: 1, notation: "",
        typeLabel: TaskRollDialog.#sentenceLabel(key),
        hindersByDefault: key === "weakness"
      }));
  }

  static #sentenceLabel(key) {
    const cap = key.charAt(0).toUpperCase() + key.slice(1);
    for (const k of [`TAGANDTALLY.Npc.${cap}`, `TAGANDTALLY.TagType.${cap}`, `TAGANDTALLY.Npc.${key}`, `TAGANDTALLY.Gear.${cap}`]) if (game.i18n.has(k)) return game.i18n.localize(k);
    return cap.replace(/([A-Z])/g, " $1").trim();
  }

  async _prepareContext() {
    await sparkTables.load();
    const { eases, hinders } = this.collect();
    const calc = computeEffectiveLevel(this.rollState.level, eases, hinders);
    const ignoredIds = new Set(calc.ignored.map((e) => e.itemId).filter(Boolean));
    const tags = (this.itemActor?.items.filter((i) => i.type === "tag") ?? []).map((i) => ({
      id: i.id, name: i.name, notation: i.system.notation, steps: i.system.steps, img: i.img,
      typeLabel: game.i18n.localize(TAGANDTALLY.tagTypes[i.system.tagType] ?? ""),
      mode: this.rollState.selection[i.id] ?? "", ignored: ignoredIds.has(i.id), hindersByDefault: i.system.hinders
    }));
    for (const t of this.sentenceTags()) tags.push({ ...t, mode: this.rollState.selection[t.id] ?? "", ignored: ignoredIds.has(t.id) });
    tags.sort((a, b) => a.name.localeCompare(b.name));
    const gear = (this.itemActor?.items.filter((i) => i.type === "gear" && i.system.equipped) ?? []).map((i) => ({
      id: i.id, name: i.name, steps: i.system.steps, img: i.img,
      typeLabel: game.i18n.localize(TAGANDTALLY.gearTypes[i.system.gearType] ?? ""),
      mode: this.rollState.selection[i.id] ?? "", ignored: ignoredIds.has(i.id)
    }));
    const levels = Object.entries(TAGANDTALLY.levels).map(([v, label]) => ({ value: Number(v), label: `${v}: ${game.i18n.localize(label)} (DC ${3 * v})`, selected: Number(v) === Number(this.rollState.level) }));
    const rollTypes = sparkTables.resolutionTypes.filter((t) => !["yes no"].includes(t.id)).map((t) => ({ ...t, selected: t.id === this.rollState.rollType }));
    return {
      actor: this.actor, state: this.rollState, tags, gear, levels, rollTypes, calc,
      fixedEases: this.fixedEases, fixedHinders: this.fixedHinders,
      effectiveLabel: game.i18n.localize(TAGANDTALLY.levels[calc.effective]),
      hasActor: Boolean(this.actor),
      lockRollType: this.lockRollType
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    // Live update on any input change.
    this.element.querySelector(".tt-roll-part")?.addEventListener("change", (ev) => {
      if (ev.target.matches("[data-action]")) return;
      this.#readForm();
      this.render();
    });
  }

  #readForm() {
    const fd = new foundry.applications.ux.FormDataExtended(this.element);
    const data = fd.object;
    this.rollState.title = data.title ?? this.rollState.title;
    if (!this.lockRollType && data.rollType) this.rollState.rollType = data.rollType;
    this.rollState.level = Math.clamp(Number(data.level) || 1, 1, 10);
    this.rollState.manualEase = Math.max(0, Number(data.manualEase) || 0);
    this.rollState.manualHinder = Math.max(0, Number(data.manualHinder) || 0);
  }

  static async #onSubmit(event, form, formData) {
    this.#readForm();
    return TaskRollDialog.#onRoll.call(this, event);
  }

  static #onToggle(event, target) {
    this.#readForm();
    const id = target.dataset.itemId;
    const mode = target.dataset.mode;
    this.rollState.selection[id] = this.rollState.selection[id] === mode ? "" : mode;
    this.render();
  }

  static #onStepLevel(event, target) {
    this.#readForm();
    this.rollState.level = Math.clamp(this.rollState.level + Number(target.dataset.delta), 1, 10);
    this.render();
  }

  static async #onRoll(event) {
    event?.preventDefault?.();
    this.#readForm();
    const { eases, hinders } = this.collect();
    const result = await resolveRoll({
      actor: this.actor, tallyActor: this.itemActor, level: this.rollState.level, eases, hinders,
      rollType: this.rollState.rollType, title: this.rollState.title || undefined, item: this.item, context: this.rollContext
    });
    this.resolvePromise?.(result);
    this.resolvePromise = null;
    return this.close();
  }

  async close(options) {
    this.resolvePromise?.(null);
    return super.close(options);
  }
}
