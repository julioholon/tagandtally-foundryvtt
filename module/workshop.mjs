import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";
import { TaskRollDialog } from "./rolls/task-roll-dialog.mjs";
import { sceneLevel } from "./rolls/resolution.mjs";
import { sparkTables } from "./sparks/tables.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const W = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Workshop.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Workshop.${k}`));
const C = TAGANDTALLY.crafting;

/**
 * SRD Crafting: a per-character Workshop with the four phases. Each task is a
 * d20 task roll through the Task Roll dialog against (level + rarity); every
 * further attempt on the same target is hindered by 2. Outcomes create, change
 * or destroy gear items on the actor and append their text to the roll card.
 */

/** Remove one unit of an item (or the item when it is the last one). */
async function consume(item) {
  if (!item) return;
  if (item.system.quantity > 1) return item.update({ "system.quantity": item.system.quantity - 1 });
  return item.delete();
}

/** A random bundled resource row of the given type (resources.json categories). */
function randomResourceRow(typeKey) {
  const rows = sparkTables.get("resource")?.table ?? [];
  const cats = C.resourceTypes[typeKey]?.categories ?? [];
  const pool = rows.filter((r) => cats.includes(r.category));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

async function rollTable(name) {
  const r = await sparkTables.roll(name).catch(() => null);
  return r?.value ? String(r.value).replace(/[`*]/g, "").trim() : "";
}

/** Prefill a new item's sentence from the Sparks gear tables. */
async function sparkGearFields(gearType) {
  const subtypeTable = { armor: "armor-type", item: "item-type", weapon: "weapon-type", trap: "trap-type", consumable: "consumable-type" }[gearType];
  return {
    descriptor: await rollTable(`${gearType}-descriptor`),
    material: ["weapon", "armor"].includes(gearType) ? await rollTable(`material-${gearType}`) : "",
    subtype: subtypeTable ? await rollTable(subtypeTable) : "",
    special: await rollTable(`${gearType}-special`) || await rollTable(`${gearType}-effect`),
    damageType: gearType === "weapon" ? await rollTable("damage-type") : ""
  };
}

/** Ask for the crafted item's sentence; null when cancelled. */
async function promptItemSentence(gearType, prefill, { title }) {
  const field = (name, label, value) => `<div class="form-group"><label>${esc(label)}</label><input type="text" name="${name}" value="${esc(value)}" /></div>`;
  const content = `
    ${field("name", game.i18n.localize("TAGANDTALLY.Name"), "")}
    ${field("descriptor", game.i18n.localize("TAGANDTALLY.TagType.Descriptor"), prefill.descriptor)}
    ${["weapon", "armor"].includes(gearType) ? field("material", game.i18n.localize("TAGANDTALLY.Gear.Material"), prefill.material) : ""}
    ${field("subtype", game.i18n.localize("TAGANDTALLY.Gear.Subtype"), prefill.subtype)}
    ${gearType === "weapon" ? field("damageType", game.i18n.localize("TAGANDTALLY.Damage.Type"), prefill.damageType) : ""}
    ${field("special", game.i18n.localize("TAGANDTALLY.Gear.Special"), prefill.special)}
    <p class="hint">${esc(W("SentenceHint"))}</p>`;
  return DialogV2.prompt({
    window: { title },
    content,
    ok: { label: game.i18n.localize("TAGANDTALLY.Create"), callback: (event, button) => Object.fromEntries(new FormData(button.form).entries()) },
    rejectClose: false
  });
}

async function promptText(title, label, value = "") {
  return DialogV2.prompt({
    window: { title },
    content: `<div class="form-group"><label>${esc(label)}</label><input type="text" name="text" value="${esc(value)}" autofocus /></div>`,
    ok: { label: game.i18n.localize("TAGANDTALLY.Create"), callback: (event, button) => button.form.elements.text.value.trim() },
    rejectClose: false
  });
}

export class WorkshopApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instances = new Map();

  constructor({ actor, tab = "harvest" } = {}) {
    super({ id: `tt-workshop-${actor.id}` });
    this.actor = actor;
    this.tab = tab;
    /** Form choices per tab (kept across renders). */
    this.form = {
      harvest: { level: sceneLevel(), type: "ore", rarity: 1 },
      craft: { baseId: "", componentId: "", gearType: "item", rarity: 1 },
      augment: { itemId: "", materialId: "", mode: "augment", rarity: 1 },
      salvage: { itemId: "" }
    };
    /** Attempts per target key: each retry hinders by 2 until a success (or a new target). */
    this.attempts = new Map();
  }

  static DEFAULT_OPTIONS = {
    classes: ["tagandtally", "tt-workshop"],
    tag: "form",
    position: { width: 600, height: "auto" },
    window: { title: "TAGANDTALLY.Workshop.Title", icon: "fa-solid fa-hammer", resizable: true },
    form: { handler: WorkshopApp.#onChange, submitOnChange: true, closeOnSubmit: false },
    actions: {
      tab: WorkshopApp.#onTab,
      rollType: WorkshopApp.#onRollType,
      rollRarity: WorkshopApp.#onRollRarity,
      resetAttempts: WorkshopApp.#onResetAttempts,
      harvest: WorkshopApp.#onHarvest,
      craft: WorkshopApp.#onCraft,
      augment: WorkshopApp.#onAugment,
      salvage: WorkshopApp.#onSalvage
    }
  };

  static PARTS = { body: { template: "systems/tagandtally/templates/apps/workshop.hbs", scrollable: [".tt-workshop-body"] } };

  static open({ actor, tab } = {}) {
    actor ??= canvas.tokens?.controlled[0]?.actor ?? game.user.character;
    if (!actor || actor.type === "faction") return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Workshop.NoActor"));
    let app = WorkshopApp.#instances.get(actor.uuid);
    if (!app) { app = new WorkshopApp({ actor, tab }); WorkshopApp.#instances.set(actor.uuid, app); }
    else if (tab) app.tab = tab;
    return app.render({ force: true });
  }

  static refresh(actor) {
    for (const app of WorkshopApp.#instances.values()) if (!actor || app.actor.uuid === actor.uuid) app.render();
  }

  get title() { return `${W("Title")}: ${this.actor.name}`; }

  async _onClose(options) {
    await super._onClose(options);
    WorkshopApp.#instances.delete(this.actor.uuid);
  }

  /* --------------------------------- data -------------------------------- */

  get gear() { return this.actor.items.filter((i) => i.type === "gear"); }
  get resources() { return this.gear.filter((i) => i.system.isResource && !i.system.salvaged); }
  get salvagedParts() { return this.gear.filter((i) => i.system.isResource && i.system.salvaged); }
  get augmentable() { return this.gear.filter((i) => !i.system.isResource && !i.system.isConsumable && !i.system.isContainer); }

  attemptsFor(key) { return this.attempts.get(key) ?? 0; }

  async _prepareContext() {
    const f = this.form;
    const opt = (items, selected) => items.map((i) => ({ id: i.id, name: `${i.name} (L${i.system.level}${i.system.rarity ? `, ${game.i18n.localize(i.system.rarityLabel)}` : ""}${i.system.quantity > 1 ? ` ×${i.system.quantity}` : ""})`, selected: i.id === selected }));
    const rarities = (selected) => Object.entries(C.rarities).filter(([k]) => Number(k) > 0).map(([k, r]) => ({ value: Number(k), label: game.i18n.localize(r.label), selected: Number(k) === Number(selected) }));

    const base = this.actor.items.get(f.craft.baseId);
    const component = this.actor.items.get(f.craft.componentId);
    const craftRarity = component ? component.system.rarity : Number(f.craft.rarity);
    const craftLevel = base ? Math.clamp(base.system.level + craftRarity, 1, 10) : null;

    const target = this.actor.items.get(f.augment.itemId);
    const material = this.actor.items.get(f.augment.materialId);
    const mode = f.augment.mode;
    const augRarity = mode === "repair" ? 0 : material ? material.system.rarity : Number(f.augment.rarity);
    const augLevel = !target ? null : mode === "salvaged" ? C.salvageAugmentLevel : Math.clamp(target.system.level + augRarity, 1, 10);
    const augFull = target && target.system.augmentations.length >= C.maxAugmentations && mode !== "repair";

    const salvageItem = this.actor.items.get(f.salvage.itemId);
    const harvestKey = `harvest:${f.harvest.level}:${f.harvest.type}`;

    return {
      actor: this.actor, tab: this.tab, isGM: game.user.isGM, canAct: this.actor.isOwner,
      tabs: ["harvest", "craft", "augment", "salvage"].map((id) => ({ id, label: W(`Tab.${id}`), active: id === this.tab, icon: { harvest: "fa-leaf", craft: "fa-hammer", augment: "fa-wand-magic-sparkles", salvage: "fa-recycle" }[id] })),
      harvest: {
        ...f.harvest, levels: Object.entries(TAGANDTALLY.levels).map(([k, l]) => ({ value: Number(k), label: `${k} · ${game.i18n.localize(l)}`, selected: Number(k) === Number(f.harvest.level) })),
        types: Object.entries(C.resourceTypes).map(([k, t]) => ({ value: k, label: game.i18n.localize(t.label), selected: k === f.harvest.type })),
        rarities: rarities(f.harvest.rarity), attempts: this.attemptsFor(harvestKey), dc: TAGANDTALLY.dcForLevel(f.harvest.level)
      },
      craft: {
        bases: opt(this.resources, f.craft.baseId), components: opt(this.resources.filter((i) => i.id !== f.craft.baseId), f.craft.componentId),
        gearTypes: C.craftTypes.map((k) => ({ value: k, label: game.i18n.localize(TAGANDTALLY.gearTypes[k]), selected: k === f.craft.gearType })),
        rarities: rarities(f.craft.rarity), hasComponent: Boolean(component), rarity: craftRarity, level: craftLevel, dc: craftLevel ? TAGANDTALLY.dcForLevel(craftLevel) : null,
        attempts: base ? this.attemptsFor(`craft:${base.id}`) : 0, fieldWarn: f.craft.gearType !== "consumable", ready: Boolean(base)
      },
      augment: {
        items: opt(this.augmentable, f.augment.itemId), materials: opt(mode === "salvaged" ? this.salvagedParts : this.resources, f.augment.materialId),
        modes: ["augment", "repair", "salvaged"].map((m) => ({ value: m, label: W(`Mode.${m}`), selected: m === mode })), mode,
        rarities: rarities(f.augment.rarity), hasMaterial: Boolean(material), rarity: augRarity, level: augLevel, dc: augLevel ? TAGANDTALLY.dcForLevel(augLevel) : null,
        attempts: target ? this.attemptsFor(`augment:${target.id}`) : 0, ready: Boolean(target) && (mode !== "salvaged" || material) && !augFull, full: augFull,
        count: target?.system.augmentations.length ?? 0, max: C.maxAugmentations, broken: target?.system.broken ?? false, noSalvaged: mode === "salvaged" && !this.salvagedParts.length
      },
      salvage: {
        items: opt(this.augmentable, f.salvage.itemId), level: salvageItem?.system.level ?? null, dc: salvageItem ? TAGANDTALLY.dcForLevel(salvageItem.system.level) : null,
        attempts: salvageItem ? this.attemptsFor(`salvage:${salvageItem.id}`) : 0, ready: Boolean(salvageItem)
      }
    };
  }

  static async #onChange(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    for (const tab of Object.keys(this.form)) if (data[tab]) Object.assign(this.form[tab], data[tab]);
    // Changing mode clears a material that no longer fits the list.
    const mat = this.actor.items.get(this.form.augment.materialId);
    if (mat && (this.form.augment.mode === "salvaged") !== Boolean(mat.system.salvaged)) this.form.augment.materialId = "";
    this.render();
  }

  static #onTab(event, target) { this.tab = target.dataset.tab; this.render(); }

  static async #onRollType() {
    let r = await new Roll("1d8").evaluate();
    while (r.total === 8) r = await new Roll("1d8").evaluate();
    this.form.harvest.type = Object.keys(C.resourceTypes)[r.total - 1];
    ui.notifications.info(W("Rolled", { formula: "1d8", total: r.total, value: game.i18n.localize(C.resourceTypes[this.form.harvest.type].label) }));
    this.render();
  }

  static async #onRollRarity(event, target) {
    const r = await new Roll("1d4").evaluate();
    this.form[target.dataset.tab].rarity = r.total;
    ui.notifications.info(W("Rolled", { formula: "1d4", total: r.total, value: game.i18n.localize(C.rarities[r.total].label) }));
    this.render();
  }

  static #onResetAttempts(event, target) { this.attempts.delete(target.dataset.key); this.render(); }

  /* --------------------------------- rolls ------------------------------- */

  /** Roll a workshop task through the Task Roll dialog. Returns the resolution result or null. */
  async roll(task, key, level, title) {
    const attempts = this.attemptsFor(key);
    const fixedHinders = attempts ? [{ name: W("Retry", { n: attempts }), steps: attempts * C.retryHinder, source: "automatic" }] : [];
    const result = await TaskRollDialog.prompt({ actor: this.actor, level, title, fixedHinders, context: { workshop: { task, key } } });
    if (!result) return null;
    return result;
  }

  /** Append the outcome to the roll card and remember the attempt. */
  async finish(result, key, task, lines, { success }) {
    if (success) this.attempts.delete(key);
    else this.attempts.set(key, this.attemptsFor(key) + 1);
    const outcome = C.outcomes[task][result.band.id];
    const html = `<div class="tagandtally chat-card tt-workshop-outcome"><p><i class="fa-solid fa-hammer"></i> <strong>${esc(W(`Tab.${task}`))} · ${esc(game.i18n.localize(result.band.label))}</strong></p><p>${esc(W(`Outcome.${task}.${outcome}`))}</p>${lines.map((l) => `<p>${l}</p>`).join("")}</div>`;
    await result.message.update({ content: `${result.message.content}${html}` });
    this.render();
  }

  static async #onHarvest() {
    const f = this.form.harvest;
    const level = Math.clamp(Number(f.level) || 1, 1, 10);
    const key = `harvest:${f.level}:${f.type}`;
    const typeLabel = game.i18n.localize(C.resourceTypes[f.type]?.label ?? "");
    const result = await this.roll("harvest", key, level, `${W("Tab.harvest")}: ${typeLabel}`);
    if (!result) return;
    const band = result.band.id;
    const lines = [];
    let success = false;
    if (band === "failAnd") {
      // The resource is destroyed: a new source starts fresh.
      this.attempts.delete(key);
      await this.finish(result, key, "harvest", lines, { success: false });
      this.attempts.delete(key);
      return;
    }
    if (band !== "failBut") {
      success = true;
      const itemLevel = Math.clamp(level + (band === "successBut" ? -1 : band === "successAnd" ? 1 : 0), 1, 10);
      const row = randomResourceRow(f.type);
      const rarity = Number(f.rarity) || 1;
      const name = row?.value ? String(row.value) : `${typeLabel} L${itemLevel}`;
      const [item] = await this.actor.createEmbeddedDocuments("Item", [{
        name, type: "gear", img: "icons/svg/item-bag.svg",
        system: { gearType: "resource", kind: "functional", level: itemLevel, rarity, cost: Math.min(6, Math.max(0, Math.ceil(itemLevel / 2))), descriptor: row?.descriptor ?? "", subtype: typeLabel.toLowerCase(), special: row?.special ?? "", source: "resource" }
      }]);
      lines.push(`<i class="fa-solid fa-leaf"></i> ${esc(W("Harvested", { name: item.name, level: itemLevel, rarity: game.i18n.localize(C.rarities[rarity].label) }))}`);
    }
    // Each further item from the same source is a new, harder attempt even after a success.
    await this.finish(result, key, "harvest", lines, { success: false });
    if (success) this.render();
  }

  static async #onCraft() {
    const f = this.form.craft;
    const base = this.actor.items.get(f.baseId);
    if (!base) return;
    const component = this.actor.items.get(f.componentId);
    const rarity = component ? component.system.rarity : Number(f.rarity) || 0;
    const level = Math.clamp(base.system.level + rarity, 1, 10);
    const key = `craft:${base.id}`;
    const typeLabel = game.i18n.localize(TAGANDTALLY.gearTypes[f.gearType]);
    const result = await this.roll("craft", key, level, `${W("Tab.craft")}: ${typeLabel}`);
    if (!result) return;
    const band = result.band.id;
    const lines = [];
    if (band === "failAnd") {
      await consume(base); await consume(component);
      lines.push(esc(W("MaterialsLost", { names: [base.name, component?.name].filter(Boolean).join(", ") })));
      this.form.craft.baseId = ""; this.form.craft.componentId = "";
      return this.finish(result, key, "craft", lines, { success: false });
    }
    if (band === "failBut") return this.finish(result, key, "craft", lines, { success: false });
    const prefill = await sparkGearFields(f.gearType);
    if (!prefill.material) prefill.material = base.system.subtype || base.name;
    const fields = await promptItemSentence(f.gearType, prefill, { title: `${W("NewItem")}: ${typeLabel}` });
    if (!fields) return this.finish(result, key, "craft", [esc(W("Cancelled"))], { success: false });
    const itemLevel = Math.clamp(C.craftedLevel + (rarity >= 3 ? 1 : 0), 1, 10);
    const name = fields.name?.trim() || `${fields.descriptor} ${fields.subtype}`.trim() || typeLabel;
    const [item] = await this.actor.createEmbeddedDocuments("Item", [{
      name, type: "gear",
      system: { gearType: f.gearType, level: itemLevel, cost: C.craftedCost, descriptor: fields.descriptor ?? "", material: fields.material ?? "", subtype: fields.subtype ?? "", special: fields.special ?? "", damageType: fields.damageType ?? "", rarity, armorClass: f.gearType === "armor" ? "light" : "none", description: `<p>${esc(W("CraftedFrom", { base: base.name, component: component?.name ?? "" }))}</p>` }
    }]);
    await consume(base); await consume(component);
    this.form.craft.baseId = ""; this.form.craft.componentId = "";
    lines.push(`<i class="fa-solid fa-hammer"></i> ${esc(W("Crafted", { name: item.name, level: itemLevel }))} <em>${esc(item.system.sentenceText)}</em>`);
    return this.finish(result, key, "craft", lines, { success: true });
  }

  static async #onAugment() {
    const f = this.form.augment;
    const target = this.actor.items.get(f.itemId);
    if (!target) return;
    const mode = f.mode;
    const material = mode === "repair" ? null : this.actor.items.get(f.materialId);
    if (mode === "salvaged" && !material) return;
    const rarity = mode === "repair" ? 0 : material ? material.system.rarity : Number(f.rarity) || 0;
    const level = mode === "salvaged" ? C.salvageAugmentLevel : Math.clamp(target.system.level + rarity, 1, 10);
    const key = `augment:${target.id}`;
    const result = await this.roll("augment", key, level, `${W(`Mode.${mode}`)}: ${target.name}`);
    if (!result) return;
    const band = result.band.id;
    const lines = [];
    if (band === "failAnd") {
      if (material) { await consume(material); lines.push(esc(W("MaterialsLost", { names: material.name }))); this.form.augment.materialId = ""; }
      return this.finish(result, key, "augment", lines, { success: false });
    }
    if (band === "failBut") return this.finish(result, key, "augment", lines, { success: false });
    if (mode === "repair") {
      await target.update({ "system.broken": false });
      lines.push(`<i class="fa-solid fa-screwdriver-wrench"></i> ${esc(W("Repaired", { name: target.name }))}`);
      return this.finish(result, key, "augment", lines, { success: true });
    }
    const prefill = material ? (material.system.salvaged ? material.system.special || material.name : material.system.special || material.name) : "";
    const text = await promptText(`${W("Mode.augment")}: ${target.name}`, W("AugmentTag"), prefill);
    if (!text) return this.finish(result, key, "augment", [esc(W("Cancelled"))], { success: false });
    const bump = rarity >= 3 ? 2 : 1;
    const augmentations = [...target.system.augmentations, text];
    await target.update({ "system.augmentations": augmentations, "system.level": Math.clamp(target.system.level + bump, 1, 10) });
    await consume(material);
    this.form.augment.materialId = "";
    lines.push(`<i class="fa-solid fa-wand-magic-sparkles"></i> ${esc(W("Augmented", { name: target.name, tag: text, level: target.system.level }))}`);
    return this.finish(result, key, "augment", lines, { success: true });
  }

  static async #onSalvage() {
    const f = this.form.salvage;
    const item = this.actor.items.get(f.itemId);
    if (!item) return;
    const key = `salvage:${item.id}`;
    const result = await this.roll("salvage", key, item.system.level, `${W("Tab.salvage")}: ${item.name}`);
    if (!result) return;
    const band = result.band.id;
    const lines = [];
    if (band === "failAnd") {
      await item.delete();
      this.form.salvage.itemId = "";
      return this.finish(result, key, "salvage", [esc(W("Destroyed", { name: item.name }))], { success: false });
    }
    if (band === "failBut") return this.finish(result, key, "salvage", lines, { success: false });
    const count = band === "successAnd" ? 2 : 1;
    const props = [];
    for (let i = 0; i < count; i++) {
      const prefill = i === 0 ? (item.system.special || item.system.augmentations.at(-1) || "") : (item.system.augmentations.at(-1 - i) || "");
      const text = await promptText(`${W("Tab.salvage")}: ${item.name}`, W("SalvageProperty", { n: i + 1, count }), prefill);
      if (!text) break;
      props.push(text);
    }
    if (!props.length) return this.finish(result, key, "salvage", [esc(W("Cancelled"))], { success: false });
    const level = Math.clamp(item.system.level - (band === "successBut" ? 1 : 0), 1, 10);
    const created = await this.actor.createEmbeddedDocuments("Item", props.map((p) => ({
      name: W("SalvagedName", { property: p }), type: "gear", img: "icons/svg/upgrade.svg",
      system: { gearType: "resource", kind: "functional", level, rarity: item.system.rarity, cost: item.system.cost, salvaged: true, special: p, subtype: game.i18n.localize("TAGANDTALLY.ResourceType.Essence").toLowerCase(), description: `<p>${esc(W("SalvagedFrom", { name: item.name }))}</p>` }
    })));
    await item.delete();
    this.form.salvage.itemId = "";
    lines.push(`<i class="fa-solid fa-recycle"></i> ${esc(W("Salvaged", { name: item.name, properties: created.map((c) => c.system.special).join(", ") }))}`);
    return this.finish(result, key, "salvage", lines, { success: true });
  }
}

export function registerWorkshop() {
  for (const hook of ["createItem", "updateItem", "deleteItem"]) Hooks.on(hook, (item) => { if (item.parent?.documentName === "Actor") WorkshopApp.refresh(item.parent); });
}
