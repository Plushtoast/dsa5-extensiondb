if (typeof testData === "undefined" || !testData) return;
if (testData.mode !== "attack") return;

const targets = Array.from(game.user.targets);
if (targets.length === 0) return;

const effectName = "Egelschreckpaste"; 
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
        const modHtml = `
            <div class="modifiers form-group">
                <label>Bedingte Modifikatoren</label>
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
        select.append(`<option data-tooltip="${effectName}<br>Modifikator: -2" value="-2" selected="">${effectName} [-2]</option>`);
        select.trigger('change');
    }
}
