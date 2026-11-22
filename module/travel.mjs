import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";
import { WorldState } from "./world-state.mjs";
import { PartyOverview } from "./integrations/party.mjs";
import { sparkTables } from "./sparks/tables.mjs";
import { sceneLevel } from "./rolls/resolution.mjs";
import { DowntimeApp, grantDayTag, reduceDayTag } from "./downtime.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const T = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Travel.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Travel.${k}`));
const theme = () => game.settings.get(SYSTEM_ID, "sparkTheme");
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const slug = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ------------------------------- Hex rolls ------------------------------- */

/** Level of the hex being entered, from the level of the one being left. */
export async function rollHexLevel(fromLevel) {
  const from = Math.clamp(Number(fromLevel) || sceneLevel(), 1, 10);
  const row = TAGANDTALLY.travel.hexLevel.find((r) => from >= r.min && from <= r.max) ?? TAGANDTALLY.travel.hexLevel.at(-1);
  const roll = await new Roll(row.formula).evaluate();
  return { level: Math.clamp(roll.total, 1, 10), roll, formula: row.formula };
}

/** "(Easy)" / "(Rough)" / "(Dangerous)" in a feature name -> cost key. */
export function difficultyOf(feature) {
  const m = /\((easy|rough|dangerous)\)/i.exec(String(feature ?? ""));
  return m ? m[1].toLowerCase() : null;
}

/** Roll the table, or null when it is missing. */
async function draw(name) {
  if (!sparkTables.has(name) && !sparkTables.worldOverride(name)) return null;
  const r = await sparkTables.roll(name);
  return r ? { value: r.value.replace(/`/g, ""), total: r.total } : null;
}

/** Roll everything the SRD asks for when entering a hex, district or room. */
export async function rollHex({ mode = "wilderness", fromLevel, terrain } = {}) {
  const modern = theme() === "modern";
  const out = { mode };
  const lvl = await rollHexLevel(fromLevel);
  out.level = lvl.level; out.levelRoll = `${lvl.formula} = ${lvl.roll.total}`;
  out.event = await draw(modern ? "modern-event-type" : "event-type");
  if (mode === "wilderness") {
    out.terrain = terrain ? { value: terrain } : await draw("terrain");
    out.feature = await draw("terrain-feature");
    out.landmark = await draw("landmark-type");
  } else if (mode === "urban") {
    out.terrain = terrain ? { value: terrain } : await draw(modern ? "districts" : "fantasy-districts");
    out.feature = await draw("modern-feature");
    out.landmark = await draw(modern ? "city-geographic-landmark" : "landmark-type");
  } else {
    const size = await new Roll("2d6").evaluate();
    const exits = await new Roll("1d4-1").evaluate();
    out.room = { size: `${size.dice[0].results[0].result} × ${size.dice[0].results[1].result}`, exits: Math.max(0, exits.total) };
    out.contents = await draw("dungeon-contents");
  }
  const difficulty = difficultyOf(out.feature?.value);
  out.difficulty = difficulty;
  out.cost = mode === "dungeon" ? 1 : (TAGANDTALLY.travel.costs[difficulty]?.cost ?? 1);
  return out;
}

/** A discovery sentence for the terrain (fantasy per-terrain tables, else the theme's generic ones). */
export async function rollDiscovery(terrain) {
  const t = slug(terrain);
  const prefix = theme() !== "modern" && TAGANDTALLY.travel.discoveryTerrains.includes(t) ? `discovery-${t}` : theme() === "modern" ? "modern-discovery" : "fantasy-discovery";
  const parts = await Promise.all(["verb", "adjective", "noun"].map((k) => draw(`${prefix}-${k}`)));
  return parts.map((p) => p?.value).filter(Boolean).join(" ");
}

/* -------------------------------- The app -------------------------------- */

/**
 * Shared travel tracker: travel type and pace set the day's points, each hex
 * or room costs by its difficulty, hex entry rolls level / event / feature /
 * landmark, and a rest rolls the SRD encounter checks.
 */
export class TravelApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance;
  static state = new WorldState("travel", {
    mode: "wilderness", pace: "normal", transport: false, spent: 0, recovered: 0, exhaustedApplied: false,
    hex: { level: null, terrain: "", feature: "", landmark: "", event: "" }, log: []
  }, { onChange: () => TravelApp.#instance?.render() });

  static DEFAULT_OPTIONS = {
    id: "tt-travel",
    classes: ["tagandtally", "travel"],
    position: { width: 640, height: "auto" },
    window: { title: "TAGANDTALLY.Travel.Title", icon: "fa-solid fa-route", resizable: true },
    actions: {
      setMode: TravelApp.#onSetMode,
      setPace: TravelApp.#onSetPace,
      toggleTransport: TravelApp.#onToggleTransport,
      spend: TravelApp.#onSpend,
      enter: TravelApp.#onEnter,
      applyLevel: TravelApp.#onApplyLevel,
      rest: TravelApp.#onRest,
      newDay: TravelApp.#onNewDay,
      resetDay: TravelApp.#onResetDay,
      clearLog: TravelApp.#onClearLog,
      openDowntime: () => DowntimeApp.open()
    }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/travel.hbs", scrollable: [".tt-travel-log"] } };

  static registerSetting() {
    TravelApp.state.register();
    // Travel points spent lower Hangover / Sore Muscles; fast pace exhausts the party. Done on the GM client.
    TravelApp.state.afterSet = async ({ recover = 0, exhaust = false } = {}) => {
      if (!game.user.isGM || (!recover && !exhaust)) return;
      for (const actor of game.actors.filter((a) => PartyOverview.isMember(a))) {
        for (let n = 0; n < recover; n++) for (const key of Object.keys(TAGANDTALLY.dayTags).filter((k) => TAGANDTALLY.dayTags[k].recover)) await reduceDayTag(actor, key, 1);
        if (exhaust) await grantDayTag(actor, "exhausted");
      }
    };
  }

  static open() {
    TravelApp.#instance ??= new TravelApp();
    return TravelApp.#instance.render({ force: true });
  }

  /** Points available today for the current mode / pace / transport. */
  static maxPoints(state) {
    const mode = TAGANDTALLY.travel.modes[state.mode];
    const base = mode?.points[state.pace];
    if (base === null || base === undefined) return null;
    return base + (state.transport && mode.transport ? TAGANDTALLY.travel.paces[state.pace].transport : 0);
  }

  async _prepareContext() {
    const state = TravelApp.state.get();
    const max = TravelApp.maxPoints(state);
    const modes = Object.entries(TAGANDTALLY.travel.modes).map(([id, m]) => ({ id, label: game.i18n.localize(m.label), icon: m.icon, active: id === state.mode }));
    const paces = Object.entries(TAGANDTALLY.travel.paces).map(([id, p]) => ({ id, label: game.i18n.localize(p.label), active: id === state.pace, disabled: TAGANDTALLY.travel.modes[state.mode].points[id] === null }));
    const costs = Object.entries(TAGANDTALLY.travel.costs).map(([id, c]) => ({ id, label: game.i18n.localize(c.label), cost: c.cost }));
    const left = max === null ? 0 : Math.max(0, max - state.spent);
    return {
      state, modes, paces, costs, max, left, isGM: game.user.isGM,
      canTransport: TAGANDTALLY.travel.modes[state.mode].transport,
      pips: max === null ? [] : Array.from({ length: max }, (_, i) => i < left),
      isDungeon: state.mode === "dungeon",
      hexLevelLabel: state.hex.level ? game.i18n.localize(TAGANDTALLY.levels[state.hex.level]) : "",
      sceneLevel: sceneLevel(),
      modeLabel: game.i18n.localize(TAGANDTALLY.travel.modes[state.mode].label),
      paceLabel: game.i18n.localize(TAGANDTALLY.travel.paces[state.pace].label),
      watchers: DowntimeApp.watchers(), party: game.actors.filter((a) => PartyOverview.isMember(a)).length,
      safeZone: DowntimeApp.state.get().safeZone,
      log: [...state.log].reverse()
    };
  }

  /* -------------------------------- Actions -------------------------------- */

  static async #onSetMode(event, target) {
    if (!game.user.isGM) return;
    const state = TravelApp.state.get();
    state.mode = target.dataset.mode;
    if (TAGANDTALLY.travel.modes[state.mode].points[state.pace] === null) state.pace = "normal";
    if (!TAGANDTALLY.travel.modes[state.mode].transport) state.transport = false;
    return TravelApp.state.set(state);
  }

  static async #onSetPace(event, target) {
    if (!game.user.isGM) return;
    const state = TravelApp.state.get();
    if (TAGANDTALLY.travel.modes[state.mode].points[target.dataset.pace] === null) return;
    state.pace = target.dataset.pace;
    return TravelApp.state.set(state);
  }

  static async #onToggleTransport() {
    if (!game.user.isGM) return;
    const state = TravelApp.state.get();
    state.transport = !state.transport;
    return TravelApp.state.set(state);
  }

  /** Spend points; every 2 spent today recover a tier of Hangover / Sore Muscles; fast pace exhausts. Returns the new state or null. */
  static async spend(cost, text, patch = {}) {
    const state = TravelApp.state.get();
    const max = TravelApp.maxPoints(state);
    if (max === null) { ui.notifications.warn(T("PaceNotAllowed")); return null; }
    if (state.spent + cost > max && !(await DialogV2.confirm({ window: { title: T("Title") }, content: `<p>${T("OverBudget", { left: Math.max(0, max - state.spent), cost })}</p>`, rejectClose: false }))) return null;
    state.spent += cost;
    const extra = {};
    const recoverable = Math.floor(state.spent / 2);
    if (recoverable > state.recovered) { extra.recover = recoverable - state.recovered; state.recovered = recoverable; }
    if (state.pace === "fast" && !state.exhaustedApplied) { extra.exhaust = true; state.exhaustedApplied = true; }
    state.log.push({ icon: "fa-shoe-prints", text: `${text} (${T("Cost", { cost })})` });
    if (extra.exhaust) state.log.push({ icon: "fa-face-tired", text: T("Exhausted") });
    Object.assign(state, patch);
    await TravelApp.state.set(state, extra);
    return state;
  }

  static async #onSpend(event, target) {
    const cost = Number(target.dataset.cost) || 1;
    const label = target.dataset.label ?? "";
    return TravelApp.spend(cost, label);
  }

  /** Enter a new hex / district / room: roll it, spend its cost (one write), then post it. Nothing changes if the spend is declined. */
  static async #onEnter() {
    if (!game.user.isGM) return;
    const state = TravelApp.state.get();
    const hex = await rollHex({ mode: state.mode, fromLevel: state.hex.level ?? sceneLevel() });
    const title = T(state.mode === "dungeon" ? "EnteredRoom" : state.mode === "urban" ? "EnteredDistrict" : "EnteredHex");
    const name = hex.terrain?.value ?? hex.room?.size ?? "";
    const spent = await TravelApp.spend(hex.cost, `${title}${name ? `: ${name}` : ""}`, {
      hex: { level: hex.level, terrain: hex.terrain?.value ?? "", feature: hex.feature?.value ?? "", landmark: hex.landmark?.value ?? "", event: hex.event?.value ?? "" }
    });
    if (!spent) return;
    const lines = [];
    lines.push({ icon: "fa-layer-group", label: T("Level"), value: `${hex.level} · ${game.i18n.localize(TAGANDTALLY.levels[hex.level])} <small>(${hex.levelRoll})</small>` });
    if (hex.terrain) lines.push({ icon: "fa-mountain-sun", label: T(state.mode === "urban" ? "District" : "Terrain"), value: esc(hex.terrain.value) });
    if (hex.feature) lines.push({ icon: "fa-signs-post", label: T("Feature"), value: esc(hex.feature.value) });
    if (hex.landmark) lines.push({ icon: "fa-monument", label: T("Landmark"), value: esc(hex.landmark.value) });
    if (hex.room) lines.push({ icon: "fa-vector-square", label: T("Room"), value: T("RoomText", { size: hex.room.size, exits: hex.room.exits }) });
    if (hex.contents) lines.push({ icon: "fa-box-open", label: T("Contents"), value: esc(hex.contents.value) });
    if (hex.event) lines.push({ icon: "fa-bolt", label: T("Event"), value: esc(hex.event.value) });
    lines.push({ icon: "fa-shoe-prints", label: T("MoveCost"), value: hex.difficulty ? `${game.i18n.localize(TAGANDTALLY.travel.costs[hex.difficulty].label)} · ${hex.cost}` : String(hex.cost) });
    return TravelApp.postCard(title, lines, { gmOnly: true });
  }

  /** Copy the hex level to the current scene's Tag & Tally level. */
  static async #onApplyLevel() {
    const state = TravelApp.state.get();
    if (!game.user.isGM || !state.hex.level || !canvas?.scene) return;
    await canvas.scene.setFlag(SYSTEM_ID, "level", state.hex.level);
    ui.notifications.info(T("LevelApplied", { level: state.hex.level, scene: canvas.scene.name }));
  }

  /** SRD rest: (1 + players) rounds, minus the watchers, each a 2d6 encounter check. */
  static async rest() {
    const state = TravelApp.state.get();
    const safeZone = DowntimeApp.state.get().safeZone && state.mode !== "dungeon";
    const players = game.actors.filter((a) => PartyOverview.isMember(a)).length;
    const rounds = 1 + players;
    const checks = Math.max(1, rounds - DowntimeApp.watchers());
    const table = TAGANDTALLY.travel.rest[safeZone ? "safeZone" : "wilderness"];
    const lines = [{ icon: "fa-moon", label: T("RestRounds"), value: T("RestRoundsText", { rounds, checks, watchers: DowntimeApp.watchers() }) }];
    for (let n = 0; n < checks; n++) {
      const roll = await new Roll("2d6").evaluate();
      const result = table.find((r) => roll.total >= r.min && roll.total <= r.max)?.result ?? "nothing";
      let value = T(`RestResult.${result}`);
      if (result === "encounter") { const ev = await draw(theme() === "modern" ? "modern-event-type" : "event-type"); if (ev) value += `: ${esc(ev.value)}`; }
      if (result === "discovery") { const d = await rollDiscovery(state.hex.terrain); if (d) value += `: ${esc(d)}`; }
      lines.push({ icon: result === "nothing" ? "fa-check" : result === "encounter" ? "fa-skull" : "fa-gem", label: `${T("Check")} ${n + 1} <small>(2d6 = ${roll.total})</small>`, value });
    }
    lines.push({ icon: "fa-drumstick-bite", label: T("Rations"), value: T("RationsText") });
    await TravelApp.postCard(T(safeZone ? "RestSafe" : "RestWild"), lines, { gmOnly: false });
    const fresh = TravelApp.state.get();
    fresh.log.push({ icon: "fa-moon", text: T(safeZone ? "RestSafe" : "RestWild") });
    return TravelApp.state.set(fresh);
  }

  static async #onRest() { return TravelApp.rest(); }

  static async #onNewDay() {
    const ok = await DialogV2.confirm({ window: { title: game.i18n.localize("TAGANDTALLY.Downtime.NewDay") }, content: `<p>${game.i18n.localize("TAGANDTALLY.Downtime.NewDayConfirm")}</p>`, rejectClose: false });
    if (ok) return DowntimeApp.newDay();
  }

  /** Refill today's points without starting a new day (same day, new leg). */
  static async #onResetDay() {
    if (!game.user.isGM) return;
    const state = TravelApp.state.get();
    Object.assign(state, { spent: 0, recovered: 0, exhaustedApplied: false });
    return TravelApp.state.set(state);
  }

  static async #onClearLog() {
    if (!game.user.isGM) return;
    const state = TravelApp.state.get();
    state.log = [];
    return TravelApp.state.set(state);
  }

  /** A travel chat card: a title and icon / label / value lines. */
  static async postCard(title, lines, { gmOnly = false } = {}) {
    const content = await foundry.applications.handlebars.renderTemplate("systems/tagandtally/templates/chat/travel-card.hbs", { title, lines });
    return ChatMessage.create({ content, whisper: gmOnly ? game.users.filter((u) => u.isGM).map((u) => u.id) : [] });
  }

  /** New day (from Downtime): refill travel points. */
  static async onNewDay() {
    if (!game.user.isGM) return;
    const state = TravelApp.state.get();
    Object.assign(state, { spent: 0, recovered: 0, exhaustedApplied: false });
    return TravelApp.state.set(state);
  }
}

export function registerTravel() {
  Hooks.on(`${SYSTEM_ID}.newDay`, () => TravelApp.onNewDay());
  Hooks.on("canvasReady", () => TravelApp.state.onChange());
}
