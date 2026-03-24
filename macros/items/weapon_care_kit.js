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
            return `<div class="paddingBox center"><i>${dict.noWeapons}</i></div>`;
        }

        const weaponHtml = context.weapons.map(w => {
            const isSelected = this.selectedWeaponId === w.id;
            return `
            <li>
                <label data-action="selectWeapon" data-id="${w.id}">
                    <input type="radio" name="weaponChoice" value="${w.id}" ${isSelected ? 'checked' : ''} />
                    <img src="${w.img}" width="40" height="40" style="object-fit: contain; border: none;"/>
                    <span>${w.name}</span>
                </label>
            </li>`;
        }).join("");

        return `
            <div class="marginBottom">
                <p class="center"><i>${dict.desc}</i></p>
                
                <div class="dsa-card-list thinscroll" style="max-height: 40vh; overflow-y: auto; padding-right: 5px;">
                    <ul>
                        ${weaponHtml}
                    </ul>
                </div>

                <div style="display: flex; gap: 5px; margin-top: 15px;">
                    <button class="dsa5 button" data-action="repair" data-skill="${dict.metalworking}" ${!this.selectedWeaponId ? 'disabled' : ''} style="flex: 1;">
                        <i class="fas fa-hammer"></i> ${dict.metalworking}
                    </button>
                    <button class="dsa5 button" data-action="repair" data-skill="${dict.woodworking}" ${!this.selectedWeaponId ? 'disabled' : ''} style="flex: 1;">
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
                
                this.selectedWeaponId = null;
                this.render();

            } else {
                ui.notifications.warn(dict.fail(weapon.name));
            }
        } catch (err) {
            console.warn("Waffenpflege: Fehler bei der Probe.", err);
        }
    }
}

new WeaponCareApp().render(true);
