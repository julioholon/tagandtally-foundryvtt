import { TAGANDTALLY } from "../config.mjs";
import { htmlField, word, tidy } from "./shared.mjs";
import { computeSpell } from "../spells/spell-calc.mjs";

const fields = foundry.data.fields;

export default class SpellData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const str = () => new fields.StringField({ required: true, blank: true, initial: "" });
    return {
      descriptor: str(),
      base: new fields.StringField({ required: true, initial: "Order", choices: Object.keys(TAGANDTALLY.spell.bases) }),
      aspects: new fields.ArrayField(new fields.StringField({ choices: Object.keys(TAGANDTALLY.spell.aspects) }), { initial: ["Earth"] }),
      types: new fields.ArrayField(new fields.StringField({ choices: Object.keys(TAGANDTALLY.spell.types) }), { initial: ["Damage"] }),
      scope: new fields.StringField({ required: true, initial: "minor", choices: Object.keys(TAGANDTALLY.spell.scopes) }),
      artifact: new fields.StringField({ required: true, initial: "channeled", choices: Object.keys(TAGANDTALLY.spell.artifacts) }),
      trigger: new fields.StringField({ required: true, initial: "none", choices: Object.keys(TAGANDTALLY.spell.triggers) }),
      effect: str(),
      mastered: new fields.BooleanField({ initial: false }),
      masteryTallies: new fields.NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 }),
      bloodMagic: new fields.BooleanField({ initial: false }),
      /** Manual override of the computed level (0 = use computed). */
      levelOverride: new fields.NumberField({ required: true, integer: true, min: 0, max: 10, initial: 0 }),
      description: htmlField()
    };
  }

  prepareDerivedData() {
    const calc = computeSpell(this);
    Object.assign(this, calc);
    this.sentenceText = this.buildSentence();
  }

  buildSentence() {
    const name = this.parent?.name ?? "This spell";
    const t = (v) => (v ? `[${v}]` : "");
    return tidy(`${name} ${word("IsA", "is a")} ${t(this.descriptor)} ${t(this.base)} ${word("Spell", "spell")}${this.effect ? ` ${word("That", "that")} ${t(this.effect)}` : ""}.`);
  }
}
