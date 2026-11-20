import { TAGANDTALLY } from "../config.mjs";
import { htmlField } from "./shared.mjs";

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
    this.sentenceText = `This ${t(this.damageType)} ${t(TAGANDTALLY.woundTrackSparkNames[this.injuryType])} is a ${t(this.descriptor)} ${t(this.mark)} located on ${t(this.bodyPart)} that ${t(this.hinders)}.`.replace(/\s+/g, " ");
  }
}
