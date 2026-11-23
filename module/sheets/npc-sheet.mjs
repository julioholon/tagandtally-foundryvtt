import BaseActorSheet from "./base-actor-sheet.mjs";
import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";

export default class NpcSheet extends BaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["npc"],
    position: { width: 680, height: 720 },
    actions: {
      reveal: NpcSheet.#onReveal,
      addInsight: NpcSheet.#onAddInsight,
      generateSentence: NpcSheet.#onGenerateSentence,
      levelStep: NpcSheet.#onLevelStep,
      openBarter: NpcSheet.#onOpenBarter,
      interact: NpcSheet.#onInteract
    }
  };

  static PARTS = {
    header: { template: "systems/tagandtally/templates/actor/parts/header-npc.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: "systems/tagandtally/templates/actor/parts/tab-npc-main.hbs", scrollable: [""] },
    tags: { template: "systems/tagandtally/templates/actor/parts/tab-tags.hbs", scrollable: [""] },
    inventory: { template: "systems/tagandtally/templates/actor/parts/tab-inventory.hbs", scrollable: [""] },
    spells: { template: "systems/tagandtally/templates/actor/parts/tab-spells.hbs", scrollable: [""] },
    wounds: { template: "systems/tagandtally/templates/actor/parts/tab-wounds.hbs", scrollable: [""] },
    biography: { template: "systems/tagandtally/templates/actor/parts/tab-biography.hbs", scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", icon: "fa-solid fa-dragon" },
        { id: "tags", icon: "fa-solid fa-tags" },
        { id: "inventory", icon: "fa-solid fa-suitcase" },
        { id: "spells", icon: "fa-solid fa-wand-sparkles" },
        { id: "wounds", icon: "fa-solid fa-heart-crack" },
        { id: "biography", icon: "fa-solid fa-book" }
      ],
      initial: "main",
      labelPrefix: "TAGANDTALLY.Tabs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const def = actor.system.hiddenDef;
    context.dispositions = TAGANDTALLY.dispositions;
    context.damageTypes = TAGANDTALLY.damageTypes;
    context.levels = TAGANDTALLY.levels;
    context.dc = actor.system.dc;
    context.levelLabel = game.i18n.localize(actor.system.levelLabel ?? "");
    context.canSee = Object.fromEntries(Object.keys(actor.system.sentence).map((k) => [k, actor.system.canSee(k)]));
    context.hiddenKeys = def.keys;
    context.insightKeys = def.insight;
    context.insightBoxes = Object.fromEntries(def.insight.map((k) => [k, Array.from({ length: TAGANDTALLY.insightsPerTally }, (_, i) => i < actor.system.insights[k])]));
    return context;
  }

  static async #onReveal(event, target) {
    const key = target.dataset.key;
    return this.actor.reveal(key, !this.actor.system.revealed[key]);
  }

  static async #onAddInsight(event, target) {
    const key = target.dataset.key;
    const index = Number(target.dataset.index);
    const current = this.actor.system.insights[key];
    const value = index < current ? index : index + 1;
    return this.actor.update({ [`system.insights.${key}`]: value, ...(value >= TAGANDTALLY.insightsPerTally ? { [`system.revealed.${key}`]: true } : {}) });
  }

  static async #onGenerateSentence() {
    const { generateInto } = await import("../sparks/create.mjs");
    return generateInto(this.actor, this.actor.system.creature ? "creature" : "npc");
  }

  static async #onOpenBarter() {
    const { BarterApp } = await import("../integrations/barter.mjs");
    return BarterApp.open({ merchant: this.actor });
  }

  static async #onInteract() {
    const { InteractDialog } = await import("../interactions.mjs");
    return InteractDialog.open({ target: this.actor });
  }

  static async #onLevelStep(event, target) {
    const value = Math.clamp(this.actor.system.level + Number(target.dataset.delta), 1, 10);
    return this.actor.update({ "system.level": value });
  }
}
