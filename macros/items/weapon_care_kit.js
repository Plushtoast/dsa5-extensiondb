// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
    de: {
        desc: "Mit einem Waffenpflegeset kann ein Held die erste Stufe Beschädigung einer Waffe aufheben. Er muss dazu eine Probe auf das Herstellungstalent ablegen.",
        metalworking: "Metallbearbeitung",
        woodworking: "Holzbearbeitung",
        title: "Waffenpflegeset",
        noWeapons: "Keine reparierbaren Waffen gefunden.",
        selectWeapon: "Bitte wähle zuerst eine Waffe aus.",
        success: (name) => `${name} wurde erfolgreich repariert!`,
        fail: (name) => `Die Reparatur von ${name} ist fehlgeschlagen.`,
        noActor: "Kein Actor gefunden.",
        noSkill: (name) => `Talent "${name}" nicht gefunden.`
    },
    en: {
        desc: "With a weapon care kit, you can remove the first level of damage. You must make a crafting talent check.",
        metalworking: "Metalworking",
        woodworking: "Woodworking",
        title: "Weapon Care Kit",
        noWeapons: "No repairable weapons found.",
        selectWeapon: "Please select a weapon first.",
        success: (name) => `${name} was successfully repaired!`,
        fail: (name) => `Repair of ${name} failed.`,
        noActor: "No actor found.",
        noSkill: (name) => `Skill "${name}" not found.`
    }
}[lang];

if (!actor) return ui.notifications.warn(dict.noActor);

class WeaponCareApp extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "weapon-care-app",
        classes: ["dsa5"],
        window: { title: dict.title, resizable: true },
        position: { width: 420, height: "auto" },
        actions: {
            selectWeapon: function(event, target) { this._onSelectWeapon(event, target); },
            repair: function(event, target) { this._onRepair(event, target); }
        }
    };

    constructor(options) {
        super(options);
        this.selectedWeaponId = null;

        const styleId = "weapon-care-styles";
        if (!document.getElementById(styleId)) {
            document.head.insertAdjacentHTML("beforeend", `
                <style id="${styleId}">
                    #dsa-weapon-care-container .weapon-care-item { 
                        display: flex; align-items: center; padding: 5px; cursor: pointer; 
                        border-bottom: 1px solid var(--color-border-light-2); 
                        transition: background 0.2s, max-height 0.4s ease, opacity 0.4s ease, padding 0.4s ease; 
                        max-height: 50px;
                        opacity: 1;
                        overflow: hidden;
                    }
                    #dsa-weapon-care-container .weapon-care-item:hover { background: rgba(0,0,0,0.05); }
                    #dsa-weapon-care-container .weapon-care-item.selected { 
                        background: rgba(147, 123, 72, 0.3) !important; 
                        font-weight: bold; 
                    }
                    /* Animations-Klasse für das erfolgreiche Reparieren */
                    #dsa-weapon-care-container .weapon-care-item.repaired-anim {
                        max-height: 0px;
                        opacity: 0;
                        padding-top: 0;
                        padding-bottom: 0;
                        border-bottom: none;
                    }
                    #dsa-weapon-care-container .weapon-care-list { 
                        border: 1px solid var(--color-border-dark); border-radius: 5px; padding: 5px; 
                        max-height: 200px; overflow-y: auto; background: var(--color-bg-light); margin-top: 10px; 
                    }
                    #dsa-weapon-care-container .care-action-btn { flex: 1; }
                </style>
            `);
        }
    }

    async _prepareContext() {
        const eligibleWeapons = actor.items.filter(i => {
            if (!["meleeweapon", "rangeweapon"].includes(i.type)) return false;
            const max = foundry.utils.getProperty(i, "system.structure.max");
            const val = foundry.utils.getProperty(i, "system.structure.value");
            if (!max || max <= 0 || val === undefined) return false;
            const ratio = val / max;
            if (ratio >= 1.0) return false;
            return max <= 4 ? ratio > 0.65 : ratio >= 0.8;
        });

        return { weapons: eligibleWeapons, hasWeapons: eligibleWeapons.length > 0 };
    }

    async _renderHTML(context, options) {
        if (!context.hasWeapons) {
            return `<div id="dsa-weapon-care-container" style="padding: 10px; text-align: center; font-style: italic;">${dict.noWeapons}</div>`;
        }

        const weaponHtml = context.weapons.map(w => {
            const isSelected = this.selectedWeaponId === w.id;
            return `
            <div class="weapon-care-item ${isSelected ? 'selected' : ''}" data-action="selectWeapon" data-id="${w.id}">
                <img src="${w.img}" width="30" height="30" style="min-width: 30px; margin-right: 10px; border: 1px solid #777; border-radius: 3px;" />
                <span class="weapon-name" style="flex-grow: 1;">${w.name}</span>
            </div>`;
        }).join("");

        return `
            <div id="dsa-weapon-care-container">
                <div style="margin-bottom: 10px; font-style: italic;">${dict.desc}</div>
                <div class="weapon-care-list">
                    ${weaponHtml}
                </div>
                <div style="display: flex; gap: 5px; margin-top: 15px;">
                    <button class="care-action-btn dsa5 button" data-action="repair" data-skill="${dict.metalworking}" ${!this.selectedWeaponId ? 'disabled' : ''}>
                        <i class="fas fa-hammer"></i> ${dict.metalworking}
                    </button>
                    <button class="care-action-btn dsa5 button" data-action="repair" data-skill="${dict.woodworking}" ${!this.selectedWeaponId ? 'disabled' : ''}>
                        <i class="fas fa-tree"></i> ${dict.woodworking}
                    </button>
                </div>
            </div>
        `;
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
    }

    _onSelectWeapon(event, target) {
        const id = target.dataset.id;
        this.selectedWeaponId = (this.selectedWeaponId === id) ? null : id;
        this.render(); 
    }

    async _onRepair(event, target) {
        target.disabled = true; 
        await this.executeRepair(target.dataset.skill);
    }

    async executeRepair(skillName) {
        if (!this.selectedWeaponId) return ui.notifications.warn(dict.selectWeapon);

        const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
        if (!skill) return ui.notifications.error(dict.noSkill(skillName));

        try {
            const tokenId = actor.getActiveTokens()[0]?.id || "";
            const setupData = await actor.setupSkill(skill.toObject(), {}, tokenId);
            
            const testResult = await actor.basicTest(setupData);
            const successLevel = testResult?.result?.successLevel ?? 0;
            
            const weapon = actor.items.get(this.selectedWeaponId);
            if (!weapon) return;

            if (successLevel > 0) {
                await actor.updateEmbeddedDocuments("Item", [{
                    _id: weapon.id,
                    "system.structure.value": weapon.system.structure.max
                }]);
                
                ui.notifications.info(dict.success(weapon.name));
                
                const itemElement = this.element.querySelector(`.weapon-care-item[data-id="${weapon.id}"]`);
                if (itemElement) {
                    itemElement.classList.add("repaired-anim");
                    
                    setTimeout(() => {
                        this.selectedWeaponId = null;
                        this.render(); 
                    }, 400);
                } else {
                    this.selectedWeaponId = null;
                    this.render();
                }

            } else {
                ui.notifications.warn(dict.fail(weapon.name));
            }
        } catch (err) {
            console.warn("Waffenpflege: Fehler bei der Probe.", err);
        }
    }
}

new WeaponCareApp().render(true);
