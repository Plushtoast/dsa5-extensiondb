// This is a system macro used for automation. It is disfunctional without the proper context.



(async () => {
  const { getProperty, setProperty } = foundry.utils;

  // Sprachweiche + Dictionary
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
      dialogText:
        "Die Heldin ist dazu in der Lage, eine Kräutermischung anzufertigen, die die Regeneration verbessert. Diese Mischung besteht nicht aus den üblichen Heilkräutern, die LeP regenerieren können, sondern aus einfachen, je nach Region unterschiedlichen Heilkräutern, die insgesamt pro Anwendung der Sonderfertigkeit 5 Silbertaler kosten. Alternativ kann die Heldin die Materialien auch selbst suchen. Sie benötigt dafür 4 Stunden, sofern es in der näheren Umgebung auch die nötigen Materialien gibt (was z. B. in Sand- oder Eiswüsten nicht der Fall ist).",
      qsText: `1: Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.
Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.
Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.
Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.
Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.
Versorgung von Wunden mit einer Kräutermischung. Die nächste Regenerationsphase ist ggf. erhöht.`,
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
      masterySF: "Masterful Herb Mixture", //Platzhalter, Kräutermischung und verwandte SF sind nicht im Englischen vorhanden.
      apothecarySF: "Path of the Apothecary", //Platzhalter, Kräutermischung und verwandte SF sind nicht im Englischen vorhanden.
      itemDesc:
        "It doesn't always have to be Tarnele or Wirsel Herb. With the right blend, a healer can make a potent herb mixture from other, simple healing herbs.",
      dialogText:
        "The hero can craft an herb mixture that improves regeneration. It costs 5 silver per use, or 4 hours to gather materials if available in the area.",
      qsText: `1: Treating wounds with an herb mixture. The next regeneration phase may be increased.
Treating wounds with an herb mixture. The next regeneration phase may be increased.
Treating wounds with an herb mixture. The next regeneration phase may be increased.
Treating wounds with an herb mixture. The next regeneration phase may be increased.
Treating wounds with an herb mixture. The next regeneration phase may be increased.
Treating wounds with an herb mixture. The next regeneration phase may be increased.`,
    },
  }[lang];

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

  // Item-Makro-Text abhängig von den Sonderfertigkeiten
  const herbMacroText = `
  // This is a system macro used for automation. It is disfunctional without the proper context.
  const { getProperty, setProperty } = foundry.utils;
  const currentTempHeal = getProperty(actor, "system.status.regeneration.LePTemp") ?? 0;
  const mapping = [1,2,3,4,5,6];
  const wuerfelziel = mapping[(typeof qs !== "undefined" ? qs : 0) - 1] ?? 0;
  const roll = await new Roll("${hasApothecary ? "2d6kl1" : "1d6"}").roll({async: true});
  await roll.toMessage({ flavor: "${dict.itemName} – Prüfwurf" });
  if (roll.total <= wuerfelziel) {
    const add = ${hasMastery ? 2 : 1};
    const newVal = (currentTempHeal || 0) + add;
    await actor.update({ "system.status.regeneration.LePTemp": newVal });
  }`;

  // --- Prozess Kräutermischung ---
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
      { modifier: 2, subtitle: " (Kräutermischung)" },
      actor.sheet?.getTokenId?.()
    );
    setProperty(setupData, "testData.opposable", false);
    const res = await actor.basicTest(setupData);
    const availableQs = Number(getProperty(res, "result.qualityStep")) || 0;

    if (availableQs <= 0) {
      ui.notifications.info(`${actor.name} ${dict.testFail}`);
      return;
    }

    // Neues Item vorbereiten
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

  // --- Dialog für die Sonderfertigkeit ---
  new Dialog({
    title: dict.title,
    content: `<p>${dict.dialogText}</p>`,
    buttons: {
      mischen: { label: dict.btnMix, callback: () => processHerbMixing() },
      abbrechen: { label: dict.btnCancel },
    },
    default: "abbrechen",
  }).render(true);
})();
