// This is a system macro used for automation. It is disfunctional without the proper context.

const { getProperty, setProperty } = foundry.utils;
const { DialogV2 } = foundry.applications.api;

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Alchimistische Verdünnung",
    infoHeader: "Alchimistische Verdünnung",
    infoText:
      "Der Zauberer kann ein alchimistisches Elixier verdünnen, sodass daraus zwei Elixiere werden. Diese weisen jeweils eine um 2 niedrigere QS auf. Fällt die QS auf 0 oder weniger, scheitert die Verdünnung und das Elixier wird unbrauchbar.",
    dropHint: "Klicke in das Feld zur Auswahl oder ziehe ein Elixier hinein.",
    aspCostText: "Es werden 4 AsP abgezogen.",
    dragDropZone: "Klicken oder Drag & Drop",
    emptyList: "Keine passenden Elixiere im Inventar.",
    cancel: "Abbrechen",
    execute: "Verdünnen",
    selectTokenError: "Bitte wähle einen Token mit verknüpftem Charakter aus.",
    needItemFirstError: "Bitte zuerst ein passendes Elixier ablegen!",
    notEnoughAsP: "Nicht genügend AsP!",
    onlyPotionsError: "Es können nur Elixiere verdünnt werden.",
    onlyHealingAlchemyError: "Es können nur Heilmittel oder Elixiere verdünnt werden.",
    success: (name, newQs) => `${name} wurde verdünnt und liegt nun in 2 Portionen mit QS ${newQs} vor.`,
    fail: (name) => `Die Verdünnung von ${name} ist gescheitert.`,
    qsLabel: "QS",
    removeHint: "(Rechtsklick zum Entfernen)",
  },
  en: {
    title: "Alchemical Dilution",
    infoHeader: "Alchemical Dilution",
    infoText:
      "The caster can dilute an alchemical elixir, creating two elixirs. Each has 2 lower QL. If QL drops to 0 or below, the dilution fails and the elixir becomes unusable.",
    dropHint: "Click the box to select or drag an elixir into it.",
    aspCostText: "It costs 4 AsP.",
    dragDropZone: "Click or Drag & Drop",
    emptyList: "No valid elixirs in inventory.",
    cancel: "Cancel",
    execute: "Dilute",
    selectTokenError: "Please select a token linked to a character.",
    needItemFirstError: "Please drop a valid elixir first!",
    notEnoughAsP: "Not enough AsP!",
    onlyPotionsError: "Only elixirs can be diluted.",
    onlyHealingAlchemyError: "Only healing remedies or elixirs can be diluted.",
    success: (name, newQs) => `${name} was diluted and is now available as 2 portions with QL ${newQs}.`,
    fail: (name) => `The dilution of ${name} failed.`,
    qsLabel: "QL",
    removeHint: "(Right-click to remove)",
  },
}[lang];

const ASP_COST = 4;
const QS_REDUCTION = 2;

const sendMessage = async (message) => {
  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(message));
};

const selectedActor = canvas.tokens.controlled[0]?.actor || game.user.character;
if (!selectedActor) {
  await sendMessage(dict.selectTokenError);
  return;
}

const validItems = selectedActor.items.filter((i) => {
  const cat = getProperty(i, "system.equipmentType.value");
  return cat === "healing" || cat === "alchemy";
});

let listItemsHtml = "";
if (validItems.length === 0) {
  listItemsHtml = `<li style="padding: 10px; color: #888; text-align: center; font-style: italic;">${dict.emptyList}</li>`;
} else {
  validItems.forEach((item) => {
    const qs = getProperty(item, "system.QL") ?? 1;
    const qty = getProperty(item, "system.quantity.value") ?? 1;
    listItemsHtml += `
                <li class="potion-option" data-id="${item.id}" style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.1); display: flex; align-items: center; gap: 10px; transition: background 0.2s;">
                    <img src="${item.img}" style="width: 28px; height: 28px; border-radius: 3px; border: 1px solid #968678; object-fit: cover;">
                    <div style="display: flex; flex-direction: column; line-height: 1.1;">
                        <span style="font-family: 'Signika'; font-weight: bold;">${item.name} <span style="font-weight: normal; color: #555;">(${qty}x)</span></span>
                        <span style="font-size: 0.85em; color: #444;">${dict.qsLabel}: ${qs}</span>
                    </div>
                </li>`;
  });
}

const cloneDilutedItem = (item, qualityStep) => {
  const dilutedItem = item.toObject();
  setProperty(dilutedItem, "system.QL", qualityStep);
  setProperty(dilutedItem, "system.quantity.value", 1);
  delete dilutedItem._id;
  return dilutedItem;
};

class DilutionDialog extends DialogV2 {
  constructor() {
    super({
      window: {
        title: dict.title,
        resizable: true,
      },
      position: {
        width: 420,
        height: "auto",
      },
      buttons: [
        {
          action: "dilute",
          label: dict.execute,
          icon: "fas fa-flask",
          callback: async () => await this._onDilute(),
        },
        {
          action: "cancel",
          label: dict.cancel,
          icon: "fas fa-times",
        },
      ],
      content: `
                    <div class="dsa5" style="max-height:600px;overflow:auto;margin-bottom:10px;">
                        <p style="font-family: 'Signika'; font-weight: bold; font-size: 1.1em; border-bottom: 1px solid #736953a6;">${dict.infoHeader}</p>
                        <p style="line-height: 1.5;">${dict.infoText}</p>
                        <p style="font-style: italic;">${dict.dropHint}<br>${dict.aspCostText}</p>
                        
                        <div id="drop-zone-container" style="position: relative; margin-top: 15px;">
                            <div id="drop-zone" style="border: 2px dashed #968678; border-radius: 5px; padding: 20px; text-align: center; color: #333333; background: rgba(0,0,0,0.05); transition: all 0.2s ease; cursor: pointer; min-height: 120px; display: flex; flex-direction: column; justify-content: center;">
                                <div id="drop-zone-content">
                                    ${dict.dragDropZone}
                                </div>
                            </div>
                            <ul id="potion-list" style="display: none; position: absolute; top: calc(100% - 2px); left: 0; width: 100%; background: #e2d8c9; border: 1px solid #968678; border-radius: 0 0 5px 5px; padding: 0; margin: 0; list-style: none; max-height: 200px; overflow-y: auto; z-index: 100; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                                ${listItemsHtml}
                            </ul>
                        </div>
                    </div>
                `,
    });
    this.droppedItem = null;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    if (!html) return;

    const dropZone = html.querySelector("#drop-zone");
    const dropZoneContent = html.querySelector("#drop-zone-content");
    const potionList = html.querySelector("#potion-list");
    const potionOptions = html.querySelectorAll(".potion-option");

    const updateDropZoneView = () => {
      if (!this.droppedItem) {
        dropZoneContent.innerHTML = `
                        ${dict.dragDropZone}
                    `;
        dropZone.style.borderStyle = "dashed";
      } else {
        const qs = getProperty(this.droppedItem, "system.QL") ?? 1;
        dropZoneContent.innerHTML = `
                        <img src="${this.droppedItem.img}" style="width: 60px; height: 60px; object-fit: cover; border: 1px solid #968678; border-radius: 3px; display: block; margin: 0 auto 10px auto; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        <b style="font-family: 'Signika'; font-size: 1.1em;">${this.droppedItem.name}</b><br>
                        ${dict.qsLabel}: ${qs}
                        <div style="font-size: 0.8em; opacity: 0.6; margin-top: 5px;">${dict.removeHint}</div>
                    `;
        dropZone.style.borderStyle = "solid";
      }
    };

    dropZone.addEventListener("click", (ev) => {
      if (this.droppedItem) return;
      potionList.style.display = potionList.style.display === "none" ? "block" : "none";
    });

    dropZone.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      this.droppedItem = null;
      potionList.style.display = "none";
      updateDropZoneView();
    });

    potionOptions.forEach((opt) => {
      opt.addEventListener("mouseenter", () => (opt.style.background = "rgba(0,0,0,0.1)"));
      opt.addEventListener("mouseleave", () => (opt.style.background = "transparent"));

      opt.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const itemId = opt.dataset.id;
        this.droppedItem = selectedActor.items.get(itemId);
        potionList.style.display = "none";
        updateDropZoneView();
      });
    });

    html.addEventListener("click", (ev) => {
      if (!ev.target.closest("#drop-zone-container")) {
        potionList.style.display = "none";
      }
    });

    dropZone.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      dropZone.style.borderColor = "#6b944d";
      dropZone.style.background = "rgba(107, 148, 77, 0.1)";
    });

    dropZone.addEventListener("dragleave", (ev) => {
      ev.preventDefault();
      dropZone.style.borderColor = "#968678";
      dropZone.style.background = "rgba(0,0,0,0.05)";
    });

    dropZone.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      dropZone.style.borderColor = "#968678";
      dropZone.style.background = "rgba(0,0,0,0.05)";
      potionList.style.display = "none";

      let data;
      try {
        data = JSON.parse(ev.dataTransfer.getData("text/plain"));
      } catch (err) {
        return;
      }

      if (data.type !== "Item") {
        await sendMessage(dict.onlyPotionsError);
        return;
      }

      const srcItem = await fromUuid(data.uuid);
      if (!srcItem) return;

      const cat = getProperty(srcItem, "system.equipmentType.value");
      if (cat !== "healing" && cat !== "alchemy") {
        await sendMessage(dict.onlyHealingAlchemyError);
        return;
      }

      this.droppedItem = selectedActor.items.get(srcItem.id);
      if (!this.droppedItem) {
        await sendMessage(dict.onlyHealingAlchemyError);
        return;
      }

      updateDropZoneView();
    });
  }

  async _onDilute() {
    if (!this.droppedItem) {
      await sendMessage(dict.needItemFirstError);
      return;
    }

    const qs = getProperty(this.droppedItem, "system.QL") ?? 1;
    const qty = getProperty(this.droppedItem, "system.quantity.value") ?? 1;
    const asp = getProperty(selectedActor, "system.status.astralenergy.value") ?? 0;

    if (asp < ASP_COST) {
      await sendMessage(dict.notEnoughAsP);
      return;
    }

    await selectedActor.update({ "system.status.astralenergy.value": asp - ASP_COST });

    if (qty > 1) {
      await selectedActor.updateEmbeddedDocuments("Item", [{ _id: this.droppedItem.id, "system.quantity.value": qty - 1 }]);
    } else {
      await selectedActor.deleteEmbeddedDocuments("Item", [this.droppedItem.id]);
    }

    if (qs > QS_REDUCTION) {
      const newQs = qs - QS_REDUCTION;
      const dilutedItems = [cloneDilutedItem(this.droppedItem, newQs), cloneDilutedItem(this.droppedItem, newQs)];
      await selectedActor.createEmbeddedDocuments("Item", dilutedItems);
      await sendMessage(dict.success(this.droppedItem.name, newQs));
    } else {
      await sendMessage(dict.fail(this.droppedItem.name));
    }

    this.close();
  }
}

new DilutionDialog().render(true);
