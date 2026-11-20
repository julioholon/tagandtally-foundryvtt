import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";

/**
 * Item Piles: gear items are tradeable, Wealth is the currency (attribute
 * currency 0-6), and NPCs flagged as merchants sell at their items' cost level.
 */
export function registerItemPiles() {
  Hooks.once("item-piles-ready", async () => {
    const api = game.itempiles?.API;
    if (!api) return;
    try {
      await api.addSystemIntegration({
        VERSION: "1.0.0",
        ACTOR_CLASS_TYPE: "npc",
        ITEM_CLASS_LOOT_TYPE: "gear",
        ITEM_CLASS_WEAPON_TYPE: "gear",
        ITEM_CLASS_EQUIPMENT_TYPE: "gear",
        ITEM_QUANTITY_ATTRIBUTE: "system.quantity",
        ITEM_PRICE_ATTRIBUTE: "system.cost",
        QUANTITY_FOR_PRICE_ATTRIBUTE: "flags.item-piles.system.quantityForPrice",
        ITEM_FILTERS: [
          { path: "type", filters: "tag,spell,quest,wound" }
        ],
        ITEM_SIMILARITIES: ["name", "type", "system.gearType", "system.level"],
        UNSTACKABLE_ITEM_TYPES: [],
        PILE_DEFAULTS: { merchantColumns: [{ label: "Level", path: "system.level", formatting: "{#}" }] },
        CURRENCIES: [
          {
            type: "attribute",
            name: game.i18n.localize("TAGANDTALLY.Wealth.Wealth"),
            img: "icons/commodities/currency/coins-plain-pouch-gold.webp",
            abbreviation: "{#}W",
            data: { path: "system.wealth.value" },
            primary: true,
            exchangeRate: 1
          }
        ],
        CURRENCY_DECIMAL_DIGITS: 1
      });
    } catch (err) {
      console.error(`${SYSTEM_ID} | Item Piles integration failed`, err);
    }
  });
}
