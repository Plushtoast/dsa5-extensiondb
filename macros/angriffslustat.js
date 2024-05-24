// transform spell source data object
const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        name: "Angriffslust"
    },
    en: {
        name: "Aggression"
    }
}[lang]
let origEffect = source.effects.find(x => x.name == dict.name)

if(!origEffect) return

origEffect = foundry.utils.duplicate(origEffect)
source.effects = source.effects.filter(x => x.name != dict.name)

origEffect.changes = [
    {
    "key": "system.meleeStats.damage",
    "mode": 2,
    "value": "+2"
    },
    {
    "key": "system.meleeStats.attack",
    "mode": 2,
    "value": 3
    },
    {
    "key": "system.rangeStats.damage",
    "mode": 2,
    "value": "+2"
    },
    {
    "key": "system.rangeStats.attack",
    "mode": 2,
    "value": 3
    }
]

source.effects.push(origEffect)
