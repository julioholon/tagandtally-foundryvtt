import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";
import { TaskRollDialog } from "../rolls/task-roll-dialog.mjs";

export default class TagAndTallyActor extends Actor {
  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    // Item Piles creates piles and merchants as NPC actors: they must not carry the NPC default Wealth.
    // Item Piles passes its flag as a dotted key ("flags.item-piles.data"), so read the expanded source.
    const given = foundry.utils.expandObject(data);
    if (this.flags?.["item-piles"] && foundry.utils.getProperty(given, "system.wealth.value") === undefined) {
      this.updateSource({ "system.wealth.value": 0, "system.wealth.coins": 0 });
    }
    const prototypeToken = {
      displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
      bar1: { attribute: "wounds.vitality" },
      bar2: { attribute: null }
    };
    if (this.type === "character") {
      Object.assign(prototypeToken, {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
        sight: { enabled: true }
      });
    } else if (this.type === "faction") {
      prototypeToken.bar1 = { attribute: null };
      prototypeToken.disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
    } else {
      prototypeToken.disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
    }
    this.updateSource({ prototypeToken: foundry.utils.mergeObject(prototypeToken, data.prototypeToken ?? {}, { inplace: false }) });
  }

  /**
   * @override Keep umbrella tag items in sync with the sentence fields.
   * Done in _preUpdate because it runs only on the client that made the
   * change; _onUpdate runs on every window of the same user and duplicates.
   */
  async _preUpdate(changed, options, user) {
    const allowed = await super._preUpdate(changed, options, user);
    if (allowed === false) return false;
    // Coins mode: enough coins climb a Wealth level (10^(w+1) coins per step).
    const coins = foundry.utils.getProperty(changed, "system.wealth.coins");
    if (coins !== undefined && !options.ttNoClimb && game.settings.get(SYSTEM_ID, "coinsMode")) {
      let w = foundry.utils.getProperty(changed, "system.wealth.value") ?? this.system.wealth.value;
      let c = Number(coins) || 0;
      let climbed = 0;
      while (w < 6 && c >= TAGANDTALLY.coins.climbCost(w)) { c -= TAGANDTALLY.coins.climbCost(w); w += 1; climbed += 1; }
      if (climbed) {
        foundry.utils.setProperty(changed, "system.wealth.coins", c);
        foundry.utils.setProperty(changed, "system.wealth.value", w);
        ui.notifications.info(game.i18n.format("TAGANDTALLY.Coins.Climbed", { name: this.name, wealth: game.i18n.localize(TAGANDTALLY.wealthLevels[w]) }));
      }
    }
    if (this.type !== "character" || options.ttSentenceSync === false) return;
    const sentence = changed.system?.sentence;
    if (!sentence) return;
    const creates = [];
    const updates = [];
    for (const slot of TAGANDTALLY.umbrellaTagTypes) {
      if (!(slot in sentence)) continue;
      const value = String(sentence[slot] ?? "").trim();
      const existing = this.items.find((i) => i.type === "tag" && i.system.tagType === slot);
      if (!value) continue;
      if (existing) { if (existing.name !== value) updates.push({ _id: existing.id, name: value }); }
      else creates.push({ name: value, type: "tag", system: { tagType: slot, category: "umbrella", magical: /\b(mag|arcan|wizard|sorcer|witch|warlock|druid|cleric|priest|mystic|shaman|spell)/i.test(value) } });
    }
    if (updates.length) await this.updateEmbeddedDocuments("Item", updates);
    if (creates.length) await this.createEmbeddedDocuments("Item", creates);
  }

  /** Coins mode: trade one Wealth level for its coins. */
  async cashOut() {
    const w = this.system.wealth.value;
    if (w <= 0) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Coins.NothingToCashOut"));
    const coins = this.system.wealth.coins + TAGANDTALLY.coins.cashOut(w);
    await this.update({ "system.wealth.value": w - 1, "system.wealth.coins": coins }, { ttNoClimb: true });
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this }), content: `<div class="tagandtally chat-card"><p><i class="fa-solid fa-coins"></i> ${game.i18n.format("TAGANDTALLY.Coins.CashedOut", { name: this.name, coins: TAGANDTALLY.coins.cashOut(w) })}</p></div>` });
  }

  /** Coins mode: spend coins to climb one Wealth level (normally automatic). */
  async climbWealth() {
    const w = this.system.wealth;
    if (!w.canClimb) return ui.notifications.warn(game.i18n.format("TAGANDTALLY.Coins.NotEnough", { needed: w.climbCost }));
    return this.update({ "system.wealth.coins": w.coins });
  }

  /* ------------------------------- Accessors ------------------------------ */

  get isCharacter() { return this.type === "character"; }
  get isCreature() { return this.type === "npc" && this.system.creature; }

  /** Tags usable in a roll (non-temporary filtering is up to the dialog). */
  get tags() { return this.items.filter((i) => i.type === "tag"); }
  get gear() { return this.items.filter((i) => i.type === "gear"); }
  get spells() { return this.items.filter((i) => i.type === "spell"); }
  get quests() { return this.items.filter((i) => i.type === "quest"); }
  get woundItems() { return this.items.filter((i) => i.type === "wound"); }

  /** The sentence as text, for chat and party overview. */
  get sentenceText() { return this.system.sentenceText ?? this.name; }

  /* --------------------------------- Rolls -------------------------------- */

  /** Open the task roll dialog for this actor. */
  async rollTask(options = {}) {
    return TaskRollDialog.prompt({ actor: this, ...options });
  }

  /* -------------------------------- Tallies ------------------------------- */

  /**
   * Add tallies to a set of tags (after a natural 1 or 20).
   * Handles tier-ups and mastery. Returns a summary per tag.
   */
  async addTallies(tagIds, amount = 1) {
    const updates = [];
    const summary = [];
    for (const id of tagIds) {
      const tag = this.items.get(id);
      if (!tag || tag.type !== "tag" || !tag.system.canTier || tag.system.mastered) continue;
      let { tier, tallies, mastered } = tag.system;
      tallies += amount;
      let event = "tally";
      while (tallies >= TAGANDTALLY.talliesPerTier) {
        tallies -= TAGANDTALLY.talliesPerTier;
        if (tier >= TAGANDTALLY.maxTier) { mastered = true; tallies = 0; event = "mastered"; break; }
        tier += 1;
        event = "tierUp";
      }
      updates.push({ _id: id, "system.tier": tier, "system.tallies": tallies, "system.mastered": mastered });
      summary.push({ id, name: tag.name, tier, tallies, mastered, event });
    }
    if (updates.length) await this.updateEmbeddedDocuments("Item", updates);
    return summary;
  }

  /* -------------------------------- Wounds -------------------------------- */

  /**
   * Mark one box on a wound track. When a track is full the mark overflows
   * to the next, more serious track. Returns the track that actually filled.
   * @param {string} track  strain | lingeringTrauma | debilitatingInjury | lastingScar
   */
  async applyWound(track, { amount = 1 } = {}) {
    const order = TAGANDTALLY.woundTrackOrder;
    const wounds = foundry.utils.deepClone(this.system._source.wounds);
    const filled = [];
    for (let n = 0; n < amount; n++) {
      let idx = order.indexOf(track);
      if (idx < 0) idx = 0;
      let placed = null;
      while (idx < order.length) {
        const key = order[idx];
        const max = TAGANDTALLY.woundTracks[key].max;
        if (wounds[key].value < max) { wounds[key].value += 1; placed = key; break; }
        idx += 1;
      }
      filled.push(placed);
    }
    await this.update({ "system.wounds": wounds });
    const dying = wounds.lastingScar.value >= TAGANDTALLY.woundTracks.lastingScar.max;
    return { filled, dying, wounds };
  }

  /**
   * Token bar edits on the derived vitality bar: a decrease marks strain
   * (overflowing upward), an increase heals from the mildest track first.
   */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    if (attribute !== "wounds.vitality") return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    const current = this.system.wounds.vitality.value;
    const target = isDelta ? current + value : value;
    let delta = Math.round(target - current);
    if (delta < 0) return this.applyWound("strain", { amount: -delta });
    const order = [...TAGANDTALLY.woundTrackOrder];
    const wounds = foundry.utils.deepClone(this.system._source.wounds);
    while (delta > 0) {
      const key = order.find((k) => wounds[k].value > 0);
      if (!key) break;
      wounds[key].value -= 1;
      delta -= 1;
    }
    return this.update({ "system.wounds": wounds });
  }

  /** Clear one box from a wound track. */
  async healWound(track, amount = 1) {
    const value = Math.max(0, this.system.wounds[track].value - amount);
    return this.update({ [`system.wounds.${track}.value`]: value });
  }

  /** Safe-zone rest: heal all strain, or 1 lingering trauma, or downgrade 1 debilitating injury. */
  async rest(mode = "strain") {
    const w = this.system.wounds;
    switch (mode) {
      case "strain": return this.update({ "system.wounds.strain.value": 0 });
      case "trauma": return this.healWound("lingeringTrauma");
      case "injury":
        if (w.debilitatingInjury.value > 0) {
          await this.healWound("debilitatingInjury");
          return this.applyWound("lingeringTrauma");
        }
        return this;
      default: return this;
    }
  }

  /* --------------------------------- NPCs --------------------------------- */

  /** Reveal (or hide) a hidden creature trait for players. */
  async reveal(key, value = true) {
    if (this.type !== "npc") return this;
    return this.knowledgeActor.update({ [`system.revealed.${key}`]: value });
  }

  /** Add an insight toward learning a creature's strength or weakness. */
  async addInsight(key, amount = 1) {
    if (this.type !== "npc") return this;
    const value = Math.clamp(this.system.insights[key] + amount, 0, TAGANDTALLY.insightsPerTally);
    const update = { [`system.insights.${key}`]: value };
    if (value >= TAGANDTALLY.insightsPerTally) update[`system.revealed.${key}`] = true;
    return this.update(update);
  }

  /** Whether the current user may see a hidden trait. */
  /** Solo veil: the world setting that hides secrets from everyone, GM included, until revealed. */
  static get veiled() {
    try { return Boolean(game.settings.get(SYSTEM_ID, "soloVeil")); } catch { return false; }
  }

  /**
   * Whether the current user may see a hidden field (NPC strength / weakness / secret, faction goal /
   * secret / headquarters). GMs and owners see everything unless the solo veil is on; then only what
   * was revealed (by the eye toggle or by insights) shows, for everyone.
   */
  /**
   * Where "what the players know" about this NPC or faction is stored: the world actor, so every
   * unlinked token of the same creature shares its reveals and insights. Token copies keep their
   * own sentence fields (three wolves can differ) but not their own knowledge state.
   */
  get knowledgeActor() {
    if (!this.isToken || !["npc", "faction"].includes(this.type)) return this;
    return game.actors.get(this.id) ?? this;
  }

  canSeeHidden(key) {
    if (this.knowledgeActor.system.revealed?.[key]) return true;
    if (this.constructor.veiled) return false;
    return game.user.isGM || this.isOwner;
  }

  /** Re-prepare and re-render the unlinked tokens of a world NPC when its knowledge state changes. */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (this.isToken || !["npc", "faction"].includes(this.type)) return;
    if (!foundry.utils.hasProperty(changed, "system.revealed") && !foundry.utils.hasProperty(changed, "system.insights")) return;
    for (const scene of game.scenes) for (const token of scene.tokens) {
      if (token.actorId !== this.id || token.actorLink || !token.actor) continue;
      token.actor.prepareData();
      token.actor.sheet?.rendered && token.actor.sheet.render(false);
    }
  }

  /** Flags namespace helper. */
  getSystemFlag(key) { return this.getFlag(SYSTEM_ID, key); }
  setSystemFlag(key, value) { return this.setFlag(SYSTEM_ID, key, value); }
}
