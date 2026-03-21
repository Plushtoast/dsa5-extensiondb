// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: { noActor: "Kein Actor gefunden." },
  en: { noActor: "No actor found." },
}[lang];

const userActor = actor;

if (!userActor) {
  ui.notifications.warn(dict.noActor);
  return;
}

const stepValue = item.system.step?.value || 0;

if (stepValue <= 0) {
  return;
}

const condition = this.effectDummy(
  item.name,
  [
    {
      key: "system.condition.feared",
      mode: 2,
      value: stepValue,
    },
  ],
  {},
);

foundry.utils.mergeObject(condition, {
  img: "icons/svg/terror.svg",
});

await userActor.addCondition(condition);