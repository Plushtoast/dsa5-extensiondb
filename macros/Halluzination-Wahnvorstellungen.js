// transform spell source data object

source.effects.push({
  icon: "icons/svg/aura.svg",
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
      args0: "confused",
      args1: "2",
    },
  },
});
