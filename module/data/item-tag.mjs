import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";
import { htmlField } from "./shared.mjs";

const fields = foundry.data.fields;

/**
 * A tag: "[Tag information N# (X) !:-]".
 * tier 1-4, tallies 0-4 toward the next tier, mastered once Tier 4 fills.
 */
export default class TagData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      tagType: new fields.StringField({ required: true, initial: "skill", choices: Object.keys(TAGANDTALLY.tagTypes) }),
      /** static tags never gain tiers; umbrella tags are sentence tags whose sub-tags tier. */
      category: new fields.StringField({ required: true, initial: "tiered", choices: ["tiered", "static", "umbrella"] }),
      tier: new fields.NumberField({ required: true, integer: true, min: 1, max: 4, initial: 1 }),
      tallies: new fields.NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 }),
      mastered: new fields.BooleanField({ initial: false }),
      temporary: new fields.BooleanField({ initial: false }),
      /** Reverse tags hinder instead of easing (flaws, conditions, scene hazards). */
      hinders: new fields.BooleanField({ initial: false }),
      /** Counts toward MAI when true (magical descriptor/type/specialty). */
      magical: new fields.BooleanField({ initial: false }),
      /** Umbrella parent tag id (for sub-tags under species/type/specialty). */
      parent: new fields.StringField({ required: true, blank: true, initial: "" }),
      lifeStage: new fields.StringField({ required: true, blank: true, initial: "" }),
      /** Spark table this item was generated from (enables reroll). */
      source: new fields.StringField({ required: true, blank: true, initial: "" }),
      description: htmlField()
    };
  }

  prepareDerivedData() {
    const isStatic = this.category === "static" || TAGANDTALLY.staticTagTypes.includes(this.tagType);
    this.isStatic = isStatic;
    this.isUmbrella = this.category === "umbrella" || TAGANDTALLY.umbrellaTagTypes.includes(this.tagType);
    this.canTier = !isStatic && !this.isUmbrella;
    /** Downtime/travel conditions such as Hangover hinder by their tier without earning tallies. */
    this.tieredCondition = Boolean(TAGANDTALLY.dayTags[this.parent?.flags?.[SYSTEM_ID]?.dayTag]?.tiered);
    /** Steps this tag eases (or hinders) a task. Static and umbrella tags count 1. */
    this.steps = this.canTier ? this.tier + (this.mastered ? 1 : 0) : this.tieredCondition ? this.tier : 1;
    this.tierLabel = TAGANDTALLY.tiers[this.tier];
    this.talliesMax = TAGANDTALLY.talliesPerTier;
    this.tallyBoxes = Array.from({ length: TAGANDTALLY.talliesPerTier }, (_, i) => i < this.tallies);
    this.notation = this.buildNotation();
  }

  buildNotation() {
    const name = this.parent?.name ?? "";
    if (!this.canTier) return `[${name}${this.tieredCondition && this.tier > 1 ? ` T${this.tier}` : ""}${this.temporary ? " :" : ""}${this.hinders ? " -" : ""}]`;
    let s = `[${name} T${this.tier > 1 ? this.tier : ""}`;
    if (this.tallies > 0) s += ` (${this.tallies})`;
    if (this.mastered) s += " !";
    if (this.temporary) s += " :";
    if (this.hinders) s += " -";
    return `${s}]`;
  }
}
