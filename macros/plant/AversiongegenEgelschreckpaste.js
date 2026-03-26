if (typeof testData === "undefined" || !testData) return;
if (testData.mode !== "attack") return;

const targets = Array.from(game.user.targets);
if (targets.length === 0) return;

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
    de: {
        effectName: "Egelschreckpaste",
        situationalModifiers: "Bedingte Modifikatoren",
        modifierLabel: "Modifikator"
    },
    en: {
        effectName: "Leech repellent paste",
        situationalModifiers: "Situational Modifiers",
        modifierLabel: "Modifier"
    }
}[lang];

const effectName = dict.effectName;

const targetHasEffect = targets.some(t => 
    t.actor && t.actor.effects.some(e => e.name === effectName)
);

if (!targetHasEffect) return;

const app = data?.dialogState?.dialog;
if (!app || !app.element) return;

if (!testData.situationalModifiers) testData.situationalModifiers = [];
if (!testData.situationalModifiers.some(mod => mod.name === effectName)) {
    testData.situationalModifiers.push({ name: effectName, value: -2 });
}

const html = $(app.element);
let modBox = html.find('.modifiers.form-group');

if (modBox.length === 0) {
    const rollModeField = html.find('.dsaRollMode').closest('.form-group');
    if (rollModeField.length > 0) {
        const localizedLabel = game.i18n.localize('DIALOG.SituationalModifiers') !== 'DIALOG.SituationalModifiers' ? game.i18n.localize('DIALOG.SituationalModifiers') : dict.situationalModifiers;
        const modHtml = `
            <div class="modifiers form-group">
                <label>${localizedLabel}</label>
                <div class="form-fields">
                    <select name="situationalModifiers" multiple=""></select>
                </div>
            </div>`;
        rollModeField.after(modHtml);
        modBox = html.find('.modifiers.form-group');
    } else {
        return;
    }
}

if (modBox.length > 0) {
    const select = modBox.find('select[name="situationalModifiers"]');

    if (select.find(`option:contains("${effectName}")`).length === 0) {
        select.append(`<option data-tooltip="${effectName}<br>${dict.modifierLabel}: -2" value="-2" selected="">${effectName} [-2]</option>`);
        
        select.on('mousedown', function(ev) {
            if (ev.target.tagName === 'OPTION') {
                ev.preventDefault();
                ev.target.selected = !ev.target.selected;
                
                $(this).trigger('change');
                
                if (typeof app.rememberFormData === "function") {
                    app.rememberFormData(ev);
                }
            }
        });
        
        select.trigger('change');
    }
}
