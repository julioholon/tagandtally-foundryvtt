// Node harness: renders every Sparks generator against the bundled tables with minimal Foundry mocks.
// Usage: node scripts/test-sparks.mjs .
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(process.argv[2] ?? ".");
globalThis.Math.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
globalThis.foundry = {
  utils: {
    fetchJsonWithTimeout: async (url) => JSON.parse(fs.readFileSync(path.join(root, url.replace(/^systems\/tagandtally\//, "")), "utf8")),
    escapeHTML: (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    deepClone: (o) => JSON.parse(JSON.stringify(o))
  },
  abstract: { TypeDataModel: class {} },
  data: { fields: {} }
};
globalThis.Roll = class {
  constructor(f) { this.formula = f; }
  async evaluate() {
    const m = this.formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!m) throw new Error("bad formula " + this.formula);
    let t = 0; for (let i = 0; i < +m[1]; i++) t += 1 + Math.floor(Math.random() * +m[2]);
    this.total = t + (m[3] ? +m[3] : 0); return this;
  }
};
globalThis.game = { tables: [], settings: { get: () => 3 }, i18n: { localize: (s) => s, format: (s) => s } };
globalThis.CONST = { TABLE_RESULT_TYPES: { TEXT: 0 } };
globalThis.Hooks = { on() {} };
const { sparkTables } = await import(path.join(root, "module/sparks/tables.mjs"));
const { generate, loadGeneratorDefs } = await import(path.join(root, "module/sparks/engine.mjs"));
await sparkTables.load();
const defs = await loadGeneratorDefs();
let missing = 0;
for (const theme of ["fantasy", "modern", "monster-hunter"]) {
  console.log(`\n=== ${theme}`);
  for (const group of defs.groups) for (const g of group.generators) {
    for (let n = 0; n < 5; n++) {
      const r = await generate(g.id, { theme });
      if (n === 0) console.log(`[${g.id}] ${r.text.replace(/\n/g, " / ")}`);
      if (r.text.includes("[missing")) { missing++; if (n > 0) console.log(`  MISSING: ${r.text}`); }
    }
  }
}
const r = await generate("creature", { values: { "creature-type": "Undead" } });
console.log("\npreset:", r.text);
console.log("\nmissing count:", missing, "tables:", sparkTables.tables.size);
