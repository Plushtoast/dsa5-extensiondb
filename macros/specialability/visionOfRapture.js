// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gueltiger Akteur gefunden.",
    noItem: "Kein Quell-Item gefunden.",
    noFate: (name) => `${name} hat keinen Schicksalspunkt zur Verfuegung.`,
    noSkill: '{name} hat keine Fertigkeit "Goetter & Kulte".',
    testFailed: '{name} hat die Probe auf "Goetter & Kulte" nicht bestanden.',
    effectName: "Vision der Entrueckung",
    incapacitatedDesc: "Der Held ist waehrend der Vision handlungsunfaehig.",
    cooldownEffectName: "Vision der Entrueckung - Abklingzeit",
    cooldownDesc: "Kann nicht von einer neuen Vision profitieren.",
    cooldownActive: (name) => `${name} kann derzeit nicht von einer neuen Vision profitieren.`,
    skillName: "Goetter & Kulte",
    started: (name, current, max) => `<p>${name} empfaengt eine Vision der Entrueckung.</p><p>Die Vision dauert 30 Minuten. In dieser Zeit ist der Held handlungsunfaehig.</p><p>1 Schip wurde eingesetzt (${current}/${max}). Nach dem Ende der Vision erhaelt der Held 2 Stufen Entrueckung.</p>`,
    failed: (name, current, max) => `<p>${name} hat die Probe auf "Goetter & Kulte" nicht bestanden.</p><p>1 Schip wurde dennoch eingesetzt (${current}/${max}).</p>`,
    completed: (name) => `<p>${name} hat die Vision der Entrueckung vollendet und erhaelt 2 Stufen Entrueckung.</p>`,
  },
  en: {
    noActor: "No valid actor found.",
    noItem: "No source item found.",
    noFate: (name) => `${name} has no Fate Point available.`,
    noSkill: '{name} does not have the skill "Religions".',
    testFailed: '{name} failed the "Religions" test.',
    effectName: "Vision of Rapture",
    incapacitatedDesc: "The hero is incapacitated while receiving the vision.",
    cooldownEffectName: "Vision of Rapture - Cooldown",
    cooldownDesc: "Can not profit of new vision.",
    cooldownActive: (name) => `${name} cannot profit of a new vision right now.`,
    skillName: "Religions",
    started: (name, current, max) => `<p>${name} receives a Vision of Rapture.</p><p>The vision lasts 30 minutes. During this time, the hero is incapacitated.</p><p>1 Fate Point has been spent (${current}/${max}). After the vision ends, the hero gains 2 levels of Rapture.</p>`,
    failed: (name, current, max) => `<p>${name} failed the "Religions" test.</p><p>1 Fate Point has still been spent (${current}/${max}).</p>`,
    completed: (name) => `<p>${name} completes the Vision of Rapture and gains 2 levels of Rapture.</p>`,
  }
}[lang];

const COOLDOWN_SECONDS = 24 * 60 * 60;
const VISION_SECONDS = 30 * 60;

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

if ((result?.result?.successLevel || 0) <= 0 || (result?.result?.qualityStep || 0) < 1) {
  await sendMessage(dict.failed(actor.name, newFate, maxFate));
  return;
}

await actor.addTimedCondition("incapacitated", 1, false, false, {
  name: dict.effectName,
  duration: { seconds: VISION_SECONDS },
  flags: {
    dsa5: {
      description: dict.incapacitatedDesc,
      hideOnToken: true,
      onRemove: `await actor.addCondition("raptured", 2);await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(${JSON.stringify(dict.completed(actor.name))}));`,
    },
  },
});

await actor.addCondition(cooldownCondition);

await sendMessage(dict.started(actor.name, newFate, maxFate));
