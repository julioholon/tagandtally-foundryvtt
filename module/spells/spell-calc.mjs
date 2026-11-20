import { TAGANDTALLY } from "../config.mjs";

/**
 * Compute spell points, level, power modifier, final level and casting modifiers.
 * Ported from the Tag & Tally spell-creation rules.
 * @param {object} s  spell data: base, aspects[], types[], scope, artifact, trigger, mastered, levelOverride
 */
export function computeSpell(s) {
  const S = TAGANDTALLY.spell;
  const aspects = (s.aspects ?? []).slice(0, S.maxAspects);
  const types = (s.types ?? []).slice(0, S.maxTypes);
  const basePoints = S.bases[s.base] ?? 0;
  const aspectPoints = aspects.reduce((n, a) => n + (S.aspects[a] ?? 0), 0);
  const typePoints = types.reduce((n, t) => n + (S.types[t] ?? 0), 0);
  const additionalAxes = Math.max(0, aspects.length + types.length - 2);
  const axisCost = S.additionalAxisCost.slice(0, additionalAxes).reduce((n, c) => n + c, 0);
  const points = basePoints + aspectPoints + typePoints + axisCost;
  const multiAxis = additionalAxes > 0;
  const requiresChaos = multiAxis && s.base !== "Chaos";

  let level = 0;
  for (const r of S.levelRanges) {
    if (points >= r.min && (r.max === null || points <= r.max)) { level = r.level; break; }
  }
  if (points < S.levelRanges[0].min) level = 1;
  if (s.levelOverride > 0) level = s.levelOverride;

  const pm = S.scopes[s.scope]?.pm ?? 0;
  const tm = S.triggers[s.trigger]?.tm ?? 0;
  const artifact = S.artifacts[s.artifact] ?? S.artifacts.channeled;
  const triggered = artifact.canTrigger && tm > 0;
  const effectiveLevel = Math.max(1, level + pm - (triggered ? tm : 0) - (s.mastered ? 1 : 0));
  const finalLevel = Math.min(10, effectiveLevel);
  let overpowered = 0;
  if (effectiveLevel >= 16) overpowered = 3;
  else if (effectiveLevel >= 13) overpowered = 2;
  else if (effectiveLevel >= 11) overpowered = 1;
  /** Hindrance from being overpowered: 11-12 = 1 step, 13-15 = 2 steps, 16+ = 3 steps. */
  const overpoweredHindrance = overpowered;

  return {
    points, basePoints, aspectPoints, typePoints, axisCost, additionalAxes,
    multiAxis, requiresChaos, level, pm, tm, triggered,
    effectiveLevel, finalLevel, overpowered, overpoweredHindrance,
    artifactEase: artifact.ease,
    canMishap: artifact.mishap,
    dc: TAGANDTALLY.dcForLevel(finalLevel),
    levelLabel: TAGANDTALLY.levels[finalLevel]
  };
}

/**
 * Hindrance a caster suffers from the MAI check: none below MAI, else by bracket.
 * @returns {{ required: boolean, hindrance: number, diff: number }}
 */
export function maiCheck(spellLevel, mai) {
  const diff = spellLevel - (Number(mai) || 0);
  if (diff < 0) return { required: false, hindrance: 0, diff };
  return { required: true, hindrance: TAGANDTALLY.spell.maiHindrance(diff), diff };
}
