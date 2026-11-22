import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Built-in party overview: sentence, wounds (severity + worst wound), wealth, gear.
 * Lists every player-owned character. The Party Overview module has no
 * public per-system API, so this is the Tag & Tally equivalent.
 */
export class PartyOverview extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance;

  static DEFAULT_OPTIONS = {
    id: "tt-party-overview",
    classes: ["tagandtally", "party-overview"],
    position: { width: 820, height: "auto" },
    window: { title: "TAGANDTALLY.Party.Title", icon: "fa-solid fa-people-group", resizable: true },
    actions: { openActor: PartyOverview.#onOpenActor, rollTask: PartyOverview.#onRollTask, addMember: PartyOverview.#onAddMember, removeMember: PartyOverview.#onRemoveMember }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/party.hbs", scrollable: [""] } };

  static open() {
    PartyOverview.#instance ??= new PartyOverview();
    return PartyOverview.#instance.render({ force: true });
  }

  static refresh() { PartyOverview.#instance?.rendered && PartyOverview.#instance.render(); }

  async _prepareContext() {
    const actors = game.actors.filter((a) => PartyOverview.isMember(a)).sort((a, b) => a.name.localeCompare(b.name));
    const rows = actors.map((a) => {
      const s = a.system;
      return {
        id: a.id, name: a.name, img: a.img, sentence: s.sentenceText,
        severity: s.wounds.severity, severityLabel: game.i18n.localize(s.wounds.severityLabel),
        worst: s.wounds.worst, vitality: s.wounds.vitality,
        tracks: TAGANDTALLY.woundTrackOrder.map((k) => ({ key: k, label: game.i18n.localize(TAGANDTALLY.woundTracks[k].label), value: s.wounds[k].value, max: s.wounds[k].max })),
        wealth: s.wealth.value, wealthLabel: game.i18n.localize(s.wealth.label), inDebt: s.wealth.inDebt, coins: s.wealth.coins,
        loadout: s.loadout, mai: s.mai.total,
        tags: a.items.filter((i) => i.type === "tag").length,
        quests: a.items.filter((i) => i.type === "quest" && i.system.status === "active").length,
        owners: game.users.filter((u) => !u.isGM && a.testUserPermission(u, "OWNER")).map((u) => u.name).join(", ")
      };
    });
    const candidates = game.user.isGM ? game.actors.filter((a) => a.type === "character" && !PartyOverview.isMember(a)).sort((a, b) => a.name.localeCompare(b.name)).map((a) => ({ id: a.id, name: a.name })) : [];
    return { rows, candidates, isGM: game.user.isGM, coinsMode: game.settings.get(SYSTEM_ID, "coinsMode") };
  }

  /** In the party: flagged in, or player-owned and not flagged out. */
  static isMember(actor) {
    if (actor.type !== "character") return false;
    const flag = actor.getFlag(SYSTEM_ID, "inParty");
    return flag === true || (flag !== false && actor.hasPlayerOwner);
  }

  static async #onAddMember() {
    const id = this.element.querySelector("select[name='member']")?.value;
    const actor = game.actors.get(id);
    if (actor) await actor.setFlag(SYSTEM_ID, "inParty", true);
  }

  static async #onRemoveMember(event, target) {
    const actor = game.actors.get(target.dataset.actorId);
    if (actor) await actor.setFlag(SYSTEM_ID, "inParty", false);
  }

  static #onOpenActor(event, target) { game.actors.get(target.dataset.actorId)?.sheet.render({ force: true }); }
  static #onRollTask(event, target) { game.actors.get(target.dataset.actorId)?.rollTask(); }
}

export function registerPartyOverview() {
  Hooks.on("updateActor", () => PartyOverview.refresh());
  Hooks.on("createActor", () => PartyOverview.refresh());
  Hooks.on("deleteActor", () => PartyOverview.refresh());
  Hooks.on("createItem", () => PartyOverview.refresh());
  Hooks.on("deleteItem", () => PartyOverview.refresh());
  Hooks.on("updateItem", () => PartyOverview.refresh());
}
