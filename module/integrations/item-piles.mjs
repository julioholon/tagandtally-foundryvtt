import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";

/**
 * Item Piles: gear items are tradeable, coins (system.wealth.coins) are the
 * currency, and items are priced in coins from their cost level (10^cost).
 * Enable the system's coins mode so coins climb Wealth levels; otherwise
 * use the built-in Barter window, which applies the SRD Wealth checks.
 * Bump VERSION whenever this config changes: Item Piles stores a copy in
 * world settings and only re-applies it on a newer version.
 */
export function registerItemPiles() {
  Hooks.once("item-piles-ready", async () => {
    const api = game.itempiles?.API;
    if (!api) return;
    try {
      await api.addSystemIntegration({
        VERSION: "1.1.0",
        ACTOR_CLASS_TYPE: "npc",
        ITEM_QUANTITY_ATTRIBUTE: "system.quantity",
        ITEM_PRICE_ATTRIBUTE: "system.coinPrice",
        QUANTITY_FOR_PRICE_ATTRIBUTE: "flags.item-piles.system.quantityForPrice",
        ITEM_FILTERS: [
          { path: "type", filters: "tag,spell,quest,wound" }
        ],
        ITEM_SIMILARITIES: ["name", "type", "system.gearType", "system.level"],
        UNSTACKABLE_ITEM_TYPES: [],
        PILE_DEFAULTS: { merchantColumns: [{ label: "Level", path: "system.level", formatting: "{#}" }] },
        TOKEN_FLAG_DEFAULTS: {},
        SECONDARY_CURRENCIES: [],
        CURRENCIES: [
          {
            type: "attribute",
            name: game.i18n.localize("TAGANDTALLY.Coins.Coins"),
            img: "icons/commodities/currency/coins-plain-pouch-gold.webp",
            abbreviation: "{#}c",
            data: { path: "system.wealth.coins" },
            primary: true,
            exchangeRate: 1
          }
        ],
        CURRENCY_DECIMAL_DIGITS: 0
      });
    } catch (err) {
      console.error(`${SYSTEM_ID} | Item Piles integration failed`, err);
    }
  });
}
