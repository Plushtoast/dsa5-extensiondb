// This is a system macro used for automation. It is disfunctional without the proper context.

const { getProperty: getProp, setProperty: setProp, duplicate: dup } = foundry.utils;
const { DialogV2 } = foundry.applications.api;

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Dieses Makro benötigt einen Akteur.",
    title: "Analyse von Gift/Elixier",
    aspWarn: "Nicht genügend AsP (mindestens 1 benötigt).",
    selectItem: "Klicke oder ziehe ein Item hierher",
    categoryLabel: "Gift, Elixier, Heilmittel",
    currentLevel: "Stufe / QL",
    currentAsp: "AsP",
    analyze: "Analysieren",
    cancel: "Schließen",
    emptyList: "Keine analysierbaren Items im Inventar.",
    invalidItem: "Nur Gifte, Heilmittel oder Alchimie-Elixiere sind erlaubt.",
    noItem: "Kein Item ausgewählt.",
    removeHint: "(Rechtsklick zum Entfernen)",
    rollLabel: "Analysewurf (1d6)",
    reducedInfo: "Die Stufe/QL wurde durch den Wurf um 1 reduziert.",
    reducedCappedInfo: "Die Stufe/QL konnte nicht unter 1 reduziert werden.",
    chatHeaderSmall: "Analyse abgeschlossen",
    aspWithCost: (current, max, cost) => `${current}${typeof max === "number" ? `/${max}` : ""} AsP (Kosten: ${cost})`,
    finalSpagyrikaText: (name, level) => `Das Stärkelevel von <b>${name}</b> beträgt ${level}.`,
    aspPath: "system.status.astralenergy.value",
    aspMaxPath: "system.status.astralenergy.max",
    poisonStepPath: "system.step.value",
    consumableQlPath: "system.QL",
    qtyPath: "system.quantity.value",
    subtypePath: "system.subType",
    equipmentTypePath: "system.equipmentType.value",
    acceptedEquipmentTypes: ["healing", "alchemy"],
  },
  en: {
    noActor: "This macro requires an actor.",
    title: "Analyze Poison/Elixir",
    aspWarn: "Not enough AE (requires at least 1).",
    selectItem: "Click or drag an item here",
    categoryLabel: "Poison, Elixir, Remedy",
    currentLevel: "Level / QL",
    currentAsp: "AE",
    analyze: "Analyze",
    cancel: "Close",
    emptyList: "No analyzable items in inventory.",
    invalidItem: "Only poisons, remedies or alchemy elixirs are allowed.",
    noItem: "No item selected.",
    removeHint: "(Right-click to remove)",
    rollLabel: "Analysis roll (1d6)",
    reducedInfo: "The level/QL was reduced by 1 due to the roll.",
    reducedCappedInfo: "The level/QL cannot go below 1.",
    chatHeaderSmall: "Analysis complete",
    aspWithCost: (current, max, cost) => `${current}${typeof max === "number" ? `/${max}` : ""} AE (Cost: ${cost})`,
    finalSpagyrikaText: (name, level) => `The strength level of <b>${name}</b> is ${level}.`,
    aspPath: "system.status.astralenergy.value",
    aspMaxPath: "system.status.astralenergy.max",
    poisonStepPath: "system.step.value",
    consumableQlPath: "system.QL",
    qtyPath: "system.quantity.value",
    subtypePath: "system.subType",
    equipmentTypePath: "system.equipmentType.value",
    acceptedEquipmentTypes: ["healing", "alchemy"],
  },
}[lang];

const ASP_COST = 1;

// --- Helper Funktionen ---

const sendMessage = async (message, flavor = "") => {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: flavor,
    content: message
  });
};

const currentActor = canvas.tokens.controlled[0]?.actor || game.user.character || (typeof actor !== "undefined" ? actor : null);
if (!currentActor) {
  ui.notifications.warn(dict.noActor);
  throw new Error("No actor found");
}

function getAsp(a) { return Number(getProp(a, dict.aspPath) ?? 0) || 0; }
function getAspMax(a) {
  const max = getProp(a, dict.aspMaxPath);
  return typeof max === "number" ? max : null;
}
function hasEnoughAsp(a) { return getAsp(a) >= ASP_COST; }
async function spendAsp(a, amount = ASP_COST) {
  const current = getAsp(a);
  await a.update({ [dict.aspPath]: Math.max(0, current - amount) });
}

function isAllowedItem(item) {
  if (!item) return false;
  const type = String(item.type || "").toLowerCase();
  const subType = String(getProp(item, dict.subtypePath) || "").toLowerCase();
  const equipTypeRaw = getProp(item, dict.equipmentTypePath);
  const equipType = String(equipTypeRaw || "").toLowerCase();

  const isPoison = type === "poison" || subType === "poison";
  const isElixir = type === "elixir" || subType === "elixir";
  const isHealingOrAlchemyConsumable = type === "consumable" && dict.acceptedEquipmentTypes.includes(equipType);

  return isPoison || isElixir || isHealingOrAlchemyConsumable;
}

function readLevel(item) {
  const type = String(item.type || "").toLowerCase();
  const subType = String(getProp(item, dict.subtypePath) || "").toLowerCase();
  const equipType = String(getProp(item, dict.equipmentTypePath) || "").toLowerCase();

  if (type === "poison" || subType === "poison") {
    const step = getProp(item, dict.poisonStepPath);
    return Number.isFinite(Number(step)) ? Number(step) : 0;
  }
  if (type === "elixir" || subType === "elixir" || (type === "consumable" && dict.acceptedEquipmentTypes.includes(equipType))) {
    const ql = getProp(item, dict.consumableQlPath);
    return Number.isFinite(Number(ql)) ? Number(ql) : 0;
  }
  return 0;
}

function readQuantity(item) {
  const q = getProp(item, dict.qtyPath);
  return Number.isFinite(Number(q)) ? Number(q) : 1;
}

function makeReducedCopyData(item, newLevel) {
  const data = dup(item.toObject());
  delete data._id;
  setProp(data, dict.qtyPath, 1);

  const type = String(item.type || "").toLowerCase();
  const subType = String(getProp(item, dict.subtypePath) || "").toLowerCase();
  const equipType = String(getProp(item, dict.equipmentTypePath) || "").toLowerCase();

  if (type === "poison" || subType === "poison") {
    setProp(data, dict.poisonStepPath, newLevel);
  } else {
    setProp(data, dict.consumableQlPath, newLevel);
  }
  return data;
}

function resolveEmbeddedItem(sourceItem, a) {
  if (sourceItem?.id) {
    const byId = a.items.get(sourceItem.id);
    if (isAllowedItem(byId)) return byId;
  }
  return null;
}

// --- Initiale Prüfungen & Listen-Generierung ---

if (!hasEnoughAsp(currentActor)) {
  ui.notifications.warn(dict.aspWarn);
  throw new Error("Not enough AsP");
}

const validItems = currentActor.items.filter(isAllowedItem);

let listItemsHtml = "";
if (validItems.length === 0) {
  listItemsHtml = `<li style="padding: 10px; color: #888; text-align: center; font-style: italic;">${dict.emptyList}</li>`;
} else {
  validItems.forEach((item) => {
    const level = readLevel(item);
    const qty = readQuantity(item);
    listItemsHtml += `
      <li class="item-option" data-id="${item.id}" style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.1); display: flex; align-items: center; gap: 10px; transition: background 0.2s;">
          <img src="${item.img}" style="width: 28px; height: 28px; border-radius: 3px; border: 1px solid #968678; object-fit: cover;">
          <div style="display: flex; flex-direction: column; line-height: 1.1;">
              <span style="font-family: 'Signika'; font-weight: bold;">${item.name} <span style="font-weight: normal; color: #555;">(${qty}x)</span></span>
              <span style="font-size: 0.85em; color: #444;">${dict.currentLevel}: ${level}</span>
          </div>
      </li>`;
  });
}

// --- Applikations Logik ---

class AnalyzeDialog extends DialogV2 {
  constructor() {
    super({
      window: { title: dict.title, resizable: true },
      position: { width: 450, height: "auto" },
      buttons: [
        {
          action: "analyze",
          label: dict.analyze,
          icon: "fas fa-search",
          callback: async () => await this._onAnalyze(),
        },
        {
          action: "cancel",
          label: dict.cancel,
          icon: "fas fa-times",
        },
      ],
      content: `
        <div class="dsa5" style="display:flex; flex-direction:column; gap:8px; margin-bottom: 15px;">
          <div id="error-msg" style="color:#b51c1c; display:none; font-weight: bold; text-align: center; font-family: 'Signika';"></div>

          <div id="drop-zone-container" style="position: relative; margin-top: 5px;">
            <div id="drop-zone" style="border:2px dashed #968678; border-radius:8px; padding:20px; text-align:center; color:#333; background: rgba(0,0,0,0.05); transition: all 0.2s ease; cursor: pointer; min-height: 80px; display: flex; flex-direction: column; justify-content: center;">
              <div id="drop-zone-content">
                <div style="margin-bottom:0px; font-family: 'Signika'; font-weight: bold; font-size: 1.1em;">
                  ${dict.selectItem} <span style="font-weight: normal; font-size: 0.9em; opacity: 0.8;">(${dict.categoryLabel})</span>
                </div>
              </div>
            </div>
            <ul id="item-list" style="display: none; position: absolute; top: calc(100% - 2px); left: 0; width: 100%; background: #e2d8c9; border: 1px solid #968678; border-radius: 0 0 5px 5px; padding: 0; margin: 0; list-style: none; max-height: 200px; overflow-y: auto; z-index: 100; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                ${listItemsHtml}
            </ul>
          </div>

          <div class="info" style="display:flex; gap:20px; justify-content:center; font-size:15px; margin-top: 10px; font-family: 'Signika'; background: #e2d8c9; padding: 10px; border-radius: 5px; border: 1px solid #968678;">
            <div><strong>${dict.currentLevel}:</strong> <span id="item-level">-</span></div>
            <div><strong>${dict.currentAsp}:</strong> <span id="actor-asp"></span></div>
          </div>
        </div>
      `,
    });
    this.embeddedItem = null;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    if (!html) return;

    this.dropZone = html.querySelector("#drop-zone");
    this.dropZoneContent = html.querySelector("#drop-zone-content");
    this.itemList = html.querySelector("#item-list");
    this.itemOptions = html.querySelectorAll(".item-option");
    this.levelEl = html.querySelector("#item-level");
    this.aspEl = html.querySelector("#actor-asp");
    this.errorEl = html.querySelector("#error-msg");

    this.analyzeBtn = html.querySelector('button[data-action="analyze"]');
    if (this.analyzeBtn) this.analyzeBtn.disabled = true;

    if (this.aspEl) this.aspEl.textContent = dict.aspWithCost(getAsp(currentActor), getAspMax(currentActor), ASP_COST);

    // Click & Drop Logic
    this.dropZone.addEventListener("click", () => {
      if (this.embeddedItem) return;
      this.itemList.style.display = this.itemList.style.display === "none" ? "block" : "none";
      this.clearError();
    });

    this.dropZone.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      this.embeddedItem = null;
      this.itemList.style.display = "none";
      this.updateInfo();
      this.clearError();
    });

    this.itemOptions.forEach((opt) => {
      opt.addEventListener("mouseenter", () => (opt.style.background = "rgba(0,0,0,0.1)"));
      opt.addEventListener("mouseleave", () => (opt.style.background = "transparent"));
      opt.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const itemId = opt.dataset.id;
        this.embeddedItem = currentActor.items.get(itemId);
        this.itemList.style.display = "none";
        this.updateInfo();
      });
    });

    html.addEventListener("click", (ev) => {
      if (!ev.target.closest("#drop-zone-container")) {
        this.itemList.style.display = "none";
      }
    });

    // Drag & Drop
    this.dropZone.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      this.dropZone.style.borderColor = "#6b944d";
      this.dropZone.style.background = "rgba(107, 148, 77, 0.1)";
    });

    this.dropZone.addEventListener("dragleave", (ev) => {
      ev.preventDefault();
      this.dropZone.style.borderColor = "#968678";
      this.dropZone.style.background = "rgba(0,0,0,0.05)";
    });

    this.dropZone.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      this.dropZone.style.borderColor = "#968678";
      this.dropZone.style.background = "rgba(0,0,0,0.05)";
      this.itemList.style.display = "none";
      this.clearError();

      let raw = ev.dataTransfer?.getData?.("text/plain");
      if (!raw) return this.showError(dict.invalidItem);

      let data;
      try { data = JSON.parse(raw); } 
      catch { return this.showError(dict.invalidItem); }

      let itemDoc = null;
      try {
        if (data?.type === "Item") {
          if (typeof data.uuid === "string") itemDoc = await fromUuid(data.uuid);
          else if (data.actorId && data.itemId) {
            const a = game.actors.get(data.actorId);
            itemDoc = a?.items?.get(data.itemId) ?? null;
          }
        }
      } catch { itemDoc = null; }

      if (!itemDoc || !isAllowedItem(itemDoc)) return this.showError(dict.invalidItem);

      const embedded = resolveEmbeddedItem(itemDoc, currentActor);
      if (!embedded) return this.showError(dict.noItem);

      this.embeddedItem = embedded;
      this.updateInfo();
    });
  }

  showError(msg) {
    if (this.errorEl) {
      this.errorEl.style.display = "block";
      this.errorEl.textContent = msg;
    }
    if (this.analyzeBtn) this.analyzeBtn.disabled = true;
  }

  clearError() {
    if (this.errorEl) {
      this.errorEl.style.display = "none";
      this.errorEl.textContent = "";
    }
  }

  updateInfo() {
    if (!this.embeddedItem) {
      this.dropZoneContent.innerHTML = `
          <div style="margin-bottom:0px; font-family: 'Signika'; font-weight: bold; font-size: 1.1em;">
            ${dict.selectItem} <span style="font-weight: normal; font-size: 0.9em; opacity: 0.8;">(${dict.categoryLabel})</span>
          </div>
        `;
      this.dropZone.style.borderStyle = "dashed";
      if (this.levelEl) this.levelEl.textContent = "-";
      if (this.aspEl) this.aspEl.textContent = dict.aspWithCost(getAsp(currentActor), getAspMax(currentActor), ASP_COST);
      if (this.analyzeBtn) this.analyzeBtn.disabled = true;
      return;
    }

    const lvl = readLevel(this.embeddedItem);
    this.dropZoneContent.innerHTML = `
        <img src="${this.embeddedItem.img}" style="width: 70px; height: 70px; object-fit: cover; border: 1px solid #968678; border-radius: 3px; display: block; margin: 0 auto 10px auto; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <b style="font-family: 'Signika'; font-size: 1.1em;">${this.embeddedItem.name}</b><br>
        <div style="font-size: 0.85em; opacity: 0.7; margin-top: 5px;">${dict.removeHint}</div>
      `;
    this.dropZone.style.borderStyle = "solid";

    if (this.levelEl) this.levelEl.textContent = lvl !== null ? String(lvl) : "-";
    if (this.aspEl) this.aspEl.textContent = dict.aspWithCost(getAsp(currentActor), getAspMax(currentActor), ASP_COST);
    if (this.analyzeBtn) this.analyzeBtn.disabled = !hasEnoughAsp(currentActor);
  }

  async _onAnalyze() {
    if (!this.embeddedItem) {
      this.showError(dict.noItem);
      return;
    }
    if (!hasEnoughAsp(currentActor)) {
      this.showError(dict.aspWarn);
      this.updateInfo();
      return;
    }

    // Kosten abziehen
    await spendAsp(currentActor, ASP_COST);

    // Wurf durchführen
    const roll = new Roll("1d6");
    await roll.evaluate();
    await roll.toMessage({
      flavor: dict.rollLabel,
      speaker: ChatMessage.getSpeaker({ actor: currentActor })
    });

    const currentLevel = readLevel(this.embeddedItem);
    let finalLevel = currentLevel;
    let reduced = false;
    let cappedAtOne = false;
    let resultingItem = this.embeddedItem;

    if (roll.total === 1) {
      const targetLevel = currentLevel - 1;
      const newLevel = targetLevel < 1 ? 1 : targetLevel;
      reduced = newLevel < currentLevel;
      cappedAtOne = targetLevel < 1;
      finalLevel = newLevel;

      const qty = readQuantity(this.embeddedItem);
      if (qty > 1) {
        await currentActor.updateEmbeddedDocuments("Item", [{ _id: this.embeddedItem.id, [dict.qtyPath]: qty - 1 }]);
      } else {
        await currentActor.deleteEmbeddedDocuments("Item", [this.embeddedItem.id]);
      }

      const newItemData = makeReducedCopyData(this.embeddedItem, newLevel);
      const createdDocs = await currentActor.createEmbeddedDocuments("Item", [newItemData]);
      resultingItem = createdDocs[0];
    }

    // Chat Output
    let msgHtml = `
      <div class="dsa5">
        <h3 style="margin-bottom: 5px;">${dict.chatHeaderSmall}</h3>
        <p style="margin-bottom: 5px;">${dict.finalSpagyrikaText(resultingItem.name, finalLevel)}</p>
    `;
    if (reduced) {
      msgHtml += `<p style="color: #b51c1c; font-size: 0.9em; margin-bottom: 2px;"><i>${dict.reducedInfo}</i></p>`;
      if (cappedAtOne) msgHtml += `<p style="color: #b51c1c; font-size: 0.9em;"><i>${dict.reducedCappedInfo}</i></p>`;
    }
    msgHtml += `</div>`;
    
    await sendMessage(msgHtml);

    this.embeddedItem = resultingItem;
    this.updateInfo();
  }
}

new AnalyzeDialog().render(true);
