source.effects.push({
  img: "icons/svg/aura.svg",
  name: effect.name,
  duration: { value: 1, units: "rounds" },
  system: {
    visibility: { hideOnToken: false, hidePlayers: false },
    description: effect.name,
    advancedFunction: 1,
    macroArgs: {
      conditionId: "blind",
      conditionValue: "1",
    },
    changes: [],
  },
});
