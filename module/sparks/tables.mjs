import { TAGANDTALLY, SYSTEM_ID } from "../config.mjs";

/**
 * Store of Sparks random tables. Tables are loaded from data/sparks/tables
 * (synced from the Tag & Tally Obsidian vault). A world RollTable whose name
 * matches a table id (e.g. "creature-type") overrides the bundled table, which
 * is how GMs customize Sparks content.
 */
class SparkTableStore {
  /** @type {Map<string, object>} */
  tables = new Map();
  resolutionTypes = [];
  resolutionDetails = {};
  loaded = false;

  async load() {
    if (this.loaded) return this;
    if (this._loading) return this._loading;
    return (this._loading = this._load());
  }

  async _load() {
    for (const hook of ["createRollTable", "updateRollTable", "deleteRollTable"]) Hooks.on(hook, () => this.invalidateOverrides());
    const base = `systems/${SYSTEM_ID}/data/sparks`;
    const index = await foundry.utils.fetchJsonWithTimeout(`${base}/index.json`);
    for (const file of index) {
      let data;
      try { data = await foundry.utils.fetchJsonWithTimeout(`${base}/${file}`); }
      catch (err) { console.error(`${SYSTEM_ID} | Could not load Spark table ${file}`, err); continue; }
      if (Array.isArray(data)) {
        for (const table of data) this._register(table, file);
      } else if (file.endsWith("resources.json")) {
        this._registerResources(data);
      } else if (data?.list) {
        this._register({ name: data.name, formula: `1d${data.list.length}`, table: data.list.map((v, i) => ({ min: i + 1, max: i + 1, value: v })) }, file);
      }
    }
    this.loaded = true;
    console.log(`${SYSTEM_ID} | Loaded ${this.tables.size} Spark tables`);
    return this;
  }

  _register(table, file) {
    if (!table?.name) return;
    if (table.name === "resolution-types") { this.resolutionTypes = table.types ?? []; return; }
    if (table.name === "resolution-details") { this.resolutionDetails = table.details ?? {}; return; }
    table.file = file;
    table.group = file.replace(/^tables\//, "").replace(/\.json$/, "");
    this.tables.set(table.name, table);
  }

  /** constants/resources.json is a dictionary of categories; flatten into one table. */
  _registerResources(data) {
    const rows = [];
    for (const [category, entries] of Object.entries(data)) {
      for (const entry of Object.values(entries)) {
        rows.push({
          value: entry.name, rarity: entry.rarity, descriptor: entry.descriptor,
          "resource-type": entry.resourceType, resourceType: entry.resourceType,
          special: entry.special, category
        });
      }
    }
    rows.forEach((r, i) => { r.min = i + 1; r.max = i + 1; });
    this._register({ name: "resource", formula: `1d${rows.length}`, table: rows }, "tables/constants/resources.json");
  }

  has(name) { return this.tables.has(name); }
  get(name) { return this.tables.get(name); }
  names() { return [...this.tables.keys()].sort(); }

  /** Tables grouped by source file for the Sparks browser. */
  grouped() {
    const groups = {};
    for (const t of this.tables.values()) (groups[t.group] ??= []).push(t);
    for (const list of Object.values(groups)) list.sort((a, b) => a.name.localeCompare(b.name));
    return groups;
  }

  /** A world RollTable overriding a bundled table, if any (cached; invalidated by RollTable hooks). */
  worldOverride(name) {
    if (!this._overrides) {
      this._overrides = new Map();
      for (const t of game.tables ?? []) {
        this._overrides.set(t.name, t);
        const flag = t.getFlag(SYSTEM_ID, "sparkTable");
        if (flag) this._overrides.set(flag, t);
      }
    }
    return this._overrides.get(name) ?? null;
  }

  invalidateOverrides() { this._overrides = null; }

  /**
   * Roll on a table. Returns { value, row, total, table, source }.
   * Rows without numeric ranges are picked uniformly.
   */
  async roll(name, { allowWorld = true } = {}) {
    if (allowWorld) {
      const override = this.worldOverride(name);
      if (override) {
        const draw = await override.draw({ displayChat: false });
        const result = draw.results[0];
        const text = result?.description ?? result?.text ?? result?.name ?? "";
        return { value: text, row: { value: text }, total: draw.roll?.total, table: { name }, source: "world" };
      }
    }
    const table = this.tables.get(name);
    if (!table) return null;
    const rows = table.table ?? [];
    if (!rows.length) return null;
    const numeric = rows.every((r) => Number.isFinite(Number(r.min)) && Number.isFinite(Number(r.max)));
    let row;
    let total;
    if (numeric && table.formula && !/^1d1$/.test(table.formula)) {
      try {
        const roll = await new Roll(table.formula).evaluate();
        total = roll.total;
        row = rows.find((r) => total >= Number(r.min) && total <= Number(r.max));
      } catch (err) { /* fall through to uniform pick */ }
    }
    if (!row) row = rows[Math.floor(Math.random() * rows.length)];
    return { value: String(row.value ?? row.label ?? ""), row, total, table, source: "bundled" };
  }

  /* --------------------------- Resolution helpers -------------------------- */

  resolutionLabel(id) {
    return this.resolutionTypes.find((t) => t.id === id)?.label ?? id;
  }

  /** The Sparks description for a band of a resolution type, if any. */
  resolutionDetail(rollTypeId, bandId) {
    const details = this.resolutionDetails[rollTypeId];
    if (!details) return null;
    return details[TAGANDTALLY.bandSparkNames[bandId]] ?? null;
  }

  /* ------------------------------- Importing ------------------------------ */

  /** Create world RollTables from the bundled tables (optionally one group). */
  async importToWorld({ group = null, folderName = "Sparks" } = {}) {
    let folder = game.folders.find((f) => f.type === "RollTable" && f.name === folderName);
    folder ??= await Folder.create({ name: folderName, type: "RollTable" });
    const created = [];
    for (const table of this.tables.values()) {
      if (group && table.group !== group) continue;
      if (game.tables.find((t) => t.name === table.name)) continue;
      const rows = table.table ?? [];
      const numeric = rows.every((r) => Number.isFinite(Number(r.min)) && Number.isFinite(Number(r.max)));
      const results = rows.map((r, i) => ({
        type: CONST.TABLE_RESULT_TYPES.TEXT,
        description: String(r.value ?? r.label ?? ""),
        weight: 1,
        range: numeric ? [Number(r.min), Number(r.max)] : [i + 1, i + 1]
      }));
      created.push({
        name: table.name,
        folder: folder.id,
        formula: numeric ? table.formula : `1d${rows.length}`,
        replacement: true,
        displayRoll: true,
        results,
        flags: { [SYSTEM_ID]: { sparkTable: table.name, group: table.group } }
      });
    }
    if (created.length) await RollTable.createDocuments(created);
    return created.length;
  }
}

export const sparkTables = new SparkTableStore();
