source.effects.push({
  img: "icons/svg/aura.svg",
  name: effect.name,
  duration: {},
  system: {
    visibility: { hideOnToken: false, hidePlayers: false },
    description: effect.name,
    advancedFunction: 1,
    macroArgs: {
      conditionId: "inpain",
      conditionValue: "1",
    },
    changes: [],
  },
});
