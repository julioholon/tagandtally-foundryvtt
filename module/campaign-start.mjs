import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";

const { DialogV2 } = foundry.applications.api;
const L = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Campaign.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Campaign.${k}`));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

/**
 * New campaign: one dialog that sets the Sparks theme, rolls the characters, the opening
 * scene, the first quest with its giver, draws a prophecy and asks the Oracle's opening
 * questions, then opens the Game loop. The Augur steps are listed as a checklist to do by hand.
 */
export async function startCampaign() {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Downtime.GmOnly"));
  const themes = Object.entries(game.settings.settings.get(`${SYSTEM_ID}.sparkTheme`).choices).map(([v, l]) => `<option value="${v}" ${v === game.settings.get(SYSTEM_ID, "sparkTheme") ? "selected" : ""}>${game.i18n.localize(l)}</option>`).join("");
  const check = (name, label, on = true) => `<label class="tt-toggle"><input type="checkbox" name="${name}" ${on ? "checked" : ""} /> ${label}</label>`;
  const content = `
    <div class="form-group"><label>${L("Name")}</label><input type="text" name="name" placeholder="${L("NamePlaceholder")}" autofocus /></div>
    <div class="form-group"><label>${L("Theme")}</label><select name="theme">${themes}</select></div>
    <div class="form-group"><label>${L("Characters")}</label><input type="number" name="characters" value="1" min="0" max="4" /></div>
    <div class="tt-campaign-steps">
      ${check("chronicle", L("StepChronicle"))}
      ${check("prophecy", L("StepProphecy"))}
      ${check("scene", L("StepScene"))}
      ${check("quest", L("StepQuest"))}
      ${check("oracle", L("StepOracle"))}
    </div>
    <p class="hint">${L("AugurHint")}</p>`;
  const data = await DialogV2.prompt({
    window: { title: L("Title") }, position: { width: 480 },
    content,
    ok: { label: L("Start"), callback: (ev, button) => { const f = button.form.elements; return { name: f.name.value.trim(), theme: f.theme.value, characters: Number(f.characters.value) || 0, chronicle: f.chronicle.checked, prophecy: f.prophecy.checked, scene: f.scene.checked, quest: f.quest.checked, oracle: f.oracle.checked }; } },
    rejectClose: false
  });
  if (!data) return null;
  return runCampaignStart(data);
}

export async function runCampaignStart({ name = "", theme = "fantasy", characters = 1, chronicle = true, prophecy = true, scene = true, quest = true, oracle = true } = {}) {
  const done = [];
  await game.settings.set(SYSTEM_ID, "sparkTheme", theme);
  const { GameLoopApp } = await import("./game-loop.mjs");
  const { PartyOverview } = await import("./integrations/party.mjs");
  let folder = null;
  if (name) { folder = game.folders.find((f) => f.type === "JournalEntry" && f.name === name) ?? await Folder.create({ name, type: "JournalEntry" }); }
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
  if (chronicle) { const j = await GameLoopApp.chronicleJournal(); if (folder && j.folder?.id !== folder.id) await j.update({ folder: folder.id }); done.push(L("DoneChronicle")); }
  // Prophecy: a Celtic Cross journaled, and a grand quest on the first character
  let prophecyJournal = null;
  if (prophecy) {
    const { TarotApp, CELTIC_CROSS } = await import("./tarot.mjs");
    await TarotApp.load();
    const app = new TarotApp();
    const used = new Set();
    app.spread = { kind: "cross", cards: CELTIC_CROSS.map((p) => { const [e] = TarotApp.draw(p.deck, 1, used); used.add(e.card.id); return { positionId: p.id, ...e }; }) };
    const by = Object.fromEntries(app.spread.cards.map((e) => [e.positionId, TarotApp.face(e)]));
    prophecyJournal = await JournalEntry.create({ name: game.i18n.format("TAGANDTALLY.Tarot.ProphecyName", { word: by.crown.word }), folder: folder?.id ?? null, pages: [{ name: game.i18n.localize("TAGANDTALLY.Tarot.Prophecy"), type: "text", text: { content: app.spreadHtml(), format: 1 } }] });
    if (party[0]) await party[0].createEmbeddedDocuments("Item", [{ name: game.i18n.format("TAGANDTALLY.Tarot.GrandQuestName", { word: by.crown.word }), type: "quest", system: { questType: by.crown.word, objective: by.outcome.word, goal: by.heart.word, reward: by.future.word, consequence: by.challenge.word, isArc: true, status: "active", description: app.spreadHtml() } }]);
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
    Object.assign(state.scene, await rollScene({}), { number: state.scene.number || 1, questUuid: firstQuest?.uuid ?? state.scene.questUuid, log: [] });
    for (const p of Object.values(state.participants)) { p.spent = 0; p.ready = false; }
    await GameLoopApp.state.set(state);
    done.push(L("DoneScene", { level: state.scene.level, sentence: state.scene.sentence }));
  }
  // The Oracle's opening questions (SRD "How to play")
  if (oracle) {
    const { rollOracle } = await import("./rolls/resolution.mjs");
    for (const key of ["Met", "Settlement", "Mission", "Employer"]) await rollOracle({ level: 5, question: L(`Oracle.${key}`), actor: party[0] });
    done.push(L("DoneOracle"));
  }
  await ChatMessage.create({ speaker: { alias: L("Title") }, content: `<div class="tagandtally chat-card tt-campaign-card"><h3><i class="fa-solid fa-flag-checkered"></i> ${esc(name || L("Title"))}</h3><ul>${done.map((d) => `<li>${d}</li>`).join("")}</ul><p class="hint">${L("AugurChecklist")}</p><ol>${["Region", "Factions", "Location", "People"].map((k) => `<li>${esc(L(`Augur.${k}`))}</li>`).join("")}</ol></div>` });
  if (scene) GameLoopApp.open();
  return { heroes, prophecyJournal, firstQuest };
}
