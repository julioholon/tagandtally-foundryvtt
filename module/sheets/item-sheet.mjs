import { TAGANDTALLY } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class TagAndTallyItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["tagandtally", "sheet", "item"],
    position: { width: 560, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editImage: TagAndTallyItemSheet.#onEditImage,
      use: TagAndTallyItemSheet.#onUse,
      toChat: TagAndTallyItemSheet.#onToChat,
      toggleAxis: TagAndTallyItemSheet.#onToggleAxis,
      addStep: TagAndTallyItemSheet.#onAddStep,
      removeStep: TagAndTallyItemSheet.#onRemoveStep,
      generateSentence: TagAndTallyItemSheet.#onGenerateSentence
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
    }
    if (item.type === "wound") {
      context.tracks = Object.fromEntries(Object.entries(TAGANDTALLY.woundTracks).map(([k, v]) => [k, v.label]));
      context.damageTypes = TAGANDTALLY.damageTypes;
    }
    if (item.type === "quest") {
      context.statuses = TAGANDTALLY.questStatus;
    }
    return context;
  }

  async _preparePartContext(partId, context) {
    context.tab = context.tabs?.[partId];
    return context;
  }

  static async #onEditImage(event, target) {
    const attr = target.dataset.edit ?? "img";
    const current = foundry.utils.getProperty(this.document, attr);
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image", current,
      callback: (path) => this.document.update({ [attr]: path }),
      position: { top: this.position.top + 40, left: this.position.left + 10 }
    });
    return fp.browse();
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
      if (list.length >= max) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Spell.MaxAxes"));
      list.push(key);
    }
    return this.item.update({ [`system.${axis}`]: list });
  }

  static async #onAddStep() {
    const steps = [...this.item.system.steps, { text: "", done: false }];
    return this.item.update({ "system.steps": steps });
  }

  static async #onRemoveStep(event, target) {
    const steps = [...this.item.system.steps];
    steps.splice(Number(target.dataset.index), 1);
    return this.item.update({ "system.steps": steps });
  }

  static async #onGenerateSentence() {
    const { generateIntoItem } = await import("../sparks/create.mjs");
    return generateIntoItem(this.item);
  }
}
