import { SYSTEM_ID } from "./config.mjs";

/**
 * One-off data migrations, keyed by a world setting holding the last migrated version.
 */
export function registerMigrationSetting() {
  game.settings.register(SYSTEM_ID, "migrationVersion", { scope: "world", config: false, type: String, default: "0.0.0" });
}

export async function migrateWorld() {
  if (!game.user.isGM) return;
  const current = game.system.version;
  const last = game.settings.get(SYSTEM_ID, "migrationVersion");
  if (!foundry.utils.isNewerVersion(current, last) && last !== "0.0.0") return;

  // 0.1.1: tag items were created with a non-existent core icon.
  await replaceItemImage("icons/svg/tag.svg", "icons/svg/upgrade.svg");

  // 0.2.1: Item Piles actors created before the fix carry the NPC default Wealth 3.
  for (const actor of game.actors) {
    if (actor.flags["item-piles"] && actor.type === "npc" && actor.system.wealth.value === 3 && !actor.system.merchant) {
      await actor.update({ "system.wealth.value": 0 }, { ttNoClimb: true });
    }
  }

  // 0.2.3: unlinked pile tokens kept their own copy of that Wealth 3.
  for (const scene of game.scenes) {
    const updates = scene.tokens
      .filter((t) => t.flags["item-piles"] && !t.actorLink && foundry.utils.getProperty(t.delta ?? {}, "system.wealth.value") > 0 && !t.actor?.system.merchant)
      .map((t) => ({ _id: t.id, "delta.system.wealth.value": 0 }));
    if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
  }

  // 0.3.0: "Known world" text fields became relation rows (converted in memory by
  // CharacterData.migrateData; persisted here) and the character arc became a quest.
  // The old keys are stripped from the client copy, so this is gated on the version, not on the data.
  if (foundry.utils.isNewerVersion("0.3.0", last)) {
    for (const actor of game.actors) {
      if (actor.type !== "character") continue;
      const arc = actor.system.legacyArc;
      if (arc && !actor.items.some((i) => i.type === "quest" && i.system.isArc)) {
        await actor.createEmbeddedDocuments("Item", [{ name: arc, type: "quest", system: { isArc: true, goal: arc } }]);
      }
      await actor.update({
        "system.relations": foundry.utils.deepClone(actor.system._source.relations),
        "system.legacyArc": "", "system.-=lore": null, "system.-=arc": null
      }, { ttNoClimb: true, ttSentenceSync: false });
    }
  }

  await game.settings.set(SYSTEM_ID, "migrationVersion", current);
}

async function replaceItemImage(from, to) {
  let count = 0;
  for (const actor of game.actors) {
    const updates = actor.items.filter((i) => i.img === from).map((i) => ({ _id: i.id, img: to }));
    if (updates.length) { await actor.updateEmbeddedDocuments("Item", updates); count += updates.length; }
  }
  const world = game.items.filter((i) => i.img === from).map((i) => ({ _id: i.id, img: to }));
  if (world.length) { await Item.updateDocuments(world); count += world.length; }
  if (count) console.log(`${SYSTEM_ID} | Migrated ${count} item icons from ${from} to ${to}`);
}
