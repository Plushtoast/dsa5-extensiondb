// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
  de: {
    noKap: (name) => { return `${name} verfügt nicht über Karmaenergie.` },
    notEnoughKap: (name) => { return `${name} hat nicht genügend Karmaenergie.` },
    onlySingleTarget: "Bitte genau ein Ziel anvisieren.",
    targetNoActor: "Das Ziel ist kein Akteur.",
    healMessage: (user, target) => { return `<p>${user} wendet einen kleinen Heilsegen auf ${target} an.</p>` }
  },
  en: {
    noKap: (name) => { return `${name} does not have karma energy.` },
    notEnoughKap: (name) => { return `${name} does not have enough karma energy.` },
    onlySingleTarget: "Please target exactly one target.",
    targetNoActor: "The target is not an actor.",
    healMessage: (user, target) => { return `<p>${user} casts a small healing blessing on ${target}.</p>` }
  }
}[lang];

const userActor = actor;

// 2) 1 KaP (Karmaenergie) abziehen
const kapObject = foundry.utils.getProperty(userActor, "system.status.karmaenergy");
if (!kapObject.max) {
  ui.notifications.warn(dict.noKap(userActor.name));
  return;
}
if (kapObject.value < 1) {
  ui.notifications.warn(dict.notEnoughKap(userActor.name));
  return;
}

// 3) Ziel prüfen und heilen
const targets = Array.from(game.user.targets);
if (targets.length !== 1) {
  ui.notifications.warn(dict.onlySingleTarget);
  return;
}
const target = targets[0];
const targetActor = target.actor;
if (!targetActor) {
  ui.notifications.warn(dict.targetNoActor);
  return;
}

// Heilung anwenden
await userActor.update({ "system.status.karmaenergy.value": kapObject.value - 1 });
const newWounds = Math.min(targetActor.system.status.wounds.value + 1, targetActor.system.status.wounds.max);
await this.socketedActorTransformation([target.id], { "system.status.wounds.value": newWounds });

// Heilungsnachricht
ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor: userActor }),
  content: dict.healMessage(userActor.name, target.name)
});
