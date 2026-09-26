// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = (game.i18n.lang === "de") ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gültiger Akteur gefunden.",
    invalidQs: "Qualitätsstufe (QS) fehlt oder ist ungültig.",
    talentName: "Gaukeleien",
    bonusEffectName: "Pyrophor: Gaukeleien-Bonus",
    effectDesc: "Pyrophor",
    lightName: "Pyrophor",
  },
  en: {
    noActor: "No valid actor found.",
    invalidQs: "Quality level (QS) is missing or invalid.",
    talentName: "Gaukelei",
    bonusEffectName: "Pyrophor: Sleight of Hand Bonus",
    effectDesc: "Pyrophor",
    lightName: "Pyrophor",
  },
}[lang];

if (!actor) {
  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.noActor));
  return;
}

const qualityStep = Number(qs) || 0;
if (qualityStep < 1 || qualityStep > 6) {
  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.invalidQs));
  return;
}

const fpBonus = [1, 1, 1, 2, 2, 0][qualityStep - 1];
const qlBonus = [0, 0, 0, 0, 0, 1][qualityStep - 1];
const lightRounds = [0, 1, 2, 2, 3, 3][qualityStep - 1];
const lightSeconds = lightRounds * (CONFIG.time.roundTime || 5);

let changes = [];
if (qlBonus > 0) {
  changes = [{ key: "system.skillModifiers.QL", type: "custom", value: `${dict.talentName} ${qlBonus}` }];
} else if (fpBonus > 0) {
  changes = [{ key: "system.skillModifiers.FP", type: "custom", value: `${dict.talentName} ${fpBonus}` }];
}

if (changes.length) {
  const condition = this.effectDummy(dict.bonusEffectName, changes, { value: 30, units: "seconds" });
  foundry.utils.mergeObject(condition, {
    description: dict.effectDesc,
    system: {
      visibility: {
        hideOnToken: true,
      },
    },
  });
  await actor.addCondition(condition);
}

if (lightSeconds > 0) {
  const tokens = actor.getActiveTokens?.() || [];
  if (tokens.length) {
    await game.dsa5.apps.LightDialog.applyVisionOrLight(true, "candle", tokens, dict.lightName, {
      duration: { value: lightSeconds, units: "seconds" },
    });
  }
}
