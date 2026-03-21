// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const { getProperty } = foundry.utils;

const dict = {
  de: {
    noActor: "Kein gueltiger Akteur gefunden.",
  },
  en: {
    noActor: "No valid actor found.",
  },
}[lang];

const userActor = actor;

if (!userActor) {
  ui.notifications.error(dict.noActor);
  return;
}

const currentTempHeal = Number(getProperty(userActor, "system.status.regeneration.LePTemp")) || 0;
await userActor.update({ "system.status.regeneration.LePTemp": currentTempHeal + 1 });

const existingEffect = userActor.effects.find((effect) => effect.name === item.name);

if (!existingEffect) {
  const condition = this.effectDummy(
    item.name,
    [
      {
        key: "system.thresholds.effects",
        mode: 0,
        value: "inpain 1",
      },
    ],
    { seconds: 3600 },
  );

  condition.img = "icons/svg/blood.svg";

  await userActor.addCondition(condition);
}