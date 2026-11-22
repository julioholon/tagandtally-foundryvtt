import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";
import { WorldState } from "./world-state.mjs";
import { PartyOverview } from "./integrations/party.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/* ------------------------------- Day tags -------------------------------- */

/** The tag item on an actor granted for a day-tag key, if any. */
export function findDayTag(actor, key) {
  return actor?.items.find((i) => i.type === "tag" && i.getFlag(SYSTEM_ID, "dayTag") === key) ?? null;
}

/**
 * Grant (or raise) a downtime/travel condition tag. Next-day tags are stamped
 * with the day they expire on (granted on day D, active on D+1, gone on D+2).
 * @returns {{item: Item, tier: number, created: boolean}}
 */
export async function grantDayTag(actor, key, { tier = 1 } = {}) {
  const def = TAGANDTALLY.dayTags[key];
  if (!actor || !def) return null;
  const expiresDay = def.nextDay ? DowntimeApp.day + 2 : null;
  const existing = findDayTag(actor, key);
  if (existing) {
    const update = { _id: existing.id, [`flags.${SYSTEM_ID}.expiresDay`]: expiresDay };
    let newTier = existing.system.tier;
    // Hour-based tags (Hangover, Sore Muscles) take the hour count; Exhausted stacks one tier per occurrence (SRD Time).
    if (def.tiered) { newTier = Math.clamp(def.nextDay ? existing.system.tier + 1 : Math.max(existing.system.tier, tier), 1, TAGANDTALLY.dayTagMaxTier); update["system.tier"] = newTier; }
    await actor.updateEmbeddedDocuments("Item", [update]);
    return { item: existing, tier: newTier, created: false };
  }
  const [item] = await actor.createEmbeddedDocuments("Item", [{
    name: game.i18n.localize(def.label), type: "tag",
    img: def.hinders ? "icons/svg/downgrade.svg" : "icons/svg/upgrade.svg",
    system: { tagType: "condition", category: "static", temporary: true, hinders: def.hinders, tier: def.tiered ? Math.clamp(tier, 1, TAGANDTALLY.dayTagMaxTier) : 1 },
    flags: { [SYSTEM_ID]: { dayTag: key, expiresDay } }
  }]);
  return { item, tier: item.system.tier, created: true };
}

/** Lower a tiered condition by `steps`; removes it at tier 0. */
export async function reduceDayTag(actor, key, steps = 1) {
  const item = findDayTag(actor, key);
  if (!item) return false;
  const tier = item.system.tier - steps;
  if (tier <= 0) await item.delete();
  else await item.update({ "system.tier": tier });
  return true;
}

/** Remove the next-day tags that have run out on `day`. */
export async function expireDayTags(actor, day) {
  const ids = actor.items.filter((i) => i.type === "tag" && i.getFlag(SYSTEM_ID, "dayTag") && Number.isFinite(i.getFlag(SYSTEM_ID, "expiresDay")) && i.getFlag(SYSTEM_ID, "expiresDay") <= day).map((i) => i.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("Item", ids);
  return ids.length;
}

/* ----------------------------- Wealth tally ------------------------------ */

/** Move the SRD wealth tally; five marks climb a Wealth level, dropping below zero loses one. */
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

export async function applyWealthTally(actor, delta) {
  const w = actor.system.wealth;
  let tally = w.tally + delta;
  let wealth = w.value;
  let change = 0;
  if (tally >= TAGANDTALLY.downtime.wealthTallyMax) {
    if (wealth < 6) { wealth += 1; change = 1; tally = 0; }
    else tally = TAGANDTALLY.downtime.wealthTallyMax - 1; // nowhere left to climb
  } else if (tally < 0) { tally = 0; if (wealth > 0) { wealth -= 1; change = -1; } }
  await actor.update({ "system.wealth.tally": tally, "system.wealth.value": wealth }, { ttNoClimb: true });
  return { tally, wealth, change };
}

/* ------------------------------ The app ---------------------------------- */

/**
 * Shared downtime tracker: 4 points a night per character, the SRD activity
 * list, next-day tags and the day counter the whole world shares.
 */
export class DowntimeApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance;
  static state = new WorldState("downtime", { day: 1, safeZone: true, participants: {} }, { onChange: () => DowntimeApp.#instance?.render() });

  static DEFAULT_OPTIONS = {
    id: "tt-downtime",
    classes: ["tagandtally", "downtime"],
    position: { width: 760, height: "auto" },
    window: { title: "TAGANDTALLY.Downtime.Title", icon: "fa-solid fa-bed", resizable: true },
    actions: {
      addParty: DowntimeApp.#onAddParty,
      addSelected: DowntimeApp.#onAddSelected,
      remove: DowntimeApp.#onRemove,
      activity: DowntimeApp.#onActivity,
      undo: DowntimeApp.#onUndo,
      newDay: DowntimeApp.#onNewDay,
      toggleSafeZone: DowntimeApp.#onToggleSafeZone,
      resetAll: DowntimeApp.#onResetAll
    }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/downtime.hbs", scrollable: [".tt-downtime-list"] } };

  static registerSetting() { DowntimeApp.state.register(); }

  static get day() { return Number(DowntimeApp.state.get().day) || 1; }

  static async open() {
    DowntimeApp.#instance ??= new DowntimeApp();
    const state = DowntimeApp.state.get();
    if (!Object.keys(state.participants).length) {
      if (!game.user.isGM && !game.users.activeGM) ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Downtime.NoGm"));
      else await DowntimeApp.addActors(game.actors.filter((a) => PartyOverview.isMember(a)));
    }
    return DowntimeApp.#instance.render({ force: true });
  }

  static async addActors(actors) {
    const state = DowntimeApp.state.get();
    let added = 0;
    for (const actor of actors) {
      if (!actor || actor.type !== "character" || state.participants[actor.uuid]) continue;
      state.participants[actor.uuid] = { uuid: actor.uuid, points: TAGANDTALLY.downtime.points, log: [] };
      added += 1;
    }
    if (added) await DowntimeApp.state.set(state);
    return added;
  }

  /** Hours of an activity a participant has logged tonight. */
  static hours(p, activity) { return p.log.filter((l) => l.activity === activity).length; }

  /** Participants who kept watch tonight (feeds the rest encounter checks). */
  static watchers() { return Object.values(DowntimeApp.state.get().participants).filter((p) => DowntimeApp.hours(p, "watch") > 0).length; }

  /**
   * Start a new day: expire yesterday's next-day tags on every character,
   * refill downtime points and tell the travel tracker.
   */
  static async newDay() {
    if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Downtime.GmOnly"));
    const state = DowntimeApp.state.get();
    state.day = (Number(state.day) || 1) + 1;
    for (const p of Object.values(state.participants)) { p.points = TAGANDTALLY.downtime.points; p.log = []; }
    let expired = 0;
    for (const actor of game.actors.filter((a) => a.type === "character")) expired += await expireDayTags(actor, state.day);
    await DowntimeApp.state.set(state);
    Hooks.callAll(`${SYSTEM_ID}.newDay`, state.day);
    await ChatMessage.create({ content: `<div class="tagandtally chat-card"><h3><i class="fa-solid fa-sun"></i> ${game.i18n.format("TAGANDTALLY.Downtime.DayStarted", { day: state.day })}</h3>${expired ? `<p>${game.i18n.format("TAGANDTALLY.Downtime.TagsExpired", { count: expired })}</p>` : ""}</div>` });
    return state.day;
  }

  async _prepareContext() {
    const state = DowntimeApp.state.get();
    const participants = [];
    for (const p of Object.values(state.participants)) {
      const actor = await fromUuid(p.uuid);
      if (!actor) continue;
      const canAct = actor.isOwner;
      const activities = Object.entries(TAGANDTALLY.downtime.activities).map(([id, def]) => {
        const hours = DowntimeApp.hours(p, id);
        const blocked = (def.unsafeOnly && state.safeZone) ? "TAGANDTALLY.Downtime.OnlyUnsafe" : null;
        return {
          id, icon: def.icon, hours,
          label: game.i18n.localize(`TAGANDTALLY.Downtime.Activity.${id}.Label`),
          hint: game.i18n.localize(`TAGANDTALLY.Downtime.Activity.${id}.Hint`),
          disabled: !canAct || p.points <= 0 || hours >= def.max || Boolean(blocked),
          blocked: blocked ? game.i18n.localize(blocked) : null,
          warn: def.safeZone && !state.safeZone ? game.i18n.localize("TAGANDTALLY.Downtime.NeedsSafeZone") : null
        };
      });
      participants.push({
        uuid: p.uuid, name: actor.name, img: actor.img, canAct,
        points: p.points, pips: Array.from({ length: TAGANDTALLY.downtime.points }, (_, i) => i < p.points),
        log: p.log.map((l, i) => ({ ...l, index: i, label: game.i18n.localize(`TAGANDTALLY.Downtime.Activity.${l.activity}.Label`), icon: TAGANDTALLY.downtime.activities[l.activity]?.icon })),
        tags: actor.items.filter((i) => i.type === "tag" && i.getFlag(SYSTEM_ID, "dayTag")).map((i) => ({ name: i.name, notation: i.system.notation, hinders: i.system.hinders })),
        activities
      });
    }
    return { participants, day: state.day, safeZone: state.safeZone, isGM: game.user.isGM };
  }

  /* -------------------------------- Actions -------------------------------- */

  static async #onAddParty() { return DowntimeApp.addActors(game.actors.filter((a) => PartyOverview.isMember(a))); }
  static async #onAddSelected() { return DowntimeApp.addActors(canvas.tokens?.controlled.map((t) => t.actor).filter(Boolean) ?? []); }

  static async #onRemove(event, target) {
    const actor = await fromUuid(target.dataset.uuid);
    if (actor && !actor.isOwner) return;
    const state = DowntimeApp.state.get();
    delete state.participants[target.dataset.uuid];
    return DowntimeApp.state.set(state);
  }

  static async #onResetAll() {
    if (!game.user.isGM) return;
    const state = DowntimeApp.state.get();
    state.participants = {};
    return DowntimeApp.state.set(state);
  }

  static async #onToggleSafeZone() {
    if (!game.user.isGM) return;
    const state = DowntimeApp.state.get();
    state.safeZone = !state.safeZone;
    return DowntimeApp.state.set(state);
  }

  static async #onNewDay() {
    const ok = await DialogV2.confirm({ window: { title: game.i18n.localize("TAGANDTALLY.Downtime.NewDay") }, content: `<p>${game.i18n.localize("TAGANDTALLY.Downtime.NewDayConfirm")}</p>`, rejectClose: false });
    if (ok) return DowntimeApp.newDay();
  }

  /** Remove the last logged hour (gives the point back; effects already applied stay). */
  static async #onUndo(event, target) {
    const state = DowntimeApp.state.get();
    const p = state.participants[target.dataset.uuid];
    if (!p || !p.log.length) return;
    const actor = await fromUuid(p.uuid);
    if (!actor?.isOwner) return;
    p.log.splice(Number(target.dataset.index), 1);
    p.points = Math.min(TAGANDTALLY.downtime.points, p.points + 1);
    return DowntimeApp.state.set(state);
  }

  static async #onActivity(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const id = target.dataset.activity;
    const def = TAGANDTALLY.downtime.activities[id];
    const state = DowntimeApp.state.get();
    const p = state.participants[uuid];
    const actor = await fromUuid(uuid);
    if (!def || !p || !actor?.isOwner || p.points <= 0) return;
    const hours = DowntimeApp.hours(p, id) + 1;
    const text = await DowntimeApp.perform(actor, id, def, { hours, safeZone: state.safeZone });
    if (text === null) return; // cancelled
    // Re-read: the effect may have taken a while and someone else may have written.
    const fresh = DowntimeApp.state.get();
    const fp = fresh.participants[uuid];
    if (!fp) return;
    fp.points = Math.max(0, fp.points - 1);
    fp.log.push({ activity: id, text });
    await DowntimeApp.state.set(fresh);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="tagandtally chat-card tt-downtime-card"><p><i class="fa-solid ${def.icon}"></i> <strong>${game.i18n.localize(`TAGANDTALLY.Downtime.Activity.${id}.Label`)}</strong>${text ? ` · ${text}` : ""}</p></div>`
    });
  }

  /**
   * Apply one hour of an activity. Returns the log text, or null when the
   * player cancelled a picker.
   */
  static async perform(actor, id, def, { hours, safeZone }) {
    const L = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Downtime.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Downtime.${k}`));
    switch (def.effect) {
      case "sleep": {
        const parts = [];
        const tag = await grantDayTag(actor, "refreshed");
        if (tag?.created) parts.push(L("Granted", { tag: tag.item.name }));
        if (hours === 1 && safeZone) {
          const mode = await DowntimeApp.#pick(L("Activity.sleep.Label"), L("HealPrompt"), [
            { value: "strain", label: game.i18n.localize("TAGANDTALLY.Wound.RestStrain") },
            { value: "trauma", label: game.i18n.localize("TAGANDTALLY.Wound.RestTrauma") },
            { value: "injury", label: game.i18n.localize("TAGANDTALLY.Wound.RestInjury") },
            { value: "", label: L("NoHeal") }
          ]);
          if (mode === null) return null;
          if (mode) { await actor.rest(mode); parts.push(L(`Healed.${mode}`)); }
        }
        return parts.join(", ");
      }
      case "dayTag": {
        const tag = await grantDayTag(actor, def.tag);
        return tag ? L("Granted", { tag: tag.item.name }) : "";
      }
      case "drinking": {
        const parts = [];
        const courage = await grantDayTag(actor, "liquidCourage");
        if (courage?.created) parts.push(L("Granted", { tag: courage.item.name }));
        if (hours > 1) { const h = await grantDayTag(actor, "hangover", { tier: hours - 1 }); parts.push(L("Tiered", { tag: h.item.name, tier: h.tier })); }
        return parts.join(", ");
      }
      case "workout": {
        const tag = await DowntimeApp.#pickTag(actor, L("Activity.workout.Label"), L("WorkoutPrompt"));
        if (tag === null) return null;
        const parts = [];
        if (tag) { const [s] = await actor.addTallies([tag.id]); if (s) parts.push(L("Tally", { name: esc(s.name) })); }
        if (hours > 1) { const h = await grantDayTag(actor, "soreMuscles", { tier: hours - 1 }); parts.push(L("Tiered", { tag: h.item.name, tier: h.tier })); }
        return parts.join(", ");
      }
      case "study": {
        const tag = await DowntimeApp.#pickTag(actor, L("Activity.study.Label"), L("StudyPrompt"));
        if (tag === null) return null;
        if (!tag) return "";
        const [s] = await actor.addTallies([tag.id]);
        return s ? L(s.event === "tierUp" ? "TierUp" : s.event === "mastered" ? "Mastered" : "Tally", { name: esc(s.name), tier: s.tier }) : "";
      }
      case "research": {
        const quests = actor.items.filter((i) => i.type === "quest" && i.system.status === "active");
        const options = [];
        for (const q of quests) for (const k of ["plan", "location"]) {
          const t = q.system.tallies[k];
          if (t.enabled && t.value < t.max) options.push({ value: `${q.id}.${k}`, label: `${q.name}: ${game.i18n.localize(TAGANDTALLY.questTallies[k].label)} (${t.value}/${t.max})` });
        }
        options.push({ value: "", label: L("ResearchOther") });
        const choice = await DowntimeApp.#pick(L("Activity.research.Label"), L("ResearchPrompt"), options);
        if (choice === null) return null;
        if (!choice) return L("ResearchOther");
        const [qid, k] = choice.split(".");
        const quest = actor.items.get(qid);
        await quest.update({ [`system.tallies.${k}.value`]: quest.system.tallies[k].value + 1 });
        return L("QuestTally", { quest: esc(quest.name), tally: game.i18n.localize(TAGANDTALLY.questTallies[k].label) });
      }
      case "socialize": {
        const people = actor.system.relations.people.map((r, i) => ({ value: String(i), label: `${r.name} (${r.tally}/${TAGANDTALLY.relationTallyMax})`, disabled: r.tally >= TAGANDTALLY.relationTallyMax }));
        const choice = await DowntimeApp.#pick(L("Activity.socializing.Label"), L("SocialPrompt"), [...people, { value: "", label: L("SocialOther") }]);
        if (choice === null) return null;
        if (!choice) return "";
        const rows = foundry.utils.deepClone(actor.system._source.relations.people);
        const row = rows[Number(choice)];
        if (!row || row.tally >= TAGANDTALLY.relationTallyMax) return "";
        row.tally += 1;
        await actor.update({ "system.relations.people": rows });
        return L("RelationTally", { name: esc(row.name), tally: row.tally });
      }
      case "gamble": return DowntimeApp.gamble(actor);
      case "watch": return L("WatchLogged");
      default: return "";
    }
  }

  /** One hour of SRD gambling: one bet, one d20. */
  static async gamble(actor) {
    const L = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Downtime.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Downtime.${k}`));
    const content = `
      <div class="form-group"><label>${L("BetType")}</label>
        <select name="bet"><option value="number">${L("BetNumber")}</option><option value="evenOdd">${L("BetEvenOdd")}</option></select></div>
      <div class="form-group"><label>${L("BetPick")}</label>
        <input type="number" name="number" min="1" max="20" value="7" />
        <select name="parity"><option value="even">${L("Even")}</option><option value="odd">${L("Odd")}</option></select></div>`;
    const bet = await DialogV2.prompt({
      window: { title: L("Activity.gambling.Label") }, content,
      ok: { label: L("RollBet"), callback: (ev, button) => ({ type: button.form.elements.bet.value, number: Number(button.form.elements.number.value), parity: button.form.elements.parity.value }) },
      rejectClose: false
    });
    if (!bet) return null;
    const roll = await new Roll("1d20").evaluate();
    const def = TAGANDTALLY.downtime.bets[bet.type] ?? TAGANDTALLY.downtime.bets.evenOdd;
    const won = bet.type === "number" ? roll.total === Math.clamp(bet.number || 1, 1, 20) : (roll.total % 2 === 0) === (bet.parity === "even");
    const res = await applyWealthTally(actor, won ? def.win : def.loss);
    const pick = bet.type === "number" ? String(Math.clamp(bet.number || 1, 1, 20)) : L(bet.parity === "even" ? "Even" : "Odd");
    let text = L(won ? "BetWon" : "BetLost", { pick, total: roll.total, tally: res.tally });
    if (res.change > 0) text += ` ${L("WealthUp", { wealth: game.i18n.localize(TAGANDTALLY.wealthLevels[res.wealth]) })}`;
    if (res.change < 0) text += ` ${L("WealthDown", { wealth: game.i18n.localize(TAGANDTALLY.wealthLevels[res.wealth]) })}`;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<i class="fa-solid fa-dice"></i> ${L("Activity.gambling.Label")}: ${text}` });
    return text;
  }

  /** Simple select prompt. Returns the value, "" for the blank choice, null when cancelled. */
  static async #pick(title, label, options) {
    const opts = options.map((o) => `<option value="${foundry.utils.escapeHTML(o.value)}" ${o.disabled ? "disabled" : ""}>${foundry.utils.escapeHTML(o.label)}</option>`).join("");
    const value = await DialogV2.prompt({
      window: { title },
      content: `<div class="form-group"><label>${label}</label><select name="choice" autofocus>${opts}</select></div>`,
      ok: { label: game.i18n.localize("TAGANDTALLY.Downtime.Spend"), callback: (ev, button) => button.form.elements.choice.value },
      rejectClose: false
    });
    return value === undefined ? null : value;
  }

  /** Pick a tiered, unmastered tag of the actor. Returns the item, undefined for "none", null when cancelled. */
  static async #pickTag(actor, title, label) {
    const tags = actor.items.filter((i) => i.type === "tag" && i.system.canTier && !i.system.mastered && !i.system.temporary).sort((a, b) => a.name.localeCompare(b.name));
    const options = [...tags.map((t) => ({ value: t.id, label: `${t.name} (T${t.system.tier}, ${t.system.tallies}/${TAGANDTALLY.talliesPerTier})` })), { value: "", label: game.i18n.localize("TAGANDTALLY.Downtime.NoTag") }];
    const id = await DowntimeApp.#pick(title, label, options);
    if (id === null) return null;
    return id ? actor.items.get(id) : undefined;
  }
}

export function registerDowntime() {
  Hooks.on("updateActor", () => DowntimeApp.state.onChange());
  Hooks.on("createItem", () => DowntimeApp.state.onChange());
  Hooks.on("deleteItem", () => DowntimeApp.state.onChange());
  Hooks.on("updateItem", () => DowntimeApp.state.onChange());
}
