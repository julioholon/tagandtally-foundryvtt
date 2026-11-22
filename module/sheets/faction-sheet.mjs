import { TAGANDTALLY } from "../config.mjs";
import { addInsight, addCountdown, nextPhase, resetPhase, setPhase, resolveFaction, findAugurFaction, importAugurFaction, allFactions } from "../factions.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** Faction sheet: sentence, phase timer, rivals and log. Players see only what was revealed. */
export default class FactionSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["tagandtally", "sheet", "actor", "faction"],
    position: { width: 640, height: 640 },
    window: { resizable: true, icon: "fa-solid fa-flag" },
    form: { submitOnChange: true },
    actions: {
      insight: FactionSheet.#onInsight,
      countdown: FactionSheet.#onCountdown,
      nextPhase: FactionSheet.#onNextPhase,
      resetPhase: FactionSheet.#onResetPhase,
      phaseStep: FactionSheet.#onPhaseStep,
      setTally: FactionSheet.#onSetTally,
      setCountdown: FactionSheet.#onSetCountdown,
      openRival: FactionSheet.#onOpenRival,
      removeRival: FactionSheet.#onRemoveRival,
      clearLog: FactionSheet.#onClearLog,
      importAugur: FactionSheet.#onImportAugur,
      generateSentence: FactionSheet.#onGenerateSentence,
      sentenceToChat: FactionSheet.#onSentenceToChat
    }
  };

  static PARTS = {
    header: { template: "systems/tagandtally/templates/actor/parts/header-faction.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: "systems/tagandtally/templates/actor/parts/tab-faction-main.hbs", scrollable: [""] },
    biography: { template: "systems/tagandtally/templates/actor/parts/tab-biography.hbs", scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [{ id: "main", icon: "fa-solid fa-flag" }, { id: "biography", icon: "fa-solid fa-book" }],
      initial: "main",
      labelPrefix: "TAGANDTALLY.Tabs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const system = actor.system;
    const F = TAGANDTALLY.faction;
    const enrich = (html) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", { relativeTo: actor, secrets: actor.isOwner });
    const label = (n) => { const d = F.phases[n - 1]; return d ? `${d.end ? "" : `${n}. `}${game.i18n.localize(d.label)}` : String(n); };
    const canSee = { goal: actor.canSeeHidden("goal"), secret: actor.canSeeHidden("secret"), headquarters: actor.canSeeHidden("headquarters") };
    const rivals = system.rivals.map(resolveFaction).filter(Boolean).map((r) => ({ uuid: r.uuid, name: r.name, img: r.img, phaseLabel: label(r.system.phase) }));
    const rivalOptions = allFactions().filter((a) => a.id !== actor.id && !system.rivals.includes(a.uuid)).map((a) => ({ uuid: a.uuid, name: a.name }));
    Object.assign(context, {
      actor, system, config: TAGANDTALLY, fields: system.schema.fields,
      isGM: game.user.isGM, owner: actor.isOwner, limited: actor.limited,
      tabs: this._prepareTabs("primary"),
      enriched: { biography: await enrich(system.biography), notes: await enrich(system.notes) },
      canSee,
      sentenceText: system.buildSentence({ hideGoal: !canSee.goal, hideSecret: !canSee.secret }),
      phaseLabel: label(system.phase),
      vibe: game.i18n.localize(system.phaseDef.vibe),
      phaseText: game.i18n.localize(system.phaseDef.text),
      rivals, rivalOptions,
      log: [...system.log].reverse().map((l) => ({ ...l, phaseLabel: label(l.phase) })),
      augurLinked: Boolean(game.modules.get("augur-nexus")?.active && findAugurFaction(actor))
    });
    return context;
  }

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.tab = context.tabs?.[partId];
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector("[data-rival-pick]")?.addEventListener("change", async (event) => {
      const uuid = event.target.value;
      if (!uuid) return;
      await this.actor.update({ "system.rivals": [...this.actor.system.rivals, uuid] });
    });
  }

  static #onInsight() { return addInsight(this.actor); }
  static #onCountdown() { return addCountdown(this.actor, 1, { reason: game.i18n.localize("TAGANDTALLY.Faction.TimePasses") }); }
  static #onNextPhase() { return nextPhase(this.actor, { reason: game.i18n.localize("TAGANDTALLY.Faction.ByGm") }); }
  static #onResetPhase() { return resetPhase(this.actor); }
  static #onPhaseStep(event, target) { return setPhase(this.actor, this.actor.system.phase + Number(target.dataset.delta)); }
  static #onSetTally(event, target) {
    const value = Number(target.dataset.value);
    return this.actor.update({ "system.tally": value === this.actor.system.tally ? value - 1 : value });
  }
  static #onSetCountdown(event, target) {
    const value = Number(target.dataset.value);
    return this.actor.update({ "system.countdown": value === this.actor.system.countdown ? value - 1 : value });
  }
  static #onOpenRival(event, target) { return resolveFaction(target.dataset.uuid)?.sheet.render({ force: true }); }
  static #onRemoveRival(event, target) { return this.actor.update({ "system.rivals": this.actor.system.rivals.filter((u) => u !== target.dataset.uuid) }); }
  static #onClearLog() { return this.actor.update({ "system.log": [] }); }
  static #onImportAugur() { return importAugurFaction(this.actor); }

  /** Fill the sentence from the Sparks faction generator. */
  static async #onGenerateSentence() {
    const { generate } = await import("../sparks/engine.mjs");
    const r = await generate("faction", { theme: game.settings.get("tagandtally", "sparkTheme") ?? "fantasy" });
    const v = r.values ?? {};
    const plain = (s) => String(s ?? "").replace(/[`*\[\]]/g, "").trim();
    const update = {
      "system.sentence.descriptor": plain(v["faction-descriptor"]),
      "system.sentence.organizationType": plain(v["faction-organization-type"]),
      "system.sentence.coreFunction": plain(v["faction-core-function"]),
      "system.sentence.goal": plain(`${v["faction-goal-verb"] ?? ""} ${v["faction-goal-noun"] ?? ""}`).toLowerCase(),
      "system.sentence.secret": plain(`${v["faction-secret-verb"] ?? ""} ${v["faction-secret-noun"] ?? ""}`).toLowerCase()
    };
    const name = plain(v["faction-name-pattern"] ?? r.name);
    if (name && /^New |^Nov[oa] /.test(this.actor.name)) update.name = name;
    return this.actor.update(update);
  }

  static #onSentenceToChat() {
    const canSee = { goal: this.actor.canSeeHidden("goal"), secret: this.actor.canSeeHidden("secret") };
    const text = this.actor.system.buildSentence({ hideGoal: !canSee.goal, hideSecret: !canSee.secret });
    return ChatMessage.create({ speaker: { alias: this.actor.name }, content: `<div class="tagandtally chat-card"><p>${foundry.utils.escapeHTML(text).replace(/\[([^\]]+)\]/g, '<span class="tt-tag">$1</span>')}</p></div>` });
  }
}
