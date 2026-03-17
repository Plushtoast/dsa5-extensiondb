// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gueltiger Akteur gefunden.",
    noItem: "Kein Quell-Item gefunden.",
    noSkill: '{name} hat keine Fertigkeit "Goetter & Kulte".',
    testFailed: '{name} hat die Probe auf "Goetter & Kulte" nicht bestanden.',
    effectName: "Vision des Schicksals",
    effectDesc: "Erschwernis -1 auf Fertigkeiten, Nahkampf, Parade, Ausweichen und Fernkampf.",
    incapacitatedDesc: "Der Held ist waehrend der Vision handlungsunfaehig.",
    cooldownEffectName: "Vision des Schicksals - Abklingzeit",
    cooldownDesc: "Kann nicht von einer neuen Vision profitieren.",
    cooldownActive: (name) => `${name} kann derzeit nicht von einer neuen Vision profitieren.`,
    skillName: "Goetter & Kulte",
    started: (name, hours) => `<p>${name} empfaengt eine Vision des Schicksals.</p><p>Der Held ist fuer 2 Stunden handlungsunfaehig.</p><p>Nach dem Ende der Vision ${hours > 0 ? `ist der Held fuer ${hours} Stunden durch Visionen abgelenkt und ` : ""}erhaelt bis zu 1 Schip zurueck.</p>`,
    completed: (name, gained, current, max, hours) => `<p>${name} vollendet die Vision des Schicksals.</p><p>${hours > 0 ? `Der Held ist fuer ${hours} Stunden durch Visionen abgelenkt.` : "Es entsteht keine zusaetzliche Ablenkung durch die Vision."}</p><p>${gained ? `Erhaelt 1 Schip (${current}/${max}).` : `Erhaelt keinen Schip, da bereits das Maximum von ${max} erreicht ist.`}</p>`,
  },
  en: {
    noActor: "No valid actor found.",
    noItem: "No source item found.",
    noSkill: '{name} does not have the skill "Religions".',
    testFailed: '{name} failed the "Religions" test.',
    effectName: "Vision of Fate",
    effectDesc: "Penalty -1 to skills, melee, parry, dodge and ranged.",
    incapacitatedDesc: "The hero is incapacitated while receiving the vision.",
    cooldownEffectName: "Vision of Fate - Cooldown",
    cooldownDesc: "Can not profit of new vision.",
    cooldownActive: (name) => `${name} cannot profit of a new vision right now.`,
    skillName: "Religions",
    started: (name, hours) => `<p>${name} receives a Vision of Fate.</p><p>The hero is incapacitated for 2 hours.</p><p>After the vision ends, ${hours > 0 ? `the hero is distracted by visions for ${hours} hours and ` : ""}regains up to 1 Fate Point.</p>`,
    completed: (name, gained, current, max, hours) => `<p>${name} completes the Vision of Fate.</p><p>${hours > 0 ? `The hero is distracted by visions for ${hours} hours.` : "The vision causes no additional distraction afterwards."}</p><p>${gained ? `Regains 1 Fate Point (${current}/${max}).` : `Regains no Fate Point because the maximum of ${max} has already been reached.`}</p>`,
  }
}[lang];

const COOLDOWN_SECONDS = 24 * 60 * 60;
const INCAPACITATED_SECONDS = 2 * 60 * 60;

function createCondition({ name = item.name, changes = [], seconds, description, hideOnToken = true }) {
  const condition = this.effectDummy(name, changes, { seconds });

  foundry.utils.mergeObject(condition, {
    img: item.img ?? condition.img,
    flags: {
      dsa5: {
        hideOnToken,
        ...(description ? { description } : {}),
      },
    },
  });

  return condition;
}

const sendMessage = async (message) => {
  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(message));
};

if (!actor) {
  await sendMessage(dict.noActor);
  return;
}

if (!item) {
  await sendMessage(dict.noItem);
  return;
}

const cooldownEffect = actor.effects.find((effect) =>
  effect.name === dict.cooldownEffectName || effect.flags?.dsa5?.description === dict.cooldownDesc
);

if (cooldownEffect) {
  await sendMessage(dict.cooldownActive(actor.name));
  return;
}

const skill = actor.items.find((entry) => entry.type === "skill" && entry.name === dict.skillName);

if (!skill) {
  await sendMessage(dict.noSkill.replace("{name}", actor.name));
  return;
}

const setupData = await actor.setupSkill(skill, { subtitle: ` (${item.name})` }, actor.sheet?.getTokenId?.());
setupData.testData.opposable = false;

const result = await actor.basicTest(setupData);
const skillQualityStep = result?.result?.qualityStep || 0;

if ((result?.result?.successLevel || 0) <= 0 || skillQualityStep < 1) {
  await sendMessage(dict.testFailed.replace("{name}", actor.name));
  return;
}

const currentFate = foundry.utils.getProperty(actor.system, "status.fatePoints.value") ?? 0;
const maxFate = foundry.utils.getProperty(actor.system, "status.fatePoints.max") ?? currentFate;
const distractionHours = Math.max(0, 12 - skillQualityStep);

const distractionCondition = distractionHours > 0
  ? createCondition.call(this, {
      name: dict.effectName,
      seconds: distractionHours * 3600,
      description: dict.effectDesc,
      changes: [
        { key: "system.skillModifiers.global", value: -1, mode: 0, priority: 20 },
        { key: "system.meleeStats.attack", value: -1, mode: 2, priority: 20 },
        { key: "system.meleeStats.parry", value: -1, mode: 2, priority: 20 },
        { key: "system.status.dodge.gearmodifier", value: -1, mode: 2, priority: 20 },
        { key: "system.rangeStats.attack", value: -1, mode: 2, priority: 20 },
      ],
    })
  : null;

const cooldownCondition = createCondition.call(this, {
  name: dict.cooldownEffectName,
  seconds: COOLDOWN_SECONDS,
  description: dict.cooldownDesc,
});

const completionMessageGainTemplate = dict.completed(actor.name, true, "${newFate}", "${maxFate}", distractionHours);
const completionMessageNoGainTemplate = dict.completed(actor.name, false, "${newFate}", "${maxFate}", distractionHours);

const completionScript = [
  "const currentFate = foundry.utils.getProperty(actor.system, \"status.fatePoints.value\") ?? 0;",
  "const maxFate = foundry.utils.getProperty(actor.system, \"status.fatePoints.max\") ?? currentFate;",
  "const newFate = Math.min(maxFate, currentFate + 1);",
  "const gainedFate = newFate > currentFate;",
  "await actor.update({ \"system.status.fatePoints.value\": newFate });",
  ...(distractionCondition ? [`await actor.addCondition(${JSON.stringify(distractionCondition)});`] : []),
  `const completionMessage = gainedFate ? \`${completionMessageGainTemplate}\` : \`${completionMessageNoGainTemplate}\`;`,
  "await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(completionMessage));",
].join("");

await actor.addTimedCondition("incapacitated", 1, false, false, {
  name: dict.effectName,
  duration: { seconds: INCAPACITATED_SECONDS },
  flags: {
    dsa5: {
      description: dict.incapacitatedDesc,
      hideOnToken: true,
      onRemove: completionScript,
    },
  },
});

await actor.addCondition(cooldownCondition);

await sendMessage(dict.started(actor.name, distractionHours));
