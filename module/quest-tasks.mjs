import { TAGANDTALLY, SYSTEM_ID } from "./config.mjs";
import { sparkTables } from "./sparks/tables.mjs";
import { sceneLevel } from "./rolls/resolution.mjs";
import { TaskRollDialog } from "./rolls/task-roll-dialog.mjs";

const { DialogV2 } = foundry.applications.api;

const L = (k, d) => (d ? game.i18n.format(`TAGANDTALLY.Quest.${k}`, d) : game.i18n.localize(`TAGANDTALLY.Quest.${k}`));
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const theme = () => game.settings.get(SYSTEM_ID, "sparkTheme");
const plain = (v) => String(v ?? "").replace(/\*\*/g, "").replace(/[\[\]]/g, "").trim();
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Roll one Sparks table, "" when it is missing. */
async function draw(name) {
  if (!sparkTables.has(name) && !sparkTables.worldOverride(name)) return "";
  const r = await sparkTables.roll(name);
  return r ? plain(r.value) : "";
}

/** A task sentence from the inspiration tables: Verb Adjective Noun ("Follow the hidden ledger"). */
export async function rollTaskText() {
  const [verb, adjective, noun] = await Promise.all(["inspiration-verb", "inspiration-adjective", "inspiration-noun"].map(draw));
  return capitalize([verb, adjective, noun].filter(Boolean).join(" ").toLowerCase());
}

/**
 * Propose `count` tasks: one editable line each with its own reroll. Returns the final texts
 * (blank lines dropped); closing the dialog keeps what was rolled.
 */
export async function proposeTasks(quest, { count = 1, title } = {}) {
  const rolled = [];
  for (let i = 0; i < count; i++) rolled.push(await rollTaskText());
  const rows = rolled.map((text, i) => `<div class="form-group tt-task-row"><input type="text" name="t${i}" value="${esc(text)}" /><a class="tt-task-reroll" data-i="${i}" title="${esc(L("TaskReroll"))}"><i class="fa-solid fa-dice"></i></a></div>`).join("");
  const texts = await DialogV2.prompt({
    window: { title: title ?? L("TaskNew", { quest: quest.name }) },
    content: `<p class="hint">${esc(L("TaskProposeHint"))}</p>${rows}`,
    render: (event, dialog) => {
      const html = dialog.element;
      html.querySelectorAll(".tt-task-reroll").forEach((a) => a.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const input = html.querySelector(`[name="t${a.dataset.i}"]`);
        if (input) input.value = await rollTaskText();
      }));
    },
    ok: { label: L("TaskAdd"), callback: (ev, button) => Array.from({ length: count }, (_, i) => button.form.elements[`t${i}`]?.value.trim() ?? "") },
    rejectClose: false
  });
  return (texts ?? rolled).filter(Boolean);
}

/** Append open tasks to a quest. */
export async function addTasks(quest, texts) {
  if (!texts.length) return quest;
  const steps = [...quest.system.steps.map((s) => ({ text: s.text, done: s.done })), ...texts.map((text) => ({ text, done: false }))];
  return quest.update({ "system.steps": steps });
}

/** The + button: propose one task and add it. */
export async function addTaskInteractive(quest) {
  const texts = await proposeTasks(quest, { count: 1 });
  return addTasks(quest, texts);
}

/** Replace an open task's text with a fresh Verb Adjective Noun. */
export async function rerollTask(quest, index) {
  const steps = quest.system.steps.map((s) => ({ text: s.text, done: s.done }));
  if (!steps[index] || steps[index].done) return quest;
  steps[index].text = await rollTaskText();
  return quest.update({ "system.steps": steps });
}

/** How many more open tasks a quest can use before its Plan would be full. */
export function planRoom(quest) {
  const plan = quest.system.tallies.plan;
  if (!plan.enabled) return 0;
  const open = quest.system.steps.filter((s) => !s.done).length;
  return Math.max(0, plan.max - plan.value - open);
}

/**
 * Attempt a task: a Task Roll at the scene level. Success closes it (the quest item then marks
 * the Plan and clears a Countdown mark, SRD); "Success, but" adds a complication, "Success, and"
 * clears one more Countdown mark; failures leave it open and "Fail, and" presses the Countdown.
 */
export async function rollTask(quest, index, actor = quest.actor) {
  const step = quest.system.steps[index];
  if (!step || step.done) return null;
  if (!actor) return ui.notifications.warn(L("TaskNoActor"));
  const result = await TaskRollDialog.prompt({ actor, level: sceneLevel(), rollType: "task", title: `${quest.name}: ${step.text}` });
  if (!result) return null;
  const band = result.band?.id ?? result.band;
  const lines = [];
  const fresh = quest.system.steps.map((s) => ({ text: s.text, done: s.done }));
  if (["successBut", "success", "successAnd"].includes(band)) {
    fresh[index].done = true;
    await quest.update({ "system.steps": fresh });
    lines.push(L("TaskDone", { task: esc(step.text) }));
    if (band === "successBut") {
      const complication = await draw("inspiration-complication");
      if (complication) lines.push(`${esc(L("TaskComplication"))}: ${esc(complication)}`);
    }
    if (band === "successAnd") {
      const t = quest.system.tallies.countdown;
      if (t.enabled && t.value > 0) { await quest.update({ "system.tallies.countdown.value": t.value - 1 }); lines.push(L("TaskBonus")); }
    }
  } else if (band === "failAnd") {
    // A scene that already serves this quest presses the Countdown from its roll hook.
    const { GameLoopApp } = await import("./game-loop.mjs");
    const scene = GameLoopApp.state.get().scene;
    const covered = scene.level && scene.questUuid === quest.uuid;
    if (!covered && await GameLoopApp.pressQuest(quest.uuid, 1)) lines.push(L("TaskPressed"));
  }
  if (lines.length && result.message) await result.message.update({ content: `${result.message.content}<div class="tagandtally tt-loop-outcome">${lines.map((l) => `<p>${l}</p>`).join("")}</div>` });
  // "Success, and" also sets something good in motion.
  if (band === "successAnd") {
    const { offerAftermath, AFTERMATH } = await import("./aftermath.mjs");
    await offerAftermath(result.message, { polarities: AFTERMATH.task.successAnd, title: quest.name });
  }
  return result;
}

/* ------------------------------ Location -------------------------------- */

/** Roll the quest's hidden Location (a Sparks location sentence). Stored but not shown to players until revealed. */
export async function rollLocation(quest) {
  const { generate } = await import("./sparks/engine.mjs");
  const r = await generate("location", { theme: theme() });
  const name = capitalize(plain(r.tags.slice(0, 2).join(" ")).toLowerCase()) || quest.name;
  return quest.update({ "system.locationName": name, "system.locationText": plain(r.text) }, { ttNoQuestRules: true });
}

/**
 * Reveal the Location: it is rolled now when the quest has none, a chat card announces it, a place
 * journal is created and the quest's character gets it in their known places.
 */
export async function revealLocation(quest) {
  if (quest.system.locationRevealed) return quest;
  if (!quest.system.locationText) await rollLocation(quest);
  await quest.update({ "system.locationRevealed": true }, { ttNoQuestRules: true });
  const { locationName: name, locationText: text } = quest.system;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: quest.actor }),
    content: `<div class="tagandtally tt-loop-outcome"><h3><i class="fa-solid fa-map-location-dot"></i> ${esc(L("LocationRevealed"))}</h3><p><strong>${esc(name)}</strong></p><p>${esc(text)}</p><p class="hint">${esc(quest.name)}</p></div>`
  });
  const actor = quest.actor;
  if (actor?.type !== "character") return quest;
  try {
    const { addRelation } = await import("./relations.mjs");
    let entry = null;
    try {
      let folder = game.folders.find((f) => f.type === "JournalEntry" && f.name === "Sparks");
      folder ??= await Folder.create({ name: "Sparks", type: "JournalEntry" });
      entry = await JournalEntry.create({
        name, folder: folder.id,
        pages: [{ name: L("Location"), type: "text", text: { content: `<p>${esc(text)}</p><p><em>${esc(quest.name)}</em></p>` } }],
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_OBSERVER }
      });
    } catch (err) { console.warn(`${SYSTEM_ID} | place journal not created`, err); }
    if (entry) await addRelation(actor, "places", entry);
    else if (!actor.system.relations.places.some((r) => r.name === name)) {
      const rows = actor.system.relations.places.map((r) => foundry.utils.deepClone(r));
      rows.push({ ...actor.system.constructor.blankRelation("places"), name, notes: quest.name });
      await actor.update({ "system.relations.places": rows });
    }
  } catch (err) { console.warn(`${SYSTEM_ID} | place not added to known places`, err); }
  return quest;
}
