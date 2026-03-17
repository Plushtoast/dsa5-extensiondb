// This is a system macro used for automation. It is disfunctional without the proper context.

        
const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gültiger Akteur gefunden.",
    invalidQs: "Qualitätsstufe (QS) fehlt oder ist ungültig.",
    talentName: "Schlösserknacken",
  },
  en: {
    noActor: "No valid actor found.",
    invalidQs: "Quality level (QS) is missing or invalid.",
    talentName: "Pick Locks",
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

const durations = [15 * 60, 30 * 60, 60 * 60, 2 * 60 * 60, 4 * 60 * 60, 8 * 60 * 60];
const durationSeconds = durations[qualityStep - 1];

let changes = [];
if (qualityStep === 1) {
  changes = [{
    key: "system.skillModifiers.TPM",
    mode: 0,
    value: `${dict.talentName} 0|1|0`
  }];
} else if (qualityStep === 2 || qualityStep === 3) {
  changes = [{
    key: "system.skillModifiers.TPM",
    mode: 0,
    value: `${dict.talentName} 0|1|1`
  }];
} else {
  changes = [{
    key: "system.skillModifiers.step",
    mode: 0,
    value: `${dict.talentName} 1`
  }];
}

if (changes.length) {
  const condition = this.effectDummy(item.name, changes, { seconds: durationSeconds });
  foundry.utils.mergeObject(condition, {
    flags: {
      dsa5: {
        description: item?.name ?? condition.name,
        hideOnToken: true,
      },
    },
  });

  await actor.addCondition(condition);
}
        
