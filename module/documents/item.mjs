import { TAGANDTALLY } from "../config.mjs";
import { resolveRoll } from "../rolls/resolution.mjs";
import { maiCheck } from "../spells/spell-calc.mjs";
import { TaskRollDialog } from "../rolls/task-roll-dialog.mjs";

export default class TagAndTallyItem extends Item {
  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    const defaults = {
      tag: "icons/svg/tag.svg",
      gear: "icons/svg/item-bag.svg",
      spell: "icons/svg/book.svg",
      quest: "icons/svg/target.svg",
      wound: "icons/svg/blood.svg"
    };
    if (!data.img || data.img === Item.DEFAULT_ICON) this.updateSource({ img: defaults[this.type] ?? Item.DEFAULT_ICON });
    // Flaws and conditions hinder by default.
    if (this.type === "tag" && !("hinders" in (data.system ?? {})) && TAGANDTALLY.hinderingTagTypes.includes(this.system.tagType)) {
      this.updateSource({ "system.hinders": true });
    }
  }

  /** Sentence text for chat and sheets. */
  get sentenceText() { return this.system.sentenceText ?? this.name; }

  /** Post the item to chat. */
  async toChat() {
    const content = await foundry.applications.handlebars.renderTemplate("systems/tagandtally/templates/chat/item-card.hbs", {
      item: this, system: this.system, config: TAGANDTALLY,
      description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.system.description ?? "", { relativeTo: this })
    });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content
    });
  }

  /**
   * Use the item: tags and gear open a task roll with themselves pre-selected,
   * spells run a casting roll, quests a resolution roll, wounds post to chat.
   */
  async use(options = {}) {
    const actor = this.actor;
    switch (this.type) {
      case "tag":
      case "gear":
        if (!actor) return this.toChat();
        return TaskRollDialog.prompt({ actor, preselected: [this.id], ...options });
      case "spell":
        return this.cast(options);
      case "quest":
        return this.rollResolution(options);
      default:
        return this.toChat();
    }
  }

  /** Cast a spell: spell level DC, MAI hindrance, artifact and overpowered modifiers. */
  async cast(options = {}) {
    const actor = this.actor;
    const s = this.system;
    const mai = actor?.system.mai?.total ?? 0;
    const check = s.triggered ? { required: false, hindrance: 0 } : maiCheck(s.finalLevel, mai);
    const hinders = [];
    const eases = [];
    if (check.hindrance) hinders.push({ name: game.i18n.format("TAGANDTALLY.Spell.MaiHindrance", { mai, level: s.finalLevel }), steps: check.hindrance, source: "mai" });
    if (s.overpoweredHindrance) hinders.push({ name: game.i18n.localize("TAGANDTALLY.Spell.Overpowered"), steps: s.overpoweredHindrance, source: "spell" });
    if (s.artifactEase > 0) eases.push({ name: game.i18n.localize(TAGANDTALLY.spell.artifacts[s.artifact].label), steps: s.artifactEase, source: "spell" });
    if (s.artifactEase < 0) hinders.push({ name: game.i18n.localize(TAGANDTALLY.spell.artifacts[s.artifact].label), steps: -s.artifactEase, source: "spell" });
    if (s.bloodMagic) eases.push({ name: game.i18n.localize("TAGANDTALLY.Spell.BloodMagic"), steps: TAGANDTALLY.spell.bloodMagicEase, source: "spell" });
    return TaskRollDialog.prompt({
      actor,
      level: s.finalLevel,
      rollType: "spellcasting",
      title: game.i18n.format("TAGANDTALLY.Spell.CastTitle", { name: this.name }),
      fixedEases: eases,
      fixedHinders: hinders,
      item: this,
      ...options
    });
  }

  /** Quest resolution roll with plan modifier. */
  async rollResolution(options = {}) {
    const actor = this.actor;
    const mod = this.system.resolutionModifier;
    const fixed = { fixedEases: [], fixedHinders: [] };
    if (mod > 0) fixed.fixedEases.push({ name: game.i18n.localize("TAGANDTALLY.Quest.PlanComplete"), steps: mod, source: "quest" });
    if (mod < 0) fixed.fixedHinders.push({ name: game.i18n.localize("TAGANDTALLY.Quest.PlanMissing"), steps: -mod, source: "quest" });
    return TaskRollDialog.prompt({
      actor,
      rollType: "quest",
      title: game.i18n.format("TAGANDTALLY.Quest.ResolveTitle", { name: this.name }),
      item: this,
      ...fixed,
      ...options
    });
  }

  /** Quick roll without dialog (used by macros). */
  async quickRoll(level, options = {}) {
    return resolveRoll({ actor: this.actor, level, item: this, ...options });
  }

  /** Tick a quest tally. */
  async tickTally(key, delta = 1) {
    if (this.type !== "quest") return this;
    const t = this.system.tallies[key];
    const value = Math.clamp(t.value + delta, 0, t.max);
    const update = { [`system.tallies.${key}.value`]: value };
    // Completing plan or location reduces the countdown by 1.
    if (delta > 0 && value >= t.max && t.value < t.max && key !== "countdown" && this.system.tallies.countdown.enabled) {
      update["system.tallies.countdown.value"] = Math.max(0, this.system.tallies.countdown.value - 1);
    }
    return this.update(update);
  }
}
