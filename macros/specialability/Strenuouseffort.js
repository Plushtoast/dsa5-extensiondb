function checkEffortModifierApplied(dialogElement, searchString) {
    const element = dialogElement[0] || dialogElement;
    const options = element.querySelectorAll('select[name="situationalModifiers"] option');
    return Array.from(options).some(opt => opt.textContent.includes(searchString));
}

function injectEffortModifier(targetDialog, value, tooltip, displayLabel) {
    const parentElement = targetDialog.element[0] || targetDialog.element;
    let modifierContainer = parentElement.querySelector('.modifiers');

    if (!modifierContainer) {
        const systemLabel = game.i18n.localize("DIALOG.SituationalModifiers");
        const finalLabel = systemLabel !== "DIALOG.SituationalModifiers" 
            ? systemLabel 
            : (game.i18n.lang === "de" ? "Bedingte Modifikatoren" : "Situational Modifiers");

        const fieldHtml = `
            <div class="modifiers form-group" style="flex-grow: 1;">
                <label>${finalLabel}</label>
                <div class="form-fields height100">
                    <select name="situationalModifiers" multiple="" class="height100">
                        <option value="${value}" selected data-tooltip="${tooltip}">${displayLabel}</option>
                    </select>
                </div>
            </div>
        `;
        
        const visionField = parentElement.querySelector('select[name="vision"]')?.closest('.form-group');
        if (visionField) {
            visionField.insertAdjacentHTML('beforebegin', fieldHtml);
        } else {
            parentElement.querySelector('.talent-test-modifier')?.insertAdjacentHTML('beforeend', fieldHtml);
        }
        
        modifierContainer = parentElement.querySelector('.modifiers');
    } else {
        const select = modifierContainer.querySelector('select[name="situationalModifiers"]');
        const exists = Array.from(select.options).some(opt => opt.textContent.includes(displayLabel));
        if (!exists) {
            select.insertAdjacentHTML('beforeend', `<option value="${value}" selected data-tooltip="${tooltip}">${displayLabel}</option>`);
        }
    }

    const select = modifierContainer.querySelector('select[name="situationalModifiers"]');

    select.addEventListener('mousedown', function(ev) {
        if (ev.target.tagName === 'OPTION') {
            ev.preventDefault();
            ev.target.selected = !ev.target.selected;
            if (typeof targetDialog.rememberFormData === "function") {
                targetDialog.rememberFormData(ev);
            } else {
                const form = parentElement.querySelector('form');
                if (form) form.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });

    if (typeof targetDialog.rememberFormData === "function") targetDialog.rememberFormData();
}

Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    const { source, dialog, actor } = dialogState; 
    
    if (source?.type !== "skill") return;
    if (!actor) return; 

    const featName = game.i18n.localize("LocalizedIDs.featOfStrength");
    if (source.name !== featName) return;

    const sfName = game.i18n.localize("FEAT_EFFORT.menuLabel");
    const hasEffortSF = actor.items.find(x => x.type === "specialability" && x.name === sfName);

    if (!hasEffortSF) return; 

    const parentDialog = dialog;

    menuItems.push({
        name: sfName,
        icon: '<i class="fa-solid fa-weight-hanging margin-right"></i>',
        callback: async () => {
            const modifierLabel = game.i18n.localize("FEAT_EFFORT.modifierLabel");
            
            if (checkEffortModifierApplied(parentDialog.element, modifierLabel)) {
                ui.notifications.warn(game.i18n.localize("FEAT_EFFORT.alreadyApplied"));
                return;
            }

            const tooltip = game.i18n.localize("FEAT_EFFORT.tooltip");
            injectEffortModifier(parentDialog, "4", tooltip, `${modifierLabel} [4]`);
        }
    });
});

Hooks.on("postProcessDSARoll", async (chatOptions, testData, rerenderMessage, hideDamage) => {
    const preData = testData.preData;
    if (!preData) return;

    if (preData.source?.type !== "skill") return;

    const featName = game.i18n.localize("LocalizedIDs.featOfStrength");
    if (preData.source.name !== featName) return;

    const modifierLabel = game.i18n.localize("FEAT_EFFORT.modifierLabel");

    const hasModifier = preData.situationalModifiers?.some(mod => 
        mod.name?.includes(modifierLabel)
    );

    if (hasModifier) {
        const speaker = preData.extra?.speaker || chatOptions.speaker;
        let actor = game.actors.get(speaker?.actor);
        
        if (!actor && speaker?.token && canvas.ready) {
            actor = canvas.tokens.get(speaker.token)?.actor;
        }

        if (actor) {
            await actor.addCondition("stunned");
            ui.notifications.info(game.i18n.format("FEAT_EFFORT.stunAdded", { name: actor.name }));
        }
    }
});
