const MACRO_CONFIG = {
    aspCostPerWeek: 2,
    durationSeconds: 604800
};

const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
    de: {
        title: "Substanz einspeichern",
        effectPrefix: "Elixierspeicher",
        noActor: "Kein gültiger Akteur gefunden.",
        noAsp: (name) => `${name} verfügt über keine Astralenergie und kann keine Substanzen einspeichern.`,
        notEnoughAsp: (name, cost) => `${name} hat nicht genügend Astralenergie (benötigt ${cost} AsP).`,
        alreadyFull: "Es ist bereits eine Substanz im Alraunigen gespeichert!",
        selectItem: "Flüssigkeit hierher ziehen",
        categoryLabel: "Gifte & Elixiere",
        storeBtn: "Einspeichern",
        cancel: "Abbrechen",
        emptyList: "Keine passenden verbrauchbaren Flüssigkeiten im Inventar.",
        invalidItem: "Nur gültige Flüssigkeiten (Tränke/Gifte) sind erlaubt.",
        chatStored: (name, itemName) => `<b>${name}</b> speichert <b>${itemName}</b> in seinem Körper ein.`,
        amount: "Menge",
        stepLabel: "Stufe",
        qsLabel: "QS",
        removeHint: "(Rechtsklick zum Entfernen)",
        qtyPath: "system.quantity.value",
        qsPath: "system.QL"
    },
    en: {
        title: "Store Substance",
        effectPrefix: "Elixir Storage",
        noActor: "No valid actor found.",
        noAsp: (name) => `${name} does not have astral energy and cannot store substances.`,
        notEnoughAsp: (name, cost) => `${name} does not have enough astral energy (requires ${cost} AE).`,
        alreadyFull: "A substance is already stored!",
        selectItem: "Drag liquid here",
        categoryLabel: "Poisons & Elixirs",
        storeBtn: "Store",
        cancel: "Cancel",
        emptyList: "No matching consumable liquids in inventory.",
        invalidItem: "Only valid liquids (potions/poisons) are allowed.",
        chatStored: (name, itemName) => `<b>${name}</b> stores <b>${itemName}</b> in their body.`,
        amount: "Amount",
        stepLabel: "Step",
        qsLabel: "QL",
        removeHint: "(Right-click to remove)",
        qtyPath: "system.quantity.value",
        qsPath: "system.QL"
    }
}[lang];

if (!actor) {
    ui.notifications.warn(dict.noActor);
    return;
}

const { getProperty, setProperty } = foundry.utils;
const { DialogV2 } = foundry.applications.api;

const aspPath = "system.status.astralenergy.value";
const currentAsp = Number(getProperty(actor, aspPath)) || 0;

const aspMax = Math.max(
    Number(getProperty(actor, "system.status.astralenergy.max")) || 0,
    Number(getProperty(actor, "system.status.astralenergy.initial")) || 0
);

if (aspMax <= 0) {
    ui.notifications.warn(dict.noAsp(actor.name));
    return;
}

if (currentAsp < MACRO_CONFIG.aspCostPerWeek) {
    ui.notifications.warn(dict.notEnoughAsp(actor.name, MACRO_CONFIG.aspCostPerWeek));
    return;
}

const existingEffect = actor.effects.find(e => e.flags?.world?.storedElixir);
if (existingEffect) {
    ui.notifications.warn(dict.alreadyFull);
    return;
}

const getQS = (doc) => {
    if (!doc) return 1;
    if (doc.type === "poison") return Number(getProperty(doc, "system.step.value")) || 1;
    return Number(getProperty(doc, "system.QL")) || 1;
};

const isValidSubstance = (i) => {
    if (!i) return false;
    const isConsumable = i.type === "consumable";
    const isPoison = i.type === "poison";
    const isAlchemy = i.type === "equipment" && getProperty(i, "system.equipmentType.value") === "alchemy";
    return isConsumable || isPoison || isAlchemy;
};

const validItems = actor.items.filter(isValidSubstance).sort((a, b) => a.name.localeCompare(b.name));

if (validItems.length === 0) {
    ui.notifications.warn(dict.emptyList);
    return;
}

const listItemsHtml = validItems.map(pot => {
    const qty = Number(getProperty(pot, dict.qtyPath)) || 1;
    const qs = getQS(pot);
    const qsLabel = pot.type === "poison" ? dict.stepLabel : dict.qsLabel;
    
    return `<li class='item potion-option' data-id='${pot.id}' style='padding: 5px; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.1); display: flex; align-items: center; gap: 10px;'>
        <img src='${pot.img}' width='32' height='32' style='border: none;'>
        <div class='item-name' style='flex: 1; line-height: 1.2;'>
            <b style='display: block;'>${pot.name}</b>
            <span class='subtitle'>${dict.amount}: ${qty} | ${qsLabel}: ${qs}</span>
        </div>
    </li>`;
}).join('');

const onRemoveScript = `
if (effect.getFlag("world", "spatOut")) return;

const encodedData = effect.getFlag("world", "storedElixir");
if (!encodedData) return;
const itemData = JSON.parse(decodeURIComponent(encodedData));

const cost = ${MACRO_CONFIG.aspCostPerWeek};
const lang = game.i18n.lang === "de" ? "de" : "en";
const dictRemove = {
    de: {
        renewed: (name, itemName) => "<b>" + name + "</b> verbraucht " + cost + " AsP, um <b>" + itemName + "</b> für eine weitere Woche zu speichern.",
        excretedNoAsp: (name, itemName) => "<b>" + name + "</b> hat nicht genügend AsP. <b>" + itemName + "</b> wird ausgeschieden.",
        excretedManual: (name, itemName) => "<b>" + name + "</b> gibt <b>" + itemName + "</b> über die Haut ab."
    },
    en: {
        renewed: (name, itemName) => "<b>" + name + "</b> spends " + cost + " AE to store <b>" + itemName + "</b> for another week.",
        excretedNoAsp: (name, itemName) => "<b>" + name + "</b> does not have enough AE. <b>" + itemName + "</b> is excreted.",
        excretedManual: (name, itemName) => "<b>" + name + "</b> secretes <b>" + itemName + "</b> through their skin."
    }
}[lang];

const aspPath = "system.status.astralenergy.value";
const currentAsp = Number(foundry.utils.getProperty(actor, aspPath)) || 0;

if (effect.duration.remaining <= 0) {
    if (currentAsp >= cost) {
        await actor.update({[aspPath]: Math.max(0, currentAsp - cost)});
        ChatMessage.create({content: dictRemove.renewed(actor.name, itemData.name)});
        
        const effectData = effect.toObject();
        effectData.duration.startTime = game.time.worldTime;
        await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    } else {
        ChatMessage.create({content: dictRemove.excretedNoAsp(actor.name, itemData.name)});
        await actor.createEmbeddedDocuments("Item", [itemData]);
    }
} else {
    ChatMessage.create({content: dictRemove.excretedManual(actor.name, itemData.name)});
    await actor.createEmbeddedDocuments("Item", [itemData]);
}
`;

class StorageDialog extends DialogV2 {
    constructor() {
        super({
            window: { title: dict.title, resizable: true },
            position: { width: 450, height: "auto" },
            buttons: [
                { action: "store", label: dict.storeBtn, icon: "fas fa-check", callback: async () => await this._onStore() },
                { action: "cancel", label: dict.cancel, icon: "fas fa-times" }
            ],
            content: `
            <div class='dsa5'>
                <div id='error-msg' class='notification error' style='display:none; margin-bottom: 5px; text-align:center;'></div>
                <div id='drop-zone-container' style='position: relative; display: flex; flex-direction: column;'>
                    <div id='drop-zone' style='border: 2px dashed var(--color-border-dark-1); border-radius: 5px; padding: 20px; text-align: center; cursor: pointer; min-height: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(0,0,0,0.05); transition: background 0.2s, border-color 0.2s;'>
                        <div id='drop-zone-content' style='display: flex; flex-direction: column; align-items: center; text-align: center;'>
                            <h3 style='margin: 0; border: none; text-align: center;'>${dict.selectItem}</h3>
                            <span class='subtitle'>(${dict.categoryLabel})</span>
                        </div>
                    </div>
                    <ul id='potion-list' class='item-list' style='display: none; width: 100%; background: #e2d8c9; border: 1px solid #968678; margin: 10px 0 0 0; padding: 0; max-height: 350px; overflow-y: auto; box-shadow: inset 0 0 5px rgba(0,0,0,0.3); list-style: none; border-radius: 3px;'>
                        ${listItemsHtml}
                    </ul>
                </div>
            </div>`
        });
        this.embeddedPotion = null;
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const html = this.element;
        if (!html) return;

        this.dropZone = html.querySelector("#drop-zone");
        this.dropZoneContent = html.querySelector("#drop-zone-content");
        this.potionList = html.querySelector("#potion-list");
        this.errorEl = html.querySelector("#error-msg");
        this.storeBtn = html.querySelector('button[data-action="store"]');
        
        if (this.storeBtn) this.storeBtn.disabled = true;

        this.dropZone.addEventListener("click", () => {
            if (this.embeddedPotion) return;
            this.potionList.style.display = this.potionList.style.display === "none" ? "block" : "none";
            this.clearError();
        });

        this.dropZone.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();
            this.embeddedPotion = null;
            this.potionList.style.display = "none";
            this.updateInfo();
            this.clearError();
        });

        html.querySelectorAll(".potion-option").forEach((opt) => {
            opt.addEventListener("mouseenter", () => (opt.style.background = "rgba(0,0,0,0.1)"));
            opt.addEventListener("mouseleave", () => (opt.style.background = "transparent"));
            opt.addEventListener("click", (ev) => {
                ev.stopPropagation();
                this.embeddedPotion = actor.items.get(opt.dataset.id);
                this.potionList.style.display = "none";
                this.updateInfo();
            });
        });

        this.dropZone.addEventListener("dragover", (ev) => {
            ev.preventDefault();
            this.dropZone.style.borderColor = "var(--color-border-highlight)";
            this.dropZone.style.background = "rgba(0, 0, 0, 0.1)";
        });

        this.dropZone.addEventListener("dragleave", (ev) => {
            ev.preventDefault();
            this.dropZone.style.borderColor = "var(--color-border-dark-1)";
            this.dropZone.style.background = "rgba(0,0,0,0.05)";
        });

        this.dropZone.addEventListener("drop", async (ev) => {
            ev.preventDefault();
            this.dropZone.style.borderColor = "var(--color-border-dark-1)";
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

            if (!itemDoc || !isValidSubstance(itemDoc)) return this.showError(dict.invalidItem);

            const embedded = actor.items.get(itemDoc.id);
            if (!embedded) return this.showError(dict.invalidItem);

            this.embeddedPotion = embedded;
            this.updateInfo();
        });
    }

    showError(msg) {
        if (this.errorEl) {
            this.errorEl.style.display = "block";
            this.errorEl.textContent = msg;
        }
        if (this.storeBtn) this.storeBtn.disabled = true;
    }

    clearError() {
        if (this.errorEl) {
            this.errorEl.style.display = "none";
            this.errorEl.textContent = "";
        }
    }

    updateInfo() {
        if (!this.embeddedPotion) {
            this.dropZoneContent.innerHTML = `<h3 style='margin: 0; border: none; text-align: center;'>${dict.selectItem}</h3><span class='subtitle'>(${dict.categoryLabel})</span>`;
            this.dropZone.style.borderStyle = "dashed";
            if (this.storeBtn) this.storeBtn.disabled = true;
            return;
        }

        const qs = getQS(this.embeddedPotion);
        const qsLabel = this.embeddedPotion.type === "poison" ? dict.stepLabel : dict.qsLabel;
        
        this.dropZoneContent.innerHTML = `<img src='${this.embeddedPotion.img}' width='64' height='64' style='display: block; border: none; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); margin: 0 auto 5px auto;'><b style='font-size: 1.1em; text-align: center; display: block;'>${this.embeddedPotion.name} (${qsLabel} ${qs})</b><span class='subtitle' style='text-align: center; display: block;'>${dict.removeHint}</span>`;
        this.dropZone.style.borderStyle = "solid";
        if (this.storeBtn) this.storeBtn.disabled = false;
    }

    async _onStore() {
        if (!this.embeddedPotion) return;
        
        const liveAsp = Number(getProperty(actor, aspPath)) || 0;
        if (liveAsp < MACRO_CONFIG.aspCostPerWeek) {
            ui.notifications.warn(dict.notEnoughAsp(actor.name, MACRO_CONFIG.aspCostPerWeek));
            return;
        }

        await actor.update({ [aspPath]: Math.max(0, liveAsp - MACRO_CONFIG.aspCostPerWeek) });

        const targetQty = Number(getProperty(this.embeddedPotion, dict.qtyPath)) || 1;
        const newItemData = this.embeddedPotion.toObject();
        delete newItemData._id;
        setProperty(newItemData, dict.qtyPath, 1);

        if (targetQty > 1) {
            await actor.updateEmbeddedDocuments("Item", [{ _id: this.embeddedPotion.id, [dict.qtyPath]: targetQty - 1 }]);
        } else {
            await actor.deleteEmbeddedDocuments("Item", [this.embeddedPotion.id]);
        }

        const effectData = {
            name: `${dict.effectPrefix}: ${this.embeddedPotion.name}`,
            img: this.embeddedPotion.img, 
            duration: { value: MACRO_CONFIG.durationSeconds, units: "seconds" },
            flags: {
                world: {
                    storedElixir: encodeURIComponent(JSON.stringify(newItemData))
                }
            },
            system: {
                advancedFunction: 2,
                macroArgs: { onRemove: onRemoveScript }
            }
        };

        await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
        await ChatMessage.create({ content: dict.chatStored(actor.name, this.embeddedPotion.name) });
        this.close();
    }
}

new StorageDialog().render(true);
