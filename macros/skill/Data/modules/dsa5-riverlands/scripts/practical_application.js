// Hilfsfunktion: Modifikator-Check (Damit nichts doppelt erscheint)
function checkPraxisApplied(dialogHtml) {
    return $(dialogHtml).find('select[name="situationalModifiers"] option').filter(function() {
        return $(this).text().includes("Praxisbezug");
    }).length > 0;
}

// Hilfsfunktion: Die robuste Injektion (Damit es interaktiv bleibt)
function injectSituationalModifierField(targetDialog, value, tooltip, displayLabel) {
    const html = $(targetDialog.element);
    let select = html.find('select[name="situationalModifiers"]');

    if (select.length === 0) {
        const localizedLabel = game.i18n.localize("situationalModifiers");
        const finalLabel = (localizedLabel === "situationalModifiers") ? "Bedingte Modifikatoren" : localizedLabel;

        const fieldHtml = `
            <div class="modifiers form-group" style="flex-grow: 1;">
                <label>${finalLabel}</label>
                <div class="form-fields height100">
                    <select name="situationalModifiers" multiple="" class="height100">
                        <option value="${value}" selected data-tooltip="${tooltip}" data-type="TPM">${displayLabel}</option>
                    </select>
                </div>
            </div>
        `;
        
        const visionField = html.find('select[name="vision"]').closest('.form-group');
        if (visionField.length > 0) visionField.before(fieldHtml);
        else html.find('.talent-test-modifier').append(fieldHtml);
        
        select = html.find('select[name="situationalModifiers"]');
    } else {
        select.find('option').filter((i, el) => $(el).text().includes("Praxisbezug")).remove();
        select.append(`<option value="${value}" selected data-tooltip="${tooltip}" data-type="TPM">${displayLabel}</option>`);
    }

    // Toggle-Verhalten wie im System
    select.off('mousedown', 'option').on('mousedown', 'option', function(ev) {
        ev.preventDefault();
        $(this).prop('selected', !$(this).prop('selected'));
        if (typeof targetDialog.rememberFormData === "function") {
            targetDialog.rememberFormData(ev);
        } else {
            html.find('form').trigger('change');
        }
        return false;
    });

    // Berechnung im Hauptfenster sofort auslösen
    if (typeof targetDialog.rememberFormData === "function") {
        targetDialog.rememberFormData();
    }
}

class PracticalApplicationDialog extends Dialog {
    constructor(actor, parentDialog, parentTestData) {
        super({
            title: game.i18n.localize('LOCAL.PraxisbezugTitle'),
            content: `<div id="praxis-wrapper"></div>`,
            buttons: {}
        });
        this.actor = actor;
        this.parentDialog = parentDialog;
        this.parentTestData = parentTestData;
        this.qs = 0;
        this.rolled = false;
        this.distributionData = [0, 0, 0];
        this.updateContent();
    }

    updateContent() {
        this.data.content = `<div id="praxis-wrapper">${this.rolled ? this._getDistributionHTML() : this._getInitialHTML()}</div>`;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 500,
            classes: ["dsa5", "dialog", "praxis-window"],
            resizable: true
        });
    }

    _getInitialHTML() {
        let html = `<p>${game.i18n.localize("LOCAL.PraxisbezugDescription")}</p><hr>`;
        html += `<div class="form-group knowledge-buttons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">`;
        const skills = this.actor.items.filter(i => i.type === "skill" && i.system.group?.value === "knowledge").sort((a, b) => a.name.localeCompare(b.name));
        for (let skill of skills) {
            html += `<button class="knowledge-roll-btn dsa5 button" data-id="${skill.id}">${skill.name}</button>`;
        }
        html += `</div>`;
        return html;
    }

    _getDistributionHTML() {
        const source = this.parentTestData.source;
        const attrs = [source.system.characteristic1.value, source.system.characteristic2.value, source.system.characteristic3.value];
        let html = `<div style="text-align: center; margin-bottom: 10px;"><p>${game.i18n.format("LOCAL.PraxisbezugInstruction", {qs: this.qs})}</p></div>`;
        html += `<div style="display: flex; justify-content: space-around; margin: 15px 0;">`;
        attrs.forEach((attr, idx) => {
            const label = game.i18n.localize(`CHARAbbrev.${attr.toUpperCase()}`);
            html += `<div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                <label style="font-weight: bold;">${label}</label>
                <a class="praxis-control" data-idx="${idx}" data-delta="1" style="cursor:pointer;"><i class="fas fa-chevron-up"></i></a>
                <input type="number" class="praxis-input" data-idx="${idx}" value="${this.distributionData[idx]}" readonly style="width: 45px; text-align: center; height: 30px; border: 1px solid #7a7971;">
                <a class="praxis-control" data-idx="${idx}" data-delta="-1" style="cursor:pointer;"><i class="fas fa-chevron-down"></i></a>
            </div>`;
        });
        html += `</div><hr><div style="display: flex; gap: 5px;">
            <button class="confirm-praxis dsa5 button" style="flex:1"><i class="fas fa-check"></i> ${game.i18n.localize("LOCAL.confirm")}</button>
            <button class="cancel-praxis dsa5 button" style="flex:1"><i class="fas fa-times"></i> ${game.i18n.localize("LOCAL.cancel")}</button>
        </div>`;
        return html;
    }

    activateListeners(html) {
        super.activateListeners(html);

        if (!this.rolled) {
            html.find('.knowledge-roll-btn').click(async (ev) => {
                const skillId = ev.currentTarget.dataset.id;
                const skill = this.actor.items.get(skillId);
                
                Hooks.once("postProcessDSARoll", (chatOptions, testData) => {
                    if (testData.successLevel > 0) {
                        this.qs = testData.qualityStep || 0;
                        this.rolled = true;
                        this.updateContent();
                        this.render(true);
                    }
                });
                
                this.actor.setupSkill(skill, {}, "roll").then(setupData => { if(setupData) this.actor.basicTest(setupData); });
            });
        } else {
            html.find('.praxis-control').click((ev) => {
                const idx = $(ev.currentTarget).data('idx');
                const delta = $(ev.currentTarget).data('delta');
                let newVal = Math.clamp(this.distributionData[idx] + delta, 0, 2);
                let totalUsed = this.distributionData.reduce((a, b) => a + b, 0) - this.distributionData[idx];
                if (totalUsed + newVal <= this.qs || delta < 0) {
                    this.distributionData[idx] = newVal;
                    this.updateContent();
                    this.render(true);
                }
            });

            html.find('.confirm-praxis').click(() => {
                const tpm = `${this.distributionData[0]}|${this.distributionData[1]}|${this.distributionData[2]}`;
                const label = `Praxisbezug [${tpm} TPM]`;
                const tt = `Praxisbezug<br>Teilprobenmodifikator: ${tpm}<br>Quelle: Sonderfertigkeit`;
                
                injectSituationalModifierField(this.parentDialog, tpm, tt, label);
                this.close(); 
            });

            html.find('.cancel-praxis').click(() => this.close());
        }
    }
}

Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    const { actor, source, testData, dialog } = dialogState;
    if (source.system?.group?.value === 'knowledge' || source.type !== "skill") return;
    
    const sfName = game.i18n.localize('LOCAL.praxisbezugAbility');
    if (actor.items.some(i => i.type === "specialability" && i.name.includes(sfName))) {
        menuItems.push({
            name: sfName,
            icon: '<i class="fas fa-lightbulb"></i>',
            callback: () => {
                if (checkPraxisApplied(dialog.element)) {
                    ui.notifications.warn(game.i18n.localize("LOCAL.PraxisbezugAlreadyApplied"));
                    return;
                }
                new PracticalApplicationDialog(actor, dialog, testData).render(true);
            }
        });
    }
});
