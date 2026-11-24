import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";
import { WorldState } from "./world-state.mjs";
import { PartyOverview } from "./integrations/party.mjs";
import { sparkTables } from "./sparks/tables.mjs";
import { sceneLevel, rollOracle } from "./rolls/resolution.mjs";
import { TaskRollDialog } from "./rolls/task-roll-dialog.mjs";
import { DowntimeApp, expireDayTags } from "./downtime.mjs";
import { rollHexLevel } from "./travel.mjs";
import { allFactions, addTally, addInsight } from "./factions.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const L = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Loop.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Loop.${k}`));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const theme = () => game.settings.get(SYSTEM_ID, "sparkTheme");
const CHRONICLE_FOLDER = "Tag & Tally Chronicles";
/** Rolls that do not spend a scene action: the combat phases before the Resolution. */
const FREE_ROLLS = new Set(["combat opening", "combat maneuver", "combat strike", "combat counter", "yes no"]);
/** Insight tallies by outcome band (SRD insights table). */
const INSIGHT_TALLIES = { successBut: 1, success: 2, successAnd: 3 };

/** Roll a Sparks table, or "" when it is missing. */
async function draw(name) {
  if (!sparkTables.has(name) && !sparkTables.worldOverride(name)) return "";
  const r = await sparkTables.roll(name);
  return r ? r.value.replace(/`/g, "") : "";
}

/** The SRD scene: level from the last scene (hex formula), a Sparks scene sentence and modifiers. */
export async function rollScene({ fromLevel } = {}) {
  const { generate } = await import("./sparks/engine.mjs");
  const lvl = await rollHexLevel(fromLevel ?? sceneLevel());
  const r = await generate("scene", { theme: theme() });
  const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/[`*\[\]]/g, "").replace(/\s+/g, " ").trim();
  return {
    level: lvl.level, levelDetail: `${lvl.formula} = ${lvl.roll.total}`,
    sentence: plain(r?.text ?? r?.html ?? Object.values(r?.values ?? {}).join(" ")),
    modifiers: { timeOfDay: await draw("time-of-day"), weather: await draw("weather"), season: await draw("season") }
  };
}

function blankScene(number = 1) {
  return { number, level: null, levelDetail: "", sentence: "", modifiers: { timeOfDay: "", weather: "", season: "" }, scope: "day", intent: "", stakes: "", questUuid: "", startedDay: 1, log: [] };
}

/**
 * The solo / play-by-post game loop: one shared scene at a time with a time scope, intent,
 * stakes and quest; each party member has 10 actions in it and a Ready flag; advancing time
 * closes the scene into the Chronicle, moves the world (days, factions) and rolls the next one.
 */
export class GameLoopApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance;
  static state = new WorldState("loop", { scene: blankScene(1), participants: {}, history: [] }, { onChange: () => GameLoopApp.#instance?.render() });

  static DEFAULT_OPTIONS = {
    id: "tt-game-loop",
    classes: ["tagandtally", "game-loop"],
    position: { width: 720, height: "auto" },
    window: { title: "TAGANDTALLY.Loop.Title", icon: "fa-solid fa-arrows-spin", resizable: true },
    actions: {
      addParty: GameLoopApp.#onAddParty,
      addSelected: GameLoopApp.#onAddSelected,
      remove: GameLoopApp.#onRemove,
      rollScene: GameLoopApp.#onRollScene,
      reroll: GameLoopApp.#onReroll,
      applyLevel: GameLoopApp.#onApplyLevel,
      act: GameLoopApp.#onAct,
      refund: GameLoopApp.#onRefund,
      newQuest: GameLoopApp.#onNewQuest,
      ready: GameLoopApp.#onReady,
      advance: GameLoopApp.#onAdvance,
      resetActions: GameLoopApp.#onResetActions,
      openChronicle: GameLoopApp.#onOpenChronicle,
      openScene: GameLoopApp.#onOpenScene,
      clearLog: GameLoopApp.#onClearLog
    }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/game-loop.hbs", scrollable: [".tt-loop-log"] } };

  static registerSetting() {
    GameLoopApp.state.register();
    // Advancing time has world effects (days, factions, chronicle); they run on the GM client.
    GameLoopApp.state.afterSet = async (extra = {}) => { if (extra.advance && game.user.isGM) await GameLoopApp.applyAdvance(extra.advance); };
  }

  static open() {
    GameLoopApp.#instance ??= new GameLoopApp();
    return GameLoopApp.#instance.render({ force: true });
  }

  static async addActors(actors) {
    const state = GameLoopApp.state.get();
    let added = 0;
    for (const actor of actors) {
      if (!actor || actor.type !== "character" || state.participants[actor.uuid]) continue;
      state.participants[actor.uuid] = { uuid: actor.uuid, spent: 0, ready: false };
      added += 1;
    }
    if (added) await GameLoopApp.state.set(state);
    return added;
  }

  static get maxActions() { return TAGANDTALLY.loop.actionPoints; }

  async _prepareContext() {
    const state = GameLoopApp.state.get();
    const scene = state.scene;
    const scopes = Object.entries(TAGANDTALLY.loop.scopes).map(([id, s]) => ({ id, label: game.i18n.localize(s.label), selected: id === scene.scope }));
    const participants = [];
    const quests = [];
    for (const p of Object.values(state.participants)) {
      const actor = await fromUuid(p.uuid);
      if (!actor) continue;
      const left = Math.max(0, GameLoopApp.maxActions - p.spent);
      participants.push({
        uuid: p.uuid, name: actor.name, img: actor.img, canAct: actor.isOwner, ready: p.ready, left,
        pips: Array.from({ length: GameLoopApp.maxActions }, (_, i) => i < left),
        actions: Object.entries(TAGANDTALLY.loop.actions).map(([id, a]) => ({ id, label: game.i18n.localize(a.label), icon: a.icon, hint: game.i18n.localize(a.hint) }))
      });
      for (const q of actor.items.filter((i) => i.type === "quest" && i.system.status === "active")) quests.push({ uuid: q.uuid, name: `${q.name} (${actor.name})`, selected: q.uuid === scene.questUuid });
    }
    const allReady = participants.length > 0 && participants.every((p) => p.ready);
    const day = DowntimeApp.state.get().day;
    return {
      state, scene, scopes, participants, quests, isGM: game.user.isGM, day,
      calendar: GameLoopApp.calendarDate(),
      hasScene: Boolean(scene.level),
      levelLabel: scene.level ? game.i18n.localize(TAGANDTALLY.levels[scene.level]) : "",
      canApplyLevel: game.user.isGM && scene.level && scene.level !== sceneLevel(),
      canAdvance: game.user.isGM || allReady, allReady,
      scopeDef: TAGANDTALLY.loop.scopes[scene.scope] ?? TAGANDTALLY.loop.scopes.day,
      log: [...scene.log].reverse(),
      history: [...state.history].reverse().slice(0, 8)
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element.querySelector(".tt-loop")?.addEventListener("change", async (ev) => {
      const name = ev.target.name;
      if (!name) return;
      const state = GameLoopApp.state.get();
      if (name === "scope") state.scene.scope = ev.target.value;
      else if (name === "questUuid") state.scene.questUuid = ev.target.value;
      else if (name === "intent" || name === "stakes") state.scene[name] = ev.target.value.trim();
      else return;
      await GameLoopApp.state.set(state);
    });
  }

  /* -------------------------------- Scene --------------------------------- */

  static async #onRollScene() {
    if (!game.user.isGM) return;
    const state = GameLoopApp.state.get();
    const rolled = await rollScene({ fromLevel: state.scene.level ?? sceneLevel() });
    Object.assign(state.scene, rolled, { startedDay: DowntimeApp.state.get().day });
    state.scene.log.push({ icon: "fa-dice", text: L("SceneRolled", { level: rolled.level, sentence: rolled.sentence }) });
    return GameLoopApp.state.set(state);
  }

  static async #onReroll(event, target) {
    if (!game.user.isGM) return;
    const state = GameLoopApp.state.get();
    const field = target.dataset.field;
    if (field === "level") { const r = await rollHexLevel(state.scene.level ?? sceneLevel()); state.scene.level = r.level; state.scene.levelDetail = `${r.formula} = ${r.roll.total}`; }
    else if (field === "sentence") state.scene.sentence = (await rollScene({ fromLevel: state.scene.level })).sentence;
    else if (field in state.scene.modifiers) state.scene.modifiers[field] = await draw({ timeOfDay: "time-of-day", weather: "weather", season: "season" }[field]);
    return GameLoopApp.state.set(state);
  }

  static async #onApplyLevel() {
    const state = GameLoopApp.state.get();
    if (!game.user.isGM || !state.scene.level || !canvas?.scene) return;
    await canvas.scene.setFlag(SYSTEM_ID, "level", state.scene.level);
    ui.notifications.info(game.i18n.format("TAGANDTALLY.Travel.LevelApplied", { level: state.scene.level, scene: canvas.scene.name }));
  }

  /* ------------------------------ Participants ---------------------------- */

  static async #onAddParty() { return GameLoopApp.addActors(game.actors.filter((a) => PartyOverview.isMember(a))); }
  static async #onAddSelected() { return GameLoopApp.addActors(canvas.tokens?.controlled.map((t) => t.actor) ?? []); }
  static async #onRemove(event, target) {
    if (!game.user.isGM) return;
    const state = GameLoopApp.state.get();
    delete state.participants[target.dataset.uuid];
    return GameLoopApp.state.set(state);
  }

  static async #onReady(event, target) {
    const state = GameLoopApp.state.get();
    const p = state.participants[target.closest("[data-uuid]")?.dataset.uuid];
    const actor = p ? await fromUuid(p.uuid) : null;
    if (!actor?.isOwner) return;
    p.ready = !p.ready;
    return GameLoopApp.state.set(state);
  }

  static async #onResetActions() {
    if (!game.user.isGM) return;
    const state = GameLoopApp.state.get();
    for (const p of Object.values(state.participants)) { p.spent = 0; p.ready = false; }
    return GameLoopApp.state.set(state);
  }

  /** An action button runs its tool; the scene action is spent when a roll actually resolves (see `onRoll`). */
  static async #onAct(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const id = target.dataset.act;
    const def = TAGANDTALLY.loop.actions[id];
    const state = GameLoopApp.state.get();
    const p = state.participants[uuid];
    const actor = await fromUuid(uuid);
    if (!def || !p || !actor?.isOwner) return;
    if (p.spent >= GameLoopApp.maxActions) ui.notifications.warn(L("NoActions"));
    const outcome = await GameLoopApp.perform(actor, id, def, state.scene);
    if (outcome === null || outcome === "") return;
    const fresh = GameLoopApp.state.get();
    fresh.scene.log.push({ icon: def.icon, actor: actor.name, text: `${game.i18n.localize(def.label)} · ${outcome}` });
    return GameLoopApp.state.set(fresh);
  }

  /** Give back the last action of a character (a misclick, a roll that should not count). */
  static async #onRefund(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const state = GameLoopApp.state.get();
    const p = state.participants[uuid];
    const actor = await fromUuid(uuid);
    if (!p || !actor?.isOwner || p.spent <= 0) return;
    p.spent -= 1;
    const idx = state.scene.log.map((l) => l.actor).lastIndexOf(actor.name);
    if (idx >= 0) state.scene.log.splice(idx, 1);
    return GameLoopApp.state.set(state);
  }

  /**
   * Every resolved roll by a participant spends one scene action, wherever it was rolled from
   * (the loop's buttons, a sheet, the Workshop, Interact, the Combat flow's Resolution…).
   * The combat phases before the Resolution are free. Runs on the rolling client only.
   */
  static async onRoll(result) {
    const actor = result?.actor;
    if (!actor || FREE_ROLLS.has(result.rollType)) return;
    const base = actor.isToken ? game.actors.get(actor.id) : actor;
    const state = GameLoopApp.state.get();
    if (!state.scene.level) return; // no scene in play: rolls are just rolls
    const p = state.participants[base?.uuid] ?? state.participants[actor.uuid];
    if (!p) return;
    p.spent += 1;
    const label = sparkTables.resolutionLabel(result.rollType) || result.rollType;
    const title = result.title && result.title !== game.i18n.localize("TAGANDTALLY.Roll.Task") ? ` · ${result.title}` : "";
    state.scene.log.push({ icon: "fa-dice-d20", actor: base?.name ?? actor.name, text: `${label}${title} → ${GameLoopApp.bandLabel(result.band)}` });
    if (p.spent > GameLoopApp.maxActions) ui.notifications.warn(L("OverActions", { name: base?.name ?? actor.name }));
    await GameLoopApp.state.set(state);
  }

  /** Localized outcome band, whether the roll returned a band id or a band definition. */
  static bandLabel(band) {
    const def = typeof band === "string" ? TAGANDTALLY.bands[band] : band;
    return def?.label ? game.i18n.localize(def.label) : "";
  }

  /** Run an action's tool. Returns a log text, "" when the roll hook will log it or a window opened, null when cancelled. */
  static async perform(actor, id, def, scene) {
    const level = scene.level ?? sceneLevel();
    switch (def.kind) {
      case "investigate": return GameLoopApp.investigate(actor, scene);
      case "roll": {
        const result = await TaskRollDialog.prompt({ actor, level, rollType: def.rollType, title: scene.intent || undefined });
        return result ? "" : null;
      }
      case "oracle": {
        const question = await DialogV2.prompt({
          window: { title: game.i18n.localize("TAGANDTALLY.Roll.Oracle") },
          content: `<input type="text" name="q" autofocus placeholder="${L("OraclePlaceholder")}" />`,
          ok: { label: game.i18n.localize("TAGANDTALLY.Roll.Roll"), callback: (ev, button) => button.form.elements.q.value },
          rejectClose: false
        });
        if (question === null || question === undefined) return null;
        await rollOracle({ level, question, actor });
        return "";
      }
      case "interact": {
        const { InteractDialog } = await import("./interactions.mjs");
        const target = await GameLoopApp.pickNpc(actor);
        if (!target) return null;
        await InteractDialog.open({ actor, target });
        return "";
      }
      case "travel": { const { TravelApp } = await import("./travel.mjs"); await TravelApp.open(); return ""; }
      case "combat": { const { CombatFlow } = await import("./combat/combat-flow.mjs"); await CombatFlow.open({ actors: [actor] }); return ""; }
      case "downtime": { await DowntimeApp.addActors([actor]); await DowntimeApp.open(); return ""; }
      case "workshop": { const { WorkshopApp } = await import("./workshop.mjs"); WorkshopApp.open({ actor }); return ""; }
      default: return "";
    }
  }

  /**
   * Investigate something: the current quest's Plan or Location, another active quest, an NPC
   * (insight toward strength / weakness / secret) or a faction. An insights roll at level 5
   * (SRD); the band's tallies land on the target and a Subject / Modifier insight is rolled.
   */
  static async investigate(actor, scene) {
    const options = [];
    const quests = [];
    for (const a of game.actors.filter((x) => x.type === "character" && PartyOverview.isMember(x))) for (const q of a.items.filter((i) => i.type === "quest" && i.system.status === "active")) quests.push(q);
    const current = scene.questUuid ? quests.find((q) => q.uuid === scene.questUuid) : null;
    for (const q of [current, ...quests.filter((q) => q !== current)].filter(Boolean)) {
      for (const key of ["plan", "location"]) if (q.system.tallies[key].enabled && !q.system.tallies[key].complete) options.push({ value: `quest:${q.uuid}:${key}`, label: `${q.name} · ${game.i18n.localize(TAGANDTALLY.questTallies[key].label)} (${q.system.tallies[key].value}/${q.system.tallies[key].max})` });
    }
    for (const n of game.actors.filter((x) => x.type === "npc")) for (const key of n.system.hiddenDef.insight) if (!n.system.revealed[key]) options.push({ value: `npc:${n.uuid}:${key}`, label: `${n.name} · ${game.i18n.localize(`TAGANDTALLY.Npc.${key}`)} (${n.system.insights[key]}/${TAGANDTALLY.insightsPerTally})` });
    for (const f of allFactions()) if (!f.system.isEnd) options.push({ value: `faction:${f.uuid}`, label: `${f.name} · ${game.i18n.localize("TAGANDTALLY.Faction.Insight")} (${f.system.tally}/${TAGANDTALLY.faction.tallyMax})` });
    if (!options.length) return ui.notifications.warn(L("NoTargets")) && null;
    const pick = await DialogV2.prompt({
      window: { title: L("Action.investigate") },
      content: `<p class="hint">${L("InvestigateHint")}</p><select name="t" autofocus>${options.map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join("")}</select>`,
      ok: { label: game.i18n.localize("TAGANDTALLY.Roll.Roll"), callback: (ev, button) => button.form.elements.t.value },
      rejectClose: false
    });
    if (!pick) return null;
    const [kind, uuid, key] = pick.split(":");
    const target = await fromUuid(uuid);
    if (!target) return null;
    const label = options.find((o) => o.value === pick)?.label ?? target.name;
    const result = await TaskRollDialog.prompt({ actor, level: TAGANDTALLY.loop.insightLevel, rollType: "insights", title: `${L("Action.investigate")}: ${label}` });
    if (!result) return null;
    const n = INSIGHT_TALLIES[result.band?.id ?? result.band] ?? 0;
    const lines = [];
    if (n > 0) {
      if (kind === "quest") { const t = target.system.tallies[key]; await target.update({ [`system.tallies.${key}.value`]: Math.min(t.max, t.value + n) }); }
      else if (kind === "npc") { const k = target.knowledgeActor; const v = Math.min(TAGANDTALLY.insightsPerTally, k.system.insights[key] + n); await k.update({ [`system.insights.${key}`]: v, ...(v >= TAGANDTALLY.insightsPerTally ? { [`system.revealed.${key}`]: true } : {}) }); }
      else if (kind === "faction") for (let i = 0; i < n; i++) await addInsight(target, { reason: L("Action.investigate") });
      lines.push(L("InsightMarked", { n, target: esc(label) }));
      const { generate } = await import("./sparks/engine.mjs");
      const insight = await generate("insight", { theme: theme() }).catch(() => null);
      if (insight?.html) lines.push(insight.html);
    } else if ((result.band?.id ?? result.band) === "failAnd" && current) {
      const t = current.system.tallies.countdown;
      if (t.enabled) { await current.update({ "system.tallies.countdown.value": Math.min(t.max, t.value + 1) }); lines.push(L("CountdownMarked", { quest: esc(current.name) })); }
    }
    if (lines.length && result.message) await result.message.update({ content: `${result.message.content}<div class="tagandtally tt-loop-outcome">${lines.map((l) => `<p>${l}</p>`).join("")}</div>` });
    return "";
  }

  /** Create a quest on a participant (optionally filled by Sparks) and make it the scene's quest. */
  static async #onNewQuest() {
    const state = GameLoopApp.state.get();
    const owners = [];
    for (const p of Object.values(state.participants)) { const a = await fromUuid(p.uuid); if (a?.isOwner) owners.push(a); }
    if (!owners.length) return ui.notifications.warn(L("NoParticipants"));
    const data = await DialogV2.prompt({
      window: { title: L("NewQuest") },
      content: `<div class="form-group"><label>${L("NewQuestOwner")}</label><select name="owner">${owners.map((a) => `<option value="${a.uuid}">${esc(a.name)}</option>`).join("")}</select></div><div class="form-group"><label>${L("NewQuestName")}</label><input type="text" name="name" placeholder="${L("NewQuestNamePlaceholder")}" /></div><label class="tt-toggle"><input type="checkbox" name="sparks" checked /> ${L("NewQuestSparks")}</label>`,
      ok: { label: L("NewQuest"), callback: (ev, button) => ({ owner: button.form.elements.owner.value, name: button.form.elements.name.value.trim(), sparks: button.form.elements.sparks.checked }) },
      rejectClose: false
    });
    if (!data) return;
    const owner = await fromUuid(data.owner);
    let itemData = { name: data.name || L("NewQuest"), type: "quest", system: { status: "active" } };
    if (data.sparks) {
      const { generate, findGenerator } = await import("./sparks/engine.mjs");
      const { itemDataFromGeneration, inspireQuest } = await import("./sparks/create.mjs");
      const r = await generate("quest", { theme: theme() });
      const g = findGenerator("quest");
      if (r && g) { const d = await inspireQuest(itemDataFromGeneration(r, g)); itemData = foundry.utils.mergeObject(d, { name: data.name || d.name, system: { status: "active" } }); }
    }
    const [quest] = await owner.createEmbeddedDocuments("Item", [itemData]);
    const fresh = GameLoopApp.state.get();
    fresh.scene.questUuid = quest.uuid;
    await GameLoopApp.state.set(fresh);
    quest.sheet.render({ force: true });
  }

  /** A Simple Calendar note on the day the scene ran, linking its Chronicle page. */
  static async calendarNote(scene, page) {
    const api = globalThis.SimpleCalendar?.api;
    if (typeof api?.addNote !== "function" || typeof api?.currentDateTime !== "function") return null;
    try {
      const now = api.currentDateTime();
      const date = { year: now.year, month: now.month, day: now.day };
      const content = `<p>@UUID[${page.uuid}]{${esc(page.name)}}</p>${scene.intent ? `<p>${esc(scene.intent)}</p>` : ""}`;
      return await api.addNote(page.name, content, date, date, true);
    } catch (err) { console.warn(`${SYSTEM_ID} | Simple Calendar note failed`, err); return null; }
  }

  /** Simple Calendar (Reborn) date, when the module is active. */
  static calendarDate() {
    try { const d = globalThis.SimpleCalendar?.api?.currentDateTimeDisplay?.(); return d?.date ? `${d.date}${d.time ? ` ${d.time}` : ""}` : ""; } catch { return ""; }
  }

  /** Move the calendar by a scope: days, or hours / minutes for the short scopes. */
  static async calendarAdvance(scope, days) {
    const api = globalThis.SimpleCalendar?.api;
    if (!api?.changeDate) return false;
    try {
      const delta = days > 0 ? { day: days } : scope === "shift" ? { hour: TAGANDTALLY.loop.shiftHours } : scope === "combat" ? { minute: TAGANDTALLY.loop.combatMinutes } : null;
      if (!delta) return false;
      await api.changeDate(delta);
      return true;
    } catch (err) { console.warn(`${SYSTEM_ID} | Simple Calendar advance failed`, err); return false; }
  }

  /** Who to talk to: the character's known people first, then every NPC actor. */
  static async pickNpc(actor) {
    // Only NPC actors can be talked to: known people first (when their relation points at an NPC actor), then the rest.
    const isNpc = (doc) => doc?.documentName === "Actor" && doc.type === "npc" && !doc.system.creature;
    const known = (actor.system.relations?.people ?? []).map((r) => (r.uuid ? fromUuidSync(r.uuid) : null)).filter(isNpc).map((a) => ({ uuid: a.uuid, name: a.name }));
    const others = game.actors.filter((a) => isNpc(a) && !known.some((k) => k.uuid === a.uuid)).map((a) => ({ uuid: a.uuid, name: a.name }));
    const options = [...known, ...others];
    if (!options.length) return ui.notifications.warn(L("NoNpc")) && null;
    const uuid = await DialogV2.prompt({
      window: { title: game.i18n.localize("TAGANDTALLY.Interaction.Interact") },
      content: `<select name="npc" autofocus>${options.map((o) => `<option value="${o.uuid}">${esc(o.name)}</option>`).join("")}</select>`,
      ok: { label: game.i18n.localize("TAGANDTALLY.Interaction.Interact"), callback: (ev, button) => button.form.elements.npc.value },
      rejectClose: false
    });
    return uuid ? fromUuid(uuid) : null;
  }

  /* ------------------------------ Advance time ---------------------------- */

  static async #onAdvance() {
    const state = GameLoopApp.state.get();
    const participants = Object.values(state.participants);
    const allReady = participants.length > 0 && participants.every((p) => p.ready);
    if (!game.user.isGM && !allReady) return ui.notifications.warn(L("NotReady"));
    const scopeDef = TAGANDTALLY.loop.scopes[state.scene.scope] ?? TAGANDTALLY.loop.scopes.day;
    const ok = await DialogV2.confirm({ window: { title: L("Advance") }, content: `<p>${L("AdvanceConfirm", { scope: game.i18n.localize(scopeDef.label), days: scopeDef.days })}</p>`, rejectClose: false });
    if (!ok) return;
    const closed = foundry.utils.deepClone(state.scene);
    closed.endedDay = DowntimeApp.state.get().day;
    state.history.push({ number: closed.number, sentence: closed.sentence, level: closed.level, scope: closed.scope, intent: closed.intent, day: closed.startedDay }).length > 30 && state.history.shift();
    const next = blankScene(closed.number + 1);
    next.questUuid = closed.questUuid; next.scope = closed.scope; next.startedDay = closed.endedDay + scopeDef.days;
    state.scene = next;
    for (const p of participants) { p.spent = 0; p.ready = false; }
    await GameLoopApp.state.set(state, { advance: { closed, days: scopeDef.days, factionTicks: scopeDef.factionTicks, scope: state.scene.scope } });
  }

  /** GM-side effects of advancing: chronicle the closed scene, move the days, tick the factions, roll the next scene. */
  static async applyAdvance({ closed, days = 0, factionTicks = 0, scope = "day" }) {
    const lines = [];
    const page = await GameLoopApp.chronicle(closed);
    if (page) await GameLoopApp.calendarNote(closed, page);
    if (days > 0) {
      const dayBefore = DowntimeApp.state.get().day;
      await DowntimeApp.newDay();
      if (days > 1) {
        const st = DowntimeApp.state.get();
        st.day = dayBefore + days;
        await DowntimeApp.state.set(st);
        for (const actor of game.actors.filter((a) => a.type === "character")) await expireDayTags(actor, st.day);
      }
      lines.push(L("DaysPassed", { days, day: DowntimeApp.state.get().day }));
    }
    if (factionTicks > 0) {
      for (const faction of allFactions()) await addTally(faction, factionTicks, { reason: game.i18n.localize("TAGANDTALLY.Faction.TimePasses") });
      lines.push(L("FactionsTicked", { ticks: factionTicks }));
    }
    if (await GameLoopApp.calendarAdvance(scope, days)) lines.push(L("CalendarMoved", { date: GameLoopApp.calendarDate() }));
    const state = GameLoopApp.state.get();
    const rolled = await rollScene({ fromLevel: closed.level ?? sceneLevel() });
    Object.assign(state.scene, rolled);
    state.scene.log.push({ icon: "fa-dice", text: L("SceneRolled", { level: rolled.level, sentence: rolled.sentence }) });
    await GameLoopApp.state.set(state);
    lines.push(L("NextScene", { number: state.scene.number, level: rolled.level, sentence: rolled.sentence }));
    await ChatMessage.create({
      speaker: { alias: L("Title") },
      content: `<div class="tagandtally chat-card tt-loop-card"><h3><i class="fa-solid fa-arrows-spin"></i> ${L("SceneClosed", { number: closed.number })}</h3>${closed.intent ? `<p><strong>${L("Intent")}</strong>: ${esc(closed.intent)}</p>` : ""}${lines.map((l) => `<p>${l}</p>`).join("")}${page ? `<p>@UUID[${page.uuid}]{${esc(page.name)}}</p>` : ""}</div>`
    });
  }

  /** The campaign Chronicle journal, created on demand. */
  static async chronicleJournal() {
    let journal = game.journal.find((j) => j.getFlag(SYSTEM_ID, "campaignChronicle"));
    if (journal) return journal;
    let folder = game.folders.find((f) => f.type === "JournalEntry" && f.name === CHRONICLE_FOLDER);
    folder ??= await Folder.create({ name: CHRONICLE_FOLDER, type: "JournalEntry" });
    return JournalEntry.create({ name: L("Chronicle"), folder: folder.id, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER }, flags: { [SYSTEM_ID]: { campaignChronicle: true } } });
  }

  /** One page per closed scene: level, scope, intent, stakes, quest and the action log. */
  static async chronicle(scene) {
    if (!game.settings.get(SYSTEM_ID, "loopChronicle")) return null;
    const journal = await GameLoopApp.chronicleJournal();
    const quest = scene.questUuid ? fromUuidSync(scene.questUuid) : null;
    const scopeDef = TAGANDTALLY.loop.scopes[scene.scope];
    const rows = [
      [L("Day"), `${scene.startedDay}${scene.endedDay && scene.endedDay !== scene.startedDay ? ` → ${scene.endedDay}` : ""}`],
      [game.i18n.localize("TAGANDTALLY.Level.Level"), scene.level ? `${scene.level} · ${game.i18n.localize(TAGANDTALLY.levels[scene.level])}` : "—"],
      [L("Scope"), scopeDef ? game.i18n.localize(scopeDef.label) : scene.scope],
      [L("Intent"), scene.intent || "—"], [L("Stakes"), scene.stakes || "—"],
      [game.i18n.localize("TAGANDTALLY.Quest.Quest"), quest ? `@UUID[${quest.uuid}]{${esc(quest.name)}}` : "—"]
    ];
    const mods = Object.values(scene.modifiers ?? {}).filter(Boolean).map(esc).join(" · ");
    const content = `<p><em>${esc(scene.sentence)}</em>${mods ? ` <small>(${mods})</small>` : ""}</p><table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join("")}</table>` +
      (scene.log.length ? `<h3>${L("Log")}</h3><ul>${scene.log.map((l) => `<li>${l.actor ? `<strong>${esc(l.actor)}</strong> ` : ""}${esc(l.text)}</li>`).join("")}</ul>` : "") + `<p></p>`;
    const [page] = await journal.createEmbeddedDocuments("JournalEntryPage", [{ name: L("ScenePage", { number: scene.number, sentence: scene.sentence || "" }).trim(), type: "text", text: { content, format: 1 } }]);
    return page;
  }

  static async #onOpenChronicle() {
    const journal = game.journal.find((j) => j.getFlag(SYSTEM_ID, "campaignChronicle")) ?? (game.user.isGM ? await GameLoopApp.chronicleJournal() : null);
    if (!journal) return ui.notifications.warn(L("NoChronicle"));
    return journal.sheet.render({ force: true });
  }

  static async #onOpenScene(event, target) {
    const doc = await fromUuid(target.dataset.uuid);
    if (doc?.documentName === "JournalEntryPage") return doc.parent.sheet.render({ force: true, pageId: doc.id });
    return doc?.sheet?.render({ force: true });
  }

  static async #onClearLog() {
    if (!game.user.isGM) return;
    const state = GameLoopApp.state.get();
    state.scene.log = [];
    return GameLoopApp.state.set(state);
  }
}

export function registerGameLoop() {
  Hooks.on(`${SYSTEM_ID}.rollResolved`, (result) => GameLoopApp.onRoll(result));
  Hooks.on("canvasReady", () => GameLoopApp.state.onChange());
  Hooks.on("updateScene", (scene, changes) => { if (scene.id === canvas?.scene?.id && foundry.utils.hasProperty(changes, `flags.${SYSTEM_ID}`)) GameLoopApp.state.onChange(); });
  for (const hook of ["createItem", "updateItem", "deleteItem"]) Hooks.on(hook, (item) => { if (item.type === "quest") GameLoopApp.state.onChange(); });
}
