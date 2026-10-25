const lang = game.i18n.lang === "de" ? "de" : "en";

const dict = {
  de: {
    notEnoughSchips: (name) => `${name} hat nicht genügend Schicksalspunkte.`,
    notSurprised: (name) => `${name} ist aktuell nicht überrascht.`,
    chatMessage: (name, itemName) => `<p><b>${name}</b> setzt einen Schicksalspunkt ein (${itemName}) und hebt den Status <i>Überrascht</i> auf.</p>`
  },
  en: {
    notEnoughSchips: (name) => `${name} does not have enough Fate Points.`,
    notSurprised: (name) => `${name} is not surprised.`,
    chatMessage: (name, itemName) => `<p><b>${name}</b> spends a Fate Point (${itemName}) and removes the <i>Surprised</i> status.</p>`
  }
}[lang];

if (!actor) return;

if (!actor.hasCondition("surprised")) {
  ui.notifications.warn(dict.notSurprised(actor.name));
  return;
}

const fatePoints = foundry.utils.getProperty(actor, "system.status.fatePoints");

if (!fatePoints || fatePoints.value < 1) {
  ui.notifications.warn(dict.notEnoughSchips(actor.name));
  return;
}

await actor.update({ "system.status.fatePoints.value": fatePoints.value - 1 });

await actor.removeCondition("surprised");

ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor: actor }),
  content: dict.chatMessage(actor.name, item.name),
  messageMode: args?.messageMode
});
