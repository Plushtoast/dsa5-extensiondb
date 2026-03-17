// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    extensionLabel: "Zaubererweiterung",
    effectName: "Brennend" 
  },
  en: {
    extensionLabel: "Spell Extension",
    effectName: "Burning"
  }
}[lang];


const burnScript = `
{
    if (actor.addCondition) {
        await actor.addCondition("burning");
    }
}
`;

let macroEffect = source.effects.find(x => x.flags?.dsa5?.args3);

if (macroEffect) {
    macroEffect = foundry.utils.duplicate(macroEffect);
    source.effects = source.effects.filter(x => x._id != macroEffect._id);
    
    macroEffect.flags.dsa5.args3 = `${burnScript}\n${macroEffect.flags.dsa5.args3}`;
    
    source.effects.push(macroEffect);

} else {
    const newEffect = {
        _id: foundry.utils.randomID(),
        name: `${dict.extensionLabel} (${dict.effectName})`,
        img: "icons/svg/fire.svg",
        changes: [],
        transfer: false,
        flags: {
            dsa5: {
                advancedFunction: 2, 
                args3: burnScript
            }
        }
    };
    
    source.effects.push(newEffect);
}
