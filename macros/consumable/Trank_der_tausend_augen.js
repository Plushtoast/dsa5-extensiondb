// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    name: "Trank der tausend Augen",
    perception: "Sinnesschärfe",
    noActor: "Kein Akteur für den Trank gefunden."
  },
  en: {
    name: "Potion of a Thousand Eyes",
    perception: "Perception",
    noActor: "No actor found for this potion."
  }
}[lang];

if (!actor) {
  ui.notifications.warn(dict.noActor);
} else {
  const DURATION = 1200;

  const sightMod   = [2, 1, 0, 0, 0, 0][qs - 1]; // Sichtmodifikator
  const sightbonus = [0, 1, 2, 2, 3, 3][qs - 1]; // Sinnesschärfe-Bonus
  const awBonus    = [0, 1, 1, 1, 2, 2][qs - 1]; // AW-Bonus
  const needsConf  = [false, false, false, false, false, true][qs - 1]; // Verwirrung bei QS 6

  const changes = [];
  // if (sightMod > 0)    changes.push({ key: "system.sightModifier", mode: 2, value: sightMod });
  if (sightbonus > 0)  changes.push({ key: "system.skillModifiers.step", mode: 0, value: `${dict.perception} ${sightbonus}` });
  if (awBonus > 0)     changes.push({ key: "system.status.dodge.gearmodifier", mode: 2, value: awBonus }); 
  if (needsConf)       changes.push({ key: "system.condition.confused", mode: 2, value: 1 });

  actor.createEmbeddedDocuments("ActiveEffect", [{
    name: dict.name,
    icon: "icons/svg/aura.svg",
    duration: { seconds: DURATION, startTime: game.time.worldTime },
    changes
  }]);
}
