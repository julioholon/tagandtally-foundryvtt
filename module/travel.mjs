import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";
import { WorldState } from "./world-state.mjs";
import { PartyOverview } from "./integrations/party.mjs";
import { sparkTables } from "./sparks/tables.mjs";
import { sceneLevel } from "./rolls/resolution.mjs";
import { DowntimeApp } from "./downtime.mjs";

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

/** Roll the table, or null when it is missing. Inline dice in the row ("`1d6+4` Room Dungeon") are rolled. */
async function draw(name) {
  if (!sparkTables.has(name) && !sparkTables.worldOverride(name)) return null;
  const r = await sparkTables.roll(name);
  if (!r) return null;
  let value = r.value;
  for (const m of value.matchAll(/`([^`]+)`/g)) {
    if (!Roll.validate(m[1])) { value = value.replace(m[0], m[1]); continue; }
    const roll = await new Roll(m[1]).evaluate();
    value = value.replace(m[0], String(Math.max(0, roll.total)));
  }
  return value;
}

/** A biome / district event sentence (verb adjective noun) for the terrain or district the party is in. */
async function rollAreaEvent(mode, terrain) {
  if (mode === "urban") {
    let district = slug(terrain);
    if (!district || !sparkTables.has(`district-${district}-noun`)) district = slug(await draw(theme() === "modern" ? "districts" : "fantasy-districts"));
    if (sparkTables.has(`district-${district}-noun`)) {
      const parts = await Promise.all(["verb", "adjective", "noun"].map((k) => draw(`district-${district}-${k}`)));
      return parts.filter(Boolean).join(" ");
    }
  }
  return rollDiscovery(terrain);
}

/** The fields an exploration rolls for each mode, in display order. */
export const HEX_FIELDS = {
  wilderness: ["level", "feature", "landmark", "event"],
  urban: ["level", "feature", "landmark", "event"],
  dungeon: ["level", "room", "contents", "event"]
};

/** Roll one field of a hex / district / room. `fromLevel` only matters for "level". */
export async function rollHexField(mode, field, { fromLevel, terrain } = {}) {
  const modern = theme() === "modern";
  switch (field) {
    case "level": { const r = await rollHexLevel(fromLevel); return { value: r.level, detail: `${r.formula} = ${r.roll.total}` }; }
    case "event": {
      const value = await draw(modern ? "modern-event-type" : "event-type");
      if (!/biome\/district event/i.test(value ?? "")) return { value };
      const detail = await rollAreaEvent(mode, terrain);
      return { value: detail ? `${value}: ${detail}` : value };
    }
    case "feature": return { value: await draw(mode === "urban" ? "modern-feature" : "terrain-feature") };
    case "landmark": return { value: await draw(mode === "urban" && modern ? "city-geographic-landmark" : "landmark-type") };
    case "contents": return { value: await draw("dungeon-contents") };
    case "room": {
      const size = await new Roll("2d6").evaluate();
      const exits = await new Roll("1d4-1").evaluate();
      return { value: T("RoomText", { size: `${size.dice[0].results[0].result} × ${size.dice[0].results[1].result}`, exits: Math.max(0, exits.total) }) };
    }
    default: return { value: null };
  }
}

/** Roll everything the SRD asks for when exploring a hex, district or room. */
export async function rollHex({ mode = "wilderness", fromLevel, terrain = "" } = {}) {
  const out = { mode, fromLevel: Math.clamp(Number(fromLevel) || sceneLevel(), 1, 10) };
  for (const field of HEX_FIELDS[mode] ?? HEX_FIELDS.wilderness) {
    const r = await rollHexField(mode, field, { fromLevel: out.fromLevel, terrain });
    out[field] = r.value;
    if (r.detail) out[`${field}Detail`] = r.detail;
  }
  return out;
}

/** A discovery sentence for the terrain (fantasy per-terrain tables, else the theme's generic ones). */
export async function rollDiscovery(terrain) {
  const t = slug(terrain);
  const prefix = theme() !== "modern" && TAGANDTALLY.travel.discoveryTerrains.includes(t) ? `discovery-${t}` : theme() === "modern" ? "modern-discovery" : "fantasy-discovery";
  const parts = await Promise.all(["verb", "adjective", "noun"].map((k) => draw(`${prefix}-${k}`)));
  return parts.filter(Boolean).join(" ");
}

/* -------------------------------- The app -------------------------------- */

const FIELD_ICONS = { level: "fa-layer-group", feature: "fa-signs-post", landmark: "fa-monument", event: "fa-bolt", room: "fa-vector-square", contents: "fa-box-open" };

/**
 * Shared exploration tracker: the party moves on the map by hand (Augur hexes
 * or any scene); Explore rolls what the SRD asks for the hex they stand on,
 * each piece can be rerolled on its own, and a rest rolls the encounter checks.
 */
export class TravelApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance;
  static state = new WorldState("travel", {
    mode: "wilderness", terrain: "",
    hex: { fromLevel: null, level: null, levelDetail: "", feature: "", landmark: "", event: "", room: "", contents: "" },
    log: []
  }, { onChange: () => TravelApp.#instance?.render() });

  static DEFAULT_OPTIONS = {
    id: "tt-travel",
    classes: ["tagandtally", "travel"],
    position: { width: 600, height: "auto" },
    window: { title: "TAGANDTALLY.Travel.Title", icon: "fa-solid fa-route", resizable: true },
    actions: {
      setMode: TravelApp.#onSetMode,
      explore: TravelApp.#onExplore,
      reroll: TravelApp.#onReroll,
      clearHex: TravelApp.#onClearHex,
      postHex: TravelApp.#onPostHex,
      applyLevel: TravelApp.#onApplyLevel,
      rest: TravelApp.#onRest,
      newDay: TravelApp.#onNewDay,
      clearLog: TravelApp.#onClearLog,
      openDowntime: () => DowntimeApp.open()
    }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/travel.hbs", scrollable: [".tt-travel-log"] } };

  static registerSetting() { TravelApp.state.register(); }

  static open() {
    TravelApp.#instance ??= new TravelApp();
    return TravelApp.#instance.render({ force: true });
  }

  async _prepareContext() {
    const state = TravelApp.state.get();
    const mode = TAGANDTALLY.travel.modes[state.mode] ? state.mode : "wilderness";
    const modes = Object.entries(TAGANDTALLY.travel.modes).map(([id, m]) => ({ id, label: game.i18n.localize(m.label), icon: m.icon, active: id === mode }));
    const hasHex = Boolean(state.hex.level);
    const fields = HEX_FIELDS[mode].map((key) => {
      const value = state.hex[key];
      return {
        key, icon: FIELD_ICONS[key], label: T(`Field.${key}`),
        value: key === "level" && value ? `${value} · ${game.i18n.localize(TAGANDTALLY.levels[value])}` : value || "",
        detail: key === "level" ? state.hex.levelDetail : "",
        empty: !value
      };
    });
    return {
      state, modes, mode, fields, hasHex, isGM: game.user.isGM,
      exploreLabel: T(mode === "dungeon" ? "ExploreRoom" : mode === "urban" ? "ExploreDistrict" : "ExploreHex"),
      hint: T(mode === "dungeon" ? "HintDungeon" : "Hint"),
      showTerrain: mode !== "dungeon",
      canApplyLevel: game.user.isGM && hasHex && state.hex.level !== sceneLevel(),
      watchers: DowntimeApp.watchers(), party: game.actors.filter((a) => PartyOverview.isMember(a)).length,
      safeZone: DowntimeApp.state.get().safeZone,
      log: [...state.log].reverse()
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element.querySelector("[name='terrain']")?.addEventListener("change", async (ev) => {
      const state = TravelApp.state.get();
      state.terrain = ev.target.value.trim();
      await TravelApp.state.set(state);
    });
  }

  /* -------------------------------- Actions -------------------------------- */

  static async #onSetMode(event, target) {
    if (!game.user.isGM) return;
    const state = TravelApp.state.get();
    state.mode = target.dataset.mode;
    return TravelApp.state.set(state);
  }

  /** Explore the hex the party stands on: roll every field from the previous hex's level, keep it, post it to the GM. */
  static async #onExplore() {
    const state = TravelApp.state.get();
    const mode = TAGANDTALLY.travel.modes[state.mode] ? state.mode : "wilderness";
    const hex = await rollHex({ mode, fromLevel: state.hex.level ?? sceneLevel(), terrain: state.terrain });
    state.hex = { fromLevel: hex.fromLevel, level: hex.level, levelDetail: hex.levelDetail ?? "", feature: hex.feature ?? "", landmark: hex.landmark ?? "", event: hex.event ?? "", room: hex.room ?? "", contents: hex.contents ?? "" };
    const title = T(mode === "dungeon" ? "ExploredRoom" : mode === "urban" ? "ExploredDistrict" : "ExploredHex");
    state.log.push({ icon: "fa-hexagon", text: `${title}: ${T("Field.level")} ${hex.level}${hex.feature ? ` · ${hex.feature}` : ""}${hex.room ? ` · ${hex.room}` : ""}` });
    await TravelApp.state.set(state);
    return TravelApp.postHex(state, title);
  }

  /** Reroll one field of the current hex; the level rerolls from the same previous level. */
  static async #onReroll(event, target) {
    const state = TravelApp.state.get();
    const mode = TAGANDTALLY.travel.modes[state.mode] ? state.mode : "wilderness";
    const field = target.dataset.field;
    if (!HEX_FIELDS[mode].includes(field)) return;
    const r = await rollHexField(mode, field, { fromLevel: state.hex.fromLevel ?? sceneLevel(), terrain: state.terrain });
    state.hex[field] = r.value ?? "";
    if (field === "level") state.hex.levelDetail = r.detail ?? "";
    return TravelApp.state.set(state);
  }

  static async #onClearHex() {
    if (!game.user.isGM) return;
    const state = TravelApp.state.get();
    state.hex = { fromLevel: null, level: null, levelDetail: "", feature: "", landmark: "", event: "", room: "", contents: "" };
    return TravelApp.state.set(state);
  }

  static async #onPostHex() {
    const state = TravelApp.state.get();
    if (!state.hex.level) return;
    const mode = TAGANDTALLY.travel.modes[state.mode] ? state.mode : "wilderness";
    return TravelApp.postHex(state, T(mode === "dungeon" ? "ExploredRoom" : mode === "urban" ? "ExploredDistrict" : "ExploredHex"), { gmOnly: false });
  }

  /** The current hex as a chat card (whispered to the GMs by default: events are theirs to reveal). */
  static async postHex(state, title, { gmOnly = true } = {}) {
    const mode = TAGANDTALLY.travel.modes[state.mode] ? state.mode : "wilderness";
    const lines = [];
    for (const key of HEX_FIELDS[mode]) {
      const value = state.hex[key];
      if (!value) continue;
      const text = key === "level" ? `${value} · ${game.i18n.localize(TAGANDTALLY.levels[value])}${state.hex.levelDetail ? ` <small>(${esc(state.hex.levelDetail)})</small>` : ""}` : esc(value);
      lines.push({ icon: FIELD_ICONS[key], label: T(`Field.${key}`), value: text });
    }
    if (state.terrain && mode !== "dungeon") lines.unshift({ icon: "fa-mountain-sun", label: T("Terrain"), value: esc(state.terrain) });
    return TravelApp.postCard(title, lines, { gmOnly });
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
      if (result === "encounter") { const ev = await draw(theme() === "modern" ? "modern-event-type" : "event-type"); if (ev) value += `: ${esc(ev)}`; }
      if (result === "discovery") { const d = await rollDiscovery(state.terrain); if (d) value += `: ${esc(d)}`; }
      lines.push({ icon: result === "nothing" ? "fa-check" : result === "encounter" ? "fa-skull" : "fa-gem", label: `${T("Check")} ${n + 1} <small>(2d6 = ${roll.total})</small>`, value });
    }
    lines.push({ icon: "fa-drumstick-bite", label: T("Rations"), value: T("RationsText") });
    await TravelApp.postCard(T(safeZone ? "RestSafe" : "RestWild"), lines, { gmOnly: false });
    const fresh = TravelApp.state.get();
    fresh.log.push({ icon: "fa-moon", text: T(safeZone ? "RestSafe" : "RestWild") });
    return TravelApp.state.set(fresh);
  }

  static async #onRest() { if (game.user.isGM) return TravelApp.rest(); }

  static async #onNewDay() {
    if (!game.user.isGM) return;
    const ok = await DialogV2.confirm({ window: { title: game.i18n.localize("TAGANDTALLY.Downtime.NewDay") }, content: `<p>${game.i18n.localize("TAGANDTALLY.Downtime.NewDayConfirm")}</p>`, rejectClose: false });
    if (ok) return DowntimeApp.newDay();
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
    return ChatMessage.create({
      content,
      speaker: { alias: game.i18n.localize("TAGANDTALLY.Travel.Title") },
      whisper: gmOnly ? game.users.filter((u) => u.isGM).map((u) => u.id) : []
    });
  }
}

export function registerTravel() {
  Hooks.on("canvasReady", () => TravelApp.state.onChange());
  // The "Set as scene level" link hides once the scene matches the hex.
  Hooks.on("updateScene", (scene, changes) => { if (scene.id === canvas?.scene?.id && foundry.utils.hasProperty(changes, `flags.${SYSTEM_ID}`)) TravelApp.state.onChange(); });
}
