// This is a system macro used for automation. It is disfunctional without the proper context.

(async () => {
  const { getProperty: getProp, setProperty: setProp } = foundry.utils;
  const { DialogV2 } = foundry.applications.api;

  if (!actor || !item) {
    ui.notifications.warn("Dieses Makro benötigt einen Akteur und das auslösende Item.");
    return;
  }

  const lang = game.i18n.lang == "de" ? "de" : "en";
  const dict = {
    de: {
      title: "Gift verstärken",
      selectGift: "Klicke oder ziehe ein Gift hierher",
      giftCategoryLabel: "Gift",
      currentStep: "Giftstufe",
      currentMoney: "Verfügbares Geld",
      strengthen: "Gift verstärken",
      cancel: "Schließen",
      emptyList: "Kein passendes Gift (max. Stufe 5, passender Typ) im Inventar.",
      invalidItem: "Nur Items der Kategorie 'Gift' sind erlaubt.",
      typeMismatch: (need, have) => `Dieses Gift passt nicht. Benötigt: ${need}. Gefunden: ${have || "-"}.`,
      stepTooHigh: "Nur Gifte mit Stufe 5 oder niedriger sind erlaubt.",
      noGift: "Kein Gift ausgewählt.",
      stepReadError: "Giftstufe konnte nicht gelesen werden.",
      notEnoughMoney: "Nicht genügend Geld vorhanden.",
      payCheckFailDetail: (msg) => `Zahlung nicht möglich: ${msg}`,
      chatSuccess: (name, oldStep, newStep) =>
        `<b>${name}</b> wurde verstärkt: Stufe ${oldStep} → ${newStep}.`,
      stepPath: "system.step.value",
      qtyPath: "system.quantity.value",
      costLabel: "Zu zahlender Betrag",
      poisonName: "Gewähltes Gift",
      skills: { alchimistisch: "Alchimie", pflanzlich: "Pflanzenkunde", mineralisch: "Steinbearbeitung", tierisch: "Tierkunde" },
      testFailed: "Probe nicht bestanden. Keine Verstärkung (Zahlung wurde dennoch fällig).",
      paymentDone: "Kosten bezahlt.",
      moneyNames: { ducat: "Dukaten", silver: "Silber", heller: "Heller", kreuzer: "Kreuzer" },
      costCurrency: "Silbertaler",
      typeDisplay: { tierisch: "tierisch", pflanzlich: "pflanzlich", mineralisch: "mineralisch", alchimistisch: "alchimistisch" },
      typeMatch: {
        alchimistisch: ["alchimistisch", "alchemical poison"],
        pflanzlich: ["pflanzlich", "plant poison"],
        mineralisch: ["mineralisch", "mineral poison"],
        tierisch: ["tierisch", "animal venom"],
      },
      typeMapEnToKey: {
        "animal": "tierisch", "animal venom": "tierisch",
        "plant": "pflanzlich", "plant poison": "pflanzlich",
        "mineral": "mineralisch", "mineral poison": "mineralisch",
        "alchemical": "alchimistisch", "alchemical poison": "alchimistisch",
      },
      moneyItemNames: { ducat: ["dukaten"], silver: ["silber", "silberthaler", "silbertaler"], heller: ["heller"], kreuzer: ["kreuzer"] },
      moneyIcons: {
        ducat: "systems/dsa5/icons/money-D.webp",
        silver: "systems/dsa5/icons/money-S.webp",
        heller: "systems/dsa5/icons/money-H.webp",
        kreuzer: "systems/dsa5/icons/money-K.webp",
      },
    },
    en: {
      title: "Enhance Poison",
      selectGift: "Click or drag a poison here",
      giftCategoryLabel: "Poison",
      currentStep: "Poison level",
      currentMoney: "Available Money",
      strengthen: "Enhance Poison",
      cancel: "Close",
      emptyList: "No matching poison (max. Level 5, correct type) in inventory.",
      invalidItem: "Only items of category 'Poison' are allowed.",
      typeMismatch: (need, have) => `This poison does not match. Required: ${need}. Found: ${have || "-"}.`,
      stepTooHigh: "Only poisons with Step 5 or lower are allowed.",
      noGift: "No poison selected.",
      stepReadError: "Could not read poison level.",
      notEnoughMoney: "Not enough money available.",
      payCheckFailDetail: (msg) => `Payment not possible: ${msg}`,
      chatSuccess: (name, oldStep, newStep) =>
        `<b>${name}</b> has been enhanced: Step ${oldStep} → ${newStep}.`,
      stepPath: "system.step.value",
      qtyPath: "system.quantity.value",
      costLabel: "Amount to pay",
      poisonName: "Selected Poison",
      skills: { alchimistisch: "Alchemy", pflanzlich: "Plant Lore", mineralisch: "Earthencraft", tierisch: "Animal Lore" },
      testFailed: "Test failed. No enhancement (payment still applied).",
      paymentDone: "Cost paid.",
      moneyNames: { ducat: "Ducat", silver: "Silverthaler", heller: "Haler", kreuzer: "Kreutzer" },
      costCurrency: "Silver",
      typeDisplay: { tierisch: "animal venom", pflanzlich: "plant poison", mineralisch: "mineral poison", alchimistisch: "alchemical poison" },
      typeMatch: {
        alchimistisch: ["alchimistisch", "alchemical poison"],
        pflanzlich: ["pflanzlich", "plant poison"],
        mineralisch: ["mineralisch", "mineral poison"],
        tierisch: ["tierisch", "animal venom"],
      },
      typeMapEnToKey: {
        "animal": "tierisch", "animal venom": "tierisch",
        "plant": "pflanzlich", "plant poison": "pflanzlich",
        "mineral": "mineralisch", "mineral poison": "mineralisch",
        "alchemical": "alchimistisch", "alchemical poison": "alchimistisch",
      },
      moneyItemNames: { ducat: ["ducat", "ducats"], silver: ["silverthaler", "silverthalers"], heller: ["haler", "halers"], kreuzer: ["kreutzer", "kreutzers"] },
      moneyIcons: {
        ducat: "systems/dsa5/icons/money-D.webp",
        silver: "systems/dsa5/icons/money-S.webp",
        heller: "systems/dsa5/icons/money-H.webp",
        kreuzer: "systems/dsa5/icons/money-K.webp",
      },
    }
  }[lang];

  function parseRequiredPoisonType() {
    const sfName = typeof item?.name === "string" ? item.name : "";
    const m = sfName.match(/\((.*?)\)/);
    const raw = m?.[1]?.trim().toLowerCase() || "";
    const allowed = ["tierisch", "pflanzlich", "mineralisch", "alchimistisch"];
    if (allowed.includes(raw)) return raw;
    const mapped = dict.typeMapEnToKey?.[raw];
    if (mapped && allowed.includes(mapped)) return mapped;
    return null;
  }
  
  const requiredType = parseRequiredPoisonType();
  if (!requiredType) {
    ui.notifications.warn(lang === "de"
      ? "Die SF muss den Typ in Klammern enthalten: z. B. Giftverstärkung (alchimistisch)."
      : "The special ability must include the type in parentheses, e.g. Enhance Poison (alchemical poison).");
    return;
  }

  function readPoisonStep(doc) { const step = getProp(doc, dict.stepPath); return Number.isFinite(Number(step)) ? Number(step) : null; }
  function readQuantity(doc) { const q = getProp(doc, dict.qtyPath); return Number.isFinite(Number(q)) ? Number(q) : 1; }
  function readPoisonType(doc) { const val = getProp(doc, "system.poisonType.value"); return typeof val === "string" ? val : ""; }
  function typeMatches(required, poisonTypeVal) {
    const val = (poisonTypeVal || "").toLowerCase();
    const candidates = dict.typeMatch?.[required] || [required];
    return candidates.some((needle) => val.includes(needle));
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

  function readPurseFromItems() {
    const lc = (s) => s?.toLowerCase?.() ?? s;
    const findMoneyByList = (names) => actor.items.find(i => names.some(n => lc(i.name) === n));
    const q = (it) => { const v = getProp(it, "system.quantity.value"); return Number.isFinite(Number(v)) ? Number(v) : 0; };
    const names = dict.moneyItemNames;
    return {
      dukaten: q(findMoneyByList(names.ducat.map(n => n.toLowerCase()))),
      silber: q(findMoneyByList(names.silver.map(n => n.toLowerCase()))),
      heller: q(findMoneyByList(names.heller.map(n => n.toLowerCase()))),
      kreuzer: q(findMoneyByList(names.kreuzer.map(n => n.toLowerCase()))),
    };
  }

  function moneyCell(icon, value, tooltip) {
    return `
      <div data-tooltip="${tooltip}" style="display:flex; align-items:center; border:1px solid #7a7971; border-radius:3px; background:rgba(0,0,0,0.05); height:24px; padding:0 4px;">
        <img src="${icon}" style="width:14px; height:14px; display:block; flex-shrink:0; border:none;">
        <input type="number" value="${value}" disabled style="width:28px; height:100%; text-align:right; border:none; background:transparent; color:inherit; font-family:'Signika'; padding:0 2px 0 0; margin:0 0 0 4px; cursor:default;">
      </div>`;
  }

  function purseInlineHtml(p) {
    return `
      <div class="actor-purse-content flexAlignCenter" style="display:flex; flex-wrap: nowrap; gap:8px; margin-left:10px;">
        ${moneyCell(dict.moneyIcons.ducat, p.dukaten, dict.moneyNames.ducat)}
        ${moneyCell(dict.moneyIcons.silver, p.silber, dict.moneyNames.silver)}
        ${moneyCell(dict.moneyIcons.heller, p.heller, dict.moneyNames.heller)}
        ${moneyCell(dict.moneyIcons.kreuzer, p.kreuzer, dict.moneyNames.kreuzer)}
      </div>`;
  }

  function refreshPurseInline(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = purseInlineHtml(readPurseFromItems());
  }
  function displayType(typeKey) { return dict.typeDisplay?.[typeKey] ?? typeKey; }

  const validItems = actor.items.filter(i => {
    if (i.type?.toLowerCase() !== "poison") return false;
    const step = readPoisonStep(i);
    if (step === null || step > 5) return false;
    return typeMatches(requiredType, readPoisonType(i));
  });

  let listItemsHtml = "";
  if(validItems.length === 0) {
      listItemsHtml = `<li style="padding: 10px; color: #888; text-align: center; font-style: italic;">${dict.emptyList}</li>`;
  } else {
      validItems.forEach(i => {
          const step = readPoisonStep(i) ?? 1;
          const qty = readQuantity(i);
          listItemsHtml += `
              <li class="poison-option" data-id="${i.id}" style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.1); display: flex; align-items: center; gap: 10px; transition: background 0.2s;">
                  <img src="${i.img}" style="width: 28px; height: 28px; border-radius: 3px; border: 1px solid #968678; object-fit: cover;">
                  <div style="display: flex; flex-direction: column; line-height: 1.1;">
                      <span style="font-family: 'Signika'; font-weight: bold;">${i.name} <span style="font-weight: normal; color: #555;">(${qty}x)</span></span>
                      <span style="font-size: 0.85em; color: #444;">${dict.currentStep}: ${step}</span>
                  </div>
              </li>`;
      });
  }

  class EnhancePoisonDialog extends DialogV2 {
    constructor() {
      super({
        window: { title: dict.title, resizable: true },
        position: { width: 540, height: "auto" },
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
                    ${dict.selectGift} <span style="font-weight: normal; font-size: 0.9em; opacity: 0.8;">(${dict.giftCategoryLabel})</span><br>
                    <span style="font-weight: normal; font-size: 0.8em; opacity: 0.7;">${lang === "de" ? "erlaubt" : "allowed"}: ${displayType(requiredType)}</span>
                  </div>
                </div>
              </div>
              <ul id="potion-list" style="display: none; position: absolute; top: calc(100% - 2px); left: 0; width: 100%; background: #e2d8c9; border: 1px solid #968678; border-radius: 0 0 5px 5px; padding: 0; margin: 0; list-style: none; max-height: 200px; overflow-y: auto; z-index: 100; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                  ${listItemsHtml}
              </ul>
            </div>

            <div class="info" style="display:flex; flex-direction:column; gap:8px; font-size:15px; margin-top: 10px; font-family: 'Signika'; background: #e2d8c9; padding: 10px; border-radius: 5px; border: 1px solid #968678;">
              <div style="display:flex; gap:16px; justify-content:flex-start; align-items:center;">
                <div><strong>${dict.poisonName}:</strong> <span id="gift-name">-</span></div>
                <div><strong>${dict.currentStep}:</strong> <span id="gift-step">-</span></div>
                <div><strong>${dict.costLabel}:</strong> <span id="gift-cost" style="color:#b51c1c; font-weight:bold;">-</span></div>
              </div>
              
              <div style="display:flex; align-items:center; flex-wrap: nowrap; white-space: nowrap; margin-top: 5px; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 8px;">
                <strong>${dict.currentMoney}:</strong>
                <div id="actor-money-inline"></div>
              </div>
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
      this.nameEl = html.querySelector("#gift-name");
      this.costEl = html.querySelector("#gift-cost");
      this.errorEl = html.querySelector("#error-msg");
      this.moneyInline = html.querySelector("#actor-money-inline");
      
      this.strengthenBtn = html.querySelector('button[data-action="strengthen"]');
      if (this.strengthenBtn) this.strengthenBtn.disabled = true;

      refreshPurseInline(this.moneyInline);

      this.dropZone.addEventListener("click", () => {
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
              this.embeddedPoison = actor.items.get(opt.dataset.id);
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
            if (typeof data.uuid === "string" && data.uuid.length) itemDoc = await fromUuid(data.uuid);
            else if (data.actorId && data.itemId) itemDoc = game.actors.get(data.actorId)?.items?.get(data.itemId) ?? null;
          }
        } catch { itemDoc = null; }

        if (!itemDoc) return this.showError(dict.invalidItem);
        if (String(itemDoc?.type ?? "").toLowerCase() !== "poison") return this.showError(dict.invalidItem);

        const poisonTypeVal = readPoisonType(itemDoc);
        if (!typeMatches(requiredType, poisonTypeVal)) return this.showError(dict.typeMismatch(displayType(requiredType), poisonTypeVal));

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
      if (this.errorEl) { this.errorEl.style.display = "block"; this.errorEl.textContent = msg; }
      if (this.strengthenBtn) this.strengthenBtn.disabled = true;
    }

    clearError() {
      if (this.errorEl) { this.errorEl.style.display = "none"; this.errorEl.textContent = ""; }
    }

    updateInfo() {
      if (!this.embeddedPoison) {
        this.dropZoneContent.innerHTML = `
          <div style="margin-bottom:0px; font-family: 'Signika'; font-weight: bold; font-size: 1.1em;">
            ${dict.selectGift} <span style="font-weight: normal; font-size: 0.9em; opacity: 0.8;">(${dict.giftCategoryLabel})</span><br>
            <span style="font-weight: normal; font-size: 0.8em; opacity: 0.7;">${lang === "de" ? "erlaubt" : "allowed"}: ${displayType(requiredType)}</span>
          </div>`;
        this.dropZone.style.borderStyle = "dashed";
        if (this.stepEl) this.stepEl.textContent = "-";
        if (this.nameEl) this.nameEl.textContent = "-";
        if (this.costEl) this.costEl.textContent = "-";
        if (this.strengthenBtn) this.strengthenBtn.disabled = true;
        return;
      }

      const s = Number(readPoisonStep(this.embeddedPoison));
      this.dropZoneContent.innerHTML = `
        <img src="${this.embeddedPoison.img}" style="width: 70px; height: 70px; object-fit: cover; border: 1px solid #968678; border-radius: 3px; display: block; margin: 0 auto 10px auto; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <b style="font-family: 'Signika'; font-size: 1.1em;">${this.embeddedPoison.name}</b><br>
        <div style="font-size: 0.85em; opacity: 0.7; margin-top: 5px;">(Rechtsklick zum Entfernen)</div>`;
      this.dropZone.style.borderStyle = "solid";

      if (this.stepEl) this.stepEl.textContent = Number.isFinite(s) ? String(s) : "-";
      if (this.nameEl) this.nameEl.textContent = this.embeddedPoison.name || "-";
      if (this.costEl) {
        const cost = Number.isFinite(s) ? s * 10 : "-";
        this.costEl.textContent = Number.isFinite(cost) ? `${cost} ${dict.costCurrency}` : "-";
      }
      
      if (this.strengthenBtn) this.strengthenBtn.disabled = false;
    }

    async _onStrengthen() {
      if (!this.embeddedPoison) return ui.notifications.warn(dict.noGift);

      const oldStep = readPoisonStep(this.embeddedPoison);
      if (oldStep === null) return ui.notifications.warn(dict.stepReadError);
      const qty = readQuantity(this.embeddedPoison);
      const newStep = Math.min(6, oldStep + 1);
      const costSilver = oldStep * 10;

      const payment = game.dsa5?.apps?.DSA5Payment;
      if (!payment) return ui.notifications.warn(lang === "de" ? "DSA5Payment API nicht verfügbar." : "DSA5Payment API not available.");
      
      let canPayRaw = await payment.canPay(actor, `${costSilver} Silbertaler`);
      const canPayObj = typeof canPayRaw === "boolean" ? { success: canPayRaw } : canPayRaw;
      if (!canPayObj.success) {
        ui.notifications.error(dict.notEnoughMoney);
        if (canPayObj.msg) console.warn(dict.payCheckFailDetail(canPayObj.msg));
        return;
      }

      await payment.payMoney(actor, `${costSilver} Silbertaler`);
      ui.notifications.info(dict.paymentDone);
      refreshPurseInline(this.moneyInline);

      const skillName = dict.skills[requiredType];
      const skill = actor.items.find((x) => x.type === "skill" && x.name === skillName);
      if (!skill) return ui.notifications.error(`${skillName} ${lang === "de" ? "nicht gefunden." : "not found."}`);

      const setupData = await actor.setupSkill(skill, { modifier: 0, subtitle: lang === "de" ? " (Giftverstärkung)" : " (Enhance Poison)" }, actor.sheet?.getTokenId?.());
      setProp(setupData, "testData.opposable", false);
      const res = await actor.basicTest(setupData);
      
      if (!res) return;

      const qs = Number(getProp(res, "result.qualityStep")) || 0;

      if (qs > 0) {
        if (qty > 1) await actor.updateEmbeddedDocuments("Item", [{ _id: this.embeddedPoison.id, [dict.qtyPath]: qty - 1 }]);
        else await actor.deleteEmbeddedDocuments("Item", [this.embeddedPoison.id]);

        const newItemData = this.embeddedPoison.toObject();
        delete newItemData._id;
        setProp(newItemData, dict.qtyPath, 1);
        setProp(newItemData, dict.stepPath, newStep);
        
        const createdDocs = await actor.createEmbeddedDocuments("Item", [newItemData]);
        const created = createdDocs[0];

        if (this.stepEl) this.stepEl.textContent = String(readPoisonStep(created) ?? newStep);
        const msgHtml = dict.chatSuccess(actor.name, oldStep, newStep);
        ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: msgHtml });

        this.embeddedPoison = created;
        this.updateInfo();
      } else {
        ui.notifications.info(dict.testFailed);
      }
    }
  }

  new EnhancePoisonDialog().render(true);

})();
