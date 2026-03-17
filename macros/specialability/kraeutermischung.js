// This is a system macro used for automation. It is disfunctional without the proper context.

const { getProperty, setProperty } = foundry.utils;
const { DialogV2 } = foundry.applications.api;

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Sonderfertigkeit: Kräutermischung",
    btnMix: "Mischen",
    btnCancel: "Abbrechen",
    needsActor: "Dieses Makro benötigt einen Akteur.",
    noPaymentApi: "Die DSA5-Zahlungsfunktion ist nicht verfügbar.",
    noSkill: "hat das Talent Pflanzenkunde nicht.",
    testFail: "hat die Probe auf Pflanzenkunde nicht bestanden. Keine Kräutermischung erhalten.",
    made: (name, amount, itemName) => `${name} hat erfolgreich ${amount} ${itemName}${amount > 1 ? "en" : ""} hergestellt.`,
    itemName: "Kräutermischung",
    effectName: "Kräutermischungseffekt",
    skillName: "Pflanzenkunde",
    masterySF: "Meisterliche Kräutermischung",
    apothecarySF: "Weg des Apothekers",
    itemDesc:
      "Es muss nicht immer Tarnele oder Wirselkraut sein. Mit der richtigen Mischung kann ein Heiler auch aus anderen, einfachen Heilkräutern eine potente Kräutermischung herstellen.",
    payLabel: "5 Silbertaler",
    searchLabel: "selbst suchen",
    payAmount: "5 Silbertaler",
    payNotEnough: "hat nicht genug Geld!",
    qsText: `1: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.\n2: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.\n3: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.\n4: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.\n5: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.\n6: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.`,
    dialogHeader:
      "Die Heldin ist dazu in der Lage, eine Kräutermischung anzufertigen, die die Regeneration verbessert. Diese Mischung besteht nicht aus den üblichen Heilkräutern, die LeP regenerieren können, sondern aus einfachen, je nach Region unterschiedlichen Heilkräutern.",
    dialogFooter:
      "Sie benötigt dafür 4 Stunden, sofern es in der näheren Umgebung auch die nötigen Materialien gibt (z. B. in Sand- oder Eiswüsten).",
    mixDisabled: "Um die Kräutermischung zu erstellen zahle bitte für die notwendigen Zutaten oder suche diese selber.",
    cannotPayDetail: "Zahlung nicht möglich: {msg}",
    paySentence: "Die Materialien kosten pro Anwendung",
    searchSentence: "Alternativ kann die Heldin die Materialien auch",
    rollFlavor: "Kräutermischung - Prüfwurf",
  },
  en: {
    title: "Special Ability: Herb Mixture",
    btnMix: "Mix",
    btnCancel: "Cancel",
    needsActor: "This macro requires an actor.",
    noPaymentApi: "The DSA5 payment API is not available.",
    noSkill: "does not have the skill Plant Lore.",
    testFail: "failed the Plant Lore check. No herb mixture created.",
    made: (name, amount, itemName) => `${name} successfully created ${amount} ${itemName}${amount > 1 ? "s" : ""}.`,
    itemName: "Herb Mixture",
    effectName: "Herb Mixture Effect",
    skillName: "Plant Lore",
    masterySF: "Masterful Herb Mixture",
    apothecarySF: "Path of the Apothecary",
    itemDesc:
      "It doesn't always have to be Tarnele or Wirsel Herb. With the right blend, a healer can make a potent herb mixture from other, simple healing herbs.",
    payLabel: "5 Silver",
    searchLabel: "search herself",
    payAmount: "5 Silver",
    payNotEnough: "does not have enough money!",
    qsText: `1: Treating wounds with an herb mixture. The next regeneration phase may be increased.\n2: Treating wounds with an herb mixture. The next regeneration phase may be increased.\n3: Treating wounds with an herb mixture. The next regeneration phase may be increased.\n4: Treating wounds with an herb mixture. The next regeneration phase may be increased.\n5: Treating wounds with an herb mixture. The next regeneration phase may be increased.\n6: Treating wounds with an herb mixture. The next regeneration phase may be increased.`,
    dialogHeader:
      "The hero can craft an herb mixture that improves regeneration. It does not consist of the usual healing herbs that regenerate HP, but of simple herbs differing by region.",
    dialogFooter: "It takes 4 hours to gather materials, if they are available in the area (e.g. not in sand or ice deserts).",
    mixDisabled: "To make the herbal mixture, please pay for the necessary ingredients or find them yourself.",
    cannotPayDetail: "Payment not possible: {msg}",
    paySentence: "Materials cost per use",
    searchSentence: "Alternatively, the hero can",
    rollFlavor: "Herb Mixture - Check Roll",
  },
}[lang];

const sendMessage = async (message) => {
  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(message));
};

if (!actor) {
  await sendMessage(dict.needsActor);
  return;
}

const hasMastery = actor.items.some((i) => getProperty(i, "system.category.value") === "general" && i.name === dict.masterySF);
const hasApothecary = actor.items.some((i) => i.name === dict.apothecarySF);

const herbMacroText = `
    // This is a system macro used for automation. It is disfunctional without the proper context.
    const currentTempHeal = foundry.utils.getProperty(actor, "system.status.regeneration.LePTemp") ?? 0;
    const mapping = [1,2,3,4,5,6];
    const wuerfelziel = mapping[(typeof qs !== "undefined" ? qs : 0) - 1] ?? 0;
    const r = new Roll("${hasApothecary ? "2d6kl1" : "1d6"}");
    await r.roll();
    await r.toMessage({ flavor: "${dict.rollFlavor}" });
    if (r.total <= wuerfelziel) {
        const add = ${hasMastery ? 2 : 1};
        const newVal = currentTempHeal + add;
        await actor.update({ "system.status.regeneration.LePTemp": newVal });
    }`;

async function processHerbMixing() {
  const skill = actor.items.find((x) => x.type === "skill" && x.name === dict.skillName);
  if (!skill) {
    await sendMessage(`${actor.name} ${dict.noSkill}`);
    return;
  }

  const setupData = await actor.setupSkill(
    skill,
    { modifier: 2, subtitle: lang === "de" ? " (Kräutermischung)" : " (Herb Mixture)" },
    actor.sheet?.getTokenId?.(),
  );
  setProperty(setupData, "testData.opposable", false);
  const res = await actor.basicTest(setupData);
  const availableQs = Number(getProperty(res, "result.qualityStep")) || 0;

  if (availableQs <= 0) {
    await sendMessage(`${actor.name} ${dict.testFail}`);
    return;
  }

  const newItem = {
    name: dict.itemName,
    type: "consumable",
    img: "systems/dsa5/icons/categories/plant.webp",
    system: {
      equipmentType: { value: "healing" },
      quantity: 1,
      weight: 0.1,
      price: { value: 5, currency: "silver" },
      QLList: dict.qsText,
      QL: availableQs,
      description: { value: dict.itemDesc },
    },
    effects: [
      {
        name: dict.effectName,
          img: "icons/svg/aura.svg",
        changes: [],
        duration: { startTime: null, seconds: null, rounds: null },
        flags: {
          dsa5: {
            advancedFunction: "2",
            args3: herbMacroText,
          },
        },
          transfer: false,
      },
    ],
  };

  const itemCount = hasApothecary ? 2 : 1;
  const created = Array.from({ length: itemCount }, () => newItem);

  await actor.createEmbeddedDocuments("Item", created);
  await sendMessage(dict.made(actor.name, itemCount, dict.itemName));
}

const tinyBtnStyle =
  "display: inline-block; padding: 1px 6px; margin: 0 2px; border: 1px solid #968678; background: #e2d8c9; border-radius: 3px; cursor: pointer; font-weight: bold; color: inherit; text-decoration: none; line-height: 1.2;";
const dialogHtml = `
        <div style="margin-bottom: 10px;">
            <p style="margin-bottom: 8px; line-height: 1.6;">${dict.dialogHeader}</p>
            <p style="margin-bottom: 8px; line-height: 1.8;">
                ${dict.paySentence} <a id="pay5-btn" style="${tinyBtnStyle}">${dict.payLabel}</a>.<br>
                ${dict.searchSentence} <a id="search-btn" style="${tinyBtnStyle}">${dict.searchLabel}</a>.
            </p>
            <br>
            <p style="margin-bottom: 8px; font-style: italic;">${dict.dialogFooter}</p>
            <p id="mix-hint" style="color: darkred; font-weight: bold; margin-bottom: 0;">${dict.mixDisabled}</p>
        </div>
    `;

let isMixEnabled = false;

class HerbDialog extends DialogV2 {
  _onRender(context, options) {
    super._onRender(context, options);

    const html = this.element;
    if (!html) return;

    const payBtn = html.querySelector("#pay5-btn");
    const searchBtn = html.querySelector("#search-btn");
    const mixHint = html.querySelector("#mix-hint");
    const mixDialogBtn = html.querySelector('button[data-action="mix"]');

    if (mixDialogBtn) {
      mixDialogBtn.disabled = true;
      mixDialogBtn.style.pointerEvents = "none";
      mixDialogBtn.style.opacity = "0.4";
      mixDialogBtn.style.filter = "grayscale(100%)";
    }

    const enableMixing = () => {
      isMixEnabled = true;
      if (mixDialogBtn) {
        mixDialogBtn.disabled = false;
        mixDialogBtn.style.pointerEvents = "auto";
        mixDialogBtn.style.opacity = "1";
        mixDialogBtn.style.filter = "none";
      }
      if (mixHint) mixHint.style.display = "none";

      if (payBtn) {
        payBtn.style.pointerEvents = "none";
        payBtn.style.opacity = "0.5";
      }
      if (searchBtn) {
        searchBtn.style.pointerEvents = "none";
        searchBtn.style.opacity = "0.5";
      }
    };

    payBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      const payment = game.dsa5?.apps?.DSA5Payment;
      if (!payment) {
        await sendMessage(dict.noPaymentApi);
        return;
      }

      let canPayRaw = await payment.canPay(actor, dict.payAmount);
      const canPayObj = typeof canPayRaw === "boolean" ? { success: canPayRaw } : canPayRaw;

      if (!canPayObj.success) {
        const detail = canPayObj.msg ? ` ${dict.cannotPayDetail.replace("{msg}", canPayObj.msg)}` : "";
        await sendMessage(`${actor.name} ${dict.payNotEnough}${detail}`);
        return;
      }

      await payment.payMoney(actor, dict.payAmount);
      enableMixing();
    });

    searchBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      enableMixing();
    });
  }
}

new HerbDialog({
  window: {
    title: dict.title,
    resizable: true,
  },
  position: {
    width: 480,
    height: "auto",
  },
  content: dialogHtml,
  buttons: [
    {
      action: "mix",
      label: dict.btnMix,
      icon: "fas fa-mortar-pestle",
      callback: async () => {
        if (isMixEnabled) await processHerbMixing();
      },
    },
    {
      action: "cancel",
      label: dict.btnCancel,
      icon: "fas fa-times",
    },
  ],
}).render(true);
