import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const L = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Tarot.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Tarot.${k}`));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const SPARKS_FOLDER = "Sparks";

/**
 * The SRD tarot: three decks drawn from one 78-card pack. The Major Arcana give descriptors,
 * the court cards give types, the numbered cards give what a character does. A character
 * sentence is one card of each; a Celtic Cross reads a campaign.
 */
export const CELTIC_CROSS = [
  { id: "heart", deck: "major" }, { id: "challenge", deck: "numbered" }, { id: "foundation", deck: "major" },
  { id: "past", deck: "numbered" }, { id: "crown", deck: "major" }, { id: "future", deck: "numbered" },
  { id: "self", deck: "court" }, { id: "others", deck: "court" }, { id: "hopes", deck: "major" }, { id: "outcome", deck: "numbered" }
];

export class TarotApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance;
  static cards = null;

  static DEFAULT_OPTIONS = {
    id: "tt-tarot",
    classes: ["tagandtally", "tarot"],
    position: { width: 760, height: "auto" },
    window: { title: "TAGANDTALLY.Tarot.Title", icon: "fa-solid fa-layer-group", resizable: true },
    actions: {
      drawSentence: TarotApp.#onDrawSentence,
      drawCross: TarotApp.#onDrawCross,
      redraw: TarotApp.#onRedraw,
      flip: TarotApp.#onFlip,
      toChat: TarotApp.#onToChat,
      journal: TarotApp.#onJournal,
      applySentence: TarotApp.#onApplySentence,
      grandQuest: TarotApp.#onGrandQuest
    }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/tarot.hbs", scrollable: [".tt-tarot-body"] } };

  constructor(options = {}) {
    super(options);
    this.spread = null; // { kind: "sentence" | "cross", cards: [{ positionId, card, reversed }] }
  }

  static open() {
    TarotApp.#instance ??= new TarotApp();
    return TarotApp.#instance.render({ force: true });
  }

  /** The 78 cards, loaded once from the system's data file. */
  static async load() {
    if (TarotApp.cards) return TarotApp.cards;
    const res = await fetch(foundry.utils.getRoute(`systems/${SYSTEM_ID}/data/tarot.json`));
    TarotApp.cards = (await res.json()).cards;
    return TarotApp.cards;
  }

  /** Draw `n` cards from a deck group without replacement, each reversed on a coin flip. */
  static draw(deck, n = 1, exclude = new Set()) {
    const pool = TarotApp.cards.filter((c) => c.group === deck && !exclude.has(c.id));
    const out = [];
    for (let i = 0; i < n && pool.length; i++) {
      const card = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      out.push({ card, reversed: Math.random() < 0.5 });
    }
    return out;
  }

  static face(entry) {
    const side = entry.reversed ? entry.card.reversed : entry.card.upright;
    return { ...entry, word: side.word, text: side.text, orientation: L(entry.reversed ? "Reversed" : "Upright") };
  }

  /** The sentence read off a three-card draw: descriptor, type, what they do. */
  static sentenceOf(entries) {
    const by = Object.fromEntries(entries.map((e) => [e.positionId, TarotApp.face(e)]));
    return { descriptor: by.descriptor?.word ?? "", type: by.type?.word ?? "", specialty: by.does?.word ?? "" };
  }

  async _prepareContext() {
    await TarotApp.load();
    const spread = this.spread;
    const cards = (spread?.cards ?? []).map((e, i) => ({ ...TarotApp.face(e), index: i, positionLabel: L(`Position.${e.positionId}`), positionHint: spread.kind === "cross" ? L(`PositionHint.${e.positionId}`) : "", suitClass: (e.card.suit ?? "major").toLowerCase() }));
    const sentence = spread?.kind === "sentence" ? TarotApp.sentenceOf(spread.cards) : null;
    return {
      kind: spread?.kind ?? "", cards, sentence,
      sentenceText: sentence ? `[${sentence.descriptor}] [${sentence.type}] who [${sentence.specialty}]` : "",
      isCross: spread?.kind === "cross", isSentence: spread?.kind === "sentence", isGM: game.user.isGM
    };
  }

  /* -------------------------------- Draws --------------------------------- */

  static async #onDrawSentence() {
    await TarotApp.load();
    const [d] = TarotApp.draw("major"); const [t] = TarotApp.draw("court"); const [s] = TarotApp.draw("numbered");
    this.spread = { kind: "sentence", cards: [{ positionId: "descriptor", ...d }, { positionId: "type", ...t }, { positionId: "does", ...s }] };
    return this.render();
  }

  static async #onDrawCross() {
    await TarotApp.load();
    const used = new Set();
    const cards = CELTIC_CROSS.map((p) => { const [e] = TarotApp.draw(p.deck, 1, used); used.add(e.card.id); return { positionId: p.id, ...e }; });
    this.spread = { kind: "cross", cards };
    return this.render();
  }

  static async #onRedraw(event, target) {
    const i = Number(target.dataset.index);
    const entry = this.spread?.cards[i];
    if (!entry) return;
    const used = new Set(this.spread.cards.map((e) => e.card.id));
    const [fresh] = TarotApp.draw(entry.card.group, 1, used);
    if (fresh) this.spread.cards[i] = { positionId: entry.positionId, ...fresh };
    return this.render();
  }

  static #onFlip(event, target) {
    const entry = this.spread?.cards[Number(target.dataset.index)];
    if (entry) entry.reversed = !entry.reversed;
    return this.render();
  }

  /* ------------------------------- Outputs -------------------------------- */

  /** The spread as HTML: one line per card with position, name, orientation and meaning. */
  spreadHtml() {
    const ctx = this.spread;
    if (!ctx) return "";
    const rows = ctx.cards.map((e) => { const f = TarotApp.face(e); return `<li><strong>${esc(L(`Position.${e.positionId}`))}</strong>: ${esc(f.card.name)} <em>(${esc(f.orientation)})</em> — <span class="tt-tag">${esc(f.word)}</span>${f.text ? ` ${esc(f.text)}` : ""}${ctx.kind === "cross" ? `<br /><small class="dim">${esc(L(`PositionHint.${e.positionId}`))}</small>` : ""}</li>`; });
    const lead = ctx.kind === "sentence" ? `<p class="tt-sentence">${esc(this.sentenceLine())}</p>` : `<p><em>${esc(this.readingLine())}</em></p>`;
    return `<div class="tagandtally chat-card tt-tarot-card"><h3><i class="fa-solid fa-layer-group"></i> ${esc(L(ctx.kind === "cross" ? "CelticCross" : "CharacterSentence"))}</h3>${lead}<ol>${rows.join("")}</ol></div>`;
  }

  sentenceLine() {
    const s = TarotApp.sentenceOf(this.spread.cards);
    return `[${s.descriptor}] [${s.type}] who [${s.specialty}]`;
  }

  /** One sentence summarizing the cross: what is at stake, what stands in the way, where it ends. */
  readingLine() {
    const by = Object.fromEntries(this.spread.cards.map((e) => [e.positionId, TarotApp.face(e)]));
    return L("ReadingLine", { heart: by.heart?.word ?? "", challenge: by.challenge?.word ?? "", crown: by.crown?.word ?? "", outcome: by.outcome?.word ?? "" });
  }

  static async #onToChat() {
    if (!this.spread) return;
    return ChatMessage.create({ speaker: { alias: L("Title") }, content: this.spreadHtml() });
  }

  /** The reading as a journal entry in the Sparks folder (a prophecy, when it is a cross). */
  static async #onJournal() {
    if (!this.spread) return;
    let folder = game.folders.find((f) => f.type === "JournalEntry" && f.name === SPARKS_FOLDER);
    folder ??= await Folder.create({ name: SPARKS_FOLDER, type: "JournalEntry" });
    const isCross = this.spread.kind === "cross";
    const name = isCross ? L("ProphecyName", { word: TarotApp.face(this.spread.cards[4]).word }) : L("SentenceName", { sentence: this.sentenceLine() });
    const journal = await JournalEntry.create({ name, folder: folder.id, pages: [{ name: L(isCross ? "Prophecy" : "CharacterSentence"), type: "text", text: { content: this.spreadHtml(), format: 1 } }] });
    journal.sheet.render({ force: true });
    return journal;
  }

  /** Put the three-card sentence on a character (species is kept, it is not a tarot card). */
  static async #onApplySentence() {
    if (this.spread?.kind !== "sentence") return;
    const { pickCharacter } = await import("./interactions.mjs");
    const actor = await pickCharacter();
    if (!actor) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Interaction.NoCharacter"));
    const s = TarotApp.sentenceOf(this.spread.cards);
    await actor.update({ "system.sentence.descriptor": s.descriptor, "system.sentence.type": s.type, "system.sentence.specialty": s.specialty });
    ui.notifications.info(L("Applied", { name: actor.name }));
    actor.sheet.render({ force: true });
  }

  /** A quest item built from the cross: the crown names it, the outcome is the objective, the challenge the consequence. */
  static async #onGrandQuest() {
    if (this.spread?.kind !== "cross") return;
    const { pickCharacter } = await import("./interactions.mjs");
    const actor = await pickCharacter();
    if (!actor) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Interaction.NoCharacter"));
    const by = Object.fromEntries(this.spread.cards.map((e) => [e.positionId, TarotApp.face(e)]));
    const [quest] = await actor.createEmbeddedDocuments("Item", [{
      name: L("GrandQuestName", { word: by.crown.word }), type: "quest",
      system: { questType: by.crown.word, objective: by.outcome.word, goal: by.heart.word, reward: by.future.word, consequence: by.challenge.word, isArc: true, status: "active", description: this.spreadHtml() }
    }]);
    quest.sheet.render({ force: true });
    return quest;
  }
}
