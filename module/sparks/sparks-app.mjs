import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";
import { sparkTables } from "./tables.mjs";
import { generate, loadGeneratorDefs, SparkGenerator } from "./engine.mjs";
import { createActorFromSpark, createItemFromSpark, createJournalFromSpark, postSparkToChat, postTableRoll, npcDataFromGeneration, itemDataFromGeneration } from "./create.mjs";
import { rollOracle, rollYesNo } from "../rolls/resolution.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * The Sparks window: sentence generators, random tables, oracle and import tools.
 */
export class SparksApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance;

  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null;
    this.theme = game.settings.get(SYSTEM_ID, "sparkTheme") ?? "fantasy";
    this.results = [];
    this.filter = "";
    this.selectedGenerator = "npc";
    this.options = {};
  }

  static DEFAULT_OPTIONS = {
    id: "tt-sparks",
    classes: ["tagandtally", "sparks"],
    position: { width: 760, height: 640 },
    window: { title: "TAGANDTALLY.Sparks.Title", icon: "fa-solid fa-wand-magic-sparkles", resizable: true },
    actions: {
      generate: SparksApp.#onGenerate,
      createActor: SparksApp.#onCreateActor,
      createItem: SparksApp.#onCreateItem,
      createJournal: SparksApp.#onCreateJournal,
      toChat: SparksApp.#onToChat,
      rollTable: SparksApp.#onRollTable,
      oracle: SparksApp.#onOracle,
      yesNo: SparksApp.#onYesNo,
      importTables: SparksApp.#onImportTables,
      clear: SparksApp.#onClear,
      copy: SparksApp.#onCopy
    }
  };

  static PARTS = {
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    generators: { template: "systems/tagandtally/templates/apps/sparks-generators.hbs", scrollable: [".tt-results"] },
    tables: { template: "systems/tagandtally/templates/apps/sparks-tables.hbs", scrollable: [".tt-table-list"] },
    oracle: { template: "systems/tagandtally/templates/apps/sparks-oracle.hbs" }
  };

  static TABS = {
    primary: {
      tabs: [{ id: "generators", icon: "fa-solid fa-wand-magic-sparkles" }, { id: "tables", icon: "fa-solid fa-table-list" }, { id: "oracle", icon: "fa-solid fa-eye" }],
      initial: "generators", labelPrefix: "TAGANDTALLY.Sparks.Tabs"
    }
  };

  static open({ actor } = {}) {
    SparksApp.#instance ??= new SparksApp();
    if (actor) SparksApp.#instance.actor = actor;
    return SparksApp.#instance.render({ force: true });
  }

  async _prepareContext() {
    const defs = await loadGeneratorDefs();
    const groups = defs.groups.map((g) => ({
      ...g,
      generators: g.generators.map((x) => ({ ...x, selected: x.id === this.selectedGenerator }))
    }));
    const generator = defs.groups.flatMap((g) => g.generators).find((g) => g.id === this.selectedGenerator);
    const optionFields = [];
    for (const opt of generator?.options ?? []) {
      let choices = opt.choices;
      if (!choices && opt.table) choices = (sparkTables.get(opt.table)?.table ?? []).map((r) => r.value);
      optionFields.push({ key: opt.key, label: opt.label, choices: choices ?? [], value: this.options[opt.key] ?? "" });
    }
    const grouped = sparkTables.grouped();
    const filter = this.filter.toLowerCase();
    const tableGroups = Object.entries(grouped).map(([group, tables]) => ({
      group, tables: tables.filter((t) => !filter || t.name.includes(filter)).map((t) => ({ name: t.name, formula: t.formula, rows: t.table?.length ?? 0, overridden: Boolean(sparkTables.worldOverride(t.name)) }))
    })).filter((g) => g.tables.length);
    return {
      tabs: this._prepareTabs("primary"),
      groups, generator, optionFields, results: this.results,
      themes: Object.fromEntries(Object.entries(TAGANDTALLY.sparkThemes).map(([k, v]) => [k, game.i18n.localize(v)])),
      theme: this.theme,
      actor: this.actor, isGM: game.user.isGM,
      tableGroups, filter: this.filter, tableCount: sparkTables.tables.size,
      likelihoods: (sparkTables.get("oracle-likelihood")?.table ?? []).map((r) => ({ value: r.level, label: `${r.value} (${game.i18n.localize(TAGANDTALLY.levels[r.level])})` }))
    };
  }

  async _preparePartContext(partId, context) {
    context.tab = context.tabs?.[partId];
    return context;
  }

  _onRender() {
    const el = this.element;
    el.querySelector("[name='theme']")?.addEventListener("change", (ev) => { this.theme = ev.target.value; this.render(); });
    el.querySelector("[name='generator']")?.addEventListener("change", (ev) => { this.selectedGenerator = ev.target.value; this.options = {}; this.render(); });
    el.querySelectorAll("[data-option]").forEach((input) => input.addEventListener("change", (ev) => { this.options[input.dataset.option] = ev.target.value; }));
    el.querySelector("[name='tableFilter']")?.addEventListener("input", (ev) => {
      this.filter = ev.target.value;
      const q = this.filter.toLowerCase();
      el.querySelectorAll(".tt-table-row").forEach((row) => { row.hidden = q && !row.dataset.name.includes(q); });
    });
    // Tab changes should not drop the actor link.
  }

  static async #onGenerate(event, target) {
    const id = target.dataset.generator ?? this.selectedGenerator;
    this.selectedGenerator = id;
    const r = await generate(id, { theme: this.theme, values: this.options });
    this.results.unshift({ uid: foundry.utils.randomID(), id, label: r.generator.label, text: r.text, html: r.html, generator: r.generator, values: r.values, name: r.name, tags: r.tags });
    this.results = this.results.slice(0, 20);
    this.render();
  }

  #result(target) { return this.results.find((r) => r.uid === target.closest("[data-uid]")?.dataset.uid); }

  static async #onCreateActor(event, target) {
    const r = this.#result(target);
    if (!r) return;
    const data = npcDataFromGeneration(r, { creature: r.generator.id === "creature" });
    const actor = await Actor.create(data);
    actor.sheet.render({ force: true });
  }

  static async #onCreateItem(event, target) {
    const r = this.#result(target);
    if (!r) return;
    const data = itemDataFromGeneration(r, r.generator);
    if (this.actor) {
      await this.actor.createEmbeddedDocuments("Item", [data]);
      ui.notifications.info(game.i18n.format("TAGANDTALLY.Sparks.ItemAdded", { name: data.name, actor: this.actor.name }));
    } else {
      const item = await Item.create(data);
      item.sheet.render({ force: true });
    }
  }

  static async #onCreateJournal(event, target) {
    const r = this.#result(target);
    if (!r) return;
    let folder = game.folders.find((f) => f.type === "JournalEntry" && f.name === "Sparks");
    folder ??= await Folder.create({ name: "Sparks", type: "JournalEntry" });
    const name = r.name ?? `${r.label}: ${r.tags.slice(0, 2).join(" ")}`;
    const entry = await JournalEntry.create({
      name, folder: folder.id,
      pages: [{ name: r.label, type: "text", text: { content: `<p>${r.html}</p>` } }],
      flags: { [SYSTEM_ID]: { spark: r.generator.id, tags: r.tags, text: r.text } }
    });
    entry.sheet.render({ force: true });
  }

  static async #onToChat(event, target) {
    const r = this.#result(target);
    if (r) return postSparkToChat(r, { theme: this.theme });
  }

  static async #onCopy(event, target) {
    const r = this.#result(target);
    if (!r) return;
    await game.clipboard.copyPlainText(r.text);
    ui.notifications.info(game.i18n.localize("TAGANDTALLY.Sparks.Copied"));
  }

  static async #onRollTable(event, target) { return postTableRoll(target.dataset.table); }

  static async #onOracle() {
    const form = this.element;
    const level = Number(form.querySelector("[name='likelihood']")?.value) || 5;
    const question = form.querySelector("[name='question']")?.value ?? "";
    return rollOracle({ level, question, actor: this.actor });
  }

  static async #onYesNo() {
    const question = this.element.querySelector("[name='question']")?.value ?? "";
    return rollYesNo({ question });
  }

  static async #onImportTables(event, target) {
    const group = target.dataset.group || null;
    const n = await sparkTables.importToWorld({ group });
    ui.notifications.info(game.i18n.format("TAGANDTALLY.Sparks.Imported", { count: n }));
    this.render();
  }

  static #onClear() { this.results = []; this.render(); }
}
