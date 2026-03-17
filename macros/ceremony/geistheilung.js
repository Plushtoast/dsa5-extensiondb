// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gültiger Akteur gefunden.",
    noQs: "Es sind keine Qualitätsstufen verfügbar.",
    message: (name, regenBonus, effectName) =>
      `${name} erhält durch ${effectName} ${regenBonus} zusätzliche LeP-Regeneration in der nächsten Regenerationsphase.`,
  },
  en: {
    noActor: "No valid actor found.",
    noQs: "No quality steps are available.",
    message: (name, regenBonus, effectName) =>
      `${name} gains ${regenBonus} additional LP regeneration from ${effectName} during the next regeneration phase.`,
  },
}[lang];

if (!actor) {
  ui.notifications.error(dict.noActor);
  return;
}

const qualityStep = Number(qs) || 0;
if (qualityStep < 1) {
  ui.notifications.warn(dict.noQs);
  return;
}

const regenBonus = qualityStep * 2;
const currentRegen = foundry.utils.getProperty(actor.system, "status.regeneration.LePTemp") ?? 0;

await actor.update({
  "system.status.regeneration.LePTemp": currentRegen + regenBonus,
});

await ChatMessage.create(
  game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.message(actor.name, regenBonus, item?.name))
);
