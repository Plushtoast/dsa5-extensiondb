const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: { effectName: "Verankerter Spion" },
  en: { effectName: "Anchored Spy" },
}[lang];

// Regel: Penetrizzel / „Verankerter Spion“ – der Empfänger erleidet −1 auf alle Proben.
// Automatisiert wird nur dieser Malus; Anker, Bewegung und Aufrechterhaltung bleiben manuell.
// Der Marker verhindert doppelte Anwendung (nicht kumulativ). Wirkt bei „selbst“ und „Ziel“.

const SPY_MARKER = "verankerterSpion";
const SPY_NAME = JSON.stringify(dict.effectName);
const SPY_MARKER_JSON = JSON.stringify(SPY_MARKER);

const spyScript = `
{
  const marker = ${SPY_MARKER_JSON};
  const name = ${SPY_NAME};
  if (actor.effects.some((e) => e.flags?.dsa5?.[marker] || e.name === name)) return;
  const helper = new game.dsa5.apps.OnUseEffect(source);
  const condition = helper.effectDummy(name, [
    { key: "system.skillModifiers.global", type: "custom", value: -1 },
  ], {});
  foundry.utils.mergeObject(condition, {
    img: "icons/svg/aura.svg",
    flags: { dsa5: { [marker]: true } },
    system: {
      description: name,
      visibility: { hideOnToken: false, hidePlayers: false },
    },
  });
  await helper.socketedConditionAddActor([actor], condition);
}
`;

source.effects.push({
  name: `${lang === "de" ? "Zaubererweiterung" : "Spell Extension"} (${dict.effectName})`,
  img: "icons/svg/aura.svg",
  transfer: false,
  system: {
    advancedFunction: 2,
    macroArgs: { macro: spyScript },
    changes: [],
  },
});
