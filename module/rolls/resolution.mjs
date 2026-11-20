import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";
import { sparkTables } from "../sparks/tables.mjs";

/**
 * Map a d20 total against a DC to an outcome band.
 * 1 = Fail-and; 2..DC-6 = Fail-but; DC-5..DC-1 = Success-but; DC..DC+4 = Success; DC+5+ = Success-and.
 */
export function bandFor(total, dc) {
  if (total <= 1) return TAGANDTALLY.bands.failAnd;
  if (total >= dc + 5) return TAGANDTALLY.bands.successAnd;
  if (total >= dc) return TAGANDTALLY.bands.success;
  if (total >= dc - 5) return TAGANDTALLY.bands.successBut;
  return TAGANDTALLY.bands.failBut;
}

/** The current scene's task level (GM sets it in Scene Config), default from settings. */
export function sceneLevel(scene = canvas?.scene ?? game.scenes?.active) {
  const flag = scene?.getFlag(SYSTEM_ID, "level");
  if (Number.isInteger(flag) && flag > 0) return Math.clamp(flag, 1, 10);
  return game.settings.get(SYSTEM_ID, "defaultLevel") ?? 3;
}

/**
 * Apply easing and hindering sources to a task level with Task Threshold rules.
 * - Each easing source counts once toward the threshold; its tier is how many steps it eases.
 * - At most 2 gear assets count. Scene, involuntary and automatic sources don't count.
 * - Hindrances apply after easing, stack, and have no cap.
 */
export function computeEffectiveLevel(level, eases = [], hinders = []) {
  level = Math.clamp(Number(level) || 1, 1, 10);
  const threshold = TAGANDTALLY.taskThreshold(level);
  const counted = [];
  const ignored = [];
  let gearCount = 0;
  let countedCount = 0;
  for (const e of eases) {
    const exempt = ["scene", "spell", "mai", "quest", "automatic", "phase"].includes(e.source);
    if (!exempt) {
      if (e.source === "gear") {
        if (gearCount >= TAGANDTALLY.maxGearAssets) { ignored.push({ ...e, reason: "gear" }); continue; }
        gearCount += 1;
      }
      if (countedCount >= threshold) { ignored.push({ ...e, reason: "threshold" }); continue; }
      countedCount += 1;
    }
    counted.push(e);
  }
  const easeSteps = counted.reduce((n, e) => n + (Number(e.steps) || 0), 0);
  const hinderSteps = hinders.reduce((n, h) => n + (Number(h.steps) || 0), 0);
  const effective = Math.clamp(level - easeSteps + hinderSteps, 1, 10);
  return { level, threshold, counted, ignored, hinders, easeSteps, hinderSteps, effective, dc: TAGANDTALLY.dcForLevel(effective) };
}

/**
 * Resolve a task roll, post a chat card and apply tallies.
 * @param {object} o
 * @param {Actor} [o.actor]
 * @param {number} o.level            task level before modifiers
 * @param {Array}  [o.eases]          [{name, steps, source, itemId}]
 * @param {Array}  [o.hinders]        [{name, steps, source, itemId}]
 * @param {string} [o.rollType="task"] Sparks resolution id (task, oracle, combat opening, ...)
 * @param {string} [o.title]
 * @param {Item}   [o.item]
 * @param {object} [o.context]        extra data stored on the message flags (combat flow etc.)
 */
export async function resolveRoll({ actor, level, eases = [], hinders = [], rollType = "task", title, item, context = {}, speaker } = {}) {
  const calc = computeEffectiveLevel(level, eases, hinders);
  const roll = await new Roll("1d20").evaluate();
  const total = roll.total;
  const band = bandFor(total, calc.dc);
  const natural = total === 1 ? 1 : total === 20 ? 20 : 0;

  // Tallies: natural 1 or 20 while using tags gives each used tiered tag a tally.
  const usedTagIds = [...calc.counted, ...hinders].filter((e) => e.source === "tag" && e.itemId).map((e) => e.itemId);
  let tallies = [];
  const autoTallies = game.settings.get(SYSTEM_ID, "autoTallies");
  if (natural && actor && usedTagIds.length && autoTallies) {
    tallies = await actor.addTallies(usedTagIds);
  }

  const details = sparkTables.resolutionDetail(rollType, band.id);
  const wound = rollType === "combat outcome" ? TAGANDTALLY.combatWound[band.id] : null;
  const templateData = {
    actor, item, title: title ?? game.i18n.localize("TAGANDTALLY.Roll.Task"),
    rollType, rollTypeLabel: sparkTables.resolutionLabel(rollType),
    calc, total, band, bandLabel: game.i18n.localize(band.label), natural, details,
    tallies, pendingTallies: natural && usedTagIds.length && !autoTallies ? usedTagIds : [],
    wound, woundLabel: wound ? game.i18n.localize(TAGANDTALLY.woundTracks[wound].label) : null,
    levelLabel: game.i18n.localize(TAGANDTALLY.levels[calc.level]),
    effectiveLabel: game.i18n.localize(TAGANDTALLY.levels[calc.effective]),
    config: TAGANDTALLY,
    mishap: rollType === "spellcasting" && band.id === "failAnd"
  };
  const content = await foundry.applications.handlebars.renderTemplate("systems/tagandtally/templates/chat/roll-card.hbs", templateData);
  const message = await ChatMessage.create({
    speaker: speaker ?? ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content,
    flavor: title,
    flags: {
      [SYSTEM_ID]: {
        type: "roll",
        rollType, band: band.id, total, dc: calc.dc, level: calc.level, effective: calc.effective,
        actorId: actor?.id, actorUuid: actor?.uuid, itemId: item?.id, wound,
        pendingTallies: templateData.pendingTallies,
        ...context
      }
    }
  });
  return { roll, total, band, calc, tallies, message, wound };
}

/** Oracle: likelihood as a level (5 = even odds). Even/odd yes-no helper too. */
export async function rollOracle({ level = 5, question = "", actor } = {}) {
  return resolveRoll({ actor, level, rollType: "oracle", title: question || game.i18n.localize("TAGANDTALLY.Roll.Oracle") });
}

export async function rollYesNo({ question = "" } = {}) {
  const roll = await new Roll("1d6").evaluate();
  const yes = roll.total % 2 === 0;
  return roll.toMessage({
    flavor: `${question ? `${question} ` : ""}${game.i18n.localize(yes ? "TAGANDTALLY.Roll.Yes" : "TAGANDTALLY.Roll.No")}`
  });
}

/** Scene tag check: even clears a temporary tag, odd keeps it. */
export async function rollTemporaryTag(item) {
  const roll = await new Roll("1d6").evaluate();
  const cleared = roll.total % 2 === 0;
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    flavor: game.i18n.format(cleared ? "TAGANDTALLY.Tag.TemporaryCleared" : "TAGANDTALLY.Tag.TemporaryStays", { name: item.name })
  });
  if (cleared) await item.delete();
  return cleared;
}
