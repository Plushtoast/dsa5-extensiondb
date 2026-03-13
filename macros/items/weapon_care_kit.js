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
        window: { title: dict.title },
        position: { width: 420, height: "auto" }
    };

    selectedWeaponId = null;

    _prepareContext() {
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
            return `<div style="padding: 10px; text-align: center; font-style: italic;">${dict.noWeapons}</div>`;
        }

        const weaponHtml = context.weapons.map(w => `
            <div class="weapon-care-item" data-id="${w.id}" style="display: flex; align-items: center; padding: 5px; cursor: pointer; border-bottom: 1px solid var(--color-border-light-2); transition: background 0.2s;">
                <img src="${w.img}" width="30" height="30" style="min-width: 30px; margin-right: 10px; border: none; border-radius: 3px;" />
                <span class="weapon-name" style="flex-grow: 1;">${w.name}</span>
            </div>
        `).join("");

        return `
            <div style="margin-bottom: 10px; font-style: italic;">${dict.desc}</div>
            <div class="weapon-care-list" style="border: 1px solid var(--color-border-dark); border-radius: 5px; padding: 5px; max-height: 200px; overflow-y: auto; background: var(--color-bg-light); margin-top: 10px;">
                ${weaponHtml}
            </div>
            <div style="display: flex; gap: 5px; margin-top: 15px;">
                <button class="care-action-btn" data-skill="${dict.metalworking}" style="flex: 1; cursor: pointer;" disabled>
                    <i class="fas fa-gavel"></i> ${dict.metalworking}
                </button>
                <button class="care-action-btn" data-skill="${dict.woodworking}" style="flex: 1; cursor: pointer;" disabled>
                    <i class="fas fa-tree"></i> ${dict.woodworking}
                </button>
            </div>
        `;
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
    }

    _onRender(context, options) {
        const html = this.element;
        const items = html.querySelectorAll('.weapon-care-item');
        const buttons = html.querySelectorAll('.care-action-btn');

        items.forEach(item => {
            const id = item.dataset.id;

            item.addEventListener('mouseenter', () => {
                if (this.selectedWeaponId !== id) item.style.background = 'rgba(0,0,0,0.05)';
            });
            item.addEventListener('mouseleave', () => {
                if (this.selectedWeaponId !== id) item.style.background = 'transparent';
            });

            item.addEventListener('click', () => {
                items.forEach(i => {
                    i.style.background = 'transparent';
                    i.style.fontWeight = 'normal';
                    i.style.borderLeft = 'none';
                });

                if (this.selectedWeaponId === id) {
                    this.selectedWeaponId = null;
                    buttons.forEach(b => b.disabled = true);
                } else {
                    item.style.background = 'rgba(147, 123, 72, 0.3)';
                    item.style.fontWeight = 'bold';
                    item.style.borderLeft = '3px solid #937b48';
                    this.selectedWeaponId = id;
                    buttons.forEach(b => b.disabled = false);
                }
            });

            item.addEventListener('contextmenu', (ev) => {
                ev.preventDefault();
                if (this.selectedWeaponId === id) {
                    item.style.background = 'transparent';
                    item.style.fontWeight = 'normal';
                    item.style.borderLeft = 'none';
                    this.selectedWeaponId = null;
                    buttons.forEach(b => b.disabled = true);
                }
            });
        });

        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                buttons.forEach(b => b.disabled = true); 
                await this.executeRepair(btn.dataset.skill);
                if (this.selectedWeaponId) buttons.forEach(b => b.disabled = false); 
            });
        });
    }

    async executeRepair(skillName) {
        if (!this.selectedWeaponId) return ui.notifications.warn(dict.selectWeapon);

        const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
        if (!skill) return ui.notifications.error(dict.noSkill(skillName));

        try {
            const setupData = await actor.setupSkill(skill.toObject(), {}, "xyz");
            const testResult = await actor.basicTest(setupData);
            const successLevel = testResult?.result?.successLevel ?? 0;
            
            const currentActor = fromUuidSync(actor.uuid);
            if (!currentActor) return;

            const weapon = currentActor.items.get(this.selectedWeaponId);
            if (!weapon) return;

            if (successLevel > 0) {
                await currentActor.updateEmbeddedDocuments("Item", [{
                    _id: weapon.id,
                    "system.structure.value": weapon.system.structure.max
                }]);
                
                ui.notifications.info(dict.success(weapon.name));
                
                this.selectedWeaponId = null;
                this.render({ force: true }); 
            } else {
                ui.notifications.warn(dict.fail(weapon.name));
            }
        } catch (err) {
        }
    }
}

new WeaponCareApp().render(true);
