function checkModifierApplied(dialogHtml, searchString) {
    return $(dialogHtml).find('select[name="situationalModifiers"] option').filter(function() {
        return $(this).text().includes(searchString);
    }).length > 0;
}

const SUPPORT_TEMPLATE_STRING = `
<div style="margin-bottom: 10px; font-style: italic; font-size: 0.95em; padding: 8px; border-left: 3px solid #7a7971; background: rgba(0,0,0,0.05); line-height: 1.3;">
    {{localize "SUPPORTING_TEST.description"}}
</div>
<nav class="sheet-tabs tabs" data-group="primary" style="display:flex; border-bottom: 1px solid #777; margin-bottom: 10px;">
    <a class="item active" data-tab="body" style="flex:1; text-align:center; padding: 5px; cursor:pointer;">{{localize "SUPPORTING_TEST.groups.physical"}}</a>
    <a class="item" data-tab="social" style="flex:1; text-align:center; padding: 5px; cursor:pointer;">{{localize "SUPPORTING_TEST.groups.social"}}</a>
    <a class="item" data-tab="nature" style="flex:1; text-align:center; padding: 5px; cursor:pointer;">{{localize "SUPPORTING_TEST.groups.nature"}}</a>
    <a class="item" data-tab="knowledge" style="flex:1; text-align:center; padding: 5px; cursor:pointer;">{{localize "SUPPORTING_TEST.groups.knowledge"}}</a>
    <a class="item" data-tab="trade" style="flex:1; text-align:center; padding: 5px; cursor:pointer;">{{localize "SUPPORTING_TEST.groups.trade"}}</a>
</nav>
<section class="content supporting-test-content" style="max-height: 400px; overflow-y: auto; padding: 5px;">
    {{#each groups as |talents groupName|}}
    <div class="tab {{groupName}} {{#if (eq groupName 'body')}}active{{/if}}" data-tab="{{groupName}}" style="display: {{#if (eq groupName 'body')}}block{{else}}none{{/if}};">
        <div class="form-group knowledge-buttons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
            {{#each talents}}
            <button class="support-roll-btn dsa5 button" data-id="{{this.id}}" style="font-size: 1.1em; height: auto; padding: 5px;">{{this.name}}</button>
            {{/each}}
        </div>
    </div>
    {{/each}}
</section>
`;

function injectSupportingModifier(targetDialog, value, tooltip, displayLabel) {
    const html = $(targetDialog.element);
    let modifierContainer = html.find('.modifiers');

    if (modifierContainer.length === 0) {
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
        
        const visionField = html.find('select[name="vision"]').closest('.form-group');
        if (visionField.length > 0) visionField.before(fieldHtml);
        else html.find('.talent-test-modifier').append(fieldHtml);
        
        modifierContainer = html.find('.modifiers');
    } else {
        const select = modifierContainer.find('select[name="situationalModifiers"]');
        if (select.find(`option:contains("${displayLabel}")`).length === 0) {
            select.append(`<option value="${value}" selected data-tooltip="${tooltip}">${displayLabel}</option>`);
        }
    }

    const select = modifierContainer.find('select[name="situationalModifiers"]');

    select.off('mousedown', 'option').on('mousedown', 'option', function(ev) {
        ev.preventDefault();
        const option = $(this);
        option.prop('selected', !option.prop('selected'));
        if (typeof targetDialog.rememberFormData === "function") targetDialog.rememberFormData(ev);
        else html.find('form').trigger('change');
        return false;
    });

    if (typeof targetDialog.rememberFormData === "function") targetDialog.rememberFormData();
}

Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
    const { actor, source, dialog } = dialogState;
    if (source?.type !== "skill") return;

    const parentDialog = dialog;

    menuItems.push({
        name: game.i18n.localize("SUPPORTING_TEST.menuLabel"),
        icon: '<i class="fas fa-hands-helping"></i>',
        callback: async () => {
            // Vor dem Öffnen prüfen, ob der Bonus schon im Fenster ist
            const modifierLabel = game.i18n.localize("SUPPORTING_TEST.modifierLabel");
            if (checkModifierApplied(parentDialog.element, modifierLabel)) {
                ui.notifications.warn(game.i18n.localize("SUPPORTING_TEST.alreadyApplied"));
                console.error("DEBUG | Abbruch: Unterstützung bereits vorhanden.");
                return;
            }

            const prepare = (l) => l.map(i => ({ id: i.id || i._id, name: i.name })).sort((a, b) => a.name.localeCompare(b.name));
            const talents = actor.items.filter(i => i.type === "skill");
            const groups = {
                body: prepare(talents.filter(i => i.system.group?.value === "body")),
                social: prepare(talents.filter(i => i.system.group?.value === "social")),
                nature: prepare(talents.filter(i => i.system.group?.value === "nature")),
                knowledge: prepare(talents.filter(i => i.system.group?.value === "knowledge")),
                trade: prepare(talents.filter(i => i.system.group?.value === "trade"))
            };

            new Dialog({
                title: game.i18n.localize("SUPPORTING_TEST.title"),
                content: Handlebars.compile(SUPPORT_TEMPLATE_STRING)({ groups }),
                buttons: {},
                render: (html) => {
                    html.find('.sheet-tabs .item').click(ev => {
                        const target = ev.currentTarget.dataset.tab;
                        html.find('.item').removeClass('active');
                        $(ev.currentTarget).addClass('active');
                        html.find('.tab').hide();
                        html.find(`.tab[data-tab="${target}"]`).show();
                    });

                    html.find('.support-roll-btn').click(async (ev) => {
                        const skillId = ev.currentTarget.dataset.id;
                        const skill = actor.items.get(skillId);
                        
                        Hooks.once("postProcessDSARoll", (chatOptions, rollData) => {
                            if (rollData.successLevel > 0) {
                                const label = game.i18n.localize("SUPPORTING_TEST.modifierLabel");
                                const tt = `${label}<br>Modifikator: 1<br>Quelle: Unterstützung`;
                                injectSupportingModifier(parentDialog, "1", tt, `${label} [1]`);
                                ui.notifications.info(game.i18n.localize("SUPPORTING_TEST.successSuccess"));
                            }
                        });

                        actor.setupSkill(skill, {}, "roll").then(setupData => { if(setupData) actor.basicTest(setupData); });
                        $(ev.currentTarget).closest('.dialog').find('.header-button.close').click();
                    });
                }
            }, { width: 600, resizable: true }).render(true);
        }
    });
});
