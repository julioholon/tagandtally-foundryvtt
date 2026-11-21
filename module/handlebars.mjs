import { TAGANDTALLY } from "./config.mjs";

export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("tt-dc", (level) => TAGANDTALLY.dcForLevel(level));
  Handlebars.registerHelper("tt-levelName", (level) => game.i18n.localize(TAGANDTALLY.levels[level] ?? ""));
  Handlebars.registerHelper("tt-range", (n) => Array.from({ length: Number(n) || 0 }, (_, i) => i));
  Handlebars.registerHelper("tt-boxes", (value, max) => Array.from({ length: Number(max) || 0 }, (_, i) => i < Number(value)));
  Handlebars.registerHelper("tt-includes", (arr, v) => Array.isArray(arr) && arr.includes(v));
  Handlebars.registerHelper("tt-eq", (a, b) => a === b);
  Handlebars.registerHelper("tt-gt", (a, b) => Number(a) > Number(b));
  Handlebars.registerHelper("tt-add", (a, b) => Number(a) + Number(b));
  Handlebars.registerHelper("tt-tags", (text) => {
    const escaped = Handlebars.escapeExpression(text ?? "");
    return new Handlebars.SafeString(escaped.replace(/\[([^\]]+)\]/g, '<span class="tt-tag">$1</span>'));
  });
  Handlebars.registerHelper("tt-array", (...args) => args.slice(0, -1));
  Handlebars.registerHelper("tt-ternary", (c, a, b) => (c ? a : b));
  Handlebars.registerHelper("tt-signed", (n) => (Number(n) > 0 ? `+${n}` : `${n}`));
}

export const TEMPLATES = [
  "templates/actor/parts/header-character.hbs",
  "templates/actor/parts/header-npc.hbs",
  "templates/actor/parts/tab-main.hbs",
  "templates/actor/parts/tab-tags.hbs",
  "templates/actor/parts/tab-lifestages.hbs",
  "templates/actor/parts/tab-inventory.hbs",
  "templates/actor/parts/tab-spells.hbs",
  "templates/actor/parts/tab-quests.hbs",
  "templates/actor/parts/tab-wounds.hbs",
  "templates/actor/parts/tab-biography.hbs",
  "templates/actor/parts/tab-npc-main.hbs",
  "templates/actor/parts/wound-tracks.hbs",
  "templates/item/item-sheet.hbs",
  "templates/item/parts/tag.hbs",
  "templates/item/parts/gear.hbs",
  "templates/item/parts/spell.hbs",
  "templates/item/parts/quest.hbs",
  "templates/item/parts/wound.hbs",
  "templates/item/parts/description.hbs",
  "templates/apps/task-roll.hbs",
  "templates/apps/combat-flow.hbs",
  "templates/apps/sparks-generators.hbs",
  "templates/apps/sparks-tables.hbs",
  "templates/apps/sparks-oracle.hbs",
  "templates/apps/party.hbs",
  "templates/apps/barter.hbs",
  "templates/chat/roll-card.hbs",
  "templates/chat/item-card.hbs",
  "templates/chat/spark-card.hbs"
].map((p) => `systems/tagandtally/${p}`);

export async function preloadTemplates() {
  return foundry.applications.handlebars.loadTemplates(TEMPLATES);
}
