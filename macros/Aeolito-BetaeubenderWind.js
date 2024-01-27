// transform spell source data object

let origEffect = source.effects.find(x => x.name == "Aeolito")

if(!origEffect) return

origEffect = duplicate(origEffect)
source.effects = source.effects.filter(x => x.name != "Aeolito")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wurde von dem Windstoß betäubt"
    },
    en: {
        msg: "was stunned by the blast of wind"
    }
}[lang]

origEffect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition('stunned', 1, false)`
source.effects.push(origEffect)
