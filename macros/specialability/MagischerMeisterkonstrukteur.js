// This is a system macro used for automation. It is disfunctional without the proper context.

if (!testData || !testData.source || !testData.source.system) return;
if (!["spell", "ritual"].includes(testData.source.type)) return;

const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
    de: {
        spellName: "Stein wandle",
        distribution: "Allgemein",
        foreignModString: "Fremdzauber"
    },
    en: {
        spellName: "Awaken Stone", // Platzhalter
        distribution: "General",
        foreignModString: "Unfamiliar tradition"
    }
}[lang];

const targetSpells = ["Animatio", dict.spellName];
if (!targetSpells.includes(testData.source.name)) return;

testData.source.system.isForeign = false;
if (testData.source.system.distribution) {
    testData.source.system.distribution.value = dict.distribution;
}

const app = data?.dialogState?.dialog;
if (app && app.element) {
    const html = $(app.element);
    const select = html.find('select[name="situationalModifiers"]');
    
    if (select.length > 0) {
        const foreignOption = select.find(`option:contains("${dict.foreignModString}")`);
        if (foreignOption.length > 0) {
            foreignOption.remove();
            select.trigger('change');
        }
    }
}
