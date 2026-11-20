import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";
import { generate } from "../sparks/engine.mjs";
import { createWoundItemFromSpark } from "../sparks/create.mjs";

/** Wire the buttons on roll and spark chat cards. */
export function registerChatHooks() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const flags = message.getFlag(SYSTEM_ID, "type") ? message.flags[SYSTEM_ID] : null;
    if (!flags) return;
    html.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", (ev) => onChatAction(ev, message, el));
    });
    // Hide GM-only parts for players.
    if (!game.user.isGM) html.querySelectorAll(".tt-gm-only").forEach((el) => el.remove());
  });
}

async function resolveActor(message) {
  const uuid = message.getFlag(SYSTEM_ID, "actorUuid");
  if (uuid) return fromUuid(uuid);
  const id = message.getFlag(SYSTEM_ID, "actorId");
  return id ? game.actors.get(id) : null;
}

async function onChatAction(event, message, el) {
  event.preventDefault();
  const action = el.dataset.action;
  const actor = await resolveActor(message);
  switch (action) {
    case "applyTallies": {
      const ids = message.getFlag(SYSTEM_ID, "pendingTallies") ?? [];
      if (!actor || !ids.length) return;
      const summary = await actor.addTallies(ids);
      ui.notifications.info(game.i18n.format("TAGANDTALLY.Chat.TalliesApplied", { count: summary.length }));
      await message.setFlag(SYSTEM_ID, "pendingTallies", []);
      el.remove();
      break;
    }
    case "applyWound": {
      const track = el.dataset.track ?? message.getFlag(SYSTEM_ID, "wound");
      const targets = actor ? [actor] : canvas.tokens.controlled.map((t) => t.actor).filter(Boolean);
      if (!targets.length) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Chat.NoTarget"));
      for (const t of targets) {
        if (!t.isOwner) continue;
        const result = await t.applyWound(track);
        const filled = result.filled[0];
        ui.notifications.info(game.i18n.format("TAGANDTALLY.Chat.WoundApplied", { name: t.name, track: game.i18n.localize(TAGANDTALLY.woundTracks[filled].label) }));
        if (result.dying) ui.notifications.warn(game.i18n.format("TAGANDTALLY.Chat.Dying", { name: t.name }));
        if (el.dataset.sentence === "true") {
          await createWoundItemFromSpark(t, { injuryType: filled, damageType: el.dataset.damageType });
        }
      }
      break;
    }
    case "rollMishap": {
      const r = await generate("spell-mishap", {}).catch(() => null);
      let text;
      if (r) text = r.text;
      else {
        const { sparkTables } = await import("../sparks/tables.mjs");
        const verb = await sparkTables.roll("spell-mishap-verb");
        const noun = await sparkTables.roll("spell-mishap-noun");
        text = `[${verb?.value}] [${noun?.value}]`;
      }
      await ChatMessage.create({
        speaker: message.speaker,
        content: `<div class="tagandtally chat-card"><h3>${game.i18n.localize("TAGANDTALLY.Spell.Mishap")}</h3><p>${text.replace(/\[([^\]]+)\]/g, '<span class="tt-tag">$1</span>')}</p></div>`
      });
      break;
    }
    case "reroll": {
      // Re-run the same roll (GM Intrusion style re-rolls are not a T&T rule, but useful at the table).
      const { resolveRoll } = await import("./resolution.mjs");
      await resolveRoll({ actor, level: message.getFlag(SYSTEM_ID, "effective"), rollType: message.getFlag(SYSTEM_ID, "rollType"), title: message.flavor });
      break;
    }
    default:
      Hooks.callAll(`${SYSTEM_ID}.chatAction`, action, message, el, actor);
  }
}
