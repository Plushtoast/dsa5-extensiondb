// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gueltiger Akteur gefunden.",
    noItem: "Kein Quell-Item gefunden.",
    noFate: (name) => `${name} hat keinen Schicksalspunkt zur Verfuegung.`,
    noSkill: '{name} hat keine Fertigkeit "Goetter & Kulte".',
    testFailed: (name, current, max) => `<p>${name} hat die Probe auf "Goetter & Kulte" nicht bestanden.</p><p>1 Schip wurde dennoch eingesetzt (${current}/${max}).</p>`,
    effectName: "Vision der Bestimmung",
    effectNameFor: (attr) => `Vision der Bestimmung (${attr} +1)`,
    effectDesc: (attr, hours) => `+1 ${attr} fuer ${hours} Stunden.`,
    incapacitatedDesc: "Der Held ist waehrend der Vision handlungsunfaehig.",
    cooldownEffectName: "Vision der Bestimmung - Abklingzeit",
    cooldownDesc: "Kann nicht von einer neuen Vision profitieren.",
    cooldownActive: (name) => `${name} kann derzeit nicht von einer neuen Vision profitieren.`,
    skillName: "Goetter & Kulte",
    title: "Vision der Bestimmung",
    visionText: "Die Vision, die du wahrnimmst, zeigt dir den Willen deiner Gottheit auf.",
    bonusLine: (qs) => `Fuer ${qs} Stunden erhaeltst du einen Bonus von +1 auf:`,
    started: (name, current, max, qs, attr) => `<p>${name} empfaengt eine Vision der Bestimmung.</p><p>Die Vision dauert 5 Minuten. In dieser Zeit ist der Held handlungsunfaehig.</p><p>1 Schip wurde eingesetzt (${current}/${max}). Nach dem Ende der Vision erhaelt der Held +1 ${attr} fuer ${qs} Stunden.</p>`,
    gained: (name, attr, hours) => `<p>${name} erhaelt +1 ${attr} fuer ${hours} Stunden.</p>`,
    MU: "MU",
    KL: "KL",
    IN: "IN",
    CH: "CH",
  },
  en: {
    noActor: "No valid actor found.",
    noItem: "No source item found.",
    noFate: (name) => `${name} has no Fate Point available.`,
    noSkill: '{name} does not have the skill "Religions".',
    testFailed: (name, current, max) => `<p>${name} failed the "Religions" test.</p><p>1 Fate Point has still been spent (${current}/${max}).</p>`,
    effectName: "Vision of Destiny",
    effectNameFor: (attr) => `Vision of Destiny (${attr} +1)`,
    effectDesc: (attr, hours) => `+1 ${attr} for ${hours} hours.`,
    incapacitatedDesc: "The hero is incapacitated while receiving the vision.",
    cooldownEffectName: "Vision of Destiny - Cooldown",
    cooldownDesc: "Can not profit of new vision.",
    cooldownActive: (name) => `${name} cannot profit of a new vision right now.`,
    skillName: "Religions",
    title: "Vision of Destiny",
    visionText: "The vision you perceive reveals your deity's will.",
    bonusLine: (qs) => `For ${qs} hours you gain a +1 bonus to:`,
    started: (name, current, max, qs, attr) => `<p>${name} receives a Vision of Destiny.</p><p>The vision lasts 5 minutes. During this time, the hero is incapacitated.</p><p>1 Fate Point has been spent (${current}/${max}). After the vision ends, the hero gains +1 ${attr} for ${qs} hours.</p>`,
    gained: (name, attr, hours) => `<p>${name} gains +1 ${attr} for ${hours} hours.</p>`,
    MU: "COU",
    KL: "SGC",
    IN: "INT",
    CH: "CHA",
  }
}[lang];

const COOLDOWN_SECONDS = 24 * 60 * 60;
const VISION_SECONDS = 5 * 60;

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

const currentFate = foundry.utils.getProperty(actor.system, "status.fatePoints.value") ?? 0;
const maxFate = foundry.utils.getProperty(actor.system, "status.fatePoints.max") ?? currentFate;

if (currentFate < 1) {
  await sendMessage(dict.noFate(actor.name));
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
const newFate = currentFate - 1;
const cooldownCondition = createCondition.call(this, {
  name: dict.cooldownEffectName,
  seconds: COOLDOWN_SECONDS,
  description: dict.cooldownDesc,
});

await actor.update({ "system.status.fatePoints.value": newFate });

const qualityStep = result?.result?.qs ?? result?.result?.qualityStep ?? 0;

if ((result?.result?.successLevel || 0) <= 0 || qualityStep < 1) {
  await sendMessage(dict.testFailed(actor.name, newFate, maxFate));
  return;
}

const bonusDurationSeconds = qualityStep * 3600;
const bonusOptions = [
  {
    key: "mu",
    label: dict.MU,
    condition: createCondition.call(this, {
      name: dict.effectNameFor(dict.MU),
      seconds: bonusDurationSeconds,
      description: dict.effectDesc(dict.MU, qualityStep),
      changes: [{ key: "system.characteristics.mu.modifier", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 }],
    }),
    message: dict.gained(actor.name, dict.MU, qualityStep),
  },
  {
    key: "kl",
    label: dict.KL,
    condition: createCondition.call(this, {
      name: dict.effectNameFor(dict.KL),
      seconds: bonusDurationSeconds,
      description: dict.effectDesc(dict.KL, qualityStep),
      changes: [{ key: "system.characteristics.kl.modifier", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 }],
    }),
    message: dict.gained(actor.name, dict.KL, qualityStep),
  },
  {
    key: "in",
    label: dict.IN,
    condition: createCondition.call(this, {
      name: dict.effectNameFor(dict.IN),
      seconds: bonusDurationSeconds,
      description: dict.effectDesc(dict.IN, qualityStep),
      changes: [{ key: "system.characteristics.in.modifier", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 }],
    }),
    message: dict.gained(actor.name, dict.IN, qualityStep),
  },
  {
    key: "ch",
    label: dict.CH,
    condition: createCondition.call(this, {
      name: dict.effectNameFor(dict.CH),
      seconds: bonusDurationSeconds,
      description: dict.effectDesc(dict.CH, qualityStep),
      changes: [{ key: "system.characteristics.ch.modifier", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 }],
    }),
    message: dict.gained(actor.name, dict.CH, qualityStep),
  },
];

const dialogContent = `<p>${dict.visionText}</p><p>${dict.bonusLine(qualityStep)}</p>`;
const selectedOptionKey = await new Promise((resolve) => {
  new foundry.applications.api.DialogV2({
    window: { title: dict.title },
    content: dialogContent,
    buttons: bonusOptions.map((option) => ({
      action: option.key,
      label: option.label,
      callback: () => resolve(option.key),
    })),
  }).render(true);
});

const selectedOption = bonusOptions.find((entry) => entry.key === selectedOptionKey);

if (!selectedOption) {
  return;
}

const onRemoveScript = [
  `const bonusOptions = ${JSON.stringify(bonusOptions)};`,
  `const selectedOptionKey = ${JSON.stringify(selectedOptionKey)};`,
  `const applyBonus = async () => {`,
  `  const option = bonusOptions.find((entry) => entry.key === selectedOptionKey);`,
  `  if (!option) return;`,
  `  await actor.addCondition(option.condition);`,
  `  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(option.message));`,
  `};`,
  `await applyBonus();`,
].join("");

await actor.addTimedCondition("incapacitated", 1, false, false, {
  name: dict.effectName,
  duration: { seconds: VISION_SECONDS },
  flags: {
    dsa5: {
      description: dict.incapacitatedDesc,
      hideOnToken: true,
      onRemove: onRemoveScript,
    },
  },
});

await actor.addCondition(cooldownCondition);

await sendMessage(dict.started(actor.name, newFate, maxFate, qualityStep, selectedOption.label));
