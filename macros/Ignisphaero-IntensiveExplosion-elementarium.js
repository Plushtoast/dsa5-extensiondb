// transform spell source data object

let effect = source.effects.find(x => x.label == "Ignisphaero")

if(!effect) return

effect = duplicate(effect)
source.effects = source.effects.filter(x => x.label != "Ignisphaero")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wurde in Brand gesteckt"
    },
    en: {
        msg: "was set on fire"
    }
}[lang]

// size does not matter for fire
effect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition('burning')`
source.effects.push(effect)