import { SYSTEM_ID } from "./config.mjs";
import { augurEntity, augurLocationsForScene } from "./relations.mjs";
import { findAugurPerson } from "./integrations/augur.mjs";

/**
 * "Log to journal": copy a chat message into a journal page so the GM can
 * write what happened next. Targets are Augur Nexus entity journals (their
 * Journal page), any journal entry, or a per-character Chronicle journal.
 * Players without write access hand the append to the active GM over the socket.
 */

const CHRONICLE_FOLDER = "Tag & Tally Chronicles";
let lastTarget = null;

export function registerJournalLog() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const meta = html.querySelector(".message-metadata");
    if (!meta || html.querySelector(".tt-log-journal")) return;
    const a = document.createElement("a");
    a.className = "tt-log-journal";
    a.title = game.i18n.localize("TAGANDTALLY.Journal.Log");
    a.innerHTML = '<i class="fa-solid fa-book-medical"></i>';
    a.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); logMessageToJournal(message); });
    meta.prepend(a);
  });
  game.socket.on(`system.${SYSTEM_ID}`, async (data) => {
    if (data?.op === "journalLog" && game.user === game.users.activeGM) {
      const page = await fromUuid(data.pageUuid);
      if (page) await appendToPage(page, data.html);
    }
  });
}

/** The text page of a journal that should receive log entries, created if missing. */
export async function logPageFor(journal) {
  const entity = augurEntity(journal);
  const notesId = entity?.journal?.notesPageId;
  let page = (notesId && journal.pages.get(notesId)) || journal.pages.find((p) => p.type === "text" && /^(journal|notes|chronicle|crônica|diário)$/i.test(p.name)) || journal.pages.find((p) => p.type === "text");
  if (!page) {
    if (!journal.isOwner) return null;
    [page] = await journal.createEmbeddedDocuments("JournalEntryPage", [{ name: game.i18n.localize("TAGANDTALLY.Journal.Chronicle"), type: "text", text: { content: "", format: 1 } }]);
  }
  return page;
}

/** Per-character Chronicle journal, created on demand (GM) or requested from the GM. */
export async function chronicleFor(actor) {
  const name = game.i18n.format("TAGANDTALLY.Journal.ChronicleOf", { name: actor.name });
  let journal = game.journal.find((j) => j.getFlag(SYSTEM_ID, "chronicleFor") === actor.uuid) ?? game.journal.getName(name);
  if (journal) return journal;
  if (!game.user.isGM) return null;
  let folder = game.folders.find((f) => f.type === "JournalEntry" && f.name === CHRONICLE_FOLDER);
  folder ??= await Folder.create({ name: CHRONICLE_FOLDER, type: "JournalEntry" });
  journal = await JournalEntry.create({
    name, folder: folder.id, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER, ...Object.fromEntries(game.users.filter((u) => actor.testUserPermission(u, "OWNER")).map((u) => [u.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER])) },
    flags: { [SYSTEM_ID]: { chronicleFor: actor.uuid } },
    pages: [{ name: game.i18n.localize("TAGANDTALLY.Journal.Chronicle"), type: "text", text: { content: "", format: 1 } }]
  });
  return journal;
}

function timestamp() {
  const sc = globalThis.SimpleCalendar?.api;
  try {
    const d = sc?.currentDateTimeDisplay?.();
    if (d?.date) return `${d.date}${d.time ? ` ${d.time}` : ""}`;
  } catch (_err) { /* no calendar */ }
  return new Date().toLocaleString(game.i18n.lang);
}

/** Message content as journal HTML: buttons, forms and GM-only parts stripped. */
export function messageToHtml(message) {
  const div = document.createElement("div");
  div.innerHTML = message.content ?? "";
  div.querySelectorAll("button, form, [data-action], .tt-gm-only, .dice-tooltip, .tt-log-journal").forEach((el) => el.remove());
  // Portraits on roll cards are full-size actor images: shrink them (token art when it is the speaker's).
  const token = message.speaker?.actor ? game.actors.get(message.speaker.actor)?.prototypeToken?.texture?.src : null;
  div.querySelectorAll("img").forEach((img) => {
    if (token) img.setAttribute("src", token);
    img.setAttribute("width", "40"); img.setAttribute("height", "40");
  });
  const flavor = message.flavor ? `<em>${foundry.utils.escapeHTML(message.flavor)}</em> ` : "";
  const body = div.innerHTML.trim() || foundry.utils.escapeHTML(message.content?.replace(/<[^>]+>/g, " ") ?? "");
  const who = message.alias || message.speaker?.alias || message.author?.name || "";
  return `<hr><p><strong>${foundry.utils.escapeHTML(timestamp())}</strong>${who ? ` · ${foundry.utils.escapeHTML(who)}` : ""}</p><blockquote>${flavor}${body}</blockquote><p></p>`;
}

async function appendToPage(page, html) {
  const content = `${page.text?.content ?? ""}${html}`;
  await page.update({ "text.content": content });
  return page;
}

/** Candidate journals for a message, most relevant first. */
export function journalCandidates(message) {
  const actor = message.speaker?.actor ? game.actors.get(message.speaker.actor) : null;
  const seen = new Set();
  const out = [];
  const push = (doc, group) => { if (doc && !seen.has(doc.uuid)) { seen.add(doc.uuid); out.push({ uuid: doc.uuid, name: doc.name, group }); } };
  for (const here of augurLocationsForScene(message.speaker?.scene ? game.scenes.get(message.speaker.scene) : canvas?.scene)) push(here, "TAGANDTALLY.Journal.GroupHere");
  if (actor) {
    const person = findAugurPerson(actor);
    if (person) push(person, "TAGANDTALLY.Journal.GroupActor");
    const chronicle = game.journal.find((j) => j.getFlag(SYSTEM_ID, "chronicleFor") === actor.uuid);
    if (chronicle) push(chronicle, "TAGANDTALLY.Journal.GroupActor");
    else out.push({ uuid: `chronicle:${actor.uuid}`, name: game.i18n.format("TAGANDTALLY.Journal.ChronicleOf", { name: actor.name }), group: "TAGANDTALLY.Journal.GroupActor" });
    for (const kind of ["people", "factions", "places"]) {
      for (const row of actor.system.relations?.[kind] ?? []) {
        const doc = row.uuid ? fromUuidSync(row.uuid) : null;
        if (doc?.documentName === "JournalEntry") push(doc, "TAGANDTALLY.Journal.GroupRelations");
      }
    }
  }
  for (const j of game.journal.contents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (j.testUserPermission(game.user, "OBSERVER")) push(j, "TAGANDTALLY.Journal.GroupAll");
  }
  return out;
}

/** Ask where to log, then append the message and open the page. */
export async function logMessageToJournal(message) {
  const candidates = journalCandidates(message);
  if (!candidates.length) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Journal.NoTarget"));
  const here = candidates.find((c) => c.group === "TAGANDTALLY.Journal.GroupHere")?.uuid;
  const preselect = message.getFlag(SYSTEM_ID, "journalTarget") ?? here ?? lastTarget ?? candidates[0].uuid;
  let group = null;
  let options = "";
  for (const c of candidates) {
    if (c.group !== group) { if (group) options += "</optgroup>"; group = c.group; options += `<optgroup label="${game.i18n.localize(group)}">`; }
    options += `<option value="${c.uuid}" ${c.uuid === preselect ? "selected" : ""}>${foundry.utils.escapeHTML(c.name)}</option>`;
  }
  if (group) options += "</optgroup>";
  const choice = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("TAGANDTALLY.Journal.Log"), icon: "fa-solid fa-book-medical" },
    content: `<div class="form-group"><label>${game.i18n.localize("TAGANDTALLY.Journal.Target")}</label><select name="target" autofocus>${options}</select></div><p class="hint">${game.i18n.localize("TAGANDTALLY.Journal.Hint")}</p>`,
    ok: { label: game.i18n.localize("TAGANDTALLY.Journal.Log"), icon: "fa-solid fa-book-medical", callback: (ev, button) => button.form.elements.target.value },
    rejectClose: false
  });
  if (!choice) return;
  let journal;
  if (choice.startsWith("chronicle:")) {
    const actor = await fromUuid(choice.slice(10));
    journal = actor ? await chronicleFor(actor) : null;
    if (!journal) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Journal.AskGM"));
  } else journal = await fromUuid(choice);
  if (!journal) return;
  const page = await logPageFor(journal);
  if (!page) return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Journal.AskGM"));
  const html = messageToHtml(message);
  if (page.isOwner) await appendToPage(page, html);
  else if (game.users.activeGM) game.socket.emit(`system.${SYSTEM_ID}`, { op: "journalLog", pageUuid: page.uuid, html });
  else return ui.notifications.warn(game.i18n.localize("TAGANDTALLY.Journal.AskGM"));
  lastTarget = journal.uuid;
  if (message.isAuthor || game.user.isGM) await message.setFlag(SYSTEM_ID, "journalTarget", journal.uuid);
  ui.notifications.info(game.i18n.format("TAGANDTALLY.Journal.Logged", { name: journal.name }));
  if (page.isOwner) journal.sheet.render({ force: true, pageId: page.id });
}
