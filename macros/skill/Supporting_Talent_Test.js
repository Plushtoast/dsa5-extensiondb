function checkModifierApplied(dialogElement, searchString) {
    const element = dialogElement[0] || dialogElement;
    const options = element.querySelectorAll('select[name="situationalModifiers"] option');
    return Array.from(options).some(opt => opt.textContent.includes(searchString));
}

function injectSupportingModifier(targetDialog, value, tooltip, displayLabel) {
    const parentElement = targetDialog.element[0] || targetDialog.element;
    let modifierContainer = parentElement.querySelector('.modifiers');

    if (!modifierContainer) {
        const finalLabel = game.i18n.localize("situationalModifiers") === "situationalModifiers" ? "Bedingte Modifikatoren" : game.i18n.localize("situationalModifiers");

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

const SUPPORT_TEMPLATE_STRING = `
<div style="margin-bottom: 10px; font-style: italic; font-size: 0.95em; padding: 8px; background: rgba(0,0,0,0.05); line-height: 1.3;">
    {{localize "SUPPORTING_TEST.description"}}
</div>
<nav class="sheet-tabs tabs" style="display:flex; border-bottom: 1px solid #777; margin-bottom: 10px;">
    {{#each groups}}
    <a class="item {{#if this.active}}active{{/if}}" data-action="switchTab" data-tab="{{this.id}}" style="flex:1; text-align:center; padding: 5px; cursor:pointer; font-weight: {{#if this.active}}bold{{else}}normal{{/if}};">{{this.label}}</a>
    {{/each}}
</nav>
<section class="content supporting-test-content" style="max-height: 400px; overflow-y: auto; padding: 5px;">
    {{#each groups}}
    <div class="tab {{this.id}} {{#if this.active}}active{{/if}}" style="display: {{#if this.active}}block{{else}}none{{/if}};">
        <div class="form-group knowledge-buttons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
            {{#each this.talents}}
            <button type="button" class="support-roll-btn dsa5 button" data-action="rollSupport" data-id="{{this.id}}" style="font-size: 1.1em; height: auto; padding: 5px;">{{this.name}}</button>
            {{/each}}
        </div>
    </div>
    {{/each}}
</section>
`;

const { ApplicationV2 } = foundry.applications.api;

class SupportingTestApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "supporting-test-app",
        window: {
            resizable: true 
        },
        position: {
            width: 705,
            height: 575
        },
        actions: {
            switchTab: function(event, target) { this._onSwitchTab(event, target); },
            rollSupport: function(event, target) { this._onRollSupport(event, target); }
        }
    };

    constructor(actor, parentDialog, options) {
        super(options);
        this.dsaActor = actor;
        this.parentDialog = parentDialog;
        this.activeTab = "body"; 
    }

    get title() {
        return game.i18n.localize("SUPPORTING_TEST.title");
    }

    async _renderHTML(context, options) {
        const template = Handlebars.compile(SUPPORT_TEMPLATE_STRING);
        return template(context);
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
    }

    async _prepareContext(options) {
        const prepare = (l) => l.map(i => ({ id: i.id || i._id, name: i.name })).sort((a, b) => a.name.localeCompare(b.name));
        const talents = this.dsaActor.items.filter(i => i.type === "skill");
        
        return {
            groups: [
                { id: "body", label: game.i18n.localize("SKILL.body"), active: this.activeTab === "body", talents: prepare(talents.filter(i => i.system.group?.value === "body")) },
                { id: "social", label: game.i18n.localize("SKILL.social"), active: this.activeTab === "social", talents: prepare(talents.filter(i => i.system.group?.value === "social")) },
                { id: "nature", label: game.i18n.localize("SKILL.nature"), active: this.activeTab === "nature", talents: prepare(talents.filter(i => i.system.group?.value === "nature")) },
                { id: "knowledge", label: game.i18n.localize("SKILL.knowledge"), active: this.activeTab === "knowledge", talents: prepare(talents.filter(i => i.system.group?.value === "knowledge")) },
                { id: "trade", label: game.i18n.localize("SKILL.trade"), active: this.activeTab === "trade", talents: prepare(talents.filter(i => i.system.group?.value === "trade")) }
            ]
        };
    }
    
    _onSwitchTab(event, target) {
        this.activeTab = target.dataset.tab;
        this.render(); 
    }

    async _onRollSupport(event, target) {
        const skillId = target.dataset.id;
        const skill = this.dsaActor.items.get(skillId);
        
        Hooks.once("postProcessDSARoll", (chatOptions, rollData) => {
            if (rollData.successLevel > 0) {
                const label = game.i18n.localize("SUPPORTING_TEST.modifierLabel");
                const tt = `${label}<br>Modifikator: 1<br>Quelle: Unterstützung`;
                injectSupportingModifier(this.parentDialog, "1", tt, `${label} [1]`);
                ui.notifications.info(game.i18n.localize("SUPPORTING_TEST.successSuccess"));
            }
        });

        this.dsaActor.setupSkill(skill, {}, "roll").then(setupData => { 
            if(setupData) this.dsaActor.basicTest(setupData); 
        });
        
        this.close();
    }
}

Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    const { actor, source, dialog } = dialogState;
    if (source?.type !== "skill") return;

    const parentDialog = dialog;

    menuItems.push({
        name: game.i18n.localize("SUPPORTING_TEST.menuLabel"),
        icon: '<i class="fas fa-hands-helping"></i>',
        callback: async () => {
            const modifierLabel = game.i18n.localize("SUPPORTING_TEST.modifierLabel");
            
            if (checkModifierApplied(parentDialog.element, modifierLabel)) {
                ui.notifications.warn(game.i18n.localize("SUPPORTING_TEST.alreadyApplied"));
                return;
            }

            new SupportingTestApp(actor, parentDialog).render(true);
        }
    });
});
