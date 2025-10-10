// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Analyse von Gift/Elixier",
    hint: "Lege hier Gift, Heilmittel oder Alchimie-Elixier ab (Drag&Drop aus deinem Inventar).",
    analyze: "Analysieren",
    cancel: "Abbrechen",
    noAsp: "Nicht genügend Astralpunkte (mindestens 1 AsP erforderlich).",
    aspSpent: "1 AsP ausgegeben für Analyse.",
    invalidItem: "Nur Gifte, Heilmittel oder Alchimie-Elixiere können hier analysiert werden.",
    noItemDrop: "Bitte zuerst ein zulässiges Item hineinziehen.",
    rollLabel: "Analysewurf (1d6)",
    reducedInfo: "Die Stufe/QL wurde um 1 reduziert.",
    reducedCappedInfo: "Die Stufe/QL konnte nicht unter 1 reduziert werden und bleibt bei 1.",
    chatHeaderSmall: "Analyse abgeschlossen",
    aspWithCost: (current, max, cost) => `${current}${typeof max === "number" ? `/${max}` : ""} AsP (Kosten: ${cost})`,
    aspPath: "system.status.astralenergy.value",
    aspMaxPath: "system.status.astralenergy.max",
    poisonStepPath: "system.step.value",
    consumableQlPath: "system.QL",
    qtyPath: "system.quantity.value",
    subtypePath: "system.subType",
    equipmentTypePath: "system.equipmentType.value",
    acceptedEquipmentTypes: ["healing", "alchemy"],
    costsLabel: "Kosten / AsP",
    finalSpagyrikaText: (level) => `Das Stärkelevel des analysierten Spagyrika beträgt ${level}.`,
  },
  en: {
    title: "Analyze Poison/Elixir",
    hint: "Drop a poison, remedy, or alchemy elixir here (drag from your inventory).",
    analyze: "Analyze",
    cancel: "Cancel",
    noAsp: "Not enough astral points (requires at least 1 AsP).",
    aspSpent: "Spent 1 AsP for analysis.",
    invalidItem: "Only poisons, remedies or alchemy elixirs can be analyzed.",
    noItemDrop: "Please drop an allowed item first.",
    rollLabel: "Analysis roll (1d6)",
    reducedInfo: "The level/QL was reduced by 1.",
    reducedCappedInfo: "The level/QL cannot go below 1 and remains at 1.",
    chatHeaderSmall: "Analysis complete",
    aspWithCost: (current, max, cost) => `${current}${typeof max === "number" ? `/${max}` : ""} AE (Cost: ${cost})`,
    aspPath: "system.status.astralenergy.value",
    aspMaxPath: "system.status.astralenergy.max",
    poisonStepPath: "system.step.value",
    consumableQlPath: "system.QL",
    qtyPath: "system.quantity.value",
    subtypePath: "system.subType",
    equipmentTypePath: "system.equipmentType.value",
    acceptedEquipmentTypes: ["healing", "alchemy"],
    costsLabel: "Cost / AE",
    finalSpagyrikaText: (level) => `The strength level of the analyzed spagyric is ${level}.`,
  }
}[lang];

const { getProperty: getProp, setProperty: setProp, duplicate: dup, randomID } = foundry.utils;
const targets = Array.from(game.user.targets);
const ASP_COST = 1;

// AsP-Helper
function getAsp(actorDoc) {
  return Number(getProp(actorDoc, dict.aspPath) ?? 0) || 0;
}
function getAspMax(actorDoc) {
  const max = getProp(actorDoc, dict.aspMaxPath);
  return typeof max === "number" ? max : null;
}
function hasEnoughAsp(actorDoc, cost = ASP_COST) {
  return getAsp(actorDoc) >= cost;
}
async function spendAsp(actorDoc, amount = ASP_COST) {
  const current = getAsp(actorDoc);
  const newVal = Math.max(0, current - amount);

  if (actorDoc.isOwner || game.user.isGM) {
    await actorDoc.update({ [dict.aspPath]: newVal });
    return true;
  }
  if (game.dsa5?.apps?.socketedActorTransformation) {
    await game.dsa5.apps.socketedActorTransformation(actorDoc, { [dict.aspPath]: newVal });
    return true;
  }
  return false;
}

// Typprüfung
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

// Level/QL lesen
function readLevel(item) {
  const type = String(item.type || "").toLowerCase();
  const subType = String(getProp(item, dict.subtypePath) || "").toLowerCase();
  const equipType = String(getProp(item, dict.equipmentTypePath) || "").toLowerCase();

  if (type === "poison" || subType === "poison") {
    const step = getProp(item, dict.poisonStepPath);
    const n = Number(step);
    return Number.isFinite(n) ? n : 0;
  }

  if (type === "elixir" || subType === "elixir" || (type === "consumable" && dict.acceptedEquipmentTypes.includes(equipType))) {
    const ql = getProp(item, dict.consumableQlPath);
    const n = Number(ql);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

// Menge lesen
function readQty(item) {
  const q = getProp(item, dict.qtyPath);
  const n = Number(q);
  return Number.isFinite(n) ? n : 1;
}

// Neues Item mit gesenkter Stufe/QL und Menge 1 anlegen
function makeReducedCopyData(item, newLevel) {
  const data = dup(item.toObject());
  delete data._id;
  setProp(data, dict.qtyPath, 1);

  const type = String(item.type || "").toLowerCase();
  const subType = String(getProp(item, dict.subtypePath) || "").toLowerCase();
  const equipType = String(getProp(item, dict.equipmentTypePath) || "").toLowerCase();

  if (type === "poison" || subType === "poison") {
    setProp(data, dict.poisonStepPath, newLevel);
  } else if (type === "elixir" || subType === "elixir" || (type === "consumable" && dict.acceptedEquipmentTypes.includes(equipType))) {
    setProp(data, dict.consumableQlPath, newLevel);
  }
  return data;
}

// Dialog-Inhalt
function buildDialogContent(dropId, droppedItem) {
  const imgSrc = droppedItem?.img || "icons/svg/poison.svg";
  const itemImgHtml = `<div style="width:96px; height:96px; margin:auto; background-image:url('icons/svg/poison.svg'); background-size:contain; background-repeat:no-repeat; background-position:center;"></div>`;
  const previewImgHtml = droppedItem?.img ? `<img src="${imgSrc}" alt="item" style="width:96px; height:96px; object-fit:contain; margin:auto; display:block;">` : "";

  return `
  <div class="form-group" style="display:flex; flex-direction:column; gap:8px;">
    <label>${dict.hint}</label>
    <div id="${dropId}" class="dsa5-drop-area" 
         style="
           border: 2px dashed var(--color-border);
           border-radius:8px;
           padding: 16px; 
           min-height: 140px; 
           text-align:center; 
           color: var(--color-text-dark);
           background-image:url('icons/svg/poison.svg');
           background-size: 64px 64px;
           background-repeat: no-repeat;
           background-position: center;
         ">
      ${previewImgHtml || itemImgHtml}
    </div>
    <div class="cost-asp" style="display:flex; justify-content:center; font-size: .95em; opacity: .85;">
      <span><strong>${dict.costsLabel}:</strong> ${dict.aspWithCost(getAsp(actor), getAspMax(actor), ASP_COST)}</span>
    </div>
  </div>
  `;
}

(async () => {
  if (!hasEnoughAsp(actor, ASP_COST)) {
    ui.notifications.warn(dict.noAsp);
    return;
  }

  let storedItem = null;
  const dropId = `drop-${randomID()}`;

  const dlg = new Dialog({
    title: dict.title,
    content: buildDialogContent(dropId, storedItem),
    buttons: {
      analyze: {
        label: dict.analyze,
        icon: '<i class="fas fa-flask"></i>',
        callback: async html => {
          if (!hasEnoughAsp(actor, ASP_COST)) {
            ui.notifications.warn(dict.noAsp);
            return false;
          }
          if (!storedItem) {
            ui.notifications.warn(dict.noItemDrop);
            return false;
          }

          const ok = await spendAsp(actor, ASP_COST);
          if (!ok) return false; // still beenden ohne Fehlermeldung
          ui.notifications.info(dict.aspSpent);

          const roll = new Roll("1d6");
          await roll.evaluate();
          await roll.toMessage({
            flavor: dict.rollLabel,
            speaker: ChatMessage.getSpeaker({ actor })
          });

          const currentLevel = readLevel(storedItem);
          let finalLevel = currentLevel;
          let reduced = false;
          let cappedAtOne = false;

          if (roll.total === 1) {
            const targetLevel = currentLevel - 1;
            const newLevel = targetLevel < 1 ? 1 : targetLevel;
            reduced = newLevel < currentLevel;
            cappedAtOne = targetLevel < 1;
            finalLevel = newLevel;

            const qty = readQty(storedItem);
            if (qty > 1) {
              await actor.updateEmbeddedDocuments("Item", [{ _id: storedItem.id, [dict.qtyPath]: qty - 1 }]);
            } else {
              await actor.deleteEmbeddedDocuments("Item", [storedItem.id]);
            }

            const newItemData = makeReducedCopyData(storedItem, newLevel);
            await actor.createEmbeddedDocuments("Item", [newItemData]);
          }

          let msg = `<div style="font-size:1.0em;"><strong>${dict.chatHeaderSmall}</strong></div>`;
          msg += `<p style="font-size:0.95em;">${dict.finalSpagyrikaText(finalLevel)}</p>`;
          if (reduced) {
            msg += `<p style="font-size:0.9em; color: var(--color-text-dark)">${dict.reducedInfo}</p>`;
            if (cappedAtOne) {
              msg += `<p style="font-size:0.9em; color: var(--color-text-dark)">${dict.reducedCappedInfo}</p>`;
            }
          }
          ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: msg
          });

          return true;
        }
      },
      cancel: {
        label: dict.cancel,
        icon: '<i class="fas fa-times"></i>',
        callback: () => true
      }
    },
    default: "analyze",
    render: html => {
      const dropEl = html[0].querySelector(`#${dropId}`);
      if (!dropEl) return;

      dropEl.addEventListener("dragover", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        dropEl.style.borderColor = "var(--color-success)";
      });
      dropEl.addEventListener("dragleave", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        dropEl.style.borderColor = "var(--color-border)";
      });
      dropEl.addEventListener("drop", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        dropEl.style.borderColor = "var(--color-border)";

        let data;
        try {
          data = JSON.parse(ev.dataTransfer.getData("text/plain"));
        } catch (e) {
          console.warn(e);
          return ui.notifications.warn(dict.invalidItem);
        }

        let item = null;
        try {
          if (data?.type === "Item" && data?.uuid) {
            item = await fromUuid(data.uuid);
          } else if (data?.actorId && data?.itemId) {
            const a = game.actors.get(data.actorId);
            item = a?.items?.get(data.itemId) ?? null;
          } else if (data?.data?._id) {
            item = actor.items.get(data.data._id);
          }
        } catch (e) {
          console.warn(e);
          item = null;
        }

        if (!(item instanceof Item)) {
          return ui.notifications.warn(dict.invalidItem);
        }
        if (!isAllowedItem(item)) {
          return ui.notifications.warn(dict.invalidItem);
        }

        storedItem = item;

        const parent = dropEl.parentElement?.parentElement;
        if (parent) {
          parent.innerHTML = buildDialogContent(dropId, storedItem);
        }
      });
    }
  }, { width: 520 });

  dlg.render(true);
})();
