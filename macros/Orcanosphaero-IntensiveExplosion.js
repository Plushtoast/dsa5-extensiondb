// transform spell source data object

let origEffect = source.effects.find(x => x.name == "Archofaxius")

if(!origEffect) return

origEffect = duplicate(origEffect)
source.effects = source.effects.filter(x => x.name != "Archofaxius")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wurde umgeworfen"
    },
    en: {
        msg: "has been knocked prone"
    }
}[lang]

origEffect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;\nawait actor.addCondition(\"prone\")`
source.effects.push(origEffect)