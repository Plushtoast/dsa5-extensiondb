// transform spell source data object

let effect = source.effects.find(x => x.label == "Aeolito")

if(!effect) return

effect = duplicate(effect)
source.effects = source.effects.filter(x => x.label != "Aeolito")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wurde von dem Windstoß betäubt"
    },
    en: {
        msg: "was stunned by the blast of wind"
    }
}[lang]

effect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition('stunned', 1, false)`
source.effects.push(effect)
