import { TAGANDTALLY } from "../config.mjs";
import { htmlField, word, tidy } from "./shared.mjs";

const fields = foundry.data.fields;

/** A wound sentence: "This [damage] [injury] is a [descriptor] [mark] located on [body part] that [detriment]." */
export default class WoundData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const str = () => new fields.StringField({ required: true, blank: true, initial: "" });
    return {
      injuryType: new fields.StringField({ required: true, initial: "lingeringTrauma", choices: Object.keys(TAGANDTALLY.woundTracks) }),
      damageType: str(),
      descriptor: str(),
      mark: str(),
      bodyPart: str(),
      /** What the wound hinders, e.g. "hinders fine motor skills". */
      hinders: str(),
      healed: new fields.BooleanField({ initial: false }),
      description: htmlField()
    };
  }

  prepareDerivedData() {
    this.trackLabel = TAGANDTALLY.woundTracks[this.injuryType]?.label;
    this.severity = TAGANDTALLY.woundTracks[this.injuryType]?.severity ?? 0;
    const t = (v) => (v ? `[${v}]` : "");
    const trackName = game?.i18n?.localize?.(TAGANDTALLY.woundTracks[this.injuryType]?.label ?? "") || TAGANDTALLY.woundTrackSparkNames[this.injuryType];
    this.sentenceText = tidy(`${word("This", "This")} ${t(this.damageType)} ${t(trackName)} ${word("IsA", "is a")} ${t(this.descriptor)} ${t(this.mark)} ${word("LocatedOn", "located on")} ${t(this.bodyPart)} ${word("That", "that")} ${t(this.hinders)}.`);
  }
}
