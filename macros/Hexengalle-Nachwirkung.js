// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    extensionLabel: "Zaubererweiterung",
    effectName: "Nachwirkung",
    chatMsg: "{name} erleidet {damage} Schaden durch Nachwirkung."
  },
  en: {
    extensionLabel: "Spell Extension",
    effectName: "Aftereffect",
    chatMsg: "{name} suffers {damage} damage from Aftereffect."
  }
}[lang];

const afterEffectScript = `
{
    const effectName = "${dict.effectName}";
    const existing = actor.effects.find(e => e.name === effectName);
        
    if (!existing) {
        const dmgVal = "1d3 + " + Math.ceil(qs / 2);

        const removeScript = "const damageRoll = await new Roll('" + dmgVal + "').evaluate(); " +
                             "await actor.applyDamage(damageRoll.total); " +
                             "const msg = '${dict.chatMsg}'.replace('{name}', actor.name).replace('{damage}', damageRoll.total); " +
                             "ChatMessage.create({speaker: ChatMessage.getSpeaker({ actor: actor }), content: msg});";

        const effectData = {
            name: effectName,
            img: "icons/svg/aura.svg", 
            duration: {
                rounds: 1, // 1 KR = 5 Sekunden
                seconds: null
            },
            flags: {
                dsa5: {
                    description: effectName,
                    onRemove: removeScript
                }
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
    
    macroEffect.flags.dsa5.args3 = `${afterEffectScript}\n${macroEffect.flags.dsa5.args3}`;
    
    source.effects.push(macroEffect);
} else {
    const newEffect = {
        _id: foundry.utils.randomID(),
        name: `${dict.extensionLabel} (${dict.effectName})`,
        img: "icons/svg/aura.svg",
        changes: [],
        transfer: false,
        flags: { dsa5: { advancedFunction: 2, args3: afterEffectScript } }
    };
    source.effects.push(newEffect);
}
