// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gültiger Akteur gefunden.",
    effectName: "Horuschenöl",
    kraftakt: "Kraftakt",
  },
  en: {
    noActor: "No valid actor found.",
    effectName: "Horus Oil",
    kraftakt: "Feat of Strength",
  },
}[lang];

if (!actor) {
  ui.notifications?.error(dict.noActor);
  return;
}

const durationSeconds = 10 * 60 * 60;
const effectName = item?.name ?? dict.effectName;

function createCondition(changes) {
  const condition = this.effectDummy(effectName, changes, { seconds: durationSeconds });

  foundry.utils.mergeObject(condition, {
    img: item?.img ?? "icons/svg/aura.svg",
    flags: {
      dsa5: {
        description: effectName,
        hideOnToken: true,
      },
    },
  });

  return condition;
}

function parseSkillBonus(value) {
  const match = String(value ?? "").match(new RegExp(`^${dict.kraftakt}\\s+(\\d+)$`));
  return Number(match?.[1] ?? 0);
}

const existingEffect = actor.effects.find(
  (effect) => effect.name === effectName || effect.name === dict.effectName,
);

if (!existingEffect) {
  const condition = createCondition.call(this, [
    {
      key: "system.characteristics.kk.gearmodifier",
      mode: 2,
      value: 1,
    },
  ]);

  await actor.addCondition(condition);
  await actor.applyDamage(1);
  return;
}

const changes = foundry.utils.duplicate(existingEffect.changes || []);
const kraftaktChange = changes.find(
  (change) => change.key === "system.skillModifiers.step" && String(change.value ?? "").startsWith(`${dict.kraftakt} `),
);

const currentBonus = parseSkillBonus(kraftaktChange?.value);
const newBonus = currentBonus + 2;

if (kraftaktChange) {
  kraftaktChange.value = `${dict.kraftakt} ${newBonus}`;
} else {
  changes.push({
    key: "system.skillModifiers.step",
    mode: 0,
    value: `${dict.kraftakt} ${newBonus}`,
  });
}

await existingEffect.update({ changes });
await actor.applyDamage(Math.pow(2, newBonus / 2));
