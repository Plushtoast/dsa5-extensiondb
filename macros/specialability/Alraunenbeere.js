const MACRO_CONFIG = {
    lepCost: 6,
    aspCost: 1,
    baseDuration: 28800,
    maxBerries: 2,
    icons: {
        growingEffect: "icons/svg/aura.svg",               
        berryItem: "systems/dsa5/icons/categories/plant.webp", 
        macroEffect: "icons/svg/aura.svg"                  
    }
};

const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
    de: {
        noActor: "Kein gültiger Akteur gefunden.",
        noAsp: (name) => `${name} verfügt nicht über Astralenergie.`,
        notEnoughLep: (name, cost) => `${name} hat nicht genügend Lebensenergie (benötigt ${cost} LeP).`,
        notEnoughAsp: (name, cost) => `${name} hat nicht genügend Astralenergie (benötigt ${cost} AsP).`,
        maxWarn: `Es können maximal ${MACRO_CONFIG.maxBerries} Beeren gleichzeitig wachsen.`,
        effectName: "Alraunenbeere wächst",
        effectDesc: "Eine Alraunenbeere wächst an diesem Wesen heran.",
        chatGrow: (name, lep, asp, hours) => `<p><b>${name}</b> wendet ${lep} LeP und ${asp} AsP auf, um eine Alraunenbeere wachsen zu lassen.</p><p>Die Beere ist in ${hours} Stunden fertig.</p>`
    },
    en: {
        noActor: "No valid actor found.",
        noAsp: (name) => `${name} does not have astral energy.`,
        notEnoughLep: (name, cost) => `${name} does not have enough life energy (requires ${cost} LP).`,
        notEnoughAsp: (name, cost) => `${name} does not have enough astral energy (requires ${cost} AE).`,
        maxWarn: `A maximum of ${MACRO_CONFIG.maxBerries} berries can grow simultaneously.`,
        effectName: "Mandrake Berry Growing",
        effectDesc: "A mandrake berry is growing on this creature.",
        chatGrow: (name, lep, asp, hours) => `<p><b>${name}</b> spends ${lep} LP and ${asp} AE to grow a mandrake berry.</p><p>The berry will be ready in ${hours} hours.</p>`
    }
}[lang];

if (!actor) {
    ui.notifications.warn(dict.noActor);
    return;
}

const { getProperty, setProperty } = foundry.utils;
const lepPath = "system.status.wounds.value";
const aspPath = "system.status.astralenergy.value";

const currentLep = Number(getProperty(actor, lepPath)) || 0;
const currentAsp = Number(getProperty(actor, aspPath)) || 0;
const aspMax = Number(getProperty(actor, "system.status.astralenergy.max")) || Number(getProperty(actor, "system.status.astralenergy.initial")) || 0;

if (aspMax <= 0) {
    ui.notifications.warn(dict.noAsp(actor.name));
    return;
}

if (currentLep <= MACRO_CONFIG.lepCost) {
    ui.notifications.warn(dict.notEnoughLep(actor.name, MACRO_CONFIG.lepCost));
    return;
}

if (currentAsp < MACRO_CONFIG.aspCost) {
    ui.notifications.warn(dict.notEnoughAsp(actor.name, MACRO_CONFIG.aspCost));
    return;
}

const existingEffects = actor.effects.filter(e => e.name === dict.effectName);
if (existingEffects.length >= MACRO_CONFIG.maxBerries) {
    ui.notifications.warn(dict.maxWarn);
    return;
}

await actor.update({
    [lepPath]: Math.max(0, currentLep - MACRO_CONFIG.lepCost),
    [aspPath]: Math.max(0, currentAsp - MACRO_CONFIG.aspCost)
});

let durationSeconds = MACRO_CONFIG.baseDuration;
if (existingEffects.length > 0) {
    const remainingTime = existingEffects[existingEffects.length - 1].duration.remaining || MACRO_CONFIG.baseDuration;
    durationSeconds = remainingTime + MACRO_CONFIG.baseDuration;
}

const guiMacro = `
const { getProperty, setProperty } = foundry.utils;
const { DialogV2 } = foundry.applications.api;

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Dieses Makro benötigt einen Akteur und muss aus einem Item aufgerufen werden.",
    title: "Elixier mit Alraunenbeere verstärken",
    selectPotion: "Klicke oder ziehe ein Elixier hierher",
    potionCategoryLabel: "Alchimie / Tränke",
    currentQS: "Aktuelle QS",
    strengthen: "QS erhöhen",
    cancel: "Abbrechen",
    emptyList: "Keine passenden Elixiere (max. QS 5) im Inventar.",
    invalidItem: "Nur Elixiere sind erlaubt.",
    stepTooHigh: "Das Elixier hat bereits die maximale Qualitätsstufe (6).",
    noPotion: "Kein Elixier ausgewählt.",
    removeHint: "(Rechtsklick zum Entfernen)",
    refundMsg: "Die Alraunenbeere wurde nicht verbraucht und verbleibt im Inventar.",
    chatSuccess: (name, potionName, oldQS, newQS) => "<b>" + name + "</b> zerdrückt eine Alraunenbeere in <b>" + potionName + "</b>.<br>Die Wirkung steigt: <b>QS " + oldQS + " → " + newQS + "</b>.",
    qsPath: "system.QL",
    qtyPath: "system.quantity.value",
    itemName: "Alraunenbeere"
  },
  en: {
    noActor: "This macro requires an actor and must be called from an item.",
    title: "Enhance Elixir with Mandrake Berry",
    selectPotion: "Click or drag an elixir here",
    potionCategoryLabel: "Alchemy / Potions",
    currentQS: "Current QL",
    strengthen: "Increase QL",
    cancel: "Cancel",
    emptyList: "No valid elixirs (max. QL 5) in inventory.",
    invalidItem: "Only elixirs are allowed.",
    stepTooHigh: "The elixir has already reached the maximum Quality Level (6).",
    noPotion: "No elixir selected.",
    removeHint: "(Right-click to remove)",
    refundMsg: "The mandrake berry was not consumed and remains in the inventory.",
    chatSuccess: (name, potionName, oldQS, newQS) => "<b>" + name + "</b> crushes a mandrake berry into <b>" + potionName + "</b>.<br>The effect increases: <b>QL " + oldQS + " → " + newQS + "</b>.",
    qsPath: "system.QL",
    qtyPath: "system.quantity.value",
    itemName: "Mandrake Berry"
  }
}[lang];

if (Object.values(ui.windows).some(w => w.title === dict.title)) return;

const MAX_RESULT_QS = 6;
const sendMessage = async (message) => await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(message));

let parentItem = null;
if (typeof item !== "undefined" && item) {
    parentItem = item.documentName === "ActiveEffect" ? item.parent : item;
} else if (typeof source !== "undefined" && source) {
    parentItem = source.documentName === "ActiveEffect" ? source.parent : source;
}

if (!actor || !parentItem) {
  ui.notifications.warn(dict.noActor);
  return;
}

async function refundBerry() {
    const currentBerry = actor.items.get(parentItem.id);
    if (currentBerry) {
        const qty = Number(getProperty(currentBerry, dict.qtyPath)) || 1;
        await currentBerry.update({ [dict.qtyPath]: qty + 1 });
    } else {
        const itemData = parentItem.toObject();
        setProperty(itemData, dict.qtyPath, 1);
        if (getProperty(itemData, "system.maxCharges")) {
            setProperty(itemData, "system.charges", getProperty(itemData, "system.maxCharges"));
        }
        await actor.createEmbeddedDocuments("Item", [itemData]);
    }
    ui.notifications.info(dict.refundMsg);
}

function readQS(doc) {
  const qs = getProperty(doc, dict.qsPath);
  return Number.isFinite(Number(qs)) ? Number(qs) : null;
}

function readQuantity(doc) {
  const q = getProperty(doc, dict.qtyPath);
  return Number.isFinite(Number(q)) ? Number(q) : 1;
}

function isValidPotion(i) {
  if (i.id === parentItem.id || i.name === dict.itemName) return false;
  
  const isConsumable = i.type === "consumable";
  const isAlchemy = i.type === "equipment" && getProperty(i, "system.equipmentType.value") === "alchemy";
  
  if (!isConsumable && !isAlchemy) return false;
  
  const qs = readQS(i);
  return qs !== null && qs < MAX_RESULT_QS;
}

function resolveEmbeddedPotion(sourceItem, a) {
  if (sourceItem?.id) {
    const byId = a.items.get(sourceItem.id);
    if (byId && isValidPotion(byId)) return byId;
  }
  return null;
}

const validItems = actor.items.filter(isValidPotion).sort((a, b) => a.name.localeCompare(b.name));

if (validItems.length === 0) {
  ui.notifications.warn(dict.emptyList);
  await refundBerry();
  return;
}

let listItemsHtml = "";
validItems.forEach((pot) => {
  const qs = readQS(pot) ?? 1;
  const qty = readQuantity(pot);
  
  listItemsHtml += "<li class='item potion-option' data-id='" + pot.id + "' style='padding: 5px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.1); display: flex; align-items: center; gap: 10px;'><img src='" + pot.img + "' width='32' height='32' style='border: none;'><div class='item-name' style='flex: 1; line-height: 1.2;'><b style='display: block;'>" + pot.name + "</b><span class='subtitle'>Menge: " + qty + " | QS: " + qs + "</span></div></li>";
});

class PotionDialog extends DialogV2 {
  constructor() {
    super({
      window: { title: dict.title, resizable: true },
      position: { width: 450, height: "auto" },
      buttons: [
        { action: "strengthen", label: dict.strengthen, icon: "fas fa-check", callback: async () => await this._onStrengthen() },
        { action: "cancel", label: dict.cancel, icon: "fas fa-times" }
      ],
      content: "<div class='dsa5'><div id='error-msg' class='notification error' style='display:none; margin-bottom: 5px; text-align:center;'></div><div id='drop-zone-container' style='position: relative; display: flex; flex-direction: column;'><div id='drop-zone' style='border: 2px dashed var(--color-border-dark-1); border-radius: 5px; padding: 20px; text-align: center; cursor: pointer; min-height: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(0,0,0,0.05);'><div id='drop-zone-content' style='display: flex; flex-direction: column; align-items: center; text-align: center;'><h3 style='margin: 0; border: none; text-align: center;'>" + dict.selectPotion + "</h3><span class='subtitle'>(" + dict.potionCategoryLabel + ")</span></div></div><ul id='potion-list' class='item-list' style='display: none; width: 100%; background: #e2d8c9; border: 1px solid #968678; margin: 10px 0 0 0; padding: 0; max-height: 350px; overflow-y: auto; box-shadow: inset 0 0 5px rgba(0,0,0,0.3); list-style: none; border-radius: 3px;'>" + listItemsHtml + "</ul></div><div class='row-section' style='margin-top: 10px; justify-content: center; background: rgba(0,0,0,0.05); padding: 5px; border-radius: 3px; border: 1px solid var(--color-border-light-2);'><div class='col center'><strong>" + dict.currentQS + ":</strong> <span id='potion-qs'>-</span></div></div></div>"
    });
    this.embeddedPotion = null;
    this.isConsumed = false;
  }

  async close(options) {
      if (!this.isConsumed) await refundBerry();
      return super.close(options);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    if (!html) return;

    this.dropZone = html.querySelector("#drop-zone");
    this.dropZoneContent = html.querySelector("#drop-zone-content");
    this.potionList = html.querySelector("#potion-list");
    this.potionOptions = html.querySelectorAll(".potion-option");
    this.qsEl = html.querySelector("#potion-qs");
    this.errorEl = html.querySelector("#error-msg");
    this.strengthenBtn = html.querySelector('button[data-action="strengthen"]');
    
    if (this.strengthenBtn) this.strengthenBtn.disabled = true;

    this.dropZone.addEventListener("click", () => {
      if (this.embeddedPotion) return;
      this.potionList.style.display = this.potionList.style.display === "none" ? "block" : "none";
      this.clearError();
    });

    this.dropZone.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      this.embeddedPotion = null;
      this.potionList.style.display = "none";
      this.updateInfo();
      this.clearError();
    });

    this.potionOptions.forEach((opt) => {
      opt.addEventListener("mouseenter", () => (opt.style.background = "rgba(0,0,0,0.1)"));
      opt.addEventListener("mouseleave", () => (opt.style.background = "transparent"));
      opt.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.embeddedPotion = actor.items.get(opt.dataset.id);
        this.potionList.style.display = "none";
        this.updateInfo();
      });
    });

    this.dropZone.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      this.dropZone.style.borderColor = "var(--color-border-highlight)";
      this.dropZone.style.background = "rgba(0, 0, 0, 0.1)";
    });

    this.dropZone.addEventListener("dragleave", (ev) => {
      ev.preventDefault();
      this.dropZone.style.borderColor = "var(--color-border-dark-1)";
      this.dropZone.style.background = "rgba(0,0,0,0.05)";
    });

    this.dropZone.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      this.dropZone.style.borderColor = "var(--color-border-dark-1)";
      this.dropZone.style.background = "rgba(0,0,0,0.05)";
      this.potionList.style.display = "none";
      this.clearError();

      let raw = ev.dataTransfer?.getData?.("text/plain");
      if (!raw) return this.showError(dict.invalidItem);

      let data;
      try { data = JSON.parse(raw); } catch { return this.showError(dict.invalidItem); }

      let itemDoc = null;
      try {
        if (data?.type === "Item") {
          if (typeof data.uuid === "string" && data.uuid.length) itemDoc = await fromUuid(data.uuid);
          else if (data.actorId && data.itemId) itemDoc = game.actors.get(data.actorId)?.items?.get(data.itemId) ?? null;
        }
      } catch { itemDoc = null; }

      if (!itemDoc) return this.showError(dict.invalidItem);

      const embedded = resolveEmbeddedPotion(itemDoc, actor);
      if (!embedded) return this.showError(dict.noPotion);

      this.embeddedPotion = embedded;
      this.updateInfo();
    });
  }

  showError(msg) {
    if (this.errorEl) {
      this.errorEl.style.display = "block";
      this.errorEl.textContent = msg;
    }
    if (this.strengthenBtn) this.strengthenBtn.disabled = true;
  }

  clearError() {
    if (this.errorEl) {
      this.errorEl.style.display = "none";
      this.errorEl.textContent = "";
    }
  }

  updateInfo() {
    if (!this.embeddedPotion) {
      this.dropZoneContent.innerHTML = "<h3 style='margin: 0; border: none; text-align: center;'>" + dict.selectPotion + "</h3><span class='subtitle'>(" + dict.potionCategoryLabel + ")</span>";
      this.dropZone.style.borderStyle = "dashed";
      if (this.qsEl) this.qsEl.textContent = "-";
      if (this.strengthenBtn) this.strengthenBtn.disabled = true;
      return;
    }

    const qs = readQS(this.embeddedPotion);
    this.dropZoneContent.innerHTML = "<img src='" + this.embeddedPotion.img + "' width='64' height='64' style='display: block; border: none; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); margin: 0 auto 5px auto;'><b style='font-size: 1.1em; text-align: center; display: block;'>" + this.embeddedPotion.name + "</b><span class='subtitle' style='text-align: center; display: block;'>" + dict.removeHint + "</span>";
    this.dropZone.style.borderStyle = "solid";

    if (this.qsEl) this.qsEl.textContent = qs !== null ? String(qs) : "-";
    if (this.strengthenBtn) this.strengthenBtn.disabled = !(qs !== null && qs < MAX_RESULT_QS);
  }

  async _onStrengthen() {
    if (!this.embeddedPotion) return;
    const oldQS = readQS(this.embeddedPotion);
    if (oldQS === null || oldQS >= MAX_RESULT_QS) return;

    this.isConsumed = true; 
    
    const targetQty = readQuantity(this.embeddedPotion);
    const newQS = Math.min(MAX_RESULT_QS, oldQS + 1);

    if (targetQty > 1) {
      await actor.updateEmbeddedDocuments("Item", [{ _id: this.embeddedPotion.id, [dict.qtyPath]: targetQty - 1 }]);
      const newItemData = this.embeddedPotion.toObject();
      delete newItemData._id;
      setProperty(newItemData, dict.qtyPath, 1);
      setProperty(newItemData, dict.qsPath, newQS);
      const createdDocs = await actor.createEmbeddedDocuments("Item", [newItemData]);
      this.embeddedPotion = createdDocs[0];
    } else {
      await actor.updateEmbeddedDocuments("Item", [{ _id: this.embeddedPotion.id, [dict.qsPath]: newQS }]);
    }

    const msgHtml = dict.chatSuccess(actor.name, this.embeddedPotion.name, oldQS, newQS);
    await sendMessage(msgHtml);

    this.close();
  }
}

new PotionDialog().render(true);
`;

const encodedMacro = encodeURIComponent(guiMacro);

const onRemoveScript = `
const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
  de: {
    itemName: "Alraunenbeere",
    effectName: "Beere zerdrücken (Elixier verstärken)",
    description: "<p>Eine frisch gewachsene Alraunenbeere.</p><p>Kann einem alchimistischen Rezept oder einem fertigen Elixier beigegeben werden, um die QS um 1 zu erhöhen (max. QS 6).</p>",
    chatDone: (name) => \`<p>An <b>\${name}</b> ist eine Alraunenbeere fertig herangewachsen.</p>\`
  },
  en: {
    itemName: "Mandrake Berry",
    effectName: "Crush Berry (Enhance Elixir)",
    description: "<p>A freshly grown mandrake berry.</p><p>Can be added to an alchemical recipe or finished elixir to increase its QL by 1 (max. QL 6).</p>",
    chatDone: (name) => \`<p>A mandrake berry has finished growing on <b>\${name}</b>.</p>\`
  }
}[lang];

if (effect.duration.remaining <= 0) {
    const decoded = decodeURIComponent("${encodedMacro}");
    const berryData = {
        name: dict.itemName,
        type: "consumable",
        img: "${MACRO_CONFIG.icons.berryItem}", 
        effects: [{
            name: dict.effectName,
            type: "base",
            img: "${MACRO_CONFIG.icons.macroEffect}", 
            system: {
                advancedFunction: 2,
                macroArgs: { macro: decoded }
            }
        }],
        system: {
            description: { value: dict.description },
            equipmentType: { value: "alchemy" },
            quantity: { value: 1 },
            weight: { value: 0.05 },
            price: { value: 10 },
            charges: 1,
            maxCharges: 1,
            QL: 1
        }
    };
    await actor.createEmbeddedDocuments("Item", [berryData]);
    ChatMessage.create({ content: dict.chatDone(actor.name) });
}
`;

const timerData = this.effectDummy(dict.effectName, [], { value: durationSeconds, units: "seconds" });
timerData.description = dict.effectDesc;
foundry.utils.mergeObject(timerData, {
    img: MACRO_CONFIG.icons.growingEffect, 
    system: {
        advancedFunction: 2,
        macroArgs: { onRemove: onRemoveScript },
        visibility: { hideOnToken: false, hidePlayers: false }
    }
});

await actor.createEmbeddedDocuments("ActiveEffect", [timerData]);

const displayHours = Math.round((durationSeconds / 3600) * 10) / 10;
const chatText = dict.chatGrow(actor.name, MACRO_CONFIG.lepCost, MACRO_CONFIG.aspCost, displayHours);
await this.createChatMessage(chatText);

return { msg: chatText };
