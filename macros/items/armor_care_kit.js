// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
    de: {
        desc: "Mit einem Rüstungspflegeset kann ein Held die erste Stufe Beschädigung einer Rüstung aufheben. Er muss dazu eine Probe auf das Herstellungstalent ablegen (erschwert um die Belastung).",
        metalworking: "Metallbearbeitung",
        woodworking: "Holzbearbeitung",
        title: "Rüstungspflegeset",
        noArmors: "Keine reparierbaren Rüstungen gefunden.",
        selectArmor: "Bitte wähle zuerst eine Rüstung aus.",
        success: (name) => `${name} wurde erfolgreich repariert!`,
        fail: (name) => `Die Reparatur von ${name} ist fehlgeschlagen.`,
        noActor: "Kein Actor gefunden.",
        noSkill: (name) => `Talent "${name}" nicht gefunden.`
    },
    en: {
        desc: "With an armor care kit, you can remove the first level of damage. You must make a crafting talent check (penalized by encumbrance).",
        metalworking: "Metalworking",
        woodworking: "Woodworking",
        title: "Armor Care Kit",
        noArmors: "No repairable armors found.",
        selectArmor: "Please select an armor first.",
        success: (name) => `${name} was successfully repaired!`,
        fail: (name) => `Repair of ${name} failed.`,
        noActor: "No actor found.",
        noSkill: (name) => `Skill "${name}" not found.`
    }
}[lang];

if (!actor) return ui.notifications.warn(dict.noActor);

class ArmorCareApp extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "armor-care-app",
        classes: ["dsa5"],
        window: { title: dict.title, resizable: true },
        position: { width: 420, height: "auto" },
        actions: {
            selectArmor: function(event, target) { this._onSelectArmor(event, target); },
            repair: function(event, target) { this._onRepair(event, target); }
        }
    };

    constructor(options) {
        super(options);
        this.selectedArmorId = null;
    }

    async _prepareContext() {
        const eligibleArmors = actor.items.filter(i => {
            if (i.type !== "armor") return false;
            const max = foundry.utils.getProperty(i, "system.structure.max");
            const val = foundry.utils.getProperty(i, "system.structure.value");
            if (!max || max <= 0 || val === undefined) return false;
            const ratio = val / max;
            if (ratio >= 1.0) return false;
            return max <= 4 ? ratio > 0.65 : ratio >= 0.8;
        });

        return { armors: eligibleArmors, hasArmors: eligibleArmors.length > 0 };
    }

    async _renderHTML(context, options) {
        if (!context.hasArmors) {
            return `<div class="paddingBox center"><i>${dict.noArmors}</i></div>`;
        }

        const armorHtml = context.armors.map(a => {
            const isSelected = this.selectedArmorId === a.id;
            const enc = foundry.utils.getProperty(a, "system.encumbrance.value") || 0;
            return `
            <li>
                <label data-action="selectArmor" data-id="${a.id}">
                    <input type="radio" name="armorChoice" value="${a.id}" ${isSelected ? 'checked' : ''} />
                    <img src="${a.img}" width="40" height="40" class="dsa-card-icon-img"/>
                    <span>${a.name} (BE: ${enc})</span>
                </label>
            </li>`;
        }).join("");

        return `
            <div class="marginBottom">
                <p class="center"><i>${dict.desc}</i></p>
                
                <div class="dsa-card-list thinscroll dsa-card-scroll-box">
                    <ul>
                        ${armorHtml}
                    </ul>
                </div>

                <div class="row-section gap5px margin-top">
                    <button class="col two dsa5 button" data-action="repair" data-skill="${dict.metalworking}" ${!this.selectedArmorId ? 'disabled' : ''}>
                        <i class="fas fa-hammer"></i> ${dict.metalworking}
                    </button>
                    <button class="col two dsa5 button" data-action="repair" data-skill="${dict.woodworking}" ${!this.selectedArmorId ? 'disabled' : ''}>
                        <i class="fas fa-tree"></i> ${dict.woodworking}
                    </button>
                </div>
            </div>
        `;
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
    }

    _onSelectArmor(event, target) {
        const id = target.dataset.id;
        this.selectedArmorId = (this.selectedArmorId === id) ? null : id;
        this.render(); 
    }

    async _onRepair(event, target) {
        target.disabled = true; 
        await this.executeRepair(target.dataset.skill);
    }

    async executeRepair(skillName) {
        if (!this.selectedArmorId) return ui.notifications.warn(dict.selectArmor);

        const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
        if (!skill) return ui.notifications.error(dict.noSkill(skillName));

        try {
            const tokenId = actor.getActiveTokens()[0]?.id || "";
            const armor = actor.items.get(this.selectedArmorId);
            if (!armor) return;

            const encumbrance = foundry.utils.getProperty(armor, "system.encumbrance.value") || 0;
            const modifier = -Math.abs(encumbrance);

            const setupData = await actor.setupSkill(skill.toObject(), { modifier }, tokenId);
            
            const testResult = await actor.basicTest(setupData);
            const successLevel = testResult?.result?.successLevel ?? 0;
            
            if (successLevel > 0) {
                await actor.updateEmbeddedDocuments("Item", [{
                    _id: armor.id,
                    "system.structure.value": armor.system.structure.max
                }]);
                
                ui.notifications.info(dict.success(armor.name));
                this.selectedArmorId = null;
                
                const remainingArmors = actor.items.filter(i => {
                    if (i.type !== "armor") return false;
                    const max = foundry.utils.getProperty(i, "system.structure.max");
                    const val = foundry.utils.getProperty(i, "system.structure.value");
                    if (!max || max <= 0 || val === undefined) return false;
                    const ratio = val / max;
                    if (ratio >= 1.0) return false;
                    return max <= 4 ? ratio > 0.65 : ratio >= 0.8;
                });

                if (remainingArmors.length === 0) {
                    this.close();
                } else {
                    this.render();
                }

            } else {
                ui.notifications.warn(dict.fail(armor.name));
            }
        } catch (err) {
            console.warn("Rüstungspflege: Fehler bei der Probe.", err);
        }
    }
}

new ArmorCareApp().render(true);
