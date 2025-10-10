// This is a system macro used for automation. It is disfunctional without the proper context.


const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Gift verstärken",
    aspWarn: "Nicht genügend AsP (4 benötigt).",
    selectGift: "Ziehe ein Gift hierher",
    giftCategoryLabel: "Gift",
    currentStep: "Giftstufe",
    currentAsp: "AsP",
    strengthen: "Gift verstärken",
    cancel: "Abbrechen",
    invalidItem: "Nur Items der Kategorie 'Gift' sind erlaubt.",
    stepTooHigh: "Nur Gifte mit Stufe 5 oder niedriger sind erlaubt.",
    noGift: "Kein Gift im Inventar des Actors gefunden. Bitte das Gift aus deinem Inventar ziehen.",
    stepReadError: "Giftstufe konnte nicht gelesen werden.",
    aspWithCost: (current, max, cost) => `${current}${typeof max === "number" ? `/${max}` : ""} AsP (Kosten: ${cost})`,
    chatSuccess: (name, oldStep, newStep, aspBefore, aspAfter, aspMax) =>
      `<b>${name}</b> verstärkt das Gift: Stufe ${oldStep} → ${newStep}. AsP: ${aspBefore}${typeof aspMax==="number" ? `/${aspMax}`:""} → ${aspAfter}${typeof aspMax==="number" ? `/${aspMax}`:""}.`,
    aspPath: "system.status.astralenergy.value",
    aspMaxPath: "system.status.astralenergy.max",
    stepPath: "system.step.value",
    qtyPath: "system.quantity.value",
  },
  en: {
    title: "Enhance Poison",
    aspWarn: "Not enough AsP (requires 4).",
    selectGift: "Drag a poison here",
    giftCategoryLabel: "Poison",
    currentStep: "Poison Level",
    currentAsp: "AE",
    strengthen: "Enhance Poison",
    cancel: "Cancel",
    invalidItem: "Only items of category 'Poison' are allowed.",
    stepTooHigh: "Only poisons of Level 5 or lower are allowed.",
    noGift: "No poison found in the actor's inventory. Please drop it from your inventory.",
    stepReadError: "Could not read poison step.",
    aspWithCost: (current, max, cost) => `${current}${typeof max === "number" ? `/${max}` : ""} AE (Cost: ${cost})`,
    chatSuccess: (name, oldStep, newStep, aspBefore, aspAfter, aspMax) =>
      `<b>${name}</b> enhances the poison: Step ${oldStep} → ${newStep}. AE: ${aspBefore}${typeof aspMax==="number" ? `/${aspMax}`:""} → ${aspAfter}${typeof aspMax==="number" ? `/${aspMax}`:""}.`,
    aspPath: "system.status.astralenergy.value",
    aspMaxPath: "system.status.astralenergy.max",
    stepPath: "system.step.value",
    qtyPath: "system.quantity.value",
  }
}[lang];

const { getProperty: getProp, setProperty: setProp, duplicate: dup } = foundry.utils;
const ASP_COST = 4;


// Helpers AsP
function getAsp(actor) {
  return Number(getProp(actor, dict.aspPath) ?? 0) || 0;
}
function getAspMax(actor) {
  const max = getProp(actor, dict.aspMaxPath);
  return typeof max === "number" ? max : null;
}
function hasEnoughAsp(actor) {
  return getAsp(actor) >= ASP_COST;
}
async function spendAsp(actor, amount = ASP_COST) {
  const current = getAsp(actor);
  const newVal = Math.max(0, current - amount);
  await actor.update({ [dict.aspPath]: newVal });
}

// Poison helpers
function readPoisonStep(doc) {
  const step = getProp(doc, dict.stepPath);
  const n = Number(step);
  return Number.isFinite(n) ? n : null;
}
function readQuantity(doc) {
  const q = getProp(doc, dict.qtyPath);
  const n = Number(q);
  return Number.isFinite(n) ? n : 1;
}
function resolveEmbeddedPoison(sourceItem) {
  if (sourceItem?.id) {
    const byId = actor.items.get(sourceItem.id);
    if (byId?.type?.toLowerCase() === "poison") return byId;
  }
  if (sourceItem?.name) {
    const byName = actor.items.find(i => i.type === "poison" && i.name === sourceItem.name);
    if (byName) return byName;
  }
  return null;
}

// Vorab AsP prüfen
if (!hasEnoughAsp(actor)) {
  ui.notifications.warn(dict.aspWarn);
  return;
}

let srcItem = null;            
let embeddedPoison = null;     

const content = `
<div style="display:flex; flex-direction:column; gap:8px; max-width:520px;">
  <div id="error-msg" style="color:#b51c1c; display:none;"></div>

  <div id="drop-zone" style="border:2px dashed #666; border-radius:8px; padding:12px; text-align:center; color:#888;">
    <div style="margin-bottom:8px;">${dict.selectGift} (${dict.giftCategoryLabel})</div>
    <img id="gift-img" src="icons/svg/poison.svg" alt="gift" style="width:96px; height:96px; object-fit:contain; margin:auto; display:block;">
  </div>

  <div class="info" style="display:flex; gap:16px; justify-content:center; font-size:14px;">
    <div><strong>${dict.currentStep}:</strong> <span id="gift-step">-</span></div>
    <div><strong>${dict.currentAsp}:</strong> <span id="actor-asp"></span></div>
  </div>
</div>
`;

new Dialog({
  title: dict.title,
  content,
  buttons: {
    strengthen: {
      label: dict.strengthen,
      callback: async (html) => {
        if (!embeddedPoison) {
          ui.notifications.warn(dict.noGift);
          return false;
        }
        // AsP erneut prüfen
        if (!hasEnoughAsp(actor)) {
          ui.notifications.warn(dict.aspWarn);
          const aspEl = html.find("#actor-asp")[0];
          if (aspEl) aspEl.textContent = dict.aspWithCost(getAsp(actor), getAspMax(actor), ASP_COST);
          return false;
        }

        // Werte vorab
        const aspBefore = getAsp(actor);
        const aspMax = getAspMax(actor);
        const oldStep = readPoisonStep(embeddedPoison);
        if (oldStep === null) {
          ui.notifications.warn(dict.stepReadError);
          return false;
        }
        const qty = readQuantity(embeddedPoison);

        // AsP abziehen
        await spendAsp(actor, ASP_COST);
        const aspAfter = getAsp(actor);

        // Neues Step
        const newStep = Math.min(6, oldStep + 1);

        // Menge reduzieren oder Item löschen
        if (qty > 1) {
          await actor.updateEmbeddedDocuments("Item", [
            { _id: embeddedPoison.id, [dict.qtyPath]: qty - 1 }
          ]);
        } else {
          await actor.deleteEmbeddedDocuments("Item", [embeddedPoison.id]);
        }

        // Neues Item mit erhöhter Stufe anlegen: dupliziere das eingebettete Item
        const newItemData = dup(embeddedPoison.toObject());
        // Entferne _id, damit eine neue Instanz entsteht
        delete newItemData._id;
        // Setze Menge 1
        setProp(newItemData, dict.qtyPath, 1);
        // Setze die erhöhte Stufe
        setProp(newItemData, dict.stepPath, newStep);

        await actor.createEmbeddedDocuments("Item", [newItemData]);

        // Anzeige aktualisieren
        const created = actor.items.find(i =>
          i.type === "poison" &&
          i.name === embeddedPoison.name &&
          readPoisonStep(i) === newStep
        );

        const stepEl = html.find("#gift-step")[0];
        if (stepEl) stepEl.textContent = String(readPoisonStep(created) ?? newStep);

        const aspEl = html.find("#actor-asp")[0];
        if (aspEl) aspEl.textContent = dict.aspWithCost(getAsp(actor), getAspMax(actor), ASP_COST);

        // Chatmeldung
        const msgHtml = dict.chatSuccess(embeddedPoison.name, oldStep, newStep, aspBefore, aspAfter, aspMax);
        ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: msgHtml });

        // Eingebettetes Referenz-Item aktualisieren
        embeddedPoison = created ?? embeddedPoison;

        return false; // Dialog offen lassen
      }
    },
    cancel: { label: dict.cancel }
  },
  default: "strengthen",
  render: (html) => {
    const dropZone = html.find("#drop-zone")[0];
    const imgEl = html.find("#gift-img")[0];
    const stepEl = html.find("#gift-step")[0];
    const aspEl = html.find("#actor-asp")[0];
    const errorEl = html.find("#error-msg")[0];

    // Initial AsP anzeigen
    if (aspEl) aspEl.textContent = dict.aspWithCost(getAsp(actor), getAspMax(actor), ASP_COST);

    function showError(msg) {
      if (!errorEl) return;
      errorEl.style.display = "block";
      errorEl.textContent = msg;
    }
    function clearError() {
      if (!errorEl) return;
      errorEl.style.display = "none";
      errorEl.textContent = "";
    }
    function updateInfo(docForView) {
      if (imgEl) imgEl.src = docForView?.img || "icons/svg/poison.svg";
      const s = readPoisonStep(docForView);
      if (stepEl) stepEl.textContent = s !== null ? String(s) : "-";
      if (aspEl) aspEl.textContent = dict.aspWithCost(getAsp(actor), getAspMax(actor), ASP_COST);
    }

    if (!dropZone) return;

    dropZone.ondragover = (ev) => { ev.preventDefault(); dropZone.style.borderColor = "green"; };
    dropZone.ondragleave = (ev) => { ev.preventDefault(); dropZone.style.borderColor = "#666"; };
    dropZone.ondrop = async (ev) => {
      ev.preventDefault();
      dropZone.style.borderColor = "#666";
      clearError();

      let raw = ev.dataTransfer?.getData?.("text/plain");
      if (!raw) { showError(dict.invalidItem); return; }
      let data;
      try { data = JSON.parse(raw); } catch { showError(dict.invalidItem); return; }

      // Item laden
      let itemDoc = null;
      try {
        if (data?.type === "Item") {
          if (typeof data.uuid === "string" && data.uuid.length) {
            itemDoc = await fromUuid(data.uuid);
          } else if (data.actorId && data.itemId) {
            const a = game.actors.get(data.actorId);
            itemDoc = a?.items?.get(data.itemId) ?? null;
          }
        }
      } catch { itemDoc = null; }

      if (!itemDoc) { showError(dict.invalidItem); return; }

      // Kategorie prüfen: type === "poison"
      const isPoison = String(itemDoc?.type ?? "").toLowerCase() === "poison";
      if (!isPoison) { showError(dict.invalidItem); return; }

      // Stufe aus Quelle lesen (zur Anzeige) und prüfen
      const stepValSrc = readPoisonStep(itemDoc);
      if (stepValSrc === null) { showError(dict.stepReadError); return; }
      if (stepValSrc > 5) { showError(dict.stepTooHigh); return; }

      // Eingebettetes Poison im aktuellen actor suchen
      const embedded = resolveEmbeddedPoison(itemDoc);
      if (!embedded) {
        showError(dict.noGift);
        return;
      }

      // Auswahl
      srcItem = itemDoc;
      embeddedPoison = embedded;

      // Anzeige basierend auf embedded Item aktualisieren
      updateInfo(embeddedPoison);
    };
  }
}, { width: 520 }).render(true);
