// Schema type: onUseEffect
// Parameters injected by the system:
//   args   {OnUseEffectExecutionArgs} - Execution metadata for this activation.
//   item   {Itemdsa5} - The item that was used.
//   actor  {Actordsa5} - The actor who used the item.
//   this   {OnUseEffect} - Helper instance (socketedConditionAdd, effectDummy, createChatMessage, ...).

const vulnerabilities = Object.keys(game.i18n.translations.Combatskilldescr)
  .map((skill) => `${skill} *0.5`)
  .join(",");

const effectData = {
  name: item.name,
  duration: {
    value: 5,
    units: "rounds",
  },
  system: {
    changes: [
      {
        key: "system.vulnerabilities.combatskill",
        type: "custom",
        mode: 0,
        value: vulnerabilities,
      },
    ],
    macroArgs: {
      onRemove: `await actor.addCondition("stunned", 1);`,
    },
  },
};

await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
