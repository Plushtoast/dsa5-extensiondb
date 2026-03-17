// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";

const dict = {
  de: {
    noActor: "Kein gueltiger Akteur gefunden.",
    noTargets: "Bitte mindestens ein Ziel anvisieren.",
    invalidTarget: "Mindestens ein Ziel ist kein Akteur.",
    rollLabel: "Wasserheilung",
    healMessage: (user, details) => `<p>${user} gibt den Zielen Wasser zu trinken und heilt:</p><ul>${details}</ul>`,
  },
  en: {
    noActor: "No valid actor found.",
    noTargets: "Please target at least one token.",
    invalidTarget: "At least one target is not an actor.",
    rollLabel: "Water Healing",
    healMessage: (user, details) => `<p>${user} gives the targets water to drink and heals:</p><ul>${details}</ul>`,
  }
}[lang];

const userActor = actor;

if (!userActor) {
  ui.notifications.warn(dict.noActor);
  return;
}

const targets = Array.from(game.user.targets);

if (targets.length === 0) {
  ui.notifications.warn(dict.noTargets);
  return;
}

if (targets.some((target) => !target.actor)) {
  ui.notifications.warn(dict.invalidTarget);
  return;
}

const healResults = [];

for (const target of targets) {
  const targetActor = target.actor;
  const roll = await new Roll("1d6").evaluate();
  const healAmount = roll.total;
  const currentWounds = foundry.utils.getProperty(targetActor, "system.status.wounds.value") ?? 0;
  const maxWounds = foundry.utils.getProperty(targetActor, "system.status.wounds.max") ?? currentWounds;
  const newWounds = Math.min(maxWounds, currentWounds + healAmount);

  await this.socketedActorTransformation([target.id], { "system.status.wounds.value": newWounds });
  healResults.push(`<li>${target.name}: ${healAmount}</li>`);
}

ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor: userActor }),
  content: `<p><strong>${dict.rollLabel}</strong></p>${dict.healMessage(userActor.name, healResults.join(""))}`,
});
