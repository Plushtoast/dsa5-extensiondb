// This is a system macro used for automation. It is disfunctional without the proper context.



const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gültiger Akteur gefunden.",
    healedInfoPrefix: "Du hast",
    healedInfoSuffix: "Lebenspunkte zurückerhalten.",
  },
  en: {
    noActor: "No valid actor found.",
    healedInfoPrefix: "You have regained",
    healedInfoSuffix: "hit points.",
  }
};


if (!actor) {
  ui.notifications.error(dict[lang].noActor);
  return;
}

const die = "1d3";
const roll = await (new Roll(die)).evaluate();
const healPoints = roll.total;

const current = foundry.utils.getProperty(actor, "system.status.wounds.value") ?? 0;
const max = foundry.utils.getProperty(actor, "system.status.wounds.max") ?? 0;
const newWounds = Math.min(current + healPoints, max);


await actor.update({ "system.status.wounds.value": newWounds });


ui.notifications.info(`${dict[lang].healedInfoPrefix} ${healPoints} ${dict[lang].healedInfoSuffix}`);
