// transform spell source data object

let origEffect = source.effects.find(x => x.name == "Humofaxius")

if(!origEffect) return

origEffect = duplicate(origEffect)
source.effects = source.effects.filter(x => x.name != "Humofaxius")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wird von Ranken umschlungen"
    },
    en: {
        msg: "is held in place by vines"
    }
}[lang]

origEffect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition('fixated')`
source.effects.push(origEffect)
