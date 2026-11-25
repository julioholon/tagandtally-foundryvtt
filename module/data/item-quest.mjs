import { TAGANDTALLY } from "../config.mjs";
import { htmlField } from "./shared.mjs";

const fields = foundry.data.fields;

function tally(max) {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 }),
    max: new fields.NumberField({ required: true, integer: true, min: 0, initial: max }),
    enabled: new fields.BooleanField({ initial: true })
  });
}

export default class QuestData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const str = () => new fields.StringField({ required: true, blank: true, initial: "" });
    return {
      questType: str(),
      objective: str(),
      goal: str(),
      reward: str(),
      consequence: str(),
      status: new fields.StringField({ required: true, initial: "active", choices: Object.keys(TAGANDTALLY.questStatus) }),
      isArc: new fields.BooleanField({ initial: false }),
      /** UUID of an Augur Nexus quest journal this quest mirrors (objectives shown read-only). */
      augurUuid: str(),
      /** Spark table this item was generated from (enables reroll). */
      source: new fields.StringField({ required: true, blank: true, initial: "" }),
      /** The quest's hidden Location (a Sparks sentence), shown once the Location tally fills or the GM reveals it. */
      locationName: str(),
      locationText: str(),
      locationRevealed: new fields.BooleanField({ initial: false }),
      tallies: new fields.SchemaField({
        plan: tally(TAGANDTALLY.questTallies.plan.max),
        location: tally(TAGANDTALLY.questTallies.location.max),
        countdown: tally(TAGANDTALLY.questTallies.countdown.max)
      }),
      steps: new fields.ArrayField(new fields.SchemaField({
        text: new fields.StringField({ required: true, blank: true, initial: "" }),
        done: new fields.BooleanField({ initial: false })
      })),
      description: htmlField()
    };
  }

  prepareDerivedData() {
    for (const [key, t] of Object.entries(this.tallies)) {
      t.value = Math.clamp(t.value, 0, t.max);
      t.boxes = Array.from({ length: t.max }, (_, i) => i < t.value);
      t.complete = t.max > 0 && t.value >= t.max;
      t.label = TAGANDTALLY.questTallies[key].label;
    }
    const plan = this.tallies.plan;
    /** Missing plan marks hinder the resolution roll; a full plan eases it by 1. */
    this.resolutionModifier = !plan.enabled ? 0 : plan.complete ? 1 : -(plan.max - plan.value);
    this.readyToResolve = (!plan.enabled || plan.complete) && (!this.tallies.location.enabled || this.tallies.location.complete);
    this.sentenceText = `${this.questType ? `[${this.questType}]` : ""} ${this.objective ? `[${this.objective}]` : ""}`.trim();
  }
}
