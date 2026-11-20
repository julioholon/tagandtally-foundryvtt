import { TAGANDTALLY } from "../config.mjs";
import { woundsSchema, prepareWounds, wealthSchema, htmlField, levelField } from "./shared.mjs";

const fields = foundry.data.fields;

/**
 * NPCs and creatures share one actor type. `creature` toggles the creature
 * sentence (disposition/descriptor/type, motivation, attack, strength, weakness)
 * versus the NPC sentence (descriptor/species/type, does something, motivation, quest, secret).
 */
export default class NpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const str = () => new fields.StringField({ required: true, blank: true, initial: "" });
    return {
      creature: new fields.BooleanField({ initial: false }),
      level: levelField(3),
      sentence: new fields.SchemaField({
        disposition: str(),
        descriptor: str(),
        species: str(),
        type: str(),
        doesSomething: str(),
        motivation: str(),
        quest: str(),
        secret: str(),
        attack: str(),
        damageType: str(),
        specialAbility: str(),
        strength: str(),
        weakness: str()
      }),
      /** Hidden information revealed to players once true (or once insights fill a tally). */
      revealed: new fields.SchemaField({
        strength: new fields.BooleanField({ initial: false }),
        weakness: new fields.BooleanField({ initial: false }),
        secret: new fields.BooleanField({ initial: false })
      }),
      insights: new fields.SchemaField({
        strength: new fields.NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 }),
        weakness: new fields.NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 })
      }),
      attitude: new fields.StringField({ required: true, initial: "indifferent", choices: Object.keys(TAGANDTALLY.dispositions) }),
      wounds: woundsSchema(),
      wealth: wealthSchema(),
      /** Item Piles merchant flag helper; shops sell at cost level. */
      merchant: new fields.BooleanField({ initial: false }),
      biography: htmlField(),
      notes: htmlField()
    };
  }

  prepareDerivedData() {
    const actor = this.parent;
    prepareWounds(this, actor);
    this.dc = TAGANDTALLY.dcForLevel(this.level);
    this.levelLabel = TAGANDTALLY.levels[this.level];
    this.wealth.label = TAGANDTALLY.wealthLevels[this.wealth.value];
    for (const key of ["strength", "weakness"]) {
      if (this.insights[key] >= TAGANDTALLY.insightsPerTally) this.revealed[key] = true;
    }
    this.sentenceText = this.buildSentence(actor?.name);
  }

  buildSentence(name = "") {
    const s = this.sentence;
    const tag = (v) => (v ? `[${v}]` : null);
    if (this.creature) {
      const head = [s.disposition, s.descriptor, s.type].map(tag).filter(Boolean).join(" ");
      let text = `${name || "?"}${head ? ` (${head})` : ""}:`;
      if (s.motivation) text += ` This creature ${tag(s.motivation)}`;
      if (s.attack) text += ` and attacks with ${tag(s.attack)}${s.damageType ? ` for ${tag(s.damageType)} damage` : ""}`;
      text += ".";
      if (s.specialAbility) text += ` It features a unique ability to ${tag(s.specialAbility)}.`;
      return text;
    }
    const head = [s.descriptor, s.species, s.type].map(tag).filter(Boolean).join(" ");
    let text = `${name || "?"} is a ${head || "..."}`;
    if (s.doesSomething) text += ` who ${tag(s.doesSomething)}`;
    text += ".";
    if (s.motivation) text += ` They are motivated by ${tag(s.motivation)}`;
    if (s.quest) text += `${s.motivation ? " and" : " They"} want to ${tag(s.quest)}`;
    if (s.motivation || s.quest) text += ".";
    return text;
  }
}
