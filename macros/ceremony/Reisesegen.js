const charges = Math.max(1, Math.round(qs / 3));
const duration = await game.dsa5.apps.DSAActiveEffectConfig.parseDurationValue(
  source.system?.duration?.value,
  qs
);

const effectData = this.effectDummy(
  source.name,
  [
    {
      key: "system.skillModifiers.postRoll.reroll",
      type: "custom",
      value: "nature 1",
    },
  ],
  duration
);

effectData.system.charges = {
  value: charges,
  max: charges,
};

await actor.addCondition(effectData);
