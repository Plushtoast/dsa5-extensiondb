// transform spell source data object

let effect = source.effects.find(x => x.label == "Archosphaero")

if(!effect) return

effect = duplicate(effect)
source.effects = source.effects.filter(x => x.label != "Archosphaero")

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        msg: "wird von Erzmassen beinträchtigt"
    },
    en: {
        msg: "is being encumbered by masses of ore"
    }
}[lang]

effect.flags.dsa5.args3 = `msg += \` \${actor.name} ${dict.msg}.\`;`
source.effects.push(effect)
source.effects.push({
  icon: "icons/svg/anchor.svg",
  label: effect.name,
  duration: {},
  changes: [],
  flags: {
    dsa5: {
      value: null,
      editable: true,
      custom: true,
      auto: null,
      manual: 0,
      hideOnToken: false,
      hidePlayers: false,
      description: effect.name,
      advancedFunction: 1,
      args0: "encumbered",
      args1: "1",
    },
  },
});
