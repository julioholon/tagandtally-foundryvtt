import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";
import { SparkGenerator } from "./sparks/engine.mjs";
import { sparkTables } from "./sparks/tables.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const L = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Tarot.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Tarot.${k}`));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const SPARKS_FOLDER = "Sparks";
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\*\*/g, "").replace(/[\[\]]/g, "").trim();

/**
 * The SRD tarot: three decks drawn from one 78-card pack. The Major Arcana give descriptors,
 * court cards give types, numbered cards give what a character does; every card also names a
 * flaw (upright and reversed). A character sentence is one card of each.
 *
 * The Prophecy is not a card spread: four verses rolled from the Sparks tables (an opposition,
 * an escalation, a trigger and a finale), each bit rerollable, that can become four grand quests.
 */
export const PROPHECY_VERSES = [
  { id: "opposition", bits: [{ key: "descriptor", table: "descriptor" }, { key: "type", table: "type-[type-option]" }, { key: "does", table: "does-something" }] },
  { id: "escalation", bits: [{ key: "emotion", table: "inspiration-emotion" }, { key: "motivation", table: "inspiration-motivation" }] },
  { id: "trigger", bits: [{ key: "environment", table: "inspiration-environment" }, { key: "complication", table: "inspiration-complication" }] },
  { id: "finale", bits: [{ key: "verb", table: "inspiration-verb" }, { key: "adjective", table: "inspiration-adjective" }, { key: "noun", table: "inspiration-noun" }, { key: "benefit", table: "inspiration-benefit" }] }
];

async function rollTable(table) {
  await sparkTables.load();
  const engine = new SparkGenerator({ theme: game.settings.get(SYSTEM_ID, "sparkTheme") });
  const text = plain(await engine.render(`{${table}}`));
  return text.startsWith("[missing") ? "" : text;
}

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
      drawProphecy: TarotApp.#onDrawProphecy,
      redraw: TarotApp.#onRedraw,
      flip: TarotApp.#onFlip,
      rerollBit: TarotApp.#onRerollBit,
      toChat: TarotApp.#onToChat,
      journal: TarotApp.#onJournal,
      applySentence: TarotApp.#onApplySentence,
      grandQuests: TarotApp.#onGrandQuests
    }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/tarot.hbs", scrollable: [".tt-tarot-body"] } };

  constructor(options = {}) {
    super(options);
    /** { kind: "sentence", cards: [{ positionId, card, reversed }] } or { kind: "prophecy", verses: [{ id, bits: { key: value } }] } */
    this.spread = null;
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
    return { ...entry, word: side.word, text: side.text, flaw: side.flaw ?? "", orientation: L(entry.reversed ? "Reversed" : "Upright") };
  }

  /** One flaw from the SRD tarot flaws: any card, either side. */
  static async drawFlaw(exclude = []) {
    await TarotApp.load();
    for (let i = 0; i < 8; i++) {
      const card = TarotApp.cards[Math.floor(Math.random() * TarotApp.cards.length)];
      const flaw = (Math.random() < 0.5 ? card.reversed : card.upright).flaw;
      if (flaw && !exclude.includes(flaw)) return flaw;
    }
    return "";
  }

  /** The sentence read off a three-card draw: descriptor, type, what they do. */
  static sentenceOf(entries) {
    const by = Object.fromEntries(entries.map((e) => [e.positionId, TarotApp.face(e)]));
    return { descriptor: by.descriptor?.word ?? "", type: by.type?.word ?? "", specialty: by.does?.word ?? "" };
  }

  /* ------------------------------ Prophecy -------------------------------- */

  /** Roll the four verses from the Sparks tables. */
  static async rollProphecy() {
    const verses = [];
    for (const v of PROPHECY_VERSES) {
      const bits = {};
      for (const b of v.bits) bits[b.key] = await rollTable(b.table);
      verses.push({ id: v.id, bits });
    }
    return verses;
  }

  /** A verse as a sentence, its bits bracketed as tags. */
  static verseLine(verse) {
    const t = Object.fromEntries(Object.entries(verse.bits).map(([k, v]) => [k, `[${v}]`]));
    return L(`VerseLine.${verse.id}`, t);
  }

  static prophecyName(verses) {
    const opp = verses.find((v) => v.id === "opposition")?.bits ?? {};
    return L("ProphecyName", { word: `${opp.descriptor ?? ""} ${opp.type ?? ""}`.trim() });
  }

  /** The four grand quests the prophecy implies, as quest item data. */
  static grandQuestData(verses, html = "") {
    const b = Object.fromEntries(verses.map((v) => [v.id, v.bits]));
    const quest = (id, extra) => ({ name: L(`VerseQuest.${id}`, { ...b[id] }), type: "quest", system: { questType: L(`Verse.${id}`), objective: plain(TarotApp.verseLine(verses.find((v) => v.id === id))), isArc: true, status: "active", description: html, ...extra } });
    return [
      quest("opposition", { goal: L("QuestGoal.opposition") }),
      quest("escalation", { goal: L("QuestGoal.escalation"), consequence: b.escalation.motivation }),
      quest("trigger", { goal: L("QuestGoal.trigger"), consequence: b.trigger.complication }),
      quest("finale", { goal: L("QuestGoal.finale"), reward: b.finale.benefit })
    ];
  }

  /* ------------------------------ Context --------------------------------- */

  async _prepareContext() {
    await TarotApp.load();
    const spread = this.spread;
    const cards = spread?.kind === "sentence" ? spread.cards.map((e, i) => ({ ...TarotApp.face(e), index: i, positionLabel: L(`Position.${e.positionId}`), suitClass: (e.card.suit ?? "major").toLowerCase() })) : [];
    const sentence = spread?.kind === "sentence" ? TarotApp.sentenceOf(spread.cards) : null;
    const verses = spread?.kind === "prophecy" ? spread.verses.map((v, vi) => ({
      id: v.id, index: vi, label: L(`Verse.${v.id}`), hint: L(`VerseHint.${v.id}`), line: TarotApp.verseLine(v),
      bits: PROPHECY_VERSES[vi].bits.map((b) => ({ key: b.key, label: L(`Bit.${b.key}`), value: v.bits[b.key] }))
    })) : [];
    return {
      kind: spread?.kind ?? "", cards, sentence, verses,
      sentenceText: sentence ? `[${sentence.descriptor}] [${sentence.type}] who [${sentence.specialty}]` : "",
      isProphecy: spread?.kind === "prophecy", isSentence: spread?.kind === "sentence", isGM: game.user.isGM
    };
  }

  /* -------------------------------- Draws --------------------------------- */

  static async #onDrawSentence() {
    await TarotApp.load();
    const [d] = TarotApp.draw("major"); const [t] = TarotApp.draw("court"); const [s] = TarotApp.draw("numbered");
    this.spread = { kind: "sentence", cards: [{ positionId: "descriptor", ...d }, { positionId: "type", ...t }, { positionId: "does", ...s }] };
    return this.render();
  }

  static async #onDrawProphecy() {
    this.spread = { kind: "prophecy", verses: await TarotApp.rollProphecy() };
    return this.render();
  }

  static async #onRedraw(event, target) {
    const i = Number(target.dataset.index);
    const entry = this.spread?.cards?.[i];
    if (!entry) return;
    const used = new Set(this.spread.cards.map((e) => e.card.id));
    const [fresh] = TarotApp.draw(entry.card.group, 1, used);
    if (fresh) this.spread.cards[i] = { positionId: entry.positionId, ...fresh };
    return this.render();
  }

  static #onFlip(event, target) {
    const entry = this.spread?.cards?.[Number(target.dataset.index)];
    if (entry) entry.reversed = !entry.reversed;
    return this.render();
  }

  static async #onRerollBit(event, target) {
    const verse = this.spread?.verses?.[Number(target.dataset.verse)];
    const def = PROPHECY_VERSES.find((v) => v.id === verse?.id)?.bits.find((b) => b.key === target.dataset.key);
    if (!verse || !def) return;
    verse.bits[def.key] = await rollTable(def.table);
    return this.render();
  }

  /* ------------------------------- Outputs -------------------------------- */

  /** The draw as HTML: the sentence cards, or the four prophecy verses. */
  spreadHtml() {
    const ctx = this.spread;
    if (!ctx) return "";
    if (ctx.kind === "prophecy") return TarotApp.prophecyHtml(ctx.verses);
    const rows = ctx.cards.map((e) => { const f = TarotApp.face(e); return `<li><strong>${esc(L(`Position.${e.positionId}`))}</strong>: ${esc(f.card.name)} <em>(${esc(f.orientation)})</em> — <span class="tt-tag">${esc(f.word)}</span>${f.text ? ` ${esc(f.text)}` : ""}</li>`; });
    return `<div class="tagandtally chat-card tt-tarot-card"><h3><i class="fa-solid fa-layer-group"></i> ${esc(L("CharacterSentence"))}</h3><p class="tt-sentence">${esc(this.sentenceLine())}</p><ol>${rows.join("")}</ol></div>`;
  }

  static prophecyHtml(verses) {
    const rows = verses.map((v) => `<li><strong>${esc(L(`Verse.${v.id}`))}</strong>: ${esc(TarotApp.verseLine(v))}</li>`);
    return `<div class="tagandtally chat-card tt-tarot-card"><h3><i class="fa-solid fa-scroll"></i> ${esc(L("Prophecy"))}</h3><ol>${rows.join("")}</ol></div>`;
  }

  sentenceLine() {
    const s = TarotApp.sentenceOf(this.spread.cards);
    return `[${s.descriptor}] [${s.type}] who [${s.specialty}]`;
  }

  static async #onToChat() {
    if (!this.spread) return;
    return ChatMessage.create({ speaker: { alias: L("Title") }, content: this.spreadHtml() });
  }

  /** The draw as a journal entry in the Sparks folder (a prophecy, when it is one). */
  static async #onJournal() {
    if (!this.spread) return;
    const journal = await TarotApp.journalSpread(this.spread);
    journal.sheet.render({ force: true });
    return journal;
  }

  static async journalSpread(spread, { folder: folderId } = {}) {
    let folder = folderId ? game.folders.get(folderId) : game.folders.find((f) => f.type === "JournalEntry" && f.name === SPARKS_FOLDER);
    folder ??= await Folder.create({ name: SPARKS_FOLDER, type: "JournalEntry" });
    const app = new TarotApp(); app.spread = spread;
    const isProphecy = spread.kind === "prophecy";
    const name = isProphecy ? TarotApp.prophecyName(spread.verses) : L("SentenceName", { sentence: app.sentenceLine() });
    return JournalEntry.create({ name, folder: folder.id, pages: [{ name: L(isProphecy ? "Prophecy" : "CharacterSentence"), type: "text", text: { content: app.spreadHtml(), format: 1 } }], flags: { [SYSTEM_ID]: { prophecy: isProphecy ? spread.verses : null } } });
  }

  /** Pick a character or NPC the user owns; `confirm` is the text shown above the picker. */
  static async pickActor({ title, confirm, label }) {
    const actors = game.actors.filter((a) => (a.type === "character" || a.type === "npc") && a.isOwner && !a.system.creature).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    if (!actors.length) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Interaction.NoCharacter")), null;
    const options = actors.map((a) => `<option value="${a.id}">${esc(a.name)} (${game.i18n.localize(CONFIG.Actor.typeLabels[a.type])})</option>`).join("");
    const id = await DialogV2.prompt({
      window: { title }, classes: ["tagandtally"],
      content: `<p>${confirm}</p><div class="form-group"><div class="form-fields"><select name="actor" autofocus>${options}</select></div></div>`,
      ok: { label, icon: "fa-solid fa-check", callback: (ev, button) => button.form.elements.actor.value },
      rejectClose: false
    });
    return id ? game.actors.get(id) : null;
  }

  /** Put the three-card sentence on a chosen character or NPC, after confirming (species is kept). */
  static async #onApplySentence() {
    if (this.spread?.kind !== "sentence") return;
    const s = TarotApp.sentenceOf(this.spread.cards);
    const actor = await TarotApp.pickActor({ title: L("ApplySentence"), confirm: L("ApplyConfirm", { sentence: esc(this.sentenceLine()) }), label: L("ApplySentence") });
    if (!actor) return;
    const doesKey = actor.type === "npc" ? "doesSomething" : "specialty";
    await actor.update({ "system.sentence.descriptor": s.descriptor, "system.sentence.type": s.type, [`system.sentence.${doesKey}`]: s.specialty });
    ui.notifications.info(L("Applied", { name: actor.name }));
    actor.sheet.render({ force: true });
  }

  /** Four grand quests on a chosen character, one per verse. */
  static async #onGrandQuests() {
    if (this.spread?.kind !== "prophecy") return;
    const actor = await TarotApp.pickActor({ title: L("GrandQuests"), confirm: L("GrandQuestsConfirm"), label: L("GrandQuests") });
    if (!actor) return;
    const quests = await actor.createEmbeddedDocuments("Item", TarotApp.grandQuestData(this.spread.verses, TarotApp.prophecyHtml(this.spread.verses)));
    ui.notifications.info(L("GrandQuestsCreated", { count: quests.length, name: actor.name }));
    actor.sheet.render({ force: true });
    return quests;
  }
}
