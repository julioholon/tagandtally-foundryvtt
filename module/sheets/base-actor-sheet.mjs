import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";
import { rollTemporaryTag } from "../rolls/resolution.mjs";
import { createWoundItemFromSpark, generateAppearanceFor } from "../sparks/create.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** Shared behaviour for character and NPC sheets. */
export default class BaseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["tagandtally", "sheet", "actor"],
    position: { width: 760, height: 780 },
    window: { resizable: true, icon: "fa-solid fa-tags" },
    form: { submitOnChange: true },
    actions: {
      rollTask: BaseActorSheet.#onRollTask,
      rollInjury: BaseActorSheet.#onRollInjury,
      openCombatFlow: BaseActorSheet.#onOpenCombatFlow,
      createItem: BaseActorSheet.#onCreateItem,
      editItem: BaseActorSheet.#onEditItem,
      deleteItem: BaseActorSheet.#onDeleteItem,
      chatItem: BaseActorSheet.#onChatItem,
      useItem: BaseActorSheet.#onUseItem,
      toggleTally: BaseActorSheet.#onToggleTally,
      setTier: BaseActorSheet.#onSetTier,
      toggleEquipped: BaseActorSheet.#onToggleEquipped,
      changeQuantity: BaseActorSheet.#onChangeQuantity,
      woundBox: BaseActorSheet.#onWoundBox,
      addWound: BaseActorSheet.#onAddWound,
      rest: BaseActorSheet.#onRest,
      questTally: BaseActorSheet.#onQuestTally,
      toggleHealed: BaseActorSheet.#onToggleHealed,
      rollTemporary: BaseActorSheet.#onRollTemporary,
      generateAppearance: BaseActorSheet.#onGenerateAppearance,
      openSparks: BaseActorSheet.#onOpenSparks,
      sentenceToChat: BaseActorSheet.#onSentenceToChat,
      rerollItem: BaseActorSheet.#onRerollItem,
      addStageTag: BaseActorSheet.#onAddStageTag
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const system = actor.system;
    const enrich = (html) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", { relativeTo: actor, secrets: actor.isOwner });
    Object.assign(context, {
      actor, system, config: TAGANDTALLY,
      fields: system.schema.fields,
      isGM: game.user.isGM,
      owner: actor.isOwner,
      limited: actor.limited,
      tabs: this._prepareTabs("primary"),
      enriched: { biography: await enrich(system.biography), notes: await enrich(system.notes) },
      items: this._prepareItems(),
      wounds: system.wounds,
      severityLabel: game.i18n.localize(system.wounds.severityLabel ?? ""),
      sentenceText: system.sentenceText
    });
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.tab = context.tabs?.[partId];
    return context;
  }

  /**
   * Drag items off the sheet (to the hotbar or other sheets). Dropping onto the
   * sheet is handled natively by ActorSheetV2 on v14; v13 gets a fallback.
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const nativeDrop = typeof this._onDropItem === "function" || typeof this._onDrop === "function";
    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".tt-item[data-item-id]",
      dropSelector: nativeDrop ? ".tt-never" : null,
      permissions: { dragstart: () => this.isEditable, drop: () => this.isEditable && !nativeDrop },
      callbacks: { dragstart: this.#onDragStartItem.bind(this), drop: this.#onDropV13.bind(this) }
    }).bind(this.element);
  }

  #onDragStartItem(event) {
    const item = this._getItem(event.currentTarget);
    if (!item) return;
    event.dataTransfer.setData("text/plain", JSON.stringify(item.toDragData()));
  }

  async #onDropV13(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== "Item") return;
    const item = await Item.implementation.fromDropData(data);
    if (!item) return;
    if (item.parent === this.actor) return; // same sheet: ignore (no manual sorting on v13)
    return this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
  }

  _prepareItems() {
    const byType = { tag: [], gear: [], spell: [], quest: [], wound: [] };
    for (const item of this.actor.items) {
      if (!(item.type in byType)) continue;
      byType[item.type].push(item);
    }
    for (const list of Object.values(byType)) list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
    const tagGroups = {};
    for (const tag of byType.tag) {
      const key = tag.system.tagType;
      (tagGroups[key] ??= { key, label: TAGANDTALLY.tagTypes[key] ?? key, items: [] }).items.push(tag);
    }
    const order = Object.keys(TAGANDTALLY.tagTypes);
    return {
      ...byType,
      tagGroups: Object.values(tagGroups).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)),
      sentenceTags: byType.tag.filter((t) => TAGANDTALLY.umbrellaTagTypes.includes(t.system.tagType)),
      activeWounds: byType.wound.filter((w) => !w.system.healed),
      healedWounds: byType.wound.filter((w) => w.system.healed),
      equippedGear: byType.gear.filter((g) => g.system.equipped)
    };
  }

  /* -------------------------------- Helpers ------------------------------- */

  _getItem(target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    return id ? this.actor.items.get(id) : null;
  }

  /* -------------------------------- Actions ------------------------------- */

  static async #onRollTask() { return this.actor.rollTask(); }

  static async #onRollInjury() {
    const { CombatFlow } = await import("../combat/combat-flow.mjs");
    return CombatFlow.rollInjury(this.actor);
  }

  static async #onOpenCombatFlow() {
    const { CombatFlow } = await import("../combat/combat-flow.mjs");
    return CombatFlow.open({ actors: [this.actor] });
  }

  static async #onCreateItem(event, target) {
    const type = target.dataset.type ?? "tag";
    const system = {};
    if (target.dataset.tagType) system.tagType = target.dataset.tagType;
    if (target.dataset.gearType) system.gearType = target.dataset.gearType;
    if (target.dataset.injuryType) system.injuryType = target.dataset.injuryType;
    if (target.dataset.lifeStage) system.lifeStage = target.dataset.lifeStage;
    const name = game.i18n.format("TAGANDTALLY.NewItem", { type: game.i18n.localize(CONFIG.Item.typeLabels[type] ?? type) });
    const [item] = await this.actor.createEmbeddedDocuments("Item", [{ name, type, system }]);
    return item?.sheet.render({ force: true });
  }

  static #onEditItem(event, target) { return this._getItem(target)?.sheet.render({ force: true }); }

  static async #onDeleteItem(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    if (event.shiftKey) return item.delete();
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("TAGANDTALLY.DeleteItem") },
      content: `<p>${game.i18n.format("TAGANDTALLY.DeleteItemConfirm", { name: item.name })}</p>`
    });
    if (ok) return item.delete();
  }

  static #onChatItem(event, target) { return this._getItem(target)?.toChat(); }
  static #onUseItem(event, target) { return this._getItem(target)?.use(); }

  static async #onToggleTally(event, target) {
    const item = this._getItem(target);
    if (!item || item.type !== "tag") return;
    const index = Number(target.dataset.index);
    const current = item.system.tallies;
    const value = index < current ? index : index + 1;
    if (value >= TAGANDTALLY.talliesPerTier) return this.actor.addTallies([item.id], value - current);
    return item.update({ "system.tallies": value });
  }

  static async #onSetTier(event, target) {
    const item = this._getItem(target);
    if (!item || item.type !== "tag") return;
    const tier = Math.clamp(Number(target.dataset.tier), 1, 4);
    return item.update({ "system.tier": tier });
  }

  static async #onToggleEquipped(event, target) {
    const item = this._getItem(target);
    return item?.update({ "system.equipped": !item.system.equipped });
  }

  static async #onChangeQuantity(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const q = Math.max(0, (item.system.quantity ?? 0) + Number(target.dataset.delta));
    return item.update({ "system.quantity": q });
  }

  /** Click a wound box: fill up to it, or clear it if it is the last filled. */
  static async #onWoundBox(event, target) {
    const track = target.dataset.track;
    const index = Number(target.dataset.index);
    const current = this.actor.system.wounds[track].value;
    const value = index < current ? index : index + 1;
    return this.actor.update({ [`system.wounds.${track}.value`]: value });
  }

  /** Add a wound to a track with overflow, and generate a wound sentence for serious wounds. */
  static async #onAddWound(event, target) {
    const track = target.dataset.track;
    const result = await this.actor.applyWound(track);
    const filled = result.filled[0];
    if (!filled) return ui.notifications.warn(game.i18n.format("TAGANDTALLY.Chat.Dying", { name: this.actor.name }));
    if (filled !== "strain" && !event.shiftKey) await createWoundItemFromSpark(this.actor, { injuryType: filled });
    if (result.dying) ui.notifications.warn(game.i18n.format("TAGANDTALLY.Chat.Dying", { name: this.actor.name }));
  }

  static async #onRest(event, target) { return this.actor.rest(target.dataset.mode); }

  static async #onQuestTally(event, target) {
    const item = this._getItem(target);
    if (!item || item.type !== "quest") return;
    const key = target.dataset.key;
    const index = Number(target.dataset.index);
    const current = item.system.tallies[key].value;
    const value = index < current ? index : index + 1;
    return item.tickTally(key, value - current);
  }

  static async #onToggleHealed(event, target) {
    const item = this._getItem(target);
    return item?.update({ "system.healed": !item.system.healed });
  }

  static async #onRollTemporary(event, target) {
    const item = this._getItem(target);
    if (item) return rollTemporaryTag(item);
  }

  static async #onGenerateAppearance() {
    return generateAppearanceFor(this.actor);
  }

  static async #onOpenSparks() {
    const { SparksApp } = await import("../sparks/sparks-app.mjs");
    return SparksApp.open({ actor: this.actor });
  }

  static async #onRerollItem(event, target) {
    const item = this._getItem(target);
    if (!item) return;
    const { rerollItem } = await import("../sparks/character-builder.mjs");
    return rerollItem(item);
  }

  static async #onAddStageTag(event, target) {
    const { addRandomStageTag } = await import("../sparks/character-builder.mjs");
    return addRandomStageTag(this.actor, target.dataset.lifeStage, target.dataset.tagType);
  }

  static async #onSentenceToChat() {
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="tagandtally chat-card"><p class="tt-sentence">${this.actor.system.sentenceText.replace(/\[([^\]]+)\]/g, '<span class="tt-tag">$1</span>')}</p></div>`
    });
  }
}
