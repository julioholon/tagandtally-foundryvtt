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
