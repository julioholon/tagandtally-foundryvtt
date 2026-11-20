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
    this.item = item;
    this.context = context;
    this.resolvePromise = resolve;
    this.fixedEases = fixedEases;
    this.fixedHinders = fixedHinders;
    this.lockRollType = rollType !== "task";
    this.state = {
      title: title ?? "",
      rollType,
      level: level ?? sceneLevel(),
      manualEase: 0,
      manualHinder: 0,
      /** itemId -> "ease" | "hinder" | "" */
      selection: {}
    };
    for (const id of preselected) {
      const it = actor?.items.get(id);
      if (it) this.state.selection[id] = it.system.hinders ? "hinder" : "ease";
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
    for (const [id, mode] of Object.entries(this.state.selection)) {
      if (!mode) continue;
      const it = this.actor?.items.get(id);
      if (!it) continue;
      const entry = { name: it.name, steps: it.system.steps ?? 1, source: it.type === "gear" ? "gear" : it.system.tagType === "scene" ? "scene" : "tag", itemId: id };
      (mode === "hinder" ? hinders : eases).push(entry);
    }
    if (this.state.manualEase > 0) eases.push({ name: game.i18n.localize("TAGANDTALLY.Roll.ManualEase"), steps: this.state.manualEase, source: "manual" });
    if (this.state.manualHinder > 0) hinders.push({ name: game.i18n.localize("TAGANDTALLY.Roll.ManualHinder"), steps: this.state.manualHinder, source: "manual" });
    return { eases, hinders };
  }

  async _prepareContext() {
    await sparkTables.load();
    const { eases, hinders } = this.collect();
    const calc = computeEffectiveLevel(this.state.level, eases, hinders);
    const ignoredIds = new Set(calc.ignored.map((e) => e.itemId).filter(Boolean));
    const tags = (this.actor?.items.filter((i) => i.type === "tag") ?? []).map((i) => ({
      id: i.id, name: i.name, notation: i.system.notation, steps: i.system.steps, img: i.img,
      typeLabel: game.i18n.localize(TAGANDTALLY.tagTypes[i.system.tagType] ?? ""),
      mode: this.state.selection[i.id] ?? "", ignored: ignoredIds.has(i.id), hindersByDefault: i.system.hinders
    })).sort((a, b) => a.name.localeCompare(b.name));
    const gear = (this.actor?.items.filter((i) => i.type === "gear" && i.system.equipped) ?? []).map((i) => ({
      id: i.id, name: i.name, steps: i.system.steps, img: i.img,
      typeLabel: game.i18n.localize(TAGANDTALLY.gearTypes[i.system.gearType] ?? ""),
      mode: this.state.selection[i.id] ?? "", ignored: ignoredIds.has(i.id)
    }));
    const levels = Object.entries(TAGANDTALLY.levels).map(([v, label]) => ({ value: Number(v), label: `${v}: ${game.i18n.localize(label)} (DC ${3 * v})`, selected: Number(v) === Number(this.state.level) }));
    const rollTypes = sparkTables.resolutionTypes.filter((t) => !["yes no"].includes(t.id)).map((t) => ({ ...t, selected: t.id === this.state.rollType }));
    return {
      actor: this.actor, state: this.state, tags, gear, levels, rollTypes, calc,
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
    this.state.title = data.title ?? this.state.title;
    if (!this.lockRollType && data.rollType) this.state.rollType = data.rollType;
    this.state.level = Math.clamp(Number(data.level) || 1, 1, 10);
    this.state.manualEase = Math.max(0, Number(data.manualEase) || 0);
    this.state.manualHinder = Math.max(0, Number(data.manualHinder) || 0);
  }

  static async #onSubmit(event, form, formData) {
    this.#readForm();
    return TaskRollDialog.#onRoll.call(this, event);
  }

  static #onToggle(event, target) {
    this.#readForm();
    const id = target.dataset.itemId;
    const mode = target.dataset.mode;
    this.state.selection[id] = this.state.selection[id] === mode ? "" : mode;
    this.render();
  }

  static #onStepLevel(event, target) {
    this.#readForm();
    this.state.level = Math.clamp(this.state.level + Number(target.dataset.delta), 1, 10);
    this.render();
  }

  static async #onRoll(event) {
    event?.preventDefault?.();
    this.#readForm();
    const { eases, hinders } = this.collect();
    const result = await resolveRoll({
      actor: this.actor, level: this.state.level, eases, hinders,
      rollType: this.state.rollType, title: this.state.title || undefined, item: this.item, context: this.context
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
