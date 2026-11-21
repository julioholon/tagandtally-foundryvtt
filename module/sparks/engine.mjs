import { sparkTables } from "./tables.mjs";

/**
 * Sentence generator engine. Renders templates such as
 *   "**{name-patterns|title}** is a {descriptor|tag} {species|tag} who {does-something|tag}."
 * Syntax:
 *   {table}            roll table (theme-aware lookup), cache the result
 *   {=table}           reuse the cached result (roll once if missing)
 *   {=table.field}     read a column of the cached row (e.g. height, rarity)
 *   {a-[b]}            roll table "a-<slug of b's result>", rolling b first if needed
 *   {x ?? y}           fall back to y when x has no table
 *   |tag |lower |title modifiers
 * Results may themselves contain {tokens} (name patterns) and are rendered recursively.
 */
export class SparkGenerator {
  /**
   * @param {object} options
   * @param {string} [options.theme="fantasy"]   fantasy | modern | monster-hunter
   * @param {object} [options.values]            preset values keyed by table name (e.g. {"creature-type": "Undead"})
   */
  constructor({ theme = "fantasy", values = {} } = {}) {
    this.theme = theme;
    this.cache = new Map();
    this.rows = new Map();
    this.used = [];
    for (const [k, v] of Object.entries(values)) if (v) { this.cache.set(k, String(v)); this.rows.set(k, { value: String(v) }); }
  }

  static slug(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  /** Resolve a logical table name to an existing table id, honoring the theme. */
  resolveName(name) {
    const candidates = [`${this.theme}-${name}`, name, `fantasy-${name}`];
    for (const c of candidates) if (sparkTables.has(c) || sparkTables.worldOverride(c)) return c;
    return null;
  }

  /**
   * Resolve a name with [dependency] segments. A dependency with no preset or
   * table gets a random variant (e.g. type-[type-option] picks any theme-type-* table).
   */
  async resolveDependentName(name) {
    const re = /\[([^\]]+)\]/g;
    let out = "";
    let last = 0;
    let match;
    while ((match = re.exec(name))) {
      out += name.slice(last, match.index);
      const dep = match[1];
      let value = this.cache.get(dep);
      if (value === undefined) {
        const depTable = this.resolveName(dep);
        if (depTable) {
          const r = await this.rollTable(depTable, dep);
          value = r?.value;
        }
      }
      if (value === undefined) {
        // No table for the dependency: pick a random variant among existing tables.
        const prefix = this.resolveVariantPrefix(out);
        const variants = sparkTables.names().filter((n) => n.startsWith(`${prefix}-`));
        if (variants.length) {
          const pick = variants[Math.floor(Math.random() * variants.length)];
          this.cache.set(dep, pick.slice(prefix.length + 1));
          return pick;
        }
        return prefix;
      }
      out += SparkGenerator.slug(value);
      last = re.lastIndex;
    }
    out += name.slice(last);
    return out;
  }

  resolveVariantPrefix(partial) {
    const base = partial.replace(/-$/, "");
    return this.resolveName(base) ?? `${this.theme}-${base}`;
  }

  async rollTable(tableId, cacheKey) {
    const result = await sparkTables.roll(tableId);
    if (!result) return null;
    // Rendered recursively: name patterns reference other tables.
    result.value = await this.render(result.value);
    if (cacheKey) { this.cache.set(cacheKey, result.value); this.rows.set(cacheKey, result.row); }
    this.cache.set(tableId, result.value);
    this.rows.set(tableId, result.row);
    this.used.push({ table: tableId, value: result.value, total: result.total });
    return result;
  }

  /** Resolve one token body (without braces). */
  async resolveToken(body) {
    const alternatives = body.split("??").map((s) => s.trim());
    for (const alt of alternatives) {
      const [refPart, ...mods] = alt.split("|").map((s) => s.trim());
      const reuse = refPart.startsWith("=");
      let ref = reuse ? refPart.slice(1) : refPart;
      let field = null;
      const dot = ref.indexOf(".");
      if (dot > 0) { field = ref.slice(dot + 1); ref = ref.slice(0, dot); }

      let value;
      if (reuse && this.cache.has(ref) && !field) value = this.cache.get(ref);
      else if (reuse && this.rows.has(ref) && field) value = this.readField(this.rows.get(ref), field);
      else {
        const logical = ref.includes("[") ? await this.resolveDependentName(ref) : ref;
        const tableId = this.resolveName(logical) ?? (sparkTables.has(logical) ? logical : null);
        if (!tableId) continue;
        const r = await this.rollTable(tableId, ref);
        if (!r) continue;
        value = field ? this.readField(r.row, field) : r.value;
      }
      if (value === undefined || value === null) continue;
      return this.applyMods(String(value), mods);
    }
    return `[missing: ${body}]`;
  }

  readField(row, field) {
    if (!row) return undefined;
    if (field in row) return row[field];
    const camel = field.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return row[camel];
  }

  applyMods(value, mods) {
    for (const mod of mods) {
      switch (mod) {
        case "tag": value = `[${value}]`; break;
        case "lower": value = value.toLowerCase(); break;
        case "upper": value = value.toUpperCase(); break;
        case "title": value = value.replace(/(^|[\s-])(\w)/g, (m, sep, c) => sep + c.toUpperCase()); break;
        default: break;
      }
    }
    return value;
  }

  /** Render a template string. */
  async render(template, depth = 0) {
    if (depth > 8 || typeof template !== "string" || !template.includes("{")) return template ?? "";
    let out = "";
    let i = 0;
    while (i < template.length) {
      const open = template.indexOf("{", i);
      if (open < 0) { out += template.slice(i); break; }
      const close = template.indexOf("}", open);
      if (close < 0) { out += template.slice(i); break; }
      out += template.slice(i, open);
      const body = template.slice(open + 1, close);
      const value = await this.resolveToken(body);
      out += await this.render(value, depth + 1);
      i = close + 1;
    }
    return out;
  }

  /** Markdown-lite to HTML: **bold**, [tags], newlines. */
  static toHTML(text) {
    const escaped = foundry.utils.escapeHTML(text ?? "");
    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]/g, '<span class="tt-tag">$1</span>')
      .replace(/\n/g, "<br>");
  }

  /** Extract [tags] from rendered text. */
  static extractTags(text) {
    return [...String(text ?? "").matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  }

  /** Extract **bold** name, if any. */
  static extractName(text) {
    return String(text ?? "").match(/\*\*(.+?)\*\*/)?.[1] ?? null;
  }
}

let generatorDefs = null;
/** Load data/sparks/generators.json once. */
export async function loadGeneratorDefs() {
  generatorDefs ??= await foundry.utils.fetchJsonWithTimeout("systems/tagandtally/data/sparks/generators.json");
  return generatorDefs;
}

export function findGenerator(id) {
  for (const group of generatorDefs?.groups ?? []) {
    const g = group.generators.find((x) => x.id === id);
    if (g) return g;
  }
  return null;
}

/**
 * Generate a sentence by generator id.
 * @returns {{ text: string, html: string, tags: string[], name: string|null, generator: object, used: object[] }}
 */
export async function generate(id, { theme = "fantasy", values = {} } = {}) {
  await loadGeneratorDefs();
  const generator = findGenerator(id);
  if (!generator) throw new Error(`Unknown generator ${id}`);
  const engine = new SparkGenerator({ theme, values });
  const text = await engine.render(generator.template);
  return {
    text, html: SparkGenerator.toHTML(text), tags: SparkGenerator.extractTags(text),
    name: SparkGenerator.extractName(text), generator, used: engine.used, values: Object.fromEntries(engine.cache)
  };
}
