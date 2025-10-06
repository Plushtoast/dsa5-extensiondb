// This is a system macro used for automation. It is disfunctional without the proper context.

// Dictionary
const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Alchimistische Verdünnung",
    infoHeader: "Alchimistische Verdünnung",
    infoText: "Der Zauberer kann ein alchimistisches Elixier verdünnen, sodass daraus zwei Elixiere werden. Diese weisen jeweils eine um 3 niedrigere QS auf. Fällt die QS auf 0 oder weniger, scheitert die Verdünnung und das Elixier wird unbrauchbar.",
    dropHint: "Ziehe ein Heilmittel oder Elixier hier hinein.",
    aspCostText: "Es werden 4 AsP abgezogen.",
    dragDropZone: "Drag & Drop Item hier",
    cancel: "Abbrechen",
    execute: "Verdünnen",
    selectTokenError: "Bitte wähle einen Token mit verknüpftem Charakter aus.",
    needItemFirstError: "Bitte zuerst ein passendes Elixier ablegen!",
    notEnoughAsP: "Nicht genügend AsP!",
    onlyPotionsError: "Es können nur Elixiere verdünnt werden.",
    onlyHealingAlchemyError: "Es können nur Heilmittel oder Elixiere verdünnt werden.",
    success: "Das Elixier wurde verdünnt!",
    fail: "Die Verdünnung ist gescheitert!",
    qsLabel: "QS"
  },
  en: {
    title: "Alchemical Dilution",
    infoHeader: "Alchemical Dilution",
    infoText: "The caster can dilute an alchemical elixir, creating two elixirs. Each has 3 lower QS. If QS drops to 0 or below, the dilution fails and the elixir becomes unusable.",
    dropHint: "Drag a healing remedy or elixir here.",
    aspCostText: "It costs 4 AsP.",
    dragDropZone: "Drag & Drop item here",
    cancel: "Cancel",
    execute: "Dilute",
    selectTokenError: "Please select a token linked to a character.",
    needItemFirstError: "Please drop a valid elixir first!",
    notEnoughAsP: "Not enough AsP!",
    onlyPotionsError: "Only elixirs can be diluted.",
    onlyHealingAlchemyError: "Only healing remedies or elixirs can be diluted.",
    success: "The elixir was successfully diluted!",
    fail: "The dilution failed!",
    qsLabel: "QS"
  }
};

const { getProperty, setProperty, duplicate } = foundry.utils;

// Actor-Ermittlung exakt wie Vorlage
let selectedActor = canvas.tokens.controlled[0]?.actor || game.user.character;
if (!selectedActor) {
  ui.notifications.error(dict[lang].selectTokenError);
  return;
}

let droppedItem = null;

const content = `
<div style="max-height:600px;overflow:auto;">
  <p><b>${dict[lang].infoHeader}</b></p>
  <p>${dict[lang].infoText}</p>
  <p>${dict[lang].dropHint}<br>${dict[lang].aspCostText}</p>

  <div id="drop-zone" style="border:2px dashed #666; border-radius:10px; padding:20px; text-align:center; color:#888;">
    ${dict[lang].dragDropZone}
  </div>
</div>
`;

new Dialog({
  title: dict[lang].title,
  content: content,
  default: "dilute",
  buttons: {
    dilute: {
      label: dict[lang].execute,
      callback: async () => {
        if (!droppedItem) {
          ui.notifications.error(dict[lang].needItemFirstError);
          return;
        }

        const qs = getProperty(droppedItem, "system.QL") ?? 1;
        const qty = getProperty(droppedItem, "system.quantity.value") ?? 1;

        // AsP prüfen
        const asp = getProperty(selectedActor, "system.status.astralenergy.value") ?? 0;
        if (asp < 4) {
          ui.notifications.error(dict[lang].notEnoughAsP);
          return;
        }

        // 4 AsP abziehen
        await selectedActor.update({ "system.status.astralenergy.value": Math.max(0, asp - 4) });

        // Originalitem Menge verringern oder löschen
        if (qty > 1) {
          await selectedActor.updateEmbeddedDocuments("Item", [{ _id: droppedItem.id, "system.quantity.value": qty - 1 }]);
        } else {
          await selectedActor.deleteEmbeddedDocuments("Item", [droppedItem.id]);
        }

        // Verdünnung nur, wenn QS > 3 (weil -3)
        if (qs > 3) {
          const newItemA = duplicate(droppedItem);
          const newItemB = duplicate(droppedItem);
          setProperty(newItemA, "system.QL", qs - 3);
          setProperty(newItemA, "system.quantity.value", 1);
          setProperty(newItemB, "system.QL", qs - 3);
          setProperty(newItemB, "system.quantity.value", 1);
          delete newItemA._id;
          delete newItemB._id;

          await selectedActor.createEmbeddedDocuments("Item", [newItemA, newItemB]);
          ui.notifications.info(dict[lang].success);
        } else {
          ui.notifications.info(dict[lang].fail);
        }
      }
    },
    cancel: { label: dict[lang].cancel }
  },
  render: (html) => {
    const dropZone = html.find("#drop-zone")[0];

    dropZone.ondragover = ev => { ev.preventDefault(); dropZone.style.borderColor = "green"; };
    dropZone.ondragleave = ev => { ev.preventDefault(); dropZone.style.borderColor = "#666"; };

    dropZone.ondrop = async ev => {
      ev.preventDefault();
      dropZone.style.borderColor = "#666";

      let data;
      try { data = JSON.parse(ev.dataTransfer.getData("text/plain")); } catch (err) { return; }

      if (data.type !== "Item") {
        ui.notifications.error(dict[lang].onlyPotionsError);
        return;
      }

      // Quelle laden
      const srcItem = await fromUuid(data.uuid);
      if (!srcItem) return;

      // Kategorie prüfen
      const cat = getProperty(srcItem, "system.equipmentType.value");
      if (cat !== "healing" && cat !== "alchemy") {
        ui.notifications.error(dict[lang].onlyHealingAlchemyError);
        return;
      }

      // Item muss vom eigenen Actor kommen
      droppedItem = selectedActor.items.get(srcItem.id);
      if (!droppedItem) {
        ui.notifications.error(dict[lang].onlyHealingAlchemyError);
        return;
      }

      const qs = getProperty(droppedItem, "system.QL") ?? 1;
      dropZone.innerHTML = `
        <img src="${droppedItem.img}" style="max-width:100px; display:block; margin:0 auto 10px auto;">
        <b>${droppedItem.name}</b><br>
        ${dict[lang].qsLabel}: ${qs}
      `;
    };
  }
}).render(true);
