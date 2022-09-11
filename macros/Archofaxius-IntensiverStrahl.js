// transform spell source data object

let effect = source.effects.find(x => x.label == "Archofaxius")

if(!effect) return

effect = duplicate(effect)
source.effects = source.effects.filter(x => x.label != "Archofaxius")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wurde schwer belastet"
    },
    en: {
        msg: "has been encumbered"
    }
}[lang]

effect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition(\"encumbered\", 1, false)`
source.effects.push(effect)