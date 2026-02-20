// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    extensionLabel: "Zaubererweiterung",
    effectName: "Hinderliche Spucke"
  },
  en: {
    extensionLabel: "Spell Extension",
    effectName: "Hindering Spit"
  }
}[lang];


const spitScript = `
{
    const effectName = "${dict.effectName}";
    const existing = actor.effects.find(e => e.name === effectName);

    if (!existing) {
        const effectData = {
            name: effectName,
            img: "icons/svg/aura.svg",
            changes: [
                { key: "system.rangeStats.attack", mode: 2, value: -1 },
                { key: "system.status.dodge.gearmodifier", mode: 2, value: -1 },
                { key: "system.meleeStats.attack", mode: 2, value: -1 },
                { key: "system.meleeStats.parry", mode: 2, value: -1 },
                { key: "system.skillModifiers.global", mode: 2, value: -1 }
            ],
            flags: {
                dsa5: { description: effectName }
            }
        };
        await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    }
}
`;

let macroEffect = source.effects.find(x => x.flags?.dsa5?.args3);

if (macroEffect) {
    macroEffect = foundry.utils.duplicate(macroEffect);
    source.effects = source.effects.filter(x => x._id != macroEffect._id);
    
    macroEffect.flags.dsa5.args3 = `${spitScript}\n${macroEffect.flags.dsa5.args3}`;
    
    source.effects.push(macroEffect);
} else {
    const newEffect = {
        _id: foundry.utils.randomID(),
        name: `${dict.extensionLabel} (${dict.effectName})`,
        img: "icons/svg/aura.svg",
        changes: [],
        transfer: false,
        flags: { dsa5: { advancedFunction: 2, args3: spitScript } }
    };
    source.effects.push(newEffect);
}
