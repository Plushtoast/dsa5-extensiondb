// transform spell source data object

let effect = source.effects.find(x => x.label == "Aquafaxius")

if(!effect) return

effect = duplicate(effect)
source.effects = source.effects.filter(x => x.label != "Aquafaxius")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wurde von den Wassermengen betäubt"
    },
    en: {
        msg: "was stunned by the gush of water"
    }
}[lang]

effect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition('stunned', 1, false)`
source.effects.push(effect)
