// transform spell source data object

let origEffect = source.effects.find(x => x.name == "Ignisphaero")

if(!origEffect) return

origEffect = duplicate(origEffect)
source.effects = source.effects.filter(x => x.name != "Ignisphaero")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wurde in Brand gesteckt"
    },
    en: {
        msg: "was set on fire"
    }
}[lang]

origEffect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition('burning')`
source.effects.push(origEffect)