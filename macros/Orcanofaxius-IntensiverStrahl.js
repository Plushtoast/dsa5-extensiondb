// transform spell source data object

let effect = source.effects.find(x => x.label == "Orcanofaxius")

if(!effect) return

effect = duplicate(effect)
source.effects = source.effects.filter(x => x.label != "Orcanofaxius")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wurde umgeworfen"
    },
    en: {
        msg: "has been knocked prone"
    }
}[lang]

effect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition(\"prone\")`
source.effects.push(effect)