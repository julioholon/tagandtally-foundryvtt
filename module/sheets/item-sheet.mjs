import { TAGANDTALLY } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class TagAndTallyItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["tagandtally", "sheet", "item"],
    position: { width: 640, height: 680 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      use: TagAndTallyItemSheet.#onUse,
      toChat: TagAndTallyItemSheet.#onToChat,
      toggleAxis: TagAndTallyItemSheet.#onToggleAxis,
      rerollField: TagAndTallyItemSheet.#onRerollField,
      addStep: TagAndTallyItemSheet.#onAddStep,
      removeStep: TagAndTallyItemSheet.#onRemoveStep,
      rerollStep: TagAndTallyItemSheet.#onRerollStep,
      rollStep: TagAndTallyItemSheet.#onRollStep,
      revealLocation: TagAndTallyItemSheet.#onRevealLocation,
      rerollLocation: TagAndTallyItemSheet.#onRerollLocation,
      generateSentence: TagAndTallyItemSheet.#onGenerateSentence,
      setQuestTally: TagAndTallyItemSheet.#onSetQuestTally,
      rerollBuild: TagAndTallyItemSheet.#onRerollBuild,
      addAbility: TagAndTallyItemSheet.#onAddAbility,
      removeAbility: TagAndTallyItemSheet.#onRemoveAbility,
      applyBuild: TagAndTallyItemSheet.#onApplyBuild
    }
  };

  static PARTS = {
    header: { template: "systems/tagandtally/templates/item/item-sheet.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: { template: "systems/tagandtally/templates/item/parts/details.hbs", scrollable: [""] },
    description: { template: "systems/tagandtally/templates/item/parts/description.hbs", scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [{ id: "details", icon: "fa-solid fa-list" }, { id: "description", icon: "fa-solid fa-align-left" }],
      initial: "details",
      labelPrefix: "TAGANDTALLY.Tabs"
    }
  };

  /** Pick the details template per item type. */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.details = { ...parts.details, template: `systems/tagandtally/templates/item/parts/${this.item.type}.hbs` };
    return parts;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    const system = item.system;
    Object.assign(context, {
      item, system, config: TAGANDTALLY,
      fields: system.schema.fields,
      isGM: game.user.isGM,
      tabs: this._prepareTabs("primary"),
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.description ?? "", { relativeTo: item, secrets: item.isOwner }),
      sentenceText: system.sentenceText,
      hasActor: Boolean(item.actor)
    });
    if (item.type === "spell") {
      const S = TAGANDTALLY.spell;
      context.spell = {
        bases: Object.entries(S.bases).map(([k, p]) => ({ key: k, points: p, selected: system.base === k })),
        aspects: Object.entries(S.aspects).map(([k, p]) => ({ key: k, points: p, selected: system.aspects.includes(k) })),
        types: Object.entries(S.types).map(([k, p]) => ({ key: k, points: p, selected: system.types.includes(k) })),
        scopes: Object.fromEntries(Object.entries(S.scopes).map(([k, v]) => [k, `${game.i18n.localize(v.label)} (+${v.pm})`])),
        artifacts: Object.fromEntries(Object.entries(S.artifacts).map(([k, v]) => [k, game.i18n.localize(v.label)])),
        triggers: Object.fromEntries(Object.entries(S.triggers).map(([k, v]) => [k, game.i18n.localize(v.label)])),
        mai: item.actor?.system.mai?.total ?? null
      };
    }
    if (item.type === "gear") {
      context.armorClasses = Object.fromEntries(Object.entries(TAGANDTALLY.armorClasses).map(([k, v]) => [k, v.label]));
    }
    if (item.type === "tag") {
      context.tagTypes = TAGANDTALLY.tagTypes;
      context.tiers = TAGANDTALLY.tiers;
      context.lifeStages = { "": "", ...TAGANDTALLY.lifeStages };
      if (system.isBuilder) {
        const { BUILD_FIELDS } = await import("../species-types.mjs");
        const Kind = `${system.tagType.charAt(0).toUpperCase()}${system.tagType.slice(1)}`;
        context.build = {
          kind: system.tagType,
          title: `TAGANDTALLY.Build.${Kind}`,
          hint: `TAGANDTALLY.Build.Hint${Kind}`,
          fields: BUILD_FIELDS[system.tagType].map((f) => ({ key: f.key, label: `TAGANDTALLY.Build.${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}`, value: system.build[f.key] })),
          magic: { none: "TAGANDTALLY.Build.MagicNone", learn: "TAGANDTALLY.Build.MagicLearn", use: "TAGANDTALLY.Build.MagicUse" },
          abilities: system.build.abilities.map((a, i) => ({ ...a, index: i, needsFlaw: i >= 2 })),
          canApply: !item.actor && game.actors.some((a) => a.type === "character" && a.isOwner),
          canGrant: item.actor?.type === "character"
        };
      }
    }
    if (item.type === "wound") {
      context.tracks = Object.fromEntries(Object.entries(TAGANDTALLY.woundTracks).map(([k, v]) => [k, v.label]));
      context.damageTypes = TAGANDTALLY.damageTypes;
    }
    if (item.type === "quest") {
      context.statuses = TAGANDTALLY.questStatus;
      context.showLocation = game.user.isGM || system.locationRevealed;
    }
    return context;
  }

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.tab = context.tabs?.[partId];
    return context;
  }

  /** Quest steps are submitted as an object keyed by index; make sure they stay an array. */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    const steps = foundry.utils.getProperty(data, "system.steps");
    if (steps && !Array.isArray(steps)) foundry.utils.setProperty(data, "system.steps", Object.values(steps));
    // Only the GM ticks tasks by hand; players close them with a Task Roll (their disabled boxes are not submitted).
    const list = foundry.utils.getProperty(data, "system.steps");
    if (Array.isArray(list) && this.item.type === "quest" && !game.user.isGM) list.forEach((s, i) => { s.done = this.item.system.steps[i]?.done ?? false; });
    const abilities = foundry.utils.getProperty(data, "system.build.abilities");
    if (abilities && !Array.isArray(abilities)) foundry.utils.setProperty(data, "system.build.abilities", Object.values(abilities));
    return data;
  }

  static #onUse() { return this.item.use(); }
  static #onToChat() { return this.item.toChat(); }

  /** Toggle an aspect or type on a spell, respecting the caps. */
  static async #onToggleAxis(event, target) {
    const axis = target.dataset.axis; // aspects | types
    const key = target.dataset.key;
    const list = [...this.item.system[axis]];
    const idx = list.indexOf(key);
    if (idx >= 0) list.splice(idx, 1);
    else {
      const max = axis === "aspects" ? TAGANDTALLY.spell.maxAspects : TAGANDTALLY.spell.maxTypes;
      const other = axis === "aspects" ? this.item.system.types.length : this.item.system.aspects.length;
      if (list.length >= max || list.length + other >= TAGANDTALLY.spell.maxCombinedAxes) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Spell.MaxAxes"));
      list.push(key);
    }
    return this.item.update({ [`system.${axis}`]: list });
  }

  /** Reroll one tag-like field from its Sparks tables. */
  static async #onRerollField(event, target) {
    if (!this.item.isOwner) return;
    const { rerollItemField } = await import("../reroll.mjs");
    return rerollItemField(this.item, target.dataset.field);
  }

  /** + rolls a Verb Adjective Noun task, editable and rerollable before it is added. */
  static async #onAddStep() {
    const { addTaskInteractive } = await import("../quest-tasks.mjs");
    return addTaskInteractive(this.item);
  }

  static async #onRerollStep(event, target) {
    const { rerollTask } = await import("../quest-tasks.mjs");
    return rerollTask(this.item, Number(target.dataset.index));
  }

  static async #onRollStep(event, target) {
    const { rollTask } = await import("../quest-tasks.mjs");
    return rollTask(this.item, Number(target.dataset.index));
  }

  static async #onRevealLocation() {
    const { revealLocation } = await import("../quest-tasks.mjs");
    return revealLocation(this.item);
  }

  static async #onRerollLocation() {
    const { rollLocation } = await import("../quest-tasks.mjs");
    return rollLocation(this.item);
  }

  static async #onRemoveStep(event, target) {
    const steps = [...this.item.system.steps];
    steps.splice(Number(target.dataset.index), 1);
    return this.item.update({ "system.steps": steps });
  }

  /** Click a box to set the tally; clicking the last filled box takes one back. */
  static async #onSetQuestTally(event, target) {
    const key = target.dataset.key;
    const value = Number(target.dataset.value);
    const current = this.item.system.tallies[key]?.value ?? 0;
    return this.item.update({ [`system.tallies.${key}.value`]: value === current ? value - 1 : value });
  }

  static async #onRerollBuild(event, target) {
    const { rerollBuildField } = await import("../species-types.mjs");
    return rerollBuildField(this.item, target.dataset.key, Number(target.dataset.index));
  }

  static async #onAddAbility() {
    const { drawFlaw } = await import("../species-types.mjs");
    const build = this.item.system.build;
    const flaw = build.abilities.length >= 2 ? await drawFlaw(build) : "";
    const abilities = [...build.abilities, { name: "", text: "", flaw }];
    return this.item.update({ "system.build.abilities": abilities });
  }

  static async #onRemoveAbility(event, target) {
    const abilities = [...this.item.system.build.abilities];
    abilities.splice(Number(target.dataset.index), 1);
    return this.item.update({ "system.build.abilities": abilities });
  }

  static async #onApplyBuild() {
    const { applyBuilderItemDialog, syncBuilderGrants } = await import("../species-types.mjs");
    if (this.item.actor) return syncBuilderGrants(this.item.actor, this.item);
    return applyBuilderItemDialog(this.item);
  }

  static async #onGenerateSentence() {
    const { generateIntoItem } = await import("../sparks/create.mjs");
    return generateIntoItem(this.item);
  }
}
