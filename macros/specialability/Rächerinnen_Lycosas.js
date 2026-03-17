// This is a system macro used for automation. It is disfunctional without the proper context.

(async () => {
  const { getProperty: getProp, setProperty: setProp } = foundry.utils;
  const { DialogV2 } = foundry.applications.api;

  if (!actor) {
    ui.notifications.warn("Dieses Makro benötigt einen Akteur.");
    return;
  }

  const lang = game.i18n.lang == "de" ? "de" : "en";
  const dict = {
    de: {
      title: "Gift verstärken",
      aspWarn: "Nicht genügend AsP (4 benötigt).",
      selectGift: "Klicke oder ziehe ein Gift hierher",
      giftCategoryLabel: "Gift",
      currentStep: "Giftstufe",
      currentAsp: "AsP",
      strengthen: "Gift verstärken",
      cancel: "Schließen",
      dragDropZone: "Klicken oder Drag & Drop",
      emptyList: "Keine passenden Gifte (max. Stufe 5) im Inventar.",
      invalidItem: "Nur Items der Kategorie 'Gift' sind erlaubt.",
      stepTooHigh: "Nur Gifte mit Stufe 5 oder niedriger sind erlaubt.",
      noGift: "Kein Gift ausgewählt.",
      stepReadError: "Giftstufe konnte nicht gelesen werden.",
      aspWithCost: (current, max, cost) => `${current}${typeof max === "number" ? `/${max}` : ""} AsP (Kosten: ${cost})`,
      chatSuccess: (name, oldStep, newStep, aspBefore, aspAfter, aspMax) =>
        `<b>${name}</b> verstärkt das Gift: Stufe ${oldStep} → ${newStep}. AsP: ${aspBefore}${typeof aspMax === "number" ? `/${aspMax}` : ""} → ${aspAfter}${typeof aspMax === "number" ? `/${aspMax}` : ""}.`,
      aspPath: "system.status.astralenergy.value",
      aspMaxPath: "system.status.astralenergy.max",
      stepPath: "system.step.value",
      qtyPath: "system.quantity.value",
    },
    en: {
      title: "Enhance Poison",
      aspWarn: "Not enough AsP (requires 4).",
      selectGift: "Click or drag a poison here",
      giftCategoryLabel: "Poison",
      currentStep: "Poison Level",
      currentAsp: "AE",
      strengthen: "Enhance Poison",
      cancel: "Close",
      dragDropZone: "Click or Drag & Drop",
      emptyList: "No valid poisons (max. Level 5) in inventory.",
      invalidItem: "Only items of category 'Poison' are allowed.",
      stepTooHigh: "Only poisons of Level 5 or lower are allowed.",
      noGift: "No poison selected.",
      stepReadError: "Could not read poison step.",
      aspWithCost: (current, max, cost) => `${current}${typeof max === "number" ? `/${max}` : ""} AE (Cost: ${cost})`,
      chatSuccess: (name, oldStep, newStep, aspBefore, aspAfter, aspMax) =>
        `<b>${name}</b> enhances the poison: Step ${oldStep} → ${newStep}. AE: ${aspBefore}${typeof aspMax === "number" ? `/${aspMax}` : ""} → ${aspAfter}${typeof aspMax === "number" ? `/${aspMax}` : ""}.`,
      aspPath: "system.status.astralenergy.value",
      aspMaxPath: "system.status.astralenergy.max",
      stepPath: "system.step.value",
      qtyPath: "system.quantity.value",
    }
  }[lang];

  const ASP_COST = 4;

  function getAsp(a) { return Number(getProp(a, dict.aspPath) ?? 0) || 0; }
  function getAspMax(a) { const max = getProp(a, dict.aspMaxPath); return typeof max === "number" ? max : null; }
  function hasEnoughAsp(a) { return getAsp(a) >= ASP_COST; }
  async function spendAsp(a, amount = ASP_COST) {
    const current = getAsp(a);
    await a.update({ [dict.aspPath]: Math.max(0, current - amount) });
  }
  function readPoisonStep(doc) { 
    const step = getProp(doc, dict.stepPath); 
    return Number.isFinite(Number(step)) ? Number(step) : null; 
  }
  function readQuantity(doc) { 
    const q = getProp(doc, dict.qtyPath); 
    return Number.isFinite(Number(q)) ? Number(q) : 1; 
  }
  function resolveEmbeddedPoison(sourceItem, a) {
    if (sourceItem?.id) {
      const byId = a.items.get(sourceItem.id);
      if (byId?.type?.toLowerCase() === "poison") return byId;
    }
    if (sourceItem?.name) {
      const byName = a.items.find(i => i.type === "poison" && i.name === sourceItem.name);
      if (byName) return byName;
    }
    return null;
  }

  if (!hasEnoughAsp(actor)) {
    ui.notifications.warn(dict.aspWarn);
    return;
  }

  const validItems = actor.items.filter(i => {
    if (i.type?.toLowerCase() !== "poison") return false;
    const step = readPoisonStep(i);
    return step !== null && step <= 5;
  });

  let listItemsHtml = "";
  if(validItems.length === 0) {
      listItemsHtml = `<li style="padding: 10px; color: #888; text-align: center; font-style: italic;">${dict.emptyList}</li>`;
  } else {
      validItems.forEach(item => {
          const step = readPoisonStep(item) ?? 1;
          const qty = readQuantity(item);
          listItemsHtml += `
              <li class="poison-option" data-id="${item.id}" style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.1); display: flex; align-items: center; gap: 10px; transition: background 0.2s;">
                  <img src="${item.img}" style="width: 28px; height: 28px; border-radius: 3px; border: 1px solid #968678; object-fit: cover;">
                  <div style="display: flex; flex-direction: column; line-height: 1.1;">
                      <span style="font-family: 'Signika'; font-weight: bold;">${item.name} <span style="font-weight: normal; color: #555;">(${qty}x)</span></span>
                      <span style="font-size: 0.85em; color: #444;">${dict.currentStep}: ${step}</span>
                  </div>
              </li>`;
      });
  }

  class PoisonDialog extends DialogV2 {
    constructor() {
      super({
        window: { title: dict.title, resizable: true },
        position: { width: 450, height: "auto" },
        buttons: [
          {
            action: "strengthen",
            label: dict.strengthen,
            icon: "fas fa-skull-crossbones",
            callback: async () => await this._onStrengthen()
          },
          {
            action: "cancel",
            label: dict.cancel,
            icon: "fas fa-times"
          }
        ],
        content: `
          <div class="dsa5" style="display:flex; flex-direction:column; gap:8px; margin-bottom: 15px;">
            <div id="error-msg" style="color:#b51c1c; display:none; font-weight: bold; text-align: center; font-family: 'Signika';"></div>

            <div id="drop-zone-container" style="position: relative; margin-top: 5px;">
              <div id="drop-zone" style="border:2px dashed #968678; border-radius:8px; padding:20px; text-align:center; color:#333; background: rgba(0,0,0,0.05); transition: all 0.2s ease; cursor: pointer; min-height: 80px; display: flex; flex-direction: column; justify-content: center;">
                <div id="drop-zone-content">
                  <div style="margin-bottom:0px; font-family: 'Signika'; font-weight: bold; font-size: 1.1em;">
                    ${dict.selectGift} <span style="font-weight: normal; font-size: 0.9em; opacity: 0.8;">(${dict.giftCategoryLabel})</span>
                  </div>
                </div>
              </div>
              <ul id="potion-list" style="display: none; position: absolute; top: calc(100% - 2px); left: 0; width: 100%; background: #e2d8c9; border: 1px solid #968678; border-radius: 0 0 5px 5px; padding: 0; margin: 0; list-style: none; max-height: 200px; overflow-y: auto; z-index: 100; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                  ${listItemsHtml}
              </ul>
            </div>

            <div class="info" style="display:flex; gap:20px; justify-content:center; font-size:15px; margin-top: 10px; font-family: 'Signika'; background: #e2d8c9; padding: 10px; border-radius: 5px; border: 1px solid #968678;">
              <div><strong>${dict.currentStep}:</strong> <span id="gift-step">-</span></div>
              <div><strong>${dict.currentAsp}:</strong> <span id="actor-asp"></span></div>
            </div>
          </div>
        `
      });
      this.embeddedPoison = null;
    }

    _onRender(context, options) {
      super._onRender(context, options);
      const html = this.element;
      if (!html) return;

      this.dropZone = html.querySelector("#drop-zone");
      this.dropZoneContent = html.querySelector("#drop-zone-content");
      this.potionList = html.querySelector("#potion-list");
      this.potionOptions = html.querySelectorAll(".poison-option");
      this.stepEl = html.querySelector("#gift-step");
      this.aspEl = html.querySelector("#actor-asp");
      this.errorEl = html.querySelector("#error-msg");
      
      this.strengthenBtn = html.querySelector('button[data-action="strengthen"]');
      if (this.strengthenBtn) {
          this.strengthenBtn.disabled = true;
      }

      if (this.aspEl) this.aspEl.textContent = dict.aspWithCost(getAsp(actor), getAspMax(actor), ASP_COST);

      this.dropZone.addEventListener("click", (ev) => {
          if (this.embeddedPoison) return;
          this.potionList.style.display = this.potionList.style.display === "none" ? "block" : "none";
          this.clearError();
      });

      this.dropZone.addEventListener("contextmenu", (ev) => {
          ev.preventDefault();
          this.embeddedPoison = null;
          this.potionList.style.display = "none";
          this.updateInfo();
          this.clearError();
      });


      this.potionOptions.forEach(opt => {
          opt.addEventListener("mouseenter", () => opt.style.background = "rgba(0,0,0,0.1)");
          opt.addEventListener("mouseleave", () => opt.style.background = "transparent");
          
          opt.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const itemId = opt.dataset.id;
              this.embeddedPoison = actor.items.get(itemId);
              this.potionList.style.display = "none";
              this.updateInfo();
          });
      });

      html.addEventListener("click", (ev) => {
          if (!ev.target.closest("#drop-zone-container")) {
              this.potionList.style.display = "none";
          }
      });

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
        this.potionList.style.display = "none";
        this.clearError();

        let raw = ev.dataTransfer?.getData?.("text/plain");
        if (!raw) return this.showError(dict.invalidItem);
        
        let data;
        try { data = JSON.parse(raw); } catch { return this.showError(dict.invalidItem); }

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

        if (!itemDoc) return this.showError(dict.invalidItem);

        const isPoison = String(itemDoc?.type ?? "").toLowerCase() === "poison";
        if (!isPoison) return this.showError(dict.invalidItem);

        const stepValSrc = readPoisonStep(itemDoc);
        if (stepValSrc === null) return this.showError(dict.stepReadError);
        if (stepValSrc > 5) return this.showError(dict.stepTooHigh);

        const embedded = resolveEmbeddedPoison(itemDoc, actor);
        if (!embedded) return this.showError(dict.noGift);

        this.embeddedPoison = embedded;
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
      if (!this.embeddedPoison) {
        this.dropZoneContent.innerHTML = `
          <div style="margin-bottom:0px; font-family: 'Signika'; font-weight: bold; font-size: 1.1em;">
            ${dict.selectGift} <span style="font-weight: normal; font-size: 0.9em; opacity: 0.8;">(${dict.giftCategoryLabel})</span>
          </div>
        `;
        this.dropZone.style.borderStyle = "dashed";
        if (this.stepEl) this.stepEl.textContent = "-";
        if (this.aspEl) this.aspEl.textContent = dict.aspWithCost(getAsp(actor), getAspMax(actor), ASP_COST);
        if (this.strengthenBtn) this.strengthenBtn.disabled = true;
        return;
      }

      const s = readPoisonStep(this.embeddedPoison);
      this.dropZoneContent.innerHTML = `
        <img src="${this.embeddedPoison.img}" style="width: 70px; height: 70px; object-fit: cover; border: 1px solid #968678; border-radius: 3px; display: block; margin: 0 auto 10px auto; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <b style="font-family: 'Signika'; font-size: 1.1em;">${this.embeddedPoison.name}</b><br>
        <div style="font-size: 0.85em; opacity: 0.7; margin-top: 5px;">(Rechtsklick zum Entfernen)</div>
      `;
      this.dropZone.style.borderStyle = "solid";

      if (this.stepEl) this.stepEl.textContent = s !== null ? String(s) : "-";
      if (this.aspEl) this.aspEl.textContent = dict.aspWithCost(getAsp(actor), getAspMax(actor), ASP_COST);
      
      if (this.strengthenBtn) this.strengthenBtn.disabled = false;
    }

    async _onStrengthen() {
      if (!this.embeddedPoison) {
        ui.notifications.warn(dict.noGift);
        return;
      }

      if (!hasEnoughAsp(actor)) {
        ui.notifications.warn(dict.aspWarn);
        if (this.aspEl) this.aspEl.textContent = dict.aspWithCost(getAsp(actor), getAspMax(actor), ASP_COST);
        return;
      }

      const aspBefore = getAsp(actor);
      const aspMax = getAspMax(actor);
      const oldStep = readPoisonStep(this.embeddedPoison);
      if (oldStep === null) return ui.notifications.warn(dict.stepReadError);
      
      const qty = readQuantity(this.embeddedPoison);

      await spendAsp(actor, ASP_COST);
      const aspAfter = getAsp(actor);

      const newStep = Math.min(6, oldStep + 1);

      if (qty > 1) {
        await actor.updateEmbeddedDocuments("Item", [{ _id: this.embeddedPoison.id, [dict.qtyPath]: qty - 1 }]);
      } else {
        await actor.deleteEmbeddedDocuments("Item", [this.embeddedPoison.id]);
      }

      const newItemData = this.embeddedPoison.toObject();
      delete newItemData._id;
      setProp(newItemData, dict.qtyPath, 1);
      setProp(newItemData, dict.stepPath, newStep);

      const createdDocs = await actor.createEmbeddedDocuments("Item", [newItemData]);
      const created = createdDocs[0];

      if (this.stepEl) this.stepEl.textContent = String(readPoisonStep(created) ?? newStep);
      if (this.aspEl) this.aspEl.textContent = dict.aspWithCost(getAsp(actor), getAspMax(actor), ASP_COST);

      const msgHtml = dict.chatSuccess(actor.name, oldStep, newStep, aspBefore, aspAfter, aspMax);
      ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: msgHtml });

      this.embeddedPoison = created;
      this.updateInfo();
    }
  }

  new PoisonDialog().render(true);

})();
