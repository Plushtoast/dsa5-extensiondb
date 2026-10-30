source.effects.push({
  img: "icons/svg/aura.svg",
  name: effect.name,
  duration: { value: 1, units: "hours" },
  system: {
    visibility: { hideOnToken: false, hidePlayers: false },
    description: effect.name,
    advancedFunction: 1,
    macroArgs: {
      conditionId: "feared",
      conditionValue: "1",
    },
    changes: [],
  },
});
