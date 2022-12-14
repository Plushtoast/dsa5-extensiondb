// transform spell source data object

let effect = source.effects.find(x => x.label == "Humosphaero")

if(!effect) return

effect = duplicate(effect)
source.effects = source.effects.filter(x => x.label != "Humosphaero")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wird von Ranken umschlungen"
    },
    en: {
        msg: "is held in place by vines"
    }
}[lang]

const resist = {
    de: {
        msg: "ist den Ranken entkommen"
    },
    en: {
        msg: "broke free of the vines"
    }
}[lang]

// size and check (for big) in the effect to do this for eah target individually
effect.flags.dsa5.args3 = `const effect_name  = 'fixated';let size = actor.system.status.size.value;if(size=='giant'){msg += \` \${actor.name} ${resist.msg}.\`;}else if(size=='big'){let roll = new Roll("1d6"); let d6 = roll.evaluate({async:false}).result;let render = await roll.render();if (d6<=4) {msg += \` \${actor.name} ${dict.msg}.\`+render ;\nawait actor.addCondition(effect_name);} else{msg += \` \${actor.name} ${resist.msg}.\`+render;} } else {msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition(effect_name)}`
source.effects.push(effect)
