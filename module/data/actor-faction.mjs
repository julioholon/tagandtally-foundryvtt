import { TAGANDTALLY } from "../config.mjs";
import { htmlField, word, tidy } from "./shared.mjs";

const fields = foundry.data.fields;

/**
 * SRD Faction: "Name is a [descriptor] [organization type] that [core function] and [has a goal].
 * Despite their outward reputation, they [have a secret]."
 * The goal runs on a phase timer: six phases, a tally of 5 each, and once the players know the
 * goal a countdown of 10 that thwarts the current phase when it fills.
 */
export default class FactionData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const str = () => new fields.StringField({ required: true, blank: true, initial: "" });
    const counter = (max) => new fields.NumberField({ required: true, integer: true, min: 0, max, initial: 0 });
    return {
      sentence: new fields.SchemaField({
        descriptor: str(),
        organizationType: str(),
        coreFunction: str(),
        goal: str(),
        secret: str()
      }),
      headquarters: str(),
      /** Hidden until learned through insights (or shown to owners / GMs). */
      revealed: new fields.SchemaField({
        goal: new fields.BooleanField({ initial: false }),
        secret: new fields.BooleanField({ initial: false }),
        headquarters: new fields.BooleanField({ initial: false })
      }),
      /** 1-6 phases, 7 = End. */
      phase: new fields.NumberField({ required: true, integer: true, min: 1, max: TAGANDTALLY.faction.phases.length, initial: 1 }),
      tally: counter(TAGANDTALLY.faction.tallyMax),
      /** The countdown runs only once the players know the goal (revealed.goal). */
      countdown: counter(TAGANDTALLY.faction.countdownMax),
      /** When the countdown fills: reset it with the phase tally (true) or let it stay full (SRD variant). */
      countdownResets: new fields.BooleanField({ initial: true }),
      /** UUIDs of faction actors this faction works against (thwart mechanism). */
      rivals: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
      /** Augur Nexus faction journal this actor was imported from. */
      augurUuid: str(),
      source: str(),
      log: new fields.ArrayField(new fields.SchemaField({
        text: str(),
        phase: new fields.NumberField({ required: true, integer: true, min: 1, initial: 1 }),
        day: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
      })),
      biography: htmlField(),
      notes: htmlField()
    };
  }

  prepareDerivedData() {
    const F = TAGANDTALLY.faction;
    this.phaseDef = F.phases[this.phase - 1] ?? F.phases[0];
    this.isEnd = Boolean(this.phaseDef.end);
    this.tallyBoxes = Array.from({ length: F.tallyMax }, (_, i) => i < this.tally);
    this.countdownBoxes = Array.from({ length: F.countdownMax }, (_, i) => i < this.countdown);
    this.countdownActive = this.revealed.goal && !this.isEnd;
    this.sentenceText = this.buildSentence();
  }

  buildSentence({ hideSecret = false, hideGoal = false } = {}) {
    const name = this.parent?.name ?? "This faction";
    const t = (v) => (v ? `[${v}]` : "");
    const s = this.sentence;
    const head = [s.descriptor, s.organizationType].map(t).filter(Boolean).join(" ");
    let text = `${name} ${word("IsA", "is a")} ${head}`;
    if (s.coreFunction) text += ` ${word("That", "that")} ${t(s.coreFunction)}`;
    if (s.goal && !hideGoal) text += ` ${word("And", "and")} ${t(s.goal)}`;
    text += ".";
    if (s.secret && !hideSecret) text += ` ${game.i18n.localize("TAGANDTALLY.Faction.DespiteReputation")} ${t(s.secret)}.`;
    return tidy(text);
  }
}
