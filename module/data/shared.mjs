import { TAGANDTALLY } from "../config.mjs";

const fields = foundry.data.fields;

/** A wound track: filled boxes out of a fixed maximum. */
export function woundTrackField(max) {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, integer: true, min: 0, max, initial: 0 })
  });
}

export function woundsSchema() {
  const schema = {};
  for (const [key, def] of Object.entries(TAGANDTALLY.woundTracks)) {
    schema[key] = woundTrackField(def.max);
  }
  return new fields.SchemaField(schema);
}

/**
 * Derived wound data shared by characters and creatures.
 * Adds max/filled per track, total, severity, vitality (for token bars) and
 * the text of the worst applying wound item.
 */
export function prepareWounds(system, actor) {
  const wounds = system.wounds;
  let total = 0;
  let max = 0;
  let severity = 0;
  for (const key of TAGANDTALLY.woundTrackOrder) {
    const def = TAGANDTALLY.woundTracks[key];
    const track = wounds[key];
    track.max = def.max;
    track.value = Math.clamp(track.value, 0, def.max);
    track.boxes = Array.from({ length: def.max }, (_, i) => i < track.value);
    track.label = def.label;
    total += track.value;
    max += def.max;
    if (track.value > 0) severity = Math.max(severity, def.severity);
  }
  if (wounds.lastingScar.value >= TAGANDTALLY.woundTracks.lastingScar.max) severity = 5;
  wounds.total = { value: total, max };
  wounds.vitality = { value: max - total, max };
  wounds.severity = severity;
  wounds.severityLabel = TAGANDTALLY.severityLabels[severity];
  // Worst wound item (highest track, most recent first).
  const woundItems = actor?.items?.filter((i) => i.type === "wound" && !i.system.healed) ?? [];
  const rank = (i) => TAGANDTALLY.woundTracks[i.system.injuryType]?.severity ?? 0;
  woundItems.sort((a, b) => rank(b) - rank(a) || (b.sort ?? 0) - (a.sort ?? 0));
  const worst = woundItems[0];
  wounds.worst = worst ? { id: worst.id, name: worst.name, hinders: worst.system.hinders, track: worst.system.injuryType } : null;
}

export function wealthSchema() {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, integer: true, min: 0, max: 6, initial: 3 }),
    qualityOfLife: new fields.NumberField({ required: true, integer: true, min: -1, max: 1, initial: 0 }),
    inDebt: new fields.BooleanField({ initial: false })
  });
}

export function htmlField() {
  return new fields.HTMLField({ required: true, blank: true, initial: "" });
}

export function levelField(initial = 1) {
  return new fields.NumberField({ required: true, integer: true, min: 1, max: 10, initial });
}
