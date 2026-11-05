const renderedRumorSections = new Map();
const pendingTableDraws = new Map();
let refreshTimeout = null;

export function hasRumorContent(result) {
  const text = result.description.replace(/<[^>]*>/g, "").trim();
  return Boolean(text || (game.user.isGM && result.name.trim()));
}

export async function formatRumorResult(result) {
  const raw = result.description.trim();
  const enriched = raw
    ? await foundry.applications.ux.TextEditor.enrichHTML(raw, { secrets: game.user.isGM })
    : "";
  const description = enriched
    .trim()
    .replace(/^<p>([\s\S]*?)<\/p>$/, (m, inner) => (inner.includes("<p>") ? m : inner.trim()));

  return {
    resultId: result.id,
    name: game.user.isGM ? result.name.trim() : "",
    description,
    drawn: result.drawn,
  };
}

export async function getActivatedQuests() {
  const DSAQuestLogEntry = CONFIG.JournalEntryPage.dataModels.dsaquestlog;
  const { activated } = game.settings.get("dsa5", DSAQuestLogEntry.SETTING_NAME);
  const journals = await Promise.all(activated.map((j) => fromUuid(j.uuid)));
  const entries = [];

  for (const journal of journals.filter(Boolean)) {
    for (const page of journal.pages) {
      if (page.type !== "dsaquestlog") continue;
      for (const [questKey, quest] of Object.entries(page.system.quests)) {
        entries.push({ page, questKey, quest });
      }
    }
  }
  return entries;
}

async function prepareRumorTable(linkKey, uuid, { isGM, visible }) {
  const table = await fromUuid(uuid);
  if (!table) return null;

  const visibleResults = Array.from(table.results)
    .sort((a, b) => a.range[0] - b.range[0])
    .filter((r) => (r.drawn || isGM) && hasRumorContent(r));

  if (!visibleResults.length && !isGM) return null;

  const rumors = await Promise.all(visibleResults.map(formatRumorResult));
  const drawnCount = rumors.filter((r) => r.drawn).length;

  return {
    linkKey,
    uuid,
    name: table.name,
    visible,
    rumors,
    progressText: `${drawnCount}/${rumors.length}`,
  };
}

async function toggleRumorVisibility(_event, target) {
  const { tableUuid, resultId } = target.dataset;
  const table = await fromUuid(tableUuid);
  const result = table.results.get(resultId);
  await table.updateEmbeddedDocuments("TableResult", [{ _id: resultId, drawn: !result.drawn }]);
}

async function openRumorTable(_event, target) {
  (await fromUuid(target.dataset.uuid)).sheet.render(true);
}

function injectRumorsIntoDOM(root) {
  if (!(root instanceof HTMLElement)) return;
  const views = root.matches(".persona-detail-view")
    ? [root]
    : root.querySelectorAll(".persona-detail-view");

  for (const view of views) {
    if (view.closest('[data-tab="personae"]')) continue;

    const content = view.querySelector(".persona-detail-content");
    if (!content) continue;

    const scrollContainer = view.closest(".persona-details-container");
    const savedTop = scrollContainer?.scrollTop ?? 0;

    content.querySelector(".questlog-rumors-section")?.remove();

    const questKey =
      view.querySelector("[data-quest-key]")?.dataset.questKey ||
      view.closest(".personae-two-column")?.querySelector(".persona-list-item.selected")?.dataset.questKey;

    const html = renderedRumorSections.get(questKey);
    if (!html) continue;

    const rumorSection = document.createRange().createContextualFragment(html.trim()).firstElementChild;
    const anchor = Array.from(
      content.querySelectorAll(":scope > .detail-section:has(.description-text, .questlog-objective-list)")
    ).at(-1);

    if (anchor) anchor.insertAdjacentElement("afterend", rumorSection);
    else content.prepend(rumorSection);

    if (scrollContainer && savedTop > 0) {
      scrollContainer.scrollTop = savedTop;
    }
  }
}

function patchPartSync(app) {
  const proto = Object.getPrototypeOf(app);
  if (proto._rumorSyncPatched) return;

  const origSync = proto._syncPartState;
  proto._syncPartState = function (partId, newElement, priorElement, state) {
    if (partId === "questlog") {
      const questKey = priorElement?.querySelector(
        ".persona-detail-view [data-quest-key], .persona-list-item.selected"
      )?.dataset.questKey;
      if (questKey) {
        newElement
          .querySelector(`.persona-list-item[data-quest-key="${CSS.escape(questKey)}"]`)
          ?.classList.add("selected");
      }
      injectRumorsIntoDOM(newElement);
    }
    return origSync.call(this, partId, newElement, priorElement, state);
  };

  proto._rumorSyncPatched = true;
}

function patchDSAQuestLogEntry() {
  const DSAQuestLogEntry = CONFIG.JournalEntryPage.dataModels.dsaquestlog;

  const origPrepareLinked = DSAQuestLogEntry.prepareLinkedReferences.bind(DSAQuestLogEntry);
  DSAQuestLogEntry.prepareLinkedReferences = async function (quest, options = {}) {
    const grouped = await origPrepareLinked(quest, options);
    const isGM = (options.user ?? game.user).isGM;
    const rumorDocs = [];

    grouped.others = grouped.others.filter((doc) => {
      const isTable = doc.documentType === "RollTable";
      if (isTable) rumorDocs.push(doc);
      return !isTable;
    });

    grouped.rumors = (
      await Promise.all(
        rumorDocs.map((doc) => prepareRumorTable(doc.linkKey, doc.uuid, { isGM, visible: doc.visible }))
      )
    ).filter(Boolean);

    quest.preparedRumors = grouped.rumors;
    return grouped;
  };

  const origPrepareQuest = DSAQuestLogEntry.prepareQuestEntry.bind(DSAQuestLogEntry);
  DSAQuestLogEntry.prepareQuestEntry = async function (entry, options = {}) {
    await origPrepareQuest(entry, options);
    const questKey = options.key || entry.questKey;
    if (entry.preparedRumors.length) {
      renderedRumorSections.set(
        questKey,
        await foundry.applications.handlebars.renderTemplate(
          "modules/dsa5-compendium2/templates/questlog-rumors.hbs",
          { tables: entry.preparedRumors, isGM: game.user.isGM }
        )
      );
    } else {
      renderedRumorSections.delete(questKey);
    }
    return entry;
  };

  const origHydrate = DSAQuestLogEntry.hydrateQuestMedia.bind(DSAQuestLogEntry);
  DSAQuestLogEntry.hydrateQuestMedia = function (root) {
    origHydrate(root);
    injectRumorsIntoDOM(root);
  };
}

async function deliverPendingRumorToasts() {
  if (!pendingTableDraws.size) return;
  const tableCounts = new Map(pendingTableDraws);
  pendingTableDraws.clear();

  const toastsByPage = new Map();
  for (const { page, questKey, quest } of await getActivatedQuests()) {
    let matchedCount = 0;
    for (const ref of Object.values(quest.linkedPages)) {
      if (ref.visible && tableCounts.has(ref.uuid)) {
        matchedCount += tableCounts.get(ref.uuid);
      }
    }
    if (!matchedCount) continue;

    if (!toastsByPage.has(page)) toastsByPage.set(page, []);
    toastsByPage.get(page).push({
      id: `questlog:${page.uuid}:${questKey}:rumors`,
      kind: "questlog",
      tab: "questlog",
      pageUuid: page.uuid,
      entryKey: questKey,
      kicker: _loc("DSAQUESTLOG.title"),
      title: quest.title,
      change: _loc(matchedCount > 1 ? "DSAQUESTLOG.rumorsHeard" : "DSAQUESTLOG.rumorHeard"),
      image: "",
      icon: "fa-regular fa-comments",
      color: "",
      closeLabel: _loc("CALENDAR.DSA.notifications.close"),
      holdMs: 7000,
      visible: quest.visible,
      audience: quest.audience,
      playerOwners: quest.playerOwners,
    });
  }

  const picker = game.dsa5.apps.CalendarPicker;
  const { refreshQuestlog, refreshParts } = picker;
  picker.refreshQuestlog = () => {};
  picker.refreshParts = () => {};
  try {
    for (const [page, toasts] of toastsByPage) {
      page.system._onUpdate({}, { dsaAlmanacToasts: toasts }, game.user.id);
    }
  } finally {
    picker.refreshQuestlog = refreshQuestlog;
    picker.refreshParts = refreshParts;
  }
}

export function refreshQuestlogViews() {
  game.dsa5.apps.CalendarPicker?.refreshQuestlog();
  for (const app of foundry.applications.instances.values()) {
    if (app.document?.type === "dsaquestlog") app.render();
  }
}

function scheduleRumorRefresh() {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(async () => {
    refreshTimeout = null;
    await deliverPendingRumorToasts();
    refreshQuestlogViews();
  }, 50);
}

Hooks.once("setup", async () => {
  await foundry.applications.handlebars.loadTemplates([
    "modules/dsa5-compendium2/templates/questlog-rumors.hbs",
  ]);
  patchDSAQuestLogEntry();
});

Hooks.on("renderApplicationV2", (app, element) => {
  if (app.document?.type === "dsaquestlog" || element.querySelector(".tab[data-tab='questlog']")) {
    patchPartSync(app);
    app.options.actions.toggleRumorVisibility = toggleRumorVisibility;
    app.options.actions.openRumorTable = openRumorTable;
  }
});

Hooks.on("updateTableResult", (result, changed) => {
  if (changed.drawn === true) {
    const tableUuid = result.parent.uuid;
    pendingTableDraws.set(tableUuid, (pendingTableDraws.get(tableUuid) || 0) + 1);
  }
  scheduleRumorRefresh();
});

Hooks.on("createTableResult", scheduleRumorRefresh);
Hooks.on("deleteTableResult", scheduleRumorRefresh);
Hooks.on("updateRollTable", scheduleRumorRefresh);
