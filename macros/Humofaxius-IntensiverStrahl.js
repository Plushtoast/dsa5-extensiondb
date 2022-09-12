// transform spell source data object

let effect = source.effects.find(x => x.label == "Humofaxius")

if(!effect) return

effect = duplicate(effect)
source.effects = source.effects.filter(x => x.label != "Humofaxius")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wird von Ranken festgehalten"
    },
    en: {
        msg: "is held in place by vines"
    }
}[lang]

effect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition('fixated')`
source.effects.push(effect)