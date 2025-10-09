// This is a system macro used for automation. It is disfunctional without the proper context.

(async () => {
  const { getProperty, setProperty } = foundry.utils;

  const lang = game.i18n.lang == "de" ? "de" : "en";
  const dict = {
    de: {
      title: "Sonderfertigkeit: Kräutermischung",
      btnMix: "Mischen",
      btnCancel: "Abbrechen",
      needsActor: "Dieses Makro benötigt einen Akteur.",
      noSkill: "hat das Talent Pflanzenkunde nicht.",
      testFail: "hat die Probe auf Pflanzenkunde nicht bestanden. Keine Kräutermischung erhalten.",
      made: "hat erfolgreich",
      itemName: "Kräutermischung",
      itemMadeSuffix: "hergestellt",
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
      qsText: `1: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.
2: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.
3: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.
4: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.
5: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.
6: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.`,
      dialogHeader:
        "Die Heldin ist dazu in der Lage, eine Kräutermischung anzufertigen, die die Regeneration verbessert. Diese Mischung besteht nicht aus den üblichen Heilkräutern, die LeP regenerieren können, sondern aus einfachen, je nach Region unterschiedlichen Heilkräutern.",
      dialogFooter:
        "Sie benötigt dafür 4 Stunden, sofern es in der näheren Umgebung auch die nötigen Materialien gibt (z. B. in Sand- oder Eiswüsten).",
      mixDisabled: "Um die Kräutermischung zu erstellen zahle bitte für die notwendigen Zutaten oder suche diese selber.",
      cannotPayDetail: "Zahlung nicht möglich: {msg}",
    },
    en: {
      title: "Special Ability: Herb Mixture",
      btnMix: "Mix",
      btnCancel: "Cancel",
      needsActor: "This macro requires an actor.",
      noSkill: "does not have the skill Plant Lore.",
      testFail: "failed the Plant Lore check. No herb mixture created.",
      made: "successfully created",
      itemName: "Herb Mixture",
      itemMadeSuffix: "",
      effectName: "Herb Mixture Effect",
      skillName: "Plant Lore",
      masterySF: "Masterful Herb Mixture", // placeholder
      apothecarySF: "Path of the Apothecary", // placeholder
      itemDesc:
        "It doesn't always have to be Tarnele or Wirsel Herb. With the right blend, a healer can make a potent herb mixture from other, simple healing herbs.",
      payLabel: "5 Silver",
      searchLabel: "search himself",
      payAmount: "5 Silver",
      payNotEnough: "does not have enough money!",
      qsText: `1: Treating wounds with an herb mixture. The next regeneration phase may be increased.
2: Treating wounds with an herb mixture. The next regeneration phase may be increased.
3: Treating wounds with an herb mixture. The next regeneration phase may be increased.
4: Treating wounds with an herb mixture. The next regeneration phase may be increased.
5: Treating wounds with an herb mixture. The next regeneration phase may be increased.
6: Treating wounds with an herb mixture. The next regeneration phase may be increased.`,
      dialogHeader:
        "The hero can craft an herb mixture that improves regeneration. It does not consist of the usual healing herbs that regenerate HP, but of simple herbs differing by region.",
      dialogFooter:
        "It takes 4 hours to gather materials, if they are available in the area (e.g. not in sand or ice deserts).",
      mixDisabled: "To make the herbal mixture, please pay for the necessary ingredients or find them yourself.",
      cannotPayDetail: "Payment not possible: {msg}",
    },
  }[lang];

  // SF-Kontext: actor ist der auslösende Charakter 
  if (!actor) {
    ui.notifications.warn(dict.needsActor);
    return;
  }

  // Prüfen, ob die allgemeine SF "Meisterliche Kräutermischung" vorhanden ist
  const hasMastery = actor.items.some(
    (i) => getProperty(i, "system.category.value") === "general" && i.name === dict.masterySF
  );

  // Prüfen, ob die SF "Weg des Apothekers" vorhanden ist
  const hasApothecary = actor.items.find((i) => i.name === dict.apothecarySF);

  // Eingebettetes Item
  const herbMacroText = `
  // This is a system macro used for automation. It is disfunctional without the proper context.
  const { getProperty, setProperty } = foundry.utils;
  const currentTempHeal = getProperty(actor, "system.status.regeneration.LePTemp") ?? 0;
  const mapping = [1,2,3,4,5,6];
  const wuerfelziel = mapping[(typeof qs !== "undefined" ? qs : 0) - 1] ?? 0;
  const r = new Roll("${hasApothecary ? "2d6kl1" : "1d6"}");
  await r.roll();
  await r.toMessage({ flavor: "${dict.itemName} – Prüfwurf" });
  if (r.total <= wuerfelziel) {
    const add = ${hasMastery ? 2 : 1};
    const newVal = (currentTempHeal || 0) + add;
    await actor.update({ "system.status.regeneration.LePTemp": newVal });
  }`;

  // Herstellprozess Kräutermischung
  async function processHerbMixing() {
    // Talent finden
    const skill = actor.items.find((x) => x.type === "skill" && x.name === dict.skillName);
    if (!skill) {
      ui.notifications.error(`${actor.name} ${dict.noSkill}`);
      return;
    }

    // Probe vorbereiten und auslösen
    const setupData = await actor.setupSkill(
      skill,
      { modifier: 2, subtitle: lang === "de" ? " (Kräutermischung)" : " (Herb Mixture)" },
      actor.sheet?.getTokenId?.()
    );
    setProperty(setupData, "testData.opposable", false);
    const res = await actor.basicTest(setupData);
    const availableQs = Number(getProperty(res, "result.qualityStep")) || 0;

    if (availableQs <= 0) {
      ui.notifications.info(`${actor.name} ${dict.testFail}`);
      return;
    }

    // Neues Item vorbereiten (QS-Text und Beschreibung)
    const newItem = {
      name: dict.itemName,
      type: "consumable",
      img: "systems/dsa5/icons/categories/plant.webp",
      system: {
        equipmentType: { value: "healing" },
        quantity: 1,
        weight: 0.1,
        price: { value: 5, currency: "silver" },
        QLList: dict.qsText, // unverändert: String, nicht Objekt
        QL: availableQs,
        description: { value: dict.itemDesc },
      },
      effects: [
        {
          name: dict.effectName,
          type: "",
          img: "icons/svg/aura.svg",
          changes: [],
          duration: { startTime: null, seconds: null, rounds: null },
          flags: {
            dsa5: {
              advancedFunction: 2, // Dropdown-Menü
              args3: herbMacroText, // Mischungs-Makro
            },
          },
          disabled: false,
          transfer: false,
        },
      ],
    };

    const itemCount = hasApothecary ? 2 : 1;
    const created = Array.from({ length: itemCount }, () => newItem);

    await actor.createEmbeddedDocuments("Item", created);
    ui.notifications.info(
      `${actor.name} ${dict.made} ${itemCount} ${dict.itemName}${itemCount > 1 ? (lang === "de" ? "en" : "s") : ""} ${dict.itemMadeSuffix} (QS=${availableQs}).`
    );
  }

  // Kompakte GUI-Buttons (nur GUI + Bezahlfunktion geändert)
  const tinyBtnStyle = "padding:0 0.25rem; margin:0; border:1px solid var(--color-border-light-primary,#999); background:var(--color-bg-option,#ddd); line-height:1.1; font-size:0.8rem; max-width:fit-content; white-space:nowrap;";
  const dialogHtml = `
    <p style="margin-bottom:0.4rem;">
      ${dict.dialogHeader}
      ${lang === "de"
        ? `Die Materialien kosten pro Anwendung <button id="pay5" style="${tinyBtnStyle}">${dict.payLabel}</button>.`
        : `Materials cost per use <button id="pay5" style="${tinyBtnStyle}">${dict.payLabel}</button>.`}
      ${lang === "de"
        ? `Alternativ kann die Heldin die Materialien auch <button id="selfSearch" style="${tinyBtnStyle}">${dict.searchLabel}</button>.`
        : `Alternatively, the hero can <button id="selfSearch" style="${tinyBtnStyle}">${dict.searchLabel}</button>.`}
      ${dict.dialogFooter}
    </p>
    <p id="mixHint" style="margin-top:0.3rem; color:#a00; font-size:0.9rem;">${dict.mixDisabled}</p>
  `;

  // Dialog für die Sonderfertigkeit
  const dlg = new Dialog({
    title: dict.title,
    content: dialogHtml,
    buttons: {
      mischen: { label: dict.btnMix, callback: () => processHerbMixing(), disabled: true }, // initial deaktiviert
      abbrechen: { label: dict.btnCancel },
    },
    default: "abbrechen",
    render: (html) => {
      const payBtn = html.find("#pay5");
      const searchBtn = html.find("#selfSearch");

      // Zugriff auf den "Mischen"-Button im Dialog und Hinweiszeile
      const mixButton = html.closest(".dialog").find('button[data-button="mischen"]');
      const mixHint = html.find("#mixHint");

      const setMixEnabled = (enabled) => {
        if (mixButton && mixButton.length) {
          mixButton.prop("disabled", !enabled);
          mixButton.toggleClass("disabled", !enabled);
        }
        if (mixHint && mixHint.length) {
          mixHint.toggle(!enabled);
        }
      };
      // initial deaktiviert
      setMixEnabled(false);

      // Pay
      payBtn.on("click", async () => {
        try {
          const payment = game.dsa5?.apps?.DSA5Payment;
          if (!payment) {
            console.warn("DSA5Payment API nicht verfügbar.");
            return;
          }

          let canPayRaw = await payment.canPay(actor, dict.payAmount);
          const canPayObj = typeof canPayRaw === "boolean" ? { success: canPayRaw } : canPayRaw;

          if (!canPayObj.success) {
            ui.notifications.error(`${actor.name} ${dict.payNotEnough}`);
            if (canPayObj.msg) {
              console.warn(dict.cannotPayDetail.replace("{msg}", canPayObj.msg));
            }
            return;
          }

          const payResult = await payment.payMoney(actor, dict.payAmount);
          console.debug("Ergebnis von payMoney:", payResult);

          // Nur bei Erfolg den "Mischen"-Button aktivieren
          setMixEnabled(true);
        } catch (e) {
          console.error("Payment failed:", e);
        }
      });

      // Selbst suchen – direkt aktivieren ohne Zahlung
      searchBtn.on("click", () => {
        setMixEnabled(true);
      });
    },
  });

  dlg.render(true);
})();
