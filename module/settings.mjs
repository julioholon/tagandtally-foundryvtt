import { SYSTEM_ID } from "./config.mjs";

export function registerSettings() {
  game.settings.register(SYSTEM_ID, "defaultLevel", {
    name: "TAGANDTALLY.Settings.DefaultLevel.Name",
    hint: "TAGANDTALLY.Settings.DefaultLevel.Hint",
    scope: "world", config: true, type: Number, default: 3,
    range: { min: 1, max: 10, step: 1 }
  });
  game.settings.register(SYSTEM_ID, "autoTallies", {
    name: "TAGANDTALLY.Settings.AutoTallies.Name",
    hint: "TAGANDTALLY.Settings.AutoTallies.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(SYSTEM_ID, "sparkTheme", {
    name: "TAGANDTALLY.Settings.SparkTheme.Name",
    hint: "TAGANDTALLY.Settings.SparkTheme.Hint",
    scope: "world", config: true, type: String, default: "fantasy",
    choices: { fantasy: "TAGANDTALLY.Theme.Fantasy", modern: "TAGANDTALLY.Theme.Modern", "monster-hunter": "TAGANDTALLY.Theme.MonsterHunter" }
  });
  game.settings.register(SYSTEM_ID, "hideCreatureSecrets", {
    name: "TAGANDTALLY.Settings.HideSecrets.Name",
    hint: "TAGANDTALLY.Settings.HideSecrets.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(SYSTEM_ID, "barBrawlDefaults", {
    name: "TAGANDTALLY.Settings.BarBrawl.Name",
    hint: "TAGANDTALLY.Settings.BarBrawl.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(SYSTEM_ID, "coinsMode", {
    name: "TAGANDTALLY.Settings.Coins.Name",
    hint: "TAGANDTALLY.Settings.Coins.Hint",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register(SYSTEM_ID, "macrosCreated", { scope: "world", config: false, type: Boolean, default: false });
  game.settings.register(SYSTEM_ID, "welcomeShown", {
    scope: "world", config: false, type: Boolean, default: false
  });
}
