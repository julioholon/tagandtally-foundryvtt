// Checks that every TAGANDTALLY.* key and template path referenced in code exists.
// Usage: node scripts/validate.mjs .
import fs from "node:fs"; import path from "node:path";
const root = path.resolve(process.argv[2] ?? ".");
const lang = JSON.parse(fs.readFileSync(path.join(root, "lang/en.json"), "utf8"));
const has = (key) => key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), lang) !== undefined;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(root).filter((f) => !f.includes("/.git/") && !f.includes("/data/") && /\.(mjs|hbs|json)$/.test(f) && !f.endsWith("en.json"));
const missing = new Set(); const templates = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/["'`](TAGANDTALLY\.[A-Za-z0-9_.]+)["'`]/g)) if (!has(m[1])) missing.add(`${m[1]}  (${path.relative(root, f)})`);
  for (const m of src.matchAll(/localize ["']([A-Za-z0-9_.]+)["']/g)) if (!has(m[1])) missing.add(`${m[1]}  (${path.relative(root, f)})`);
  for (const m of src.matchAll(/systems\/tagandtally\/(templates\/[A-Za-z0-9_\-\/.]+\.hbs)/g)) templates.add(m[1]);
  for (const m of src.matchAll(/"(templates\/[A-Za-z0-9_\-\/.]+\.hbs)"/g)) templates.add(m[1]);
}
console.log("Missing i18n keys:", missing.size); for (const m of [...missing].sort()) console.log("  ", m);
const missingT = [...templates].filter((t) => !fs.existsSync(path.join(root, t)));
console.log("Missing templates:", missingT);
// Unbalanced handlebars blocks
for (const f of files.filter((f) => f.endsWith(".hbs"))) {
  const src = fs.readFileSync(f, "utf8"); const stack = [];
  for (const m of src.matchAll(/\{\{~?[#/](\w+)/g)) {
    const [tok, name] = m; if (tok.includes("{{#") || tok.includes("{{~#")) stack.push(name); else { const top = stack.pop(); if (top !== name) console.log("UNBALANCED", path.relative(root, f), top, name); }
  }
  if (stack.length) console.log("UNCLOSED", path.relative(root, f), stack);
}
console.log("done");
