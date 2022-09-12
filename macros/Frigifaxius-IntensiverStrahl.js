// transform spell source data object

let effect = source.effects.find(x => x.label == "Frigifaxius")

if(!effect) return

effect = duplicate(effect)
source.effects = source.effects.filter(x => x.label != "Frigifaxius")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wurde eingefrohren"
    },
    en: {
        msg: "was chilled"
    }
}[lang]

effect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition('paralysed')`
source.effects.push(effect)