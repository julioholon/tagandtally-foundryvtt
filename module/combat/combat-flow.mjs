import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";
import { resolveRoll } from "../rolls/resolution.mjs";
import { TaskRollDialog } from "../rolls/task-roll-dialog.mjs";
import { createWoundItemFromSpark } from "../sparks/create.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Tracks the five-phase combat loop (Opening, Maneuver, Attack, Counter,
 * Resolution) for each participant against an opposing level. Each phase is
 * one task roll; the outcome band feeds an ease/hinder modifier into the next
 * phase. The final Resolution maps the band to a wound.
 *
 * State lives in a world setting so every client sees the same tracker; the
 * GM owns it, players can roll their own phases.
 */
export class CombatFlow extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance;

  static DEFAULT_OPTIONS = {
    id: "tt-combat-flow",
    classes: ["tagandtally", "combat-flow"],
    position: { width: 720, height: "auto" },
    window: { title: "TAGANDTALLY.Combat.Title", icon: "fa-solid fa-swords", resizable: true },
    actions: {
      addSelected: CombatFlow.#onAddSelected,
      addCombatants: CombatFlow.#onAddCombatants,
      remove: CombatFlow.#onRemove,
      rollPhase: CombatFlow.#onRollPhase,
      skipPhase: CombatFlow.#onSkipPhase,
      applyWound: CombatFlow.#onApplyWound,
      reset: CombatFlow.#onReset,
      resetAll: CombatFlow.#onResetAll,
      setOpponent: CombatFlow.#onSetOpponent,
      rollInjury: CombatFlow.#onRollInjuryAction
    }
  };

  static PARTS = {
    body: { template: "systems/tagandtally/templates/apps/combat-flow.hbs", scrollable: [".tt-flow-list"] }
  };

  static registerSetting() {
    game.settings.register(SYSTEM_ID, "combatFlow", { scope: "world", config: false, type: Object, default: { participants: {} }, onChange: () => CombatFlow.#instance?.render() });
  }

  static get state() { return foundry.utils.deepClone(game.settings.get(SYSTEM_ID, "combatFlow") ?? { participants: {} }); }

  static async setState(state) {
    if (game.user.isGM) return game.settings.set(SYSTEM_ID, "combatFlow", state);
    // Players ask the GM to store the state.
    game.socket.emit(`system.${SYSTEM_ID}`, { op: "combatFlowState", state });
    CombatFlow.#instance?.render();
  }

  static async open({ actors = [] } = {}) {
    CombatFlow.#instance ??= new CombatFlow();
    if (actors.length) await CombatFlow.addActors(actors);
    return CombatFlow.#instance.render({ force: true });
  }

  static async addActors(actors) {
    const state = CombatFlow.state;
    for (const actor of actors) {
      if (!actor || state.participants[actor.uuid]) continue;
      state.participants[actor.uuid] = CombatFlow.freshParticipant(actor);
    }
    return CombatFlow.setState(state);
  }

  static freshParticipant(actor) {
    const defaultLevel = Number(canvas?.scene?.getFlag(SYSTEM_ID, "level")) || game.settings.get(SYSTEM_ID, "defaultLevel");
    return {
      uuid: actor.uuid, name: actor.name, img: actor.img,
      opponentLevel: defaultLevel,
      opponentUuid: null,
      phase: 0,
      results: {},
      modifier: 0
    };
  }

  /** Standalone injury roll: one Resolution-phase roll with no prior modifiers. */
  static async rollInjury(actor, { level } = {}) {
    return TaskRollDialog.prompt({
      actor,
      level,
      rollType: "combat outcome",
      title: game.i18n.format("TAGANDTALLY.Combat.InjuryTitle", { name: actor?.name ?? "" })
    });
  }

  async _prepareContext() {
    const state = CombatFlow.state;
    const participants = [];
    for (const p of Object.values(state.participants)) {
      const actor = await fromUuid(p.uuid);
      const phases = TAGANDTALLY.combatPhases.map((ph, i) => {
        const res = p.results[ph.id];
        return {
          ...ph, index: i, label: game.i18n.localize(ph.label),
          current: i === p.phase, done: Boolean(res), future: i > p.phase,
          band: res ? game.i18n.localize(TAGANDTALLY.bands[res.band].label) : null,
          bandCss: res ? TAGANDTALLY.bands[res.band].css : "",
          total: res?.total, modifier: res?.modifier
        };
      });
      const finished = p.phase >= TAGANDTALLY.combatPhases.length;
      const finalBand = p.results.resolution?.band;
      participants.push({
        ...p, actor, phases, finished,
        canRoll: actor?.isOwner && !finished,
        wound: finalBand ? TAGANDTALLY.combatWound[finalBand] : null,
        woundLabel: finalBand && TAGANDTALLY.combatWound[finalBand] ? game.i18n.localize(TAGANDTALLY.woundTracks[TAGANDTALLY.combatWound[finalBand]].label) : finalBand ? game.i18n.localize("TAGANDTALLY.Severity.Unscathed") : null,
        woundApplied: p.woundApplied,
        modifierLabel: p.modifier > 0 ? `+${p.modifier}` : `${p.modifier}`,
        opponentLevelLabel: game.i18n.localize(TAGANDTALLY.levels[p.opponentLevel] ?? ""),
        dc: TAGANDTALLY.dcForLevel(Math.clamp(p.opponentLevel - p.modifier, 1, 10))
      });
    }
    return { participants, isGM: game.user.isGM, levels: TAGANDTALLY.levels, hasCombat: Boolean(game.combat) };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelectorAll("select[data-opponent-level]").forEach((el) => {
      el.addEventListener("change", (ev) => CombatFlow.#setLevel(el.dataset.opponentLevel, Number(ev.target.value)));
    });
  }

  static async #setLevel(uuid, level) {
    const state = CombatFlow.state;
    if (!state.participants[uuid]) return;
    state.participants[uuid].opponentLevel = Math.clamp(level, 1, 10);
    return CombatFlow.setState(state);
  }

  static async #onAddSelected() {
    return CombatFlow.addActors(canvas.tokens.controlled.map((t) => t.actor).filter(Boolean));
  }

  static async #onAddCombatants() {
    return CombatFlow.addActors(game.combat?.combatants.map((c) => c.actor).filter(Boolean) ?? []);
  }

  static async #onRemove(event, target) {
    const state = CombatFlow.state;
    delete state.participants[target.dataset.uuid];
    return CombatFlow.setState(state);
  }

  static async #onReset(event, target) {
    const state = CombatFlow.state;
    const p = state.participants[target.dataset.uuid];
    if (!p) return;
    Object.assign(p, { phase: 0, results: {}, modifier: 0, woundApplied: false });
    return CombatFlow.setState(state);
  }

  static async #onResetAll() { return CombatFlow.setState({ participants: {} }); }

  static async #onSetOpponent(event, target) {
    const uuid = target.dataset.uuid;
    const token = canvas.tokens.controlled[0];
    const opponent = token?.actor;
    if (!opponent) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Combat.SelectOpponent"));
    const state = CombatFlow.state;
    const p = state.participants[uuid];
    if (!p) return;
    p.opponentUuid = opponent.uuid;
    p.opponentName = opponent.name;
    if (opponent.type === "npc") p.opponentLevel = opponent.system.level;
    return CombatFlow.setState(state);
  }

  /** Roll the current phase through the task dialog; store result and the modifier for the next phase. */
  static async #onRollPhase(event, target) {
    const uuid = target.dataset.uuid;
    const state = CombatFlow.state;
    const p = state.participants[uuid];
    if (!p) return;
    const actor = await fromUuid(uuid);
    const phase = TAGANDTALLY.combatPhases[p.phase];
    if (!phase) return;
    const fixed = { fixedEases: [], fixedHinders: [] };
    if (p.modifier > 0) fixed.fixedEases.push({ name: game.i18n.localize("TAGANDTALLY.Combat.PhaseModifier"), steps: p.modifier, source: "phase" });
    if (p.modifier < 0) fixed.fixedHinders.push({ name: game.i18n.localize("TAGANDTALLY.Combat.PhaseModifier"), steps: -p.modifier, source: "phase" });
    // Armor eases the Counter (defense) phase.
    if (phase.id === "counter") {
      const armor = actor?.items.find((i) => i.type === "gear" && i.system.isArmor && i.system.equipped && i.system.armor.defense > 0);
      if (armor) fixed.fixedEases.push({ name: armor.name, steps: armor.system.armor.defense, source: "automatic" });
    }
    const result = await TaskRollDialog.prompt({
      actor, level: p.opponentLevel, rollType: phase.spark,
      title: `${game.i18n.localize(phase.label)}${p.opponentName ? ` vs ${p.opponentName}` : ""}`,
      context: { combatPhase: phase.id, participant: uuid },
      ...fixed
    });
    if (!result) return;
    const modifier = TAGANDTALLY.combatPhaseModifiers[phase.id]?.[result.band.id] ?? 0;
    const fresh = CombatFlow.state;
    const fp = fresh.participants[uuid];
    if (!fp) return;
    fp.results[phase.id] = { band: result.band.id, total: result.total, modifier };
    fp.modifier = modifier;
    fp.phase += 1;
    // Opening "Success, but": ease by 1 but take a strain.
    if (phase.id === "opening" && result.band.id === "successBut" && actor?.isOwner) await actor.applyWound("strain");
    await CombatFlow.setState(fresh);
  }

  static async #onSkipPhase(event, target) {
    const state = CombatFlow.state;
    const p = state.participants[target.dataset.uuid];
    if (!p) return;
    p.phase = Math.min(p.phase + 1, TAGANDTALLY.combatPhases.length);
    p.modifier = 0;
    return CombatFlow.setState(state);
  }

  static async #onApplyWound(event, target) {
    const uuid = target.dataset.uuid;
    const state = CombatFlow.state;
    const p = state.participants[uuid];
    const actor = await fromUuid(uuid);
    const band = p?.results.resolution?.band;
    const track = band ? TAGANDTALLY.combatWound[band] : null;
    if (!actor || !track) return;
    const res = await actor.applyWound(track);
    const filled = res.filled[0];
    if (filled && filled !== "strain") await createWoundItemFromSpark(actor, { injuryType: filled });
    p.woundApplied = true;
    await CombatFlow.setState(state);
    if (res.dying) ui.notifications.warn(game.i18n.format("TAGANDTALLY.Chat.Dying", { name: actor.name }));
  }

  static async #onRollInjuryAction(event, target) {
    const actor = await fromUuid(target.dataset.uuid);
    const p = CombatFlow.state.participants[target.dataset.uuid];
    return CombatFlow.rollInjury(actor, { level: p?.opponentLevel });
  }
}

/** Socket handler: GM stores state on behalf of players. */
export function registerCombatFlowSocket() {
  game.socket.on(`system.${SYSTEM_ID}`, async (data) => {
    if (data?.op === "combatFlowState" && game.user === game.users.activeGM) {
      await game.settings.set(SYSTEM_ID, "combatFlow", data.state);
    }
  });
}
