// transform spell source data object

let origEffect = source.effects.find(x => x.name == "Archofaxius")

if(!origEffect) return

origEffect = duplicate(origEffect)
source.effects = source.effects.filter(x => x.name != "Archofaxius")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wurde schwer belastet"
    },
    en: {
        msg: "has been encumbered"
    }
}[lang]

const resist = {
    de: {
        msg: "hat der Belastung widerstanden"
    },
    en: {
        msg: "resisted the encumberment"
    }
}[lang]

// size and check (for big) in the effect to do this for eah target individually
origEffect.flags.dsa5.args3 = `const effect_name  = 'encumbered';let size = actor.system.status.size.value;if(size=='giant'){msg += \` \${actor.name} ${resist.msg}.\`;}else if(size=='big'){let roll = new Roll("1d6"); let d6 = roll.evaluate({async:false}).result;let render = await roll.render();if (d6<=4) {msg += \` \${actor.name} ${dict.msg}.\`+render ;\nawait actor.addCondition(effect_name, 1, false);} else{msg += \` \${actor.name} ${resist.msg}.\`+render;} } else {msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition(effect_name , 1, false)}`
source.effects.push(origEffect)
