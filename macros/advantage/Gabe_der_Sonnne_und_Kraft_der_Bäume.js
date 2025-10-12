// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gültiger Akteur gefunden.",
    healedInfo: (healPoints) => `Du hast ${healPoints} Lebenspunkte zurückerhalten.`,
  },
  en: {
    noActor: "No valid actor found.",
    healedInfo: (healPoints) => `You have regained ${healPoints} hit points.`,
  }
};


if (!actor) {
  ui.notifications.error(dict[lang].noActor);
  return;
}

const roll = await new Roll('1d3').evaluate();
const healPoints = roll.total;

const current = foundry.utils.getProperty(actor, "system.status.wounds.value") ?? 0;
const max = foundry.utils.getProperty(actor, "system.status.wounds.max") ?? 0;
const newWounds = Math.min(current + healPoints, max);

await actor.update({ "system.status.wounds.value": newWounds });

ui.notifications.info(dict[lang].healedInfo(healPoints));
