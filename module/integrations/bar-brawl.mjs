import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";

/**
 * Bar Brawl: give new tokens a vitality bar (wounds.vitality) plus a thin
 * strain bar, mirroring the Cypher system's default-bar approach.
 */
export function registerBarBrawl() {
  Hooks.on("preCreateToken", (document) => {
    if (!game.modules.get("barbrawl")?.active) return;
    if (!game.settings.get(SYSTEM_ID, "barBrawlDefaults")) return;
    const actor = document.actor;
    if (!actor || !["character", "npc"].includes(actor.type)) return;
    if (document.flags?.barbrawl?.resourceBars) return;
    const isPC = actor.type === "character";
    const bars = {
      bar1: {
        id: "bar1", order: 0, attribute: "wounds.vitality", mincolor: "#8b0000", maxcolor: "#2e8b57",
        position: "bottom-inner", otherVisibility: isPC ? CONST.TOKEN_DISPLAY_MODES.HOVER : CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        ownerVisibility: CONST.TOKEN_DISPLAY_MODES.ALWAYS, label: game.i18n.localize("TAGANDTALLY.Wound.Vitality")
      },
      bar2: {
        id: "bar2", order: 1, attribute: "wounds.strain", mincolor: "#c9a227", maxcolor: "#c9a227", invertDirection: true,
        position: "bottom-inner", otherVisibility: CONST.TOKEN_DISPLAY_MODES.NONE,
        ownerVisibility: CONST.TOKEN_DISPLAY_MODES.ALWAYS, label: game.i18n.localize(TAGANDTALLY.woundTracks.strain.label)
      }
    };
    document.updateSource({ "flags.barbrawl.resourceBars": bars });
  });
}

/** Macro helper: re-apply the default bars to all tokens of the selected actors. */
export async function resetBarBrawlDefaults() {
  for (const token of canvas.tokens.controlled) {
    await token.document.unsetFlag("barbrawl", "resourceBars");
    const data = token.document.toObject();
    delete data._id;
    const temp = new TokenDocument(data, { parent: canvas.scene });
    Hooks.callAll("preCreateToken", temp, data, {}, game.user.id);
    await token.document.update({ "flags.barbrawl.resourceBars": temp.flags.barbrawl?.resourceBars ?? {} });
  }
}
