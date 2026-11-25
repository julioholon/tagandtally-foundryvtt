import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";

const { DialogV2 } = foundry.applications.api;
const L = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Campaign.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Campaign.${k}`));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/** The ongoing campaign, as recorded by the last start (name, journal folder id, start). */
export function currentCampaign() {
  const c = game.settings.get(SYSTEM_ID, "campaign") ?? {};
  return c.folderId && game.folders.get(c.folderId) ? c : null;
}

/** Simple Calendar's current date, when the module is active. */
function calendarNow() {
  const api = globalThis.SimpleCalendar?.api;
  if (typeof api?.currentDateTime !== "function") return null;
  try { return api.currentDateTime(); } catch { return null; }
}

/**
 * New campaign: one dialog that sets the Sparks theme, rolls the characters, the opening
 * scene, the first quest with its giver and draws the prophecy, then opens the Game loop.
 * The Augur steps are listed as a checklist to do by hand. An ongoing campaign's journals
 * are cleared first (after a confirmation); actors are never removed.
 */
export async function startCampaign() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Downtime.GmOnly"));
  const ongoing = currentCampaign();
  const themes = Object.entries(game.settings.settings.get(`${SYSTEM_ID}.sparkTheme`).choices).map(([v, l]) => `<option value="${v}" ${v === game.settings.get(SYSTEM_ID, "sparkTheme") ? "selected" : ""}>${game.i18n.localize(l)}</option>`).join("");
  const row = (label, field) => `<div class="form-group"><label>${label}</label><div class="form-fields">${field}</div></div>`;
  const check = (name, label, on = true) => `<label class="tt-toggle"><input type="checkbox" name="${name}" ${on ? "checked" : ""} /> <span>${label}</span></label>`;
  const now = calendarNow();
  const dateRow = now ? row(L("StartDate"), `<input type="number" name="year" value="${now.year}" title="${L("Year")}" /><input type="number" name="month" value="${now.month + 1}" min="1" title="${L("Month")}" /><input type="number" name="day" value="${now.day + 1}" min="1" title="${L("Day")}" /><input type="number" name="hour" value="${now.hour}" min="0" max="23" title="${L("Hour")}" />`) : "";
  const content = `
    ${ongoing ? `<p class="notification warning">${L("OngoingWarning", { name: esc(ongoing.name) })}</p>` : ""}
    ${row(L("Name"), `<input type="text" name="name" placeholder="${L("NamePlaceholder")}" autofocus />`)}
    ${row(L("Theme"), `<select name="theme">${themes}</select>`)}
    ${row(L("Characters"), `<input type="number" name="characters" value="1" min="0" max="4" />`)}
    ${dateRow}
    <fieldset class="tt-campaign-steps"><legend>${L("Steps")}</legend>
      ${check("chronicle", L("StepChronicle"))}
      ${check("prophecy", L("StepProphecy"))}
      ${check("scene", L("StepScene"))}
      ${check("quest", L("StepQuest"))}
    </fieldset>
    <p class="hint">${L("AugurHint")}</p>`;
  const data = await DialogV2.prompt({
    window: { title: L("Title"), icon: "fa-solid fa-flag-checkered" }, classes: ["tagandtally", "tt-campaign-dialog"], position: { width: 520 },
    content,
    ok: { label: L("Start"), icon: "fa-solid fa-check", callback: (ev, button) => { const f = button.form.elements; return { name: f.name.value.trim(), theme: f.theme.value, characters: Number(f.characters.value) || 0, chronicle: f.chronicle.checked, prophecy: f.prophecy.checked, scene: f.scene.checked, quest: f.quest.checked, date: now ? { year: Number(f.year.value), month: Number(f.month.value) - 1, day: Number(f.day.value) - 1, hour: Number(f.hour.value) || 0, minute: 0 } : null }; } },
    rejectClose: false
  });
  if (!data) return null;
  if (ongoing) {
    const ok = await DialogV2.confirm({ window: { title: L("Title") }, classes: ["tagandtally"], content: `<p>${L("CleanupConfirm", { name: esc(ongoing.name) })}</p>`, rejectClose: false });
    if (!ok) return null;
    await cleanupCampaign(ongoing);
  }
  return runCampaignStart(data);
}

/** Delete the ongoing campaign's journals and folder and reset the Game loop. Actors stay. */
export async function cleanupCampaign(campaign) {
  const folder = game.folders.get(campaign.folderId);
  if (folder) {
    const journals = game.journal.filter((j) => j.folder?.id === folder.id);
    if (journals.length) await JournalEntry.deleteDocuments(journals.map((j) => j.id));
    await folder.delete();
  }
  const { GameLoopApp } = await import("./game-loop.mjs");
  await GameLoopApp.state.set(foundry.utils.deepClone(GameLoopApp.state.defaults));
  await game.settings.set(SYSTEM_ID, "campaign", {});
}

export async function runCampaignStart({ name = "", theme = "fantasy", characters = 1, chronicle = true, prophecy = true, scene = true, quest = true, date = null } = {}) {
  const done = [];
  await game.settings.set(SYSTEM_ID, "sparkTheme", theme);
  const { GameLoopApp } = await import("./game-loop.mjs");
  const { PartyOverview } = await import("./integrations/party.mjs");
  // A fresh start: day 1, no scene history (the loop's scene number restarts too).
  const { DowntimeApp } = await import("./downtime.mjs");
  const downtime = DowntimeApp.state.get();
  if (downtime.day !== 1) { downtime.day = 1; await DowntimeApp.state.set(downtime); }
  const loopState = GameLoopApp.state.get();
  if (loopState.history.length || loopState.scene.number > 1) { loopState.history = []; loopState.scene.number = 1; await GameLoopApp.state.set(loopState); }
  const folderName = name || L("Title");
  const folder = game.folders.find((f) => f.type === "JournalEntry" && f.name === folderName) ?? await Folder.create({ name: folderName, type: "JournalEntry" });
  // Starting date and time (Simple Calendar)
  if (date && typeof globalThis.SimpleCalendar?.api?.setDate === "function") {
    try { await globalThis.SimpleCalendar.api.setDate(date); done.push(L("DoneDate", { date: GameLoopApp.calendarDate() })); } catch (err) { console.warn(`${SYSTEM_ID} | Simple Calendar setDate failed`, err); }
  }
  // Characters: random builds, in the party
  const { buildRandomCharacter } = await import("./sparks/character-builder.mjs");
  const heroes = [];
  for (let i = 0; i < characters; i++) {
    const actor = await Actor.create({ name: L("NewCharacter"), type: "character" });
    await buildRandomCharacter(actor, { theme });
    await actor.setFlag(SYSTEM_ID, "inParty", true);
    heroes.push(actor);
  }
  if (heroes.length) done.push(L("DoneCharacters", { count: heroes.length, names: heroes.map((h) => h.name).join(", ") }));
  const party = heroes.length ? heroes : game.actors.filter((a) => PartyOverview.isMember(a));
  // Chronicle
  let chronicleJournal = null;
  if (chronicle) { chronicleJournal = await GameLoopApp.chronicleJournal(); if (chronicleJournal && chronicleJournal.folder?.id !== folder.id) await chronicleJournal.update({ folder: folder.id }); done.push(L("DoneChronicle")); }
  // Prophecy: four verses journaled, and the four grand quests on the first character
  let prophecyJournal = null;
  if (prophecy) {
    const { TarotApp } = await import("./tarot.mjs");
    const verses = await TarotApp.rollProphecy();
    prophecyJournal = await TarotApp.journalSpread({ kind: "prophecy", verses }, { folder: folder.id });
    // The Chronicle opens on the prophecy too, so it is never out of sight.
    if (chronicleJournal) await chronicleJournal.createEmbeddedDocuments("JournalEntryPage", [{ name: game.i18n.localize("TAGANDTALLY.Tarot.Prophecy"), type: "text", sort: 0, text: { content: TarotApp.prophecyHtml(verses), format: 1 } }]);
    if (party[0]) await party[0].createEmbeddedDocuments("Item", TarotApp.grandQuestData(verses, TarotApp.prophecyHtml(verses)));
    done.push(L("DoneProphecy", { name: prophecyJournal.name }));
  }
  // First quest with its giver
  let firstQuest = null;
  if (quest && party[0]) {
    const { createItemFromSpark, createActorFromSpark } = await import("./sparks/create.mjs");
    firstQuest = await createItemFromSpark("quest", { actor: party[0] });
    const giver = await createActorFromSpark("npc");
    await giver.sheet.close();
    await firstQuest.update({ "system.source": giver.name });
    const { addRelation } = await import("./relations.mjs");
    for (const hero of party) await addRelation(hero, "people", giver).catch(() => null);
    done.push(L("DoneQuest", { quest: firstQuest.name, giver: giver.name }));
  }
  // Opening scene in the loop
  if (scene) {
    await GameLoopApp.addActors(party);
    const state = GameLoopApp.state.get();
    const { rollScene } = await import("./game-loop.mjs");
    Object.assign(state.scene, await rollScene({}), { number: 1, questUuid: firstQuest?.uuid ?? state.scene.questUuid, log: [] });
    for (const p of Object.values(state.participants)) { p.spent = 0; p.ready = false; }
    await GameLoopApp.state.set(state);
    done.push(L("DoneScene", { level: state.scene.level, sentence: state.scene.sentence }));
  }
  await game.settings.set(SYSTEM_ID, "campaign", { name: folderName, folderId: folder.id, started: Date.now() });
  await ChatMessage.create({ speaker: { alias: L("Title") }, content: `<div class="tagandtally chat-card tt-campaign-card"><h3><i class="fa-solid fa-flag-checkered"></i> ${esc(folderName)}</h3><ul>${done.map((d) => `<li>${d}</li>`).join("")}</ul><p class="hint">${L("AugurChecklist")}</p><ol>${["Region", "Factions", "Location", "People"].map((k) => `<li>${esc(L(`Augur.${k}`))}</li>`).join("")}</ol></div>` });
  if (scene) GameLoopApp.open();
  return { heroes, prophecyJournal, firstQuest, folder };
}
