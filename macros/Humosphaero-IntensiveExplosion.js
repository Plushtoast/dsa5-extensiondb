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

effect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition('fixated')`
source.effects.push(effect)
