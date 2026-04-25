function checkPraxisApplied(dialogElement) {
    const element = dialogElement[0] || dialogElement;
    const options = element.querySelectorAll('select[name="situationalModifiers"] option');
    return Array.from(options).some(opt => opt.textContent.includes("Praxisbezug"));
}

function injectSituationalModifierField(targetDialog, value, tooltip, displayLabel) {
    const parentElement = targetDialog.element[0] || targetDialog.element;
    let modifierContainer = parentElement.querySelector('.modifiers');

    if (!modifierContainer) {
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
        
        parentElement.querySelector('.talent-test-modifier')?.insertAdjacentHTML('beforeend', fieldHtml);
        
        modifierContainer = parentElement.querySelector('.modifiers');
    } else {
        const select = modifierContainer.querySelector('select[name="situationalModifiers"]');
        
        Array.from(select.options).forEach(opt => {
            if (opt.textContent.includes("Praxisbezug")) opt.remove();
        });
        
        select.insertAdjacentHTML('beforeend', `<option value="${value}" selected data-tooltip="${tooltip}" data-type="TPM">${displayLabel}</option>`);
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

const PRAXIS_TEMPLATE_STRING = `
<div id="praxis-wrapper">
    {{#if rolled}}
        <div class="center marginBottom">
            <p>{{{instruction}}}</p>
        </div>
        
        <div class="row-section marginBottom praxis-distribution-row">
            {{#each distribution}}
            <div class="columnFlex center praxis-attribute-col">
                <b>{{this.label}}</b>
                <a data-action="adjustPraxis" data-idx="{{this.idx}}" data-delta="1"><i class="fas fa-chevron-up"></i></a>
                <input type="number" class="input-text praxis-input-small" value="{{this.value}}" readonly>
                <a data-action="adjustPraxis" data-idx="{{this.idx}}" data-delta="-1"><i class="fas fa-chevron-down"></i></a>
            </div>
            {{/each}}
        </div>
        <hr>
        <div class="row-section gap5px">
            <button type="button" data-action="confirmPraxis" class="col two dsa5 button"><i class="fas fa-check"></i> {{localize "LOCAL.confirm"}}</button>
            <button type="button" data-action="cancelPraxis" class="col two dsa5 button"><i class="fas fa-times"></i> {{localize "LOCAL.cancel"}}</button>
        </div>
    {{else}}
        <p class="center marginBottom">{{description}}</p>
        
        <div class="row-section gap5px wrap">
            {{#each skills}}
            <button type="button" data-action="rollKnowledge" data-id="{{this.id}}" class="col two dsa5 button" style="margin-bottom: 5px;">{{this.name}}</button>
            {{/each}}
        </div>
    {{/if}}
</div>
`;

const { ApplicationV2 } = foundry.applications.api;

class PracticalApplicationApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "praxisbezug-app",
        classes: ["dsa5", "praxis-window"],
        window: {
            resizable: true 
        },
        position: {
            width: 500,
            height: "auto"
        },

        actions: {
            rollKnowledge: function(event, target) { this._onRollKnowledge(event, target); },
            adjustPraxis: function(event, target) { this._onAdjustPraxis(event, target); },
            confirmPraxis: function() { this._onConfirmPraxis(); },
            cancelPraxis: function() { this.close(); }
        }
    };

    constructor(actor, parentDialog, parentTestData, options) {
        super(options);
        this.dsaActor = actor;
        this.parentDialog = parentDialog;
        this.parentTestData = parentTestData;
        
        this.qs = 0;
        this.rolled = false;
        this.distributionData = [0, 0, 0];
    }

    get title() {
        return game.i18n.localize("LOCAL.PraxisbezugTitle");
    }

    async _renderHTML(context, options) {
        const template = Handlebars.compile(PRAXIS_TEMPLATE_STRING);
        return template(context);
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
    }

    async _prepareContext(options) {
        if (this.rolled) {
            const source = this.parentTestData.source;
            const attrs = [source.system.characteristic1.value, source.system.characteristic2.value, source.system.characteristic3.value];
            
            const distribution = attrs.map((attr, idx) => ({
                idx: idx,
                label: game.i18n.localize(`CHARAbbrev.${attr.toUpperCase()}`),
                value: this.distributionData[idx]
            }));

            return {
                rolled: true,
                qs: this.qs,
                instruction: game.i18n.format("LOCAL.PraxisbezugInstruction", {qs: this.qs}),
                distribution: distribution
            };
        } else {
            const skills = this.dsaActor.items
                .filter(i => i.type === "skill" && i.system.group?.value === "knowledge")
                .sort((a, b) => a.name.localeCompare(b.name));
            
            return {
                rolled: false,
                description: game.i18n.localize("LOCAL.PraxisbezugDescription"),
                skills: skills.map(s => ({ id: s.id, name: s.name }))
            };
        }
    }


    async _onRollKnowledge(event, target) {
        const skillId = target.dataset.id;
        const skill = this.dsaActor.items.get(skillId);
        
        Hooks.once("postProcessDSARoll", (chatOptions, testData) => {
            if (testData.successLevel > 0) {
                this.qs = testData.qualityStep || 0;
                this.rolled = true;
                this.render();
            }
        });
        
        this.dsaActor.setupSkill(skill, {}, "roll").then(setupData => { 
            if(setupData) this.dsaActor.basicTest(setupData); 
        });
    }

    _onAdjustPraxis(event, target) {
        const idx = parseInt(target.dataset.idx);
        const delta = parseInt(target.dataset.delta);
        
        let newVal = Math.clamp(this.distributionData[idx] + delta, 0, 2);
        let totalUsed = this.distributionData.reduce((a, b) => a + b, 0) - this.distributionData[idx];
        
        if (totalUsed + newVal <= this.qs || delta < 0) {
            this.distributionData[idx] = newVal;
            this.render();
        }
    }

    _onConfirmPraxis() {
        const tpm = `${this.distributionData[0]}|${this.distributionData[1]}|${this.distributionData[2]}`;
        const label = `Praxisbezug [${tpm} TPM]`;
        const tt = `Praxisbezug<br>Teilprobenmodifikator: ${tpm}<br>Quelle: Sonderfertigkeit`;
        
        injectSituationalModifierField(this.parentDialog, tpm, tt, label);
        this.close(); 
    }
}

Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    const { actor, source, testData, dialog } = dialogState;
    if (!source) return;
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
                new PracticalApplicationApp(actor, dialog, testData).render(true);
            }
        });
    }
});
