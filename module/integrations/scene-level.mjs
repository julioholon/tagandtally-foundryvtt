import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";

/**
 * Adds a "Scene level" field to the Scene configuration. The task roll dialog
 * defaults to this level, and generated creatures take it as their level.
 */
export function registerSceneLevel() {
  Hooks.on("renderSceneConfig", (app, html) => {
    const root = html instanceof HTMLElement ? html : html[0];
    if (!root || root.querySelector(".tt-scene-level")) return;
    const scene = app.document;
    const current = scene.getFlag(SYSTEM_ID, "level") ?? "";
    const options = Object.entries(TAGANDTALLY.levels).map(([v, l]) => `<option value="${v}" ${String(current) === v ? "selected" : ""}>${v}: ${game.i18n.localize(l)} (DC ${3 * v})</option>`).join("");
    const group = document.createElement("div");
    group.className = "form-group tt-scene-level";
    group.innerHTML = `
      <label>${game.i18n.localize("TAGANDTALLY.Scene.Level")}</label>
      <div class="form-fields">
        <select name="flags.${SYSTEM_ID}.level">
          <option value="">${game.i18n.localize("TAGANDTALLY.Scene.LevelDefault")}</option>
          ${options}
        </select>
      </div>
      <p class="hint">${game.i18n.localize("TAGANDTALLY.Scene.LevelHint")}</p>`;
    // Put it after the scene name field in the basics tab.
    const nameGroup = root.querySelector('input[name="name"]')?.closest(".form-group");
    const basics = root.querySelector('.tab[data-tab="basics"], [data-tab="basics"]');
    if (nameGroup) nameGroup.insertAdjacentElement("afterend", group);
    else if (basics) basics.prepend(group);
    else {
      const form = root.querySelector("form") ?? root;
      (form.querySelector("fieldset") ?? form).prepend(group);
    }
  });

  // Blank select values would be stored as "" so coerce them to a number or unset.
  Hooks.on("preUpdateScene", (scene, changes) => {
    const level = foundry.utils.getProperty(changes, `flags.${SYSTEM_ID}.level`);
    if (level === "" || level === null) {
      delete changes.flags[SYSTEM_ID].level;
      if (scene.getFlag(SYSTEM_ID, "level") !== undefined) foundry.utils.setProperty(changes, `flags.${SYSTEM_ID}.-=level`, null);
    } else if (level !== undefined) {
      foundry.utils.setProperty(changes, `flags.${SYSTEM_ID}.level`, Number(level));
    }
  });
}
