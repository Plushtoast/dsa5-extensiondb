import { hasRumorContent, formatRumorResult, getActivatedQuests } from "./questlog-rumors.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export async function getActiveQuestRumorTables() {
  const DSAQuestLogEntry = CONFIG.JournalEntryPage.dataModels.dsaquestlog;
  const tableUuids = new Set();

  for (const { quest } of await getActivatedQuests()) {
    if (quest.status !== 0 || !DSAQuestLogEntry.isVisibleToUser(quest, game.user)) continue;
    for (const ref of Object.values(quest.linkedPages)) {
      if (ref.uuid && ref.visible && foundry.utils.parseUuid(ref.uuid).type === "RollTable") {
        tableUuids.add(ref.uuid);
      }
    }
  }

  const tables = await Promise.all(
    Array.from(tableUuids).map(async (uuid) => {
      const table = await fromUuid(uuid);
      if (!table) return null;
      const remaining = Array.from(table.results).filter((r) => !r.drawn && hasRumorContent(r)).length;
      return remaining > 0 ? { uuid, name: table.name, remaining } : null;
    })
  );
  return tables.filter(Boolean);
}

function drawWeightedResults(undrawnPool, count) {
  const pool = [...undrawnPool];
  const limit = Math.min(count, pool.length);
  return Array.from({ length: limit }, () => {
    const totalWeight = pool.reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * totalWeight;
    const idx = pool.findIndex((r) => (roll -= r.weight) <= 0);
    return pool.splice(idx, 1)[0];
  });
}

async function executeRevealRumorsOnGM({ selections, userId }) {
  for (const { tableUuid, count } of selections) {
    const table = await fromUuid(tableUuid);
    if (!table) continue;

    const undrawn = Array.from(table.results).filter((r) => !r.drawn && hasRumorContent(r));
    const chosenResults = drawWeightedResults(undrawn, count);
    if (!chosenResults.length) continue;

    await table.updateEmbeddedDocuments(
      "TableResult",
      chosenResults.map((r) => ({ _id: r.id, drawn: true }))
    );

    const rumors = await Promise.all(chosenResults.map(formatRumorResult));
    const itemsHtml = rumors.map(({ description }) => `<li>${description}</li>`).join("");
    const tableTitle = foundry.utils.escapeHTML(table.name);

    await ChatMessage.create({
      user: game.user.id,
      speaker: { alias: _loc("DSAQUESTLOG.rumors") },
      content: `<div class="dsa5 chat-card"><h3>${tableTitle}</h3><ul class="dsalist">${itemsHtml}</ul></div>`,
      whisper: [userId],
    });
  }
}

export class RumorPickerDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  #initialQs;
  #tables;
  #selections = new Map();

  constructor(qs, tables, options = {}) {
    super(options);
    this.#initialQs = qs;
    this.#tables = tables;
  }

  static DEFAULT_OPTIONS = {
    id: "dsa5-rumor-picker-dialog",
    tag: "div",
    classes: ["dsa5", "dsa-rumor-picker"],
    window: { icon: "fas fa-comment-dots", resizable: true },
    position: { width: 480, height: "auto" },
    actions: {
      incrementRumor: RumorPickerDialog.#onIncrementRumor,
      decrementRumor: RumorPickerDialog.#onDecrementRumor,
      acceptRumors: RumorPickerDialog.#onAcceptRumors,
      declineRumors: function () {
        this.close();
      },
    },
  };

  static PARTS = {
    main: { template: "modules/dsa5-compendium2/templates/rumor-picker.hbs" },
  };

  get title() {
    return _loc("DSAQUESTLOG.pickUpRumorsTitle");
  }

  #getSpentQs() {
    let sum = 0;
    for (const count of this.#selections.values()) sum += count;
    return sum;
  }

  async _prepareContext() {
    const spentQs = this.#getSpentQs();
    const remainingQs = this.#initialQs - spentQs;

    return {
      initialQs: this.#initialQs,
      remainingQs,
      canAccept: spentQs > 0,
      tables: this.#tables.map((t) => {
        const selected = this.#selections.get(t.uuid) || 0;
        return {
          ...t,
          selected,
          remainingLabel: game.i18n.format("DSAQUESTLOG.remainingRumorsCount", {
            count: t.remaining - selected,
          }),
          canIncrement: remainingQs > 0 && selected < t.remaining,
          canDecrement: selected > 0,
        };
      }),
    };
  }

  static #onIncrementRumor(_event, target) {
    const table = this.#tables.find((t) => t.uuid === target.dataset.tableUuid);
    const current = this.#selections.get(table.uuid) || 0;
    if (this.#getSpentQs() >= this.#initialQs || current >= table.remaining) return;

    this.#selections.set(table.uuid, current + 1);
    this.render();
  }

  static #onDecrementRumor(_event, target) {
    const uuid = target.dataset.tableUuid;
    const current = this.#selections.get(uuid) || 0;
    if (current <= 0) return;

    this.#selections.set(uuid, current - 1);
    this.render();
  }

  static async #onAcceptRumors(_event, target) {
    const selections = Array.from(this.#selections, ([tableUuid, count]) => ({
      tableUuid,
      count,
    })).filter((e) => e.count > 0);

    target.disabled = true;
    const payload = { selections, userId: game.user.id };
    if (game.user.isGM) {
      await executeRevealRumorsOnGM(payload);
    } else if (game.users.activeGM) {
      await game.users.activeGM.query("dsa5-compendium2.revealRumors", payload);
    } else {
      ui.notifications.warn(_loc("DSAError.requiresGM"));
    }
    await this.close();
  }
}

export async function pickUpRumors(actor) {
  const targetActor = actor || canvas.tokens.controlled[0]?.actor || game.user.character;
  if (!targetActor) return ui.notifications.warn(_loc("DSAError.noProperActor"));

  const skillName = _loc("LocalizedIDs.streetwise");
  const skill = targetActor.items.find((i) => i.type === "skill" && i.name === skillName);
  if (!skill) {
    return ui.notifications.warn(
      game.i18n.format("DSAError.notFound", { category: _loc("TYPES.Item.skill"), name: skillName })
    );
  }

  const setupData = await targetActor.setupSkill(skill, {}, targetActor.token?.id);
  if (!setupData) return;

  const rollResult = await targetActor.basicTest(setupData);
  if (!rollResult?.result) return;

  const qs = rollResult.result.qualityStep || 0;
  if (qs <= 0) return ui.notifications.info(_loc("DSAQUESTLOG.rumorRollFailed"));

  const availableTables = await getActiveQuestRumorTables();
  if (!availableTables.length) return ui.notifications.info(_loc("DSAQUESTLOG.noActiveQuestRumors"));

  new RumorPickerDialog(qs, availableTables).render(true);
}

Hooks.once("setup", async () => {
  CONFIG.queries["dsa5-compendium2.revealRumors"] = executeRevealRumorsOnGM;
  await foundry.applications.handlebars.loadTemplates([
    "modules/dsa5-compendium2/templates/rumor-picker.hbs",
  ]);

  CONFIG.JournalEntryPage.dataModels.dsaquestlog.pickUpRumors = pickUpRumors;
  game.dsa5.macros ??= {};
  game.dsa5.macros.pickUpRumors = pickUpRumors;
});
