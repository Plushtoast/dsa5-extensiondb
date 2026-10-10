const { ApplicationV2 } = foundry.applications.api;

const lang = game.i18n.lang === "de" ? "de" : "en";

const dict = {
    de: {
        title: "Springarm konfigurieren",
        desc: "Dieses Item kann eine Waffe der Kampftechnik Dolche aufnehmen.",
        noDaggers: "Du hast keine (freien) Dolche im Inventar.",
        mainHand: "Haupthand",
        offHand: "Nebenhand",
        selectWeapon: "Bitte wähle zuerst einen Dolch aus.",
        success: (name, hand) => `${name} wurde installiert.`,
        successRemove: (name) => `${name} wurde ausgebaut.`,
        current: "Aktuell installiert:",
        none: "Keiner",
        remove: "Ausbauen",
        noActor: "Kein Akteur gefunden.",
        combatSkill: "Dolche"
    },
    en: {
        title: "Configure spring mechanism",
        desc: "This spring mechanism can hold a weapon of the Daggers combat technique.",
        noDaggers: "You have no (unequipped/free) daggers in your inventory.",
        mainHand: "Main Hand",
        offHand: "Off Hand",
        selectWeapon: "Please select a dagger first.",
        success: (name, hand) => `${name} was installed.`,
        successRemove: (name) => `${name} was removed.`,
        current: "Currently installed:",
        none: "None",
        remove: "Remove",
        noActor: "No actor found.",
        combatSkill: "Daggers"
    }
}[lang];

if (!actor) {
    ui.notifications.warn(dict.noActor);
    return;
}

const FLAG_SCOPE = "dsa5-riverlands";
const FLAG_KEY = "SpringarmSetup";

const isDagger = (entry) => {
    if (entry.type !== "meleeweapon") return false;
    if (entry.system.worn?.value) return false;
    if (entry.system.parent_id && entry.system.parent_id !== "0" && entry.system.parent_id !== 0) {
        return false;
    }
    
    return entry.system.combatskill?.value === dict.combatSkill;
};

const getEligibleDaggers = () => actor.items.filter(isDagger);

class ContainerApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: `container-app-${item.id}`,
        classes: ["dsa5"],
        window: { title: dict.title, resizable: true },
        position: { width: 420, height: "auto" },
        actions: {
            selectWeapon(event, target) { this._onSelectWeapon(event, target); },
            equip(event, target) { this._onEquip(event, target); },
            unequip(event, target) { this._onUnequip(event, target); },
        },
    };

    constructor(options) {
        super(options);
        const currentSetup = item.getFlag(FLAG_SCOPE, FLAG_KEY) || {};
        this.selectedWeaponId = currentSetup.daggerId || null;
    }

    async _prepareContext() {
        const daggers = getEligibleDaggers();
        if (this.selectedWeaponId && !daggers.some((w) => w.id === this.selectedWeaponId)) {
            this.selectedWeaponId = null;
        }

        const currentSetup = item.getFlag(FLAG_SCOPE, FLAG_KEY) || {};
        let currentDaggerName = dict.none;
        let currentDaggerImg = "";
        let currentHandStr = "";
        
        if (currentSetup.daggerId) {
            const w = actor.items.get(currentSetup.daggerId);
            if (w) {
                currentDaggerName = w.name;
                currentDaggerImg = w.img;
                currentHandStr = currentSetup.hand === "main" ? dict.mainHand : dict.offHand;
            }
        }

        return {
            hasDaggers: daggers.length > 0,
            equipDisabled: !this.selectedWeaponId,
            daggers,
            currentDaggerName,
            currentDaggerImg,
            currentHandStr
        };
    }

    async _renderHTML(context) {
        const daggerHtml = context.daggers.map((weapon) => {
            const isSelected = this.selectedWeaponId === weapon.id;
            return `
                <li class="${isSelected ? "selected" : ""}">
                    <label data-action="selectWeapon" data-id="${weapon.id}">
                        <input type="radio" name="weaponChoice" value="${weapon.id}" ${isSelected ? "checked" : ""} />
                        <img src="${weapon.img}" width="40" height="40" class="dsa-card-icon-img" style="border: none;"/>
                        <span>${weapon.name}</span>
                    </label>
                </li>`;
        }).join("");

        let listSection = context.hasDaggers 
            ? `<div class="dsa-card-list thinscroll dsa-card-scroll-box"><ul>${daggerHtml}</ul></div>`
            : `<div class="paddingBox center" style="margin: 10px 0;"><i>${dict.noDaggers}</i></div>`;

        let currentInfoHtml = `<div class="center"><b>${dict.current}</b> ${dict.none}</div>`;
        
        if (context.currentDaggerName !== dict.none) {
            currentInfoHtml = `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 5px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <b>${dict.current}</b>
                        <img src="${context.currentDaggerImg}" width="28" height="28" style="border: none; border-radius: 3px; object-fit: contain;" />
                        <span>${context.currentDaggerName} (${context.currentHandStr})</span>
                    </div>
                        <a data-action="unequip" style="font-size: 1.2em; cursor: pointer;" data-tooltip="${dict.remove}">
                        <i class="fas fa-trash"></i>
                    </a>
                </div>
            `;
        }

        return `
            <div class="marginBottom">
                <p class="center" style="font-size: 0.9em; text-align: center; padding: 0 10px;"><i>${dict.desc}</i></p>
                
                <div style="margin-bottom: 10px; padding: 5px; background: rgba(0,0,0,0.05); border: 1px solid #968678; border-radius: 4px;">
                    ${currentInfoHtml}
                </div>

                ${listSection}

                <div class="row-section gap5px margin-top">
                    <button class="col two dsa5 button" data-action="equip" data-hand="main" ${context.equipDisabled ? "disabled" : ""}>
                        <i class="fas fa-hand-paper"></i> ${dict.mainHand}
                    </button>
                    <button class="col two dsa5 button" data-action="equip" data-hand="off" ${context.equipDisabled ? "disabled" : ""}>
                        <i class="fas fa-hand-paper" style="transform: scaleX(-1);"></i> ${dict.offHand}
                    </button>
                </div>
            </div>
        `;
    }

    _replaceHTML(result, content) {
        content.innerHTML = result;
    }

    _onSelectWeapon(_event, target) {
        const { id } = target.dataset;
        this.selectedWeaponId = this.selectedWeaponId === id ? null : id;
        this.render();
    }

    async _onUnequip(_event, _target) {
        const currentSetup = item.getFlag(FLAG_SCOPE, FLAG_KEY);
        if (!currentSetup || !currentSetup.daggerId) return;

        const weapon = actor.items.get(currentSetup.daggerId);
        if (weapon) {
            await actor.updateEmbeddedDocuments("Item", [{ _id: weapon.id, "system.parent_id": "0" }]);
            ui.notifications.info(dict.successRemove(weapon.name));
        }

        await item.unsetFlag(FLAG_SCOPE, FLAG_KEY);
        this.selectedWeaponId = null;
        this.render();
    }

    async _onEquip(_event, target) {
        target.disabled = true;
        try {
            await this.executeEquip(target.dataset.hand);
        } finally {
            if (this.rendered) {
                this.render();
            }
        }
    }

    async executeEquip(hand) {
        if (!this.selectedWeaponId) {
            ui.notifications.warn(dict.selectWeapon);
            return;
        }

        const weapon = actor.items.get(this.selectedWeaponId);
        if (!weapon) return;

        const updates = [];
        
        const currentlyStored = actor.items.filter(i => i.system.parent_id === item.id);
        for (const storedItem of currentlyStored) {
            if (storedItem.id !== this.selectedWeaponId) {
                updates.push({ _id: storedItem.id, "system.parent_id": "0" });
            }
        }

        if (weapon.system.parent_id !== item.id) {
            updates.push({ _id: weapon.id, "system.parent_id": item.id });
        }

        if (updates.length > 0) {
            await actor.updateEmbeddedDocuments("Item", updates);
        }

        await item.setFlag(FLAG_SCOPE, FLAG_KEY, {
            daggerId: weapon.id,
            hand: hand
        });

        const handStr = hand === "main" ? dict.mainHand : dict.offHand;
        ui.notifications.info(dict.success(weapon.name, handStr));
        this.render();
    }
}

new ContainerApp().render(true);
