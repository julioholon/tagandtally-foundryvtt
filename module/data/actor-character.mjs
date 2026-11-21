import { TAGANDTALLY } from "../config.mjs";
import { woundsSchema, prepareWounds, wealthSchema, htmlField } from "./shared.mjs";

const fields = foundry.data.fields;

export default class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // "Name is a [descriptor] [species] [type] who [specialty]."
      sentence: new fields.SchemaField({
        descriptor: new fields.StringField({ required: true, blank: true, initial: "" }),
        species: new fields.StringField({ required: true, blank: true, initial: "" }),
        type: new fields.StringField({ required: true, blank: true, initial: "" }),
        specialty: new fields.StringField({ required: true, blank: true, initial: "" })
      }),
      lifeStage: new fields.StringField({ required: true, initial: "youngAdult", choices: Object.keys(TAGANDTALLY.lifeStages) }),
      age: new fields.NumberField({ required: true, integer: true, min: 0, initial: 22 }),
      pronoun: new fields.StringField({ required: true, blank: true, initial: "" }),
      wounds: woundsSchema(),
      wealth: wealthSchema(),
      mai: new fields.SchemaField({
        base: new fields.NumberField({ required: true, integer: true, min: 0, max: 10, initial: 0 }),
        bonus: new fields.NumberField({ required: true, integer: true, min: 0, max: 3, initial: 0 })
      }),
      appearance: new fields.SchemaField({
        height: new fields.StringField({ required: true, blank: true, initial: "" }),
        build: new fields.StringField({ required: true, blank: true, initial: "" }),
        hair: new fields.StringField({ required: true, blank: true, initial: "" }),
        eyes: new fields.StringField({ required: true, blank: true, initial: "" }),
        skin: new fields.StringField({ required: true, blank: true, initial: "" }),
        clothing: new fields.StringField({ required: true, blank: true, initial: "" }),
        voice: new fields.StringField({ required: true, blank: true, initial: "" }),
        distinguishing: new fields.StringField({ required: true, blank: true, initial: "" })
      }),
      lore: new fields.SchemaField({
        residence: new fields.StringField({ required: true, blank: true, initial: "" }),
        workplace: new fields.StringField({ required: true, blank: true, initial: "" }),
        faction: new fields.StringField({ required: true, blank: true, initial: "" }),
        factionDisposition: new fields.StringField({ required: true, initial: "indifferent", choices: Object.keys(TAGANDTALLY.dispositions) }),
        knownNpcs: new fields.StringField({ required: true, blank: true, initial: "" })
      }),
      arc: new fields.StringField({ required: true, blank: true, initial: "" }),
      biography: htmlField(),
      notes: htmlField()
    };
  }

  prepareDerivedData() {
    const actor = this.parent;
    prepareWounds(this, actor);
    const items = actor?.items ?? [];
    const magicalTags = items.filter((i) => i.type === "tag" && i.system.magical).length;
    this.mai.bonus = Math.min(3, magicalTags);
    this.mai.total = this.mai.base + this.mai.bonus;
    const gear = items.filter((i) => i.type === "gear");
    this.loadout = {
      value: gear.filter((i) => i.system.kind === "extraordinary").reduce((n, i) => n + (i.system.quantity || 1), 0),
      max: TAGANDTALLY.loadoutSlots,
      ephemeral: gear.filter((i) => i.system.kind === "ephemeral").length,
      ephemeralMax: TAGANDTALLY.ephemeralCap
    };
    this.wealth.label = TAGANDTALLY.wealthLevels[this.wealth.value];
    this.wealth.climbCost = TAGANDTALLY.coins.climbCost(this.wealth.value);
    this.wealth.cashOut = TAGANDTALLY.coins.cashOut(this.wealth.value);
    this.wealth.canClimb = this.wealth.value < 6 && this.wealth.coins >= this.wealth.climbCost;
    this.wealth.dc = TAGANDTALLY.dcForLevel(this.wealth.value) || 0;
    this.sentenceText = this.buildSentence(actor?.name);
  }

  buildSentence(name = "") {
    const s = this.sentence;
    const parts = [s.descriptor, s.species, s.type].filter(Boolean).map((p) => `[${p}]`);
    let text = `${name || "?"} is a ${parts.join(" ") || "..."}`;
    if (s.specialty) text += ` who ${s.specialty.startsWith("[") ? s.specialty : `[${s.specialty}]`}`;
    return `${text}.`;
  }
}
