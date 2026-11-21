import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";
import { resolveRoll } from "../rolls/resolution.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Barter window: a character buys from or sells to an NPC merchant using the
 * Tag & Tally Wealth rules.
 * - Buying below your Wealth needs no roll. At or above it: Wealth check at
 *   level 3 + (cost - wealth); on success choose to lose 1 Wealth or take the
 *   "In debt" status.
 * - Selling at or below your Wealth: hindered Wealth check, success = +1 Wealth.
 *   Above your Wealth: +1 Wealth without a roll.
 * Works without Item Piles; the GM or the owning player can run it.
 */
export class BarterApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ buyer, merchant } = {}) {
    super();
    this.buyer = buyer;
    this.merchant = merchant;
  }

  static DEFAULT_OPTIONS = {
    id: "tt-barter-{id}",
    classes: ["tagandtally", "barter"],
    position: { width: 760, height: 560 },
    window: { title: "TAGANDTALLY.Barter.Title", icon: "fa-solid fa-scale-balanced", resizable: true },
    actions: { buy: BarterApp.#onBuy, sell: BarterApp.#onSell, pickBuyer: BarterApp.#onPickBuyer }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/barter.hbs", scrollable: [".tt-barter-list"] } };

  /** Open for a merchant, using the selected token's actor or the user's character as buyer. */
  static open({ merchant, buyer } = {}) {
    buyer ??= canvas.tokens?.controlled.map((t) => t.actor).find((a) => a && a.type === "character" && a !== merchant) ?? game.user.character;
    if (!merchant) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Barter.NoMerchant"));
    return new BarterApp({ buyer, merchant }).render({ force: true });
  }

  async _prepareContext() {
    const gearRows = (actor) => (actor?.items.filter((i) => i.type === "gear" && i.system.quantity > 0) ?? []).map((i) => ({
      id: i.id, name: i.name, img: i.img, level: i.system.level, cost: i.system.cost, costLabel: game.i18n.localize(i.system.costLabel), quantity: i.system.quantity,
      sentence: i.system.sentenceText, free: this.buyer ? i.system.cost < this.buyer.system.wealth.value : false
    }));
    return {
      buyer: this.buyer, merchant: this.merchant,
      buyerWealth: this.buyer?.system.wealth, buyerWealthLabel: this.buyer ? game.i18n.localize(this.buyer.system.wealth.label) : "",
      merchantWealth: this.merchant?.system.wealth,
      stock: gearRows(this.merchant), owned: gearRows(this.buyer),
      candidates: game.actors.filter((a) => a.type === "character" && a.isOwner).map((a) => ({ id: a.id, name: a.name, selected: a === this.buyer })),
      canTrade: Boolean(this.buyer && this.merchant && this.buyer.isOwner)
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("[name='buyer']")?.addEventListener("change", (ev) => { this.buyer = game.actors.get(ev.target.value); this.render(); });
  }

  static #onPickBuyer() { this.render(); }

  /** Move one unit of an item from one actor to another. */
  static async transfer(item, from, to) {
    const data = item.toObject();
    delete data._id;
    data.system.quantity = 1;
    data.system.equipped = false;
    const existing = to.items.find((i) => i.type === "gear" && i.name === item.name && i.system.level === item.system.level);
    if (existing) await existing.update({ "system.quantity": existing.system.quantity + 1 });
    else await to.createEmbeddedDocuments("Item", [data]);
    if (item.system.quantity > 1) await item.update({ "system.quantity": item.system.quantity - 1 });
    else await item.delete();
  }

  static async #onBuy(event, target) {
    const item = this.merchant.items.get(target.dataset.itemId);
    if (!item || !this.buyer) return;
    const wealth = this.buyer.system.wealth.value;
    const cost = item.system.cost;
    if (cost < wealth) {
      await BarterApp.transfer(item, this.merchant, this.buyer);
      await BarterApp.post(this.buyer, game.i18n.format("TAGANDTALLY.Barter.BoughtFree", { item: item.name, merchant: this.merchant.name }));
      return this.render();
    }
    const level = Math.clamp(3 + (cost - wealth), 1, 10);
    const result = await resolveRoll({ actor: this.buyer, level, rollType: "task", title: game.i18n.format("TAGANDTALLY.Barter.BuyTitle", { item: item.name, cost }) });
    if (!result.band.success) { ui.notifications.info(game.i18n.format("TAGANDTALLY.Barter.BuyFailed", { item: item.name })); return this.render(); }
    const choice = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("TAGANDTALLY.Barter.PayHow") },
      content: `<p>${game.i18n.format("TAGANDTALLY.Barter.PayHowHint", { item: item.name })}</p>`,
      buttons: [
        { action: "wealth", label: game.i18n.localize("TAGANDTALLY.Barter.PayWealth"), icon: "fa-solid fa-coins", default: true },
        { action: "debt", label: game.i18n.localize("TAGANDTALLY.Barter.PayDebt"), icon: "fa-solid fa-file-invoice-dollar" }
      ],
      rejectClose: false
    });
    if (!choice) return this.render();
    await BarterApp.transfer(item, this.merchant, this.buyer);
    if (choice === "wealth") await this.buyer.update({ "system.wealth.value": Math.max(0, wealth - 1) });
    else await this.buyer.update({ "system.wealth.inDebt": true });
    await BarterApp.post(this.buyer, game.i18n.format("TAGANDTALLY.Barter.Bought", { item: item.name, merchant: this.merchant.name }));
    this.render();
  }

  static async #onSell(event, target) {
    const item = this.buyer?.items.get(target.dataset.itemId);
    if (!item) return;
    const wealth = this.buyer.system.wealth.value;
    const cost = item.system.cost;
    let success = true;
    if (cost <= wealth) {
      const result = await resolveRoll({ actor: this.buyer, level: Math.clamp(Math.max(1, wealth) + 1, 1, 10), rollType: "task", title: game.i18n.format("TAGANDTALLY.Barter.SellTitle", { item: item.name }) });
      success = result.band.success;
    }
    await BarterApp.transfer(item, this.buyer, this.merchant);
    if (success) await this.buyer.update({ "system.wealth.value": Math.min(6, wealth + 1) });
    await BarterApp.post(this.buyer, game.i18n.format(success ? "TAGANDTALLY.Barter.Sold" : "TAGANDTALLY.Barter.SoldCheap", { item: item.name, merchant: this.merchant.name }));
    this.render();
  }

  static post(actor, text) {
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="tagandtally chat-card"><p><i class="fa-solid fa-scale-balanced"></i> ${text}</p></div>` });
  }
}
