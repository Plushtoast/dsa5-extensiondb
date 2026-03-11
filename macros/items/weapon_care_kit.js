// This is a system macro used for automation. It is disfunctional without the proper context.


const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
    de: {
        desc: "Mit einem Waffenpflegeset kann ein Held die erste Stufe Beschädigung einer Waffe aufheben. Er muss dazu nicht die Fähigkeit besitzen, die Waffe herstellen zu können, aber er muss eine Probe auf das Herstellungstalent, beispielsweise Metall- oder Holzbearbeitung, ablegen.<br><br>Gelingt die Probe, so wird die Beschädigungsstufe aufgehoben. Sollte die Waffe mehr als nur 1 Stufe Beschädigung aufweisen, kann der Held nicht von der Wirkung des Waffenpflegesets profitieren.",
        metalworking: "Metallbearbeitung",
        woodworking: "Holzbearbeitung",
        title: "Waffenpflegeset",
        noWeapons: "Du hast keine Waffen im Inventar, die für eine Reparatur in Frage kommen.",
        selectWeapon: "Bitte wähle zuerst eine Waffe aus der Liste aus.",
        success: (name) => `${name} wurde erfolgreich repariert!`,
        fail: (name) => `Die Reparatur von ${name} ist fehlgeschlagen.`,
        noActor: "Kein Actor gefunden.",
        noSkill: (name) => `Talent "${name}" nicht beim Charakter gefunden.`
    },
    en: {
        desc: "With a weapon care kit, a hero can remove the first level of damage to a weapon. They do not need to possess the ability to forge the weapon, but they must make a check on the crafting talent, for example Metalworking or Woodworking.<br><br>If the check succeeds, the damage level is removed. If the weapon has more than 1 level of damage, the hero cannot benefit from the weapon care kit.",
        metalworking: "Metalworking",
        woodworking: "Woodworking",
        title: "Weapon Care Kit",
        noWeapons: "You have no weapons in your inventory eligible for repair.",
        selectWeapon: "Please select a weapon from the list first.",
        success: (name) => `${name} was successfully repaired!`,
        fail: (name) => `The repair of ${name} failed.`,
        noActor: "No actor found.",
        noSkill: (name) => `Skill "${name}" not found on the character.`
    }
}[lang];

if (!actor) {
    ui.notifications.warn(dict.noActor);
    return;
}

// Finde alle Nahkampf- und Fernkampfwaffen, die exakt in die erste Beschädigungsstufe fallen
const eligibleWeapons = actor.items.filter(i => {
    if (!["meleeweapon", "rangeweapon"].includes(i.type)) return false;
    
    const max = foundry.utils.getProperty(i, "system.structure.max");
    const val = foundry.utils.getProperty(i, "system.structure.value");
    
    if (!max || max <= 0 || val === undefined) return false;
    
    const ratio = val / max;
    
    // Komplett intakte Waffen ignorieren
    if (ratio >= 1.0) return false;
    
    // Logik basierend auf maximalen Strukturpunkten
    if (max <= 4) {
        return ratio > 0.65;
    } else {
        return ratio >= 0.8;
    }
});

if (eligibleWeapons.length === 0) {
    ui.notifications.info(dict.noWeapons);
    return;
}

let selectedWeaponId = null;

let weaponHtml = eligibleWeapons.map(w => `
    <div class="weapon-care-item" data-id="${w.id}">
        <img src="${w.img}" />
        <span class="weapon-name">${w.name}</span>
    </div>
`).join("");

const content = `
    <style>
        .weapon-care-list { 
            border: 1px solid var(--color-border-dark); 
            border-radius: 5px; 
            padding: 5px; 
            max-height: 200px; 
            overflow-y: auto; 
            margin-top: 10px; 
            background: var(--color-bg-light); 
        }
        .weapon-care-item { 
            display: flex; 
            align-items: center; 
            padding: 5px; 
            cursor: pointer; 
            transition: background 0.2s; 
            border-bottom: 1px solid var(--color-border-light-2); 
        }
        .weapon-care-item:last-child { border-bottom: none; }
        .weapon-care-item:hover { background: rgba(0, 0, 0, 0.05); }
        .weapon-care-item.selected { 
            background: rgba(147, 123, 72, 0.3); 
            font-weight: bold; 
            border-left: 3px solid #937b48; 
        }
        .weapon-care-item img { 
            width: 30px; 
            height: 30px; 
            margin-right: 10px; 
            border: none; 
            border-radius: 3px;
        }
        .weapon-care-item .weapon-name { flex-grow: 1; }
        .custom-dialog-buttons {
            display: flex;
            gap: 5px;
            margin-top: 15px;
        }
        .custom-dialog-buttons button {
            flex: 1;
            cursor: pointer;
        }
    </style>
    <div style="margin-bottom: 10px; font-style: italic;">
        ${dict.desc}
    </div>
    <div class="weapon-care-list">
        ${weaponHtml}
    </div>
    <div class="custom-dialog-buttons">
        <button class="care-action-btn" data-skill="${dict.metalworking}">
            <i class="fas fa-gavel"></i> ${dict.metalworking}
        </button>
        <button class="care-action-btn" data-skill="${dict.woodworking}">
            <i class="fas fa-tree"></i> ${dict.woodworking}
        </button>
    </div>
`;

let weaponCareDialog = new Dialog({
    title: dict.title,
    content: content,
    buttons: {}, 
    render: html => {
        html.find('.weapon-care-item').click(ev => {
            const target = $(ev.currentTarget);
            const id = target.data('id');
            
            if (selectedWeaponId === id) {
                target.removeClass('selected');
                selectedWeaponId = null;
            } else {
                html.find('.weapon-care-item').removeClass('selected');
                target.addClass('selected');
                selectedWeaponId = id;
            }
        });

        html.find('.weapon-care-item').contextmenu(ev => {
            const target = $(ev.currentTarget);
            const id = target.data('id');
            
            if (selectedWeaponId === id) {
                target.removeClass('selected');
                selectedWeaponId = null;
            }
        });

        html.find('.care-action-btn').click(async ev => {
            const skillName = $(ev.currentTarget).data('skill');
            
            if (!selectedWeaponId) {
                ui.notifications.warn(dict.selectWeapon);
                return;
            }

            const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);

            if (!skill) {
                ui.notifications.error(dict.noSkill(skillName));
                return;
            }

            try {
                const setupData = await actor.setupSkill(skill.toObject(), {}, "xyz");
                const testResult = await actor.basicTest(setupData);
                const successLevel = testResult?.result?.successLevel ?? 0;
                
                const weapon = actor.items.get(selectedWeaponId);
                if (!weapon) return;

                if (successLevel > 0) {
                    await weapon.update({ "system.structure.value": weapon.system.structure.max });
                    ui.notifications.info(dict.success(weapon.name));
                    
                    // Waffe optisch ausblenden, abwählen und Fensterhöhe anpassen
                    html.find(`.weapon-care-item[data-id="${selectedWeaponId}"]`).slideUp(300, function() {
                        $(this).remove();
                        if (html.find('.weapon-care-item').length === 0) {
                            html.find('.weapon-care-list').html(`<div style="padding: 10px; text-align: center; color: #666;">${dict.noWeapons}</div>`);
                        }
                        weaponCareDialog.setPosition({ height: "auto" });
                    });
                    selectedWeaponId = null;
                    
                } else {
                    ui.notifications.warn(dict.fail(weapon.name));
                }
            } catch (err) {
                console.log("Waffenpflege-Probe abgebrochen.");
            }
        });
    }
});

weaponCareDialog.render(true);
