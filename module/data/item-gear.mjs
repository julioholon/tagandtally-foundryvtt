import { TAGANDTALLY } from "../config.mjs";
import { htmlField, levelField, word, tidy } from "./shared.mjs";

const fields = foundry.data.fields;

export default class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const str = () => new fields.StringField({ required: true, blank: true, initial: "" });
    return {
      gearType: new fields.StringField({ required: true, initial: "item", choices: Object.keys(TAGANDTALLY.gearTypes) }),
      kind: new fields.StringField({ required: true, initial: "extraordinary", choices: Object.keys(TAGANDTALLY.gearKinds) }),
      level: levelField(3),
      /** "Name is a [descriptor] [material] [type] that [special]." */
      sentence: str(),
      descriptor: str(),
      material: str(),
      subtype: str(),
      special: str(),
      damageType: str(),
      armorClass: new fields.StringField({ required: true, initial: "none", choices: Object.keys(TAGANDTALLY.armorClasses) }),
      consumableMode: new fields.StringField({ required: true, initial: "singleUse", choices: Object.keys(TAGANDTALLY.consumableModes) }),
      quantity: new fields.NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      equipped: new fields.BooleanField({ initial: true }),
      /** Cost level 0-6 for Wealth checks and Item Piles pricing. */
      cost: new fields.NumberField({ required: true, integer: true, min: 0, max: 6, initial: 2 }),
      /** Container capacity (items) when gearType is container. */
      capacity: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      /** Spark table this item was generated from (enables reroll). */
      source: new fields.StringField({ required: true, blank: true, initial: "" }),
      description: htmlField()
    };
  }

  prepareDerivedData() {
    this.levelLabel = TAGANDTALLY.gearLevels[this.level];
    this.costLabel = TAGANDTALLY.costLevels[this.cost];
    /** Price in coins for the optional coins mode and Item Piles. */
    this.coinPrice = TAGANDTALLY.coins.priceForCost(this.cost);
    this.armor = TAGANDTALLY.armorClasses[this.armorClass];
    this.isWeapon = this.gearType === "weapon";
    this.isArmor = this.gearType === "armor";
    this.isConsumable = this.gearType === "consumable";
    this.isContainer = this.gearType === "container";
    /** Gear eases a task by 1 as an asset; armor eases defense by its class. */
    this.steps = this.isArmor ? (this.armor?.defense ?? 1) : 1;
    const hasFields = Boolean(this.descriptor || this.material || this.subtype || this.special || this.damageType);
    this.sentenceText = hasFields || !this.sentence ? this.buildSentence() : this.sentence;
  }

  buildSentence() {
    const name = this.parent?.name ?? "This item";
    const t = (v) => (v ? `[${v}]` : "");
    const head = [this.descriptor, this.material, this.subtype].map(t).filter(Boolean).join(" ");
    return tidy(this.#sentence(name, t, head));
  }

  #sentence(name, t, head) {
    switch (this.gearType) {
      case "weapon":
        return `${name} ${word("IsA", "is a")} ${head} ${word("ThatDoes", "that does")} ${t(this.damageType)} ${word("Damage", "damage")}${this.special ? ` ${word("And", "and")} ${t(this.special)}` : ""}.`;
      default:
        return `${name} ${word("IsA", "is a")} ${head || `[${game?.i18n?.localize?.(TAGANDTALLY.gearTypes[this.gearType]) ?? this.gearType}]`}${this.special ? ` ${word("That", "that")} ${t(this.special)}` : ""}.`;
    }
  }
}
