// This is a system macro used for automation. It is disfunctional without the proper context.

const { getProperty: getProp, setProperty: setProp, duplicate: dup } = foundry.utils;

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Gift verstärken",
    selectGift: "Ziehe ein Gift hierher",
    giftCategoryLabel: "Gift",
    currentStep: "Giftstufe",
    currentMoney: "Verfügbares Geld",
    strengthen: "Gift verstärken",
    cancel: "Abbrechen",
    invalidItem: "Nur Items der Kategorie 'Gift' sind erlaubt.",
    typeMismatch: (need, have) => `Dieses Gift passt nicht. Benötigt: ${need}. Gefunden: ${have || "-"}.`,
    stepTooHigh: "Nur Gifte mit Stufe 5 oder niedriger sind erlaubt.",
    noGift: "Kein passendes Gift im Inventar des Actors gefunden. Bitte das Gift aus deinem Inventar ziehen.",
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
    title: "Enhance Poison", // Skill existiert in der englischen Version noch nicht
    selectGift: "Drag a poison here",
    giftCategoryLabel: "Poison",
    currentStep: "Poison level",
    currentMoney: "Available Money",
    strengthen: "Enhance Poison",
    cancel: "Cancel",
    invalidItem: "Only items of category 'Poison' are allowed.",
    typeMismatch: (need, have) => `This poison does not match. Required: ${need}. Found: ${have || "-"}.`,
    stepTooHigh: "Only poisons with Step 5 or lower are allowed.",
    noGift: "No matching poison found in the actor's inventory. Please drop it from your inventory.",
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

// Gift/Item-Helfer
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
function readPoisonType(doc) {
  const val = getProp(doc, "system.poisonType.value");
  return typeof val === "string" ? val : "";
}
function typeMatches(required, poisonTypeVal) {
  const val = (poisonTypeVal || "").toLowerCase();
  const candidates = dict.typeMatch?.[required] || [required];
  return candidates.some((needle) => val.includes(needle));
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

// Geld 
function readPurseFromItems() {
  const lc = (s) => s?.toLowerCase?.() ?? s;
  const findMoneyByList = (names) => actor.items.find(i => names.some(n => lc(i.name) === n));
  const q = (it) => {
    const v = getProp(it, "system.quantity.value");
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const names = dict.moneyItemNames;
  const ducatIt = findMoneyByList(names.ducat.map(n => n.toLowerCase()));
  const silverIt = findMoneyByList(names.silver.map(n => n.toLowerCase()));
  const hellerIt = findMoneyByList(names.heller.map(n => n.toLowerCase()));
  const kreuzIt = findMoneyByList(names.kreuzer.map(n => n.toLowerCase()));

  return {
    dukaten: q(ducatIt),
    silber: q(silverIt),
    heller: q(hellerIt),
    kreuzer: q(kreuzIt),
  };
}

// Geld-Widget (Icons + Werte)
function moneyCell(icon, value, tooltip) {
  return `
    <div class="number-input item position-relative" title="${tooltip}" style="display:flex; align-items:center; gap:6px;">
      <i class="withContext" style="background-image: url('${icon}'); width:24px; height:24px; display:inline-block; background-size:cover;"></i>
      <input class="withContext money-change" type="number" value="${value}" disabled
             style="width:64px; text-align:center; background:var(--color-bg-option,#ddd); border:1px solid var(--color-border-light-primary,#999);">
    </div>`;
}
function purseInlineHtml(p) {
  return `
    <div class="flexrow actor-purse-inline flexAlignCenter wrap" style="gap:12px; margin-left:8px;">
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

// Anzeige-Typ lokalisieren
function displayType(typeKey) {
  const map = dict.typeDisplay || {};
  return map[typeKey] ?? typeKey;
}

// Dialog
let embeddedPoison = null;

const content = `
<div style="display:flex; flex-direction:column; gap:8px; max-width:560px;">
  <div id="error-msg" style="color:#b51c1c; display:none;"></div>

  <div id="drop-zone" style="border:2px dashed #666; border-radius:8px; padding:12px; text-align:center; color:#888;">
    <div style="margin-bottom:8px;">
      ${dict.selectGift} (${dict.giftCategoryLabel}) – ${lang === "de" ? "erlaubt" : "allowed"}: ${displayType(requiredType)}
    </div>
    <img id="gift-img" src="icons/svg/poison.svg" alt="gift" style="width:96px; height:96px; object-fit:contain; margin:auto; display:block;">
  </div>

  <div class="info" style="display:flex; flex-direction:column; gap:8px; font-size:14px;">
    <div style="display:flex; gap:16px; justify-content:flex-start; align-items:center;">
      <div><strong>${dict.poisonName}:</strong> <span id="gift-name">-</span></div>
      <div><strong>${dict.currentStep}:</strong> <span id="gift-step">-</span></div>
      <div><strong>${dict.costLabel}:</strong> <span id="gift-cost">-</span></div>
    </div>
    <div style="display:flex; align-items:center;">
      <strong>${dict.currentMoney}:</strong>
      <div id="actor-money-inline"></div>
    </div>
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
        if (!embeddedPoison) { ui.notifications.warn(dict.noGift); return false; }

        const oldStep = readPoisonStep(embeddedPoison);
        if (oldStep === null) { ui.notifications.warn(dict.stepReadError); return false; }
        const qty = readQuantity(embeddedPoison);
        const newStep = Math.min(6, oldStep + 1);

        const costSilver = oldStep * 10;

        const payment = game.dsa5?.apps?.DSA5Payment;
        if (!payment) {
          ui.notifications.warn(lang === "de" ? "DSA5Payment API nicht verfügbar." : "DSA5Payment API not available.");
          return false;
        }
        let canPayRaw = await payment.canPay(actor, `${costSilver} Silbertaler`);
        const canPayObj = typeof canPayRaw === "boolean" ? { success: canPayRaw } : canPayRaw;
        if (!canPayObj.success) {
          ui.notifications.error(dict.notEnoughMoney);
          if (canPayObj.msg) console.warn(dict.payCheckFailDetail(canPayObj.msg));
          return false;
        }

        await payment.payMoney(actor, `${costSilver} Silbertaler`);
        ui.notifications.info(dict.paymentDone);

        const moneyInline = html.find("#actor-money-inline")[0];
        refreshPurseInline(moneyInline);

        const skillName = dict.skills[requiredType];
        const skill = actor.items.find((x) => x.type === "skill" && x.name === skillName);
        if (!skill) { ui.notifications.error(`${skillName} ${lang === "de" ? "nicht gefunden." : "not found."}`); return false; }

        const setupData = await actor.setupSkill(
          skill,
          { modifier: 0, subtitle: lang === "de" ? " (Giftverstärkung)" : " (Enhance Poison)" },
          actor.sheet?.getTokenId?.()
        );
        setProperty(setupData, "testData.opposable", false);
        const res = await actor.basicTest(setupData);
        const qs = Number(getProp(res, "result.qualityStep")) || 0;

        if (qs > 0) {
          if (qty > 1) {
            await actor.updateEmbeddedDocuments("Item", [{ _id: embeddedPoison.id, [dict.qtyPath]: qty - 1 }]);
          } else {
            await actor.deleteEmbeddedDocuments("Item", [embeddedPoison.id]);
          }

          const newItemData = dup(embeddedPoison.toObject());
          delete newItemData._id;
          setProp(newItemData, dict.qtyPath, 1);
          setProp(newItemData, dict.stepPath, newStep);
          await actor.createEmbeddedDocuments("Item", [newItemData]);

          const created = actor.items.find(i => i.type === "poison" && i.name === embeddedPoison.name && readPoisonStep(i) === newStep);
          const stepEl = html.find("#gift-step")[0];
          if (stepEl) stepEl.textContent = String(readPoisonStep(created) ?? newStep);

          const msgHtml = dict.chatSuccess(embeddedPoison.name, oldStep, newStep);
          ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: msgHtml });

          embeddedPoison = created ?? embeddedPoison;
        } else {
          ui.notifications.info(dict.testFailed);
        }

        return false;
      }
    },
    cancel: { label: dict.cancel }
  },
  default: "strengthen",
  render: (html) => {
    const dropZone = html.find("#drop-zone")[0];
    const imgEl = html.find("#gift-img")[0];
    const stepEl = html.find("#gift-step")[0];
    const nameEl = html.find("#gift-name")[0];
    const costEl = html.find("#gift-cost")[0];
    const errorEl = html.find("#error-msg")[0];
    const moneyInline = html.find("#actor-money-inline")[0];

    refreshPurseInline(moneyInline);

    function showError(msg) { if (!errorEl) return; errorEl.style.display = "block"; errorEl.textContent = msg; }
    function clearError() { if (!errorEl) return; errorEl.style.display = "none"; errorEl.textContent = ""; }
    function updateInfo(docForView) {
      if (imgEl) imgEl.src = docForView?.img || "icons/svg/poison.svg";
      const s = Number(readPoisonStep(docForView));
      if (stepEl) stepEl.textContent = Number.isFinite(s) ? String(s) : "-";
      if (nameEl) nameEl.textContent = docForView?.name || "-";
      if (costEl) {
        const cost = Number.isFinite(s) ? s * 10 : "-";
        costEl.textContent = Number.isFinite(cost) ? `${cost} ${dict.costCurrency}` : "-";
      }
      refreshPurseInline(moneyInline);
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
      if (String(itemDoc?.type ?? "").toLowerCase() !== "poison") { showError(dict.invalidItem); return; }

      const poisonTypeVal = readPoisonType(itemDoc);
      if (!typeMatches(requiredType, poisonTypeVal)) {
        const needDisp = displayType(requiredType);
        showError(dict.typeMismatch(needDisp, poisonTypeVal));
        return;
      }

      const stepValSrc = readPoisonStep(itemDoc);
      if (stepValSrc === null) { showError(dict.stepReadError); return; }
      if (stepValSrc > 5) { showError(dict.stepTooHigh); return; }

      const embedded = resolveEmbeddedPoison(itemDoc);
      if (!embedded) { showError(dict.noGift); return; }

      embeddedPoison = embedded;
      updateInfo(embeddedPoison);
    };
  }
}, { width: 560 }).render(true);
