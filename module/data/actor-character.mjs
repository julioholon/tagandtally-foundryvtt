import { TAGANDTALLY } from "../config.mjs";
import { woundsSchema, prepareWounds, wealthSchema, htmlField, word, tidy } from "./shared.mjs";
import { currentSceneId, sceneAttitude } from "../relations.mjs";

const fields = foundry.data.fields;

/** One row of a relations list: a linked document (optional) plus the character's view of it. */
function relationRow({ disposition = false, tally = false, place = false } = {}) {
  const schema = {
    uuid: new fields.StringField({ required: true, blank: true, initial: "" }),
    name: new fields.StringField({ required: true, blank: true, initial: "" }),
    img: new fields.StringField({ required: true, blank: true, initial: "" }),
    notes: new fields.StringField({ required: true, blank: true, initial: "" })
  };
  if (disposition) {
    schema.disposition = new fields.NumberField({ required: true, integer: true, min: 0, max: TAGANDTALLY.relationSteps.length - 1, initial: TAGANDTALLY.relationDefault });
    /** Temporary attitude for the current scene (null = same as disposition). Set by the Drift roll. */
    schema.attitude = new fields.NumberField({ required: false, nullable: true, integer: true, min: 0, max: TAGANDTALLY.relationSteps.length - 1, initial: null });
    /** Scene the attitude was rolled in; elsewhere the disposition stands. */
    schema.attitudeScene = new fields.StringField({ required: true, blank: true, initial: "" });
  }
  if (tally) schema.tally = new fields.NumberField({ required: true, integer: true, min: 0, max: TAGANDTALLY.relationTallyMax, initial: 0 });
  if (place) {
    schema.visited = new fields.BooleanField({ initial: true });
    schema.safeZone = new fields.BooleanField({ initial: false });
  }
  return new fields.SchemaField(schema);
}

/** Old free-text "Known world" fields → relation rows (0.3.0). */
const LEGACY_DISPOSITION = { hostile: 1, unfriendly: 4, indifferent: 5, friendly: 7, allied: 9 };

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
      /** Known world: factions, people and places the character has a relation with. */
      relations: new fields.SchemaField({
        factions: new fields.ArrayField(relationRow({ disposition: true })),
        people: new fields.ArrayField(relationRow({ disposition: true, tally: true })),
        places: new fields.ArrayField(relationRow({ place: true }))
      }),
      biography: htmlField(),
      notes: htmlField(),
      /** Old "Character arc" text, parked here by migrateData until the world migration turns it into a quest. */
      legacyArc: new fields.StringField({ required: true, blank: true, initial: "" })
    };
  }

  /** @override */
  static migrateData(source) {
    if (source.lore && !source.relations) {
      const lore = source.lore;
      const row = (kind, data) => ({ ...this.blankRelation(kind), ...data });
      const relations = { factions: [], people: [], places: [] };
      if (lore.faction) relations.factions.push(row("factions", { name: lore.faction, disposition: LEGACY_DISPOSITION[lore.factionDisposition] ?? TAGANDTALLY.relationDefault }));
      for (const name of String(lore.knownNpcs ?? "").split(/[,;]/).map((n) => n.trim()).filter(Boolean)) relations.people.push(row("people", { name }));
      if (lore.residence) relations.places.push(row("places", { name: lore.residence, notes: "Residence" }));
      if (lore.workplace) relations.places.push(row("places", { name: lore.workplace, notes: "Workplace" }));
      source.relations = relations;
    }
    if (typeof source.arc === "string" && source.arc && !source.legacyArc) source.legacyArc = source.arc;
    return super.migrateData(source);
  }

  /** A relation row with every field at its default (partial updates are not cleaned until reload). */
  static blankRelation(kind) {
    return this.schema.getField(`relations.${kind}.element`).getInitialValue();
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
    for (const kind of Object.keys(TAGANDTALLY.relationKinds)) {
      for (const row of this.relations[kind]) {
        if ("disposition" in row) {
          const step = TAGANDTALLY.relationSteps[row.disposition] ?? TAGANDTALLY.relationSteps[TAGANDTALLY.relationDefault];
          row.stepLabel = step.label;
          row.modifier = step.modifier;
          row.attitudeActive = row.attitude !== null && row.attitude !== undefined && (!row.attitudeScene || row.attitudeScene === currentSceneId());
          row.attitudeValue = sceneAttitude(row);
          row.attitudeLabel = row.attitudeActive ? TAGANDTALLY.relationSteps[row.attitude]?.label : null;
        }
        if ("tally" in row) row.tallyBoxes = Array.from({ length: TAGANDTALLY.relationTallyMax }, (_, i) => i < row.tally);
      }
    }
  }

  buildSentence(name = "") {
    const s = this.sentence;
    const parts = [s.descriptor, s.species, s.type].filter(Boolean).map((p) => `[${p}]`);
    let text = `${name || "?"} ${word("IsA", "is a")} ${parts.join(" ") || "..."}`;
    if (s.specialty) text += ` ${word("Who", "who")} ${s.specialty.startsWith("[") ? s.specialty : `[${s.specialty}]`}`;
    return tidy(`${text}.`);
  }
}
