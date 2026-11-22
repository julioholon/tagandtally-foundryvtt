import BaseActorSheet from "./base-actor-sheet.mjs";
import { TAGANDTALLY } from "../config.mjs";
import { handleRelationDrop, openRelation, syncQuestFromAugur, augurQuestView } from "../relations.mjs";

export default class CharacterSheet extends BaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["character"],
    actions: {
      buildSentence: CharacterSheet.#onBuildSentence,
      wealthStep: CharacterSheet.#onWealthStep,
      openParty: CharacterSheet.#onOpenParty,
      randomize: CharacterSheet.#onRandomize,
      rerollSlot: CharacterSheet.#onRerollSlot,
      openRelation: CharacterSheet.#onOpenRelation,
      removeRelation: CharacterSheet.#onRemoveRelation,
      addRelationRow: CharacterSheet.#onAddRelationRow,
      relationTally: CharacterSheet.#onRelationTally,
      syncQuest: CharacterSheet.#onSyncQuest
    }
  };

  static PARTS = {
    header: { template: "systems/tagandtally/templates/actor/parts/header-character.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: "systems/tagandtally/templates/actor/parts/tab-main.hbs", scrollable: [""] },
    tags: { template: "systems/tagandtally/templates/actor/parts/tab-tags.hbs", scrollable: [""] },
    lifestages: { template: "systems/tagandtally/templates/actor/parts/tab-lifestages.hbs", scrollable: [""] },
    inventory: { template: "systems/tagandtally/templates/actor/parts/tab-inventory.hbs", scrollable: [""] },
    spells: { template: "systems/tagandtally/templates/actor/parts/tab-spells.hbs", scrollable: [""] },
    quests: { template: "systems/tagandtally/templates/actor/parts/tab-quests.hbs", scrollable: [""] },
    relations: { template: "systems/tagandtally/templates/actor/parts/tab-relations.hbs", scrollable: [""] },
    wounds: { template: "systems/tagandtally/templates/actor/parts/tab-wounds.hbs", scrollable: [""] },
    biography: { template: "systems/tagandtally/templates/actor/parts/tab-biography.hbs", scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", icon: "fa-solid fa-user" },
        { id: "tags", icon: "fa-solid fa-tags" },
        { id: "lifestages", icon: "fa-solid fa-timeline" },
        { id: "inventory", icon: "fa-solid fa-suitcase" },
        { id: "spells", icon: "fa-solid fa-wand-sparkles" },
        { id: "quests", icon: "fa-solid fa-scroll" },
        { id: "relations", icon: "fa-solid fa-people-arrows" },
        { id: "wounds", icon: "fa-solid fa-heart-crack" },
        { id: "biography", icon: "fa-solid fa-book" }
      ],
      initial: "main",
      labelPrefix: "TAGANDTALLY.Tabs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const s = this.actor.system;
    context.lifeStages = TAGANDTALLY.lifeStages;
    context.dispositions = TAGANDTALLY.dispositions;
    context.qualityOfLife = TAGANDTALLY.qualityOfLife;
    context.wealthLabel = game.i18n.localize(s.wealth.label ?? "");
    context.loadout = s.loadout;
    context.mai = s.mai;
    const { LIFE_STAGE_ORDER, LIFE_STAGE_PLAN } = await import("../sparks/character-builder.mjs");
    const reached = LIFE_STAGE_ORDER.indexOf(s.lifeStage);
    const tags = this.actor.items.filter((i) => i.type === "tag" && !TAGANDTALLY.umbrellaTagTypes.includes(i.system.tagType));
    context.stages = LIFE_STAGE_ORDER.map((key, i) => ({
      key, label: TAGANDTALLY.lifeStages[key], reached: i <= reached, current: key === s.lifeStage,
      items: tags.filter((t) => t.system.lifeStage === key),
      plan: LIFE_STAGE_PLAN[key].map((p) => game.i18n.localize(TAGANDTALLY.tagTypes[p.tagType])).join(", ")
    }));
    context.unassignedTags = tags.filter((t) => !t.system.lifeStage);
    context.relationLists = Object.entries(TAGANDTALLY.relationKinds).map(([kind, def]) => ({
      kind, label: def.label, icon: def.icon,
      hasDisposition: kind !== "places", hasTally: kind === "people", isPlace: kind === "places",
      rows: s.relations[kind].map((row) => ({ ...row, img: row.img || "icons/svg/book.svg", steps: TAGANDTALLY.relationSteps.map((st) => ({ ...st, selected: st.value === row.disposition })) }))
    }));
    context.questAugur = Object.fromEntries(context.items.quest.filter((q) => q.system.augurUuid).map((q) => [q.id, augurQuestView(q.system.augurUuid)]));
    return context;
  }

  /** Relation rows are arrays in the form; merge each row over the stored one so unseen fields survive. */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    const rel = foundry.utils.getProperty(data, "system.relations");
    if (rel) {
      for (const kind of Object.keys(TAGANDTALLY.relationKinds)) {
        if (!rel[kind] || Array.isArray(rel[kind])) continue;
        const stored = this.actor.system._source.relations[kind];
        rel[kind] = stored.map((row, i) => ({ ...row, ...(rel[kind][i] ?? {}) }));
      }
    }
    return data;
  }

  /** Dropped journals and actors become relation rows; Augur quests become linked quest items. */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (this.isEditable && await handleRelationDrop(this.actor, data)) return;
    return super._onDrop?.(event);
  }

  static #onOpenRelation(event, target) { return openRelation(target.closest("[data-uuid]")?.dataset.uuid); }

  static async #onRemoveRelation(event, target) {
    const li = target.closest(".tt-relation");
    const rows = this.actor.system.relations[li.dataset.kind].map((r) => foundry.utils.deepClone(r));
    rows.splice(Number(li.dataset.index), 1);
    return this.actor.update({ [`system.relations.${li.dataset.kind}`]: rows });
  }

  static async #onAddRelationRow(event, target) {
    const kind = target.dataset.kind;
    const rows = this.actor.system.relations[kind].map((r) => foundry.utils.deepClone(r));
    rows.push(this.actor.system.constructor.blankRelation(kind));
    return this.actor.update({ [`system.relations.${kind}`]: rows });
  }

  static async #onRelationTally(event, target) {
    const li = target.closest(".tt-relation");
    const rows = this.actor.system.relations[li.dataset.kind].map((r) => foundry.utils.deepClone(r));
    const row = rows[Number(li.dataset.index)];
    const index = Number(target.dataset.index);
    row.tally = index < row.tally ? index : index + 1;
    return this.actor.update({ [`system.relations.${li.dataset.kind}`]: rows });
  }

  static async #onSyncQuest(event, target) {
    const item = this._getItem(target);
    if (item) return syncQuestFromAugur(item);
  }

  /** Fill the sentence fields from the umbrella tags on the sheet. */
  static async #onBuildSentence() {
    const update = {};
    for (const type of TAGANDTALLY.umbrellaTagTypes) {
      const tag = this.actor.items.find((i) => i.type === "tag" && i.system.tagType === type);
      if (tag) update[`system.sentence.${type}`] = tag.name;
    }
    return this.actor.update(update);
  }

  static async #onWealthStep(event, target) {
    const value = Math.clamp(this.actor.system.wealth.value + Number(target.dataset.delta), 0, 6);
    return this.actor.update({ "system.wealth.value": value });
  }

  static async #onRandomize() {
    const hasContent = this.actor.items.size > 0;
    if (hasContent) {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("TAGANDTALLY.Builder.Title") },
        content: `<p>${game.i18n.localize("TAGANDTALLY.Builder.Confirm")}</p>`
      });
      if (!ok) return;
    }
    const { buildRandomCharacter } = await import("../sparks/character-builder.mjs");
    return buildRandomCharacter(this.actor, { lifeStage: this.actor.system.lifeStage ?? "adult", keepName: !/^(New |Character)/.test(this.actor.name) && hasContent });
  }

  static async #onRerollSlot(event, target) {
    const { rerollSlot } = await import("../sparks/character-builder.mjs");
    return rerollSlot(this.actor, target.dataset.slot);
  }

  static async #onOpenParty() {
    const { PartyOverview } = await import("../integrations/party.mjs");
    return PartyOverview.open();
  }
}
