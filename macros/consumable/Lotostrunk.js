// Makro

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
    de: {
        noActor: "Kein gültiger Akteur gefunden.",
        spells: (sk, sk2, fk) => `Odem Arcanum ${sk};Analys Arkanstruktur ${sk2};Magiekunde ${fk}`,
    },
    en: {
        noActor: "No valid actor found.",
        spells: (sk, sk2, fk) => `Odem Arcanum ${sk};Analyze Arcane Structure ${sk2};Magical Lore ${fk}`,
    }
};

if (!actor) {
    ui.notifications.error(dict[lang].noActor);
    return;
}


const sk = [0, 1, 2, 2, 3, 3][qs - 1];
const sk2 = [1, 1, 2, 2, 3, 3][qs - 1];
const fk = [0, 0, 0, 0, 1, 2][qs - 1];
const condition = this.effectDummy(item.name, [{ key: "system.skillModifiers.step", mode: 0, value: dict[lang].spells(sk, sk2, fk) }], { seconds: 30 * 60 })
foundry.utils.mergeObject(condition, {
    flags: {
        dsa5: {
            hideOnToken: true,
        }
    }
})
await actor.addCondition(condition);
