// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";

const dict = {
  de: {
    noActor: "Konnte den ausfuehrenden Charakter nicht finden.",
    onlySingleTarget: "Bitte genau ein Ziel anvisieren.",
    targetNoActor: "Das Ziel ist kein Akteur.",
    notEnoughAsp: (current, required) => `${game.i18n.localize("DSAError.NotEnoughAsP")} (Gefunden: ${current} AsP, Benoetigt: ${required} AsP)`,
    traditionName: "Tradition (Hexen)",
    eyesGlow: (name) => `Die Augen von ${name} leuchten kurz purpurn auf.`,
    nothingHappens: "Nichts passiert."
  },
  en: {
    noActor: "Could not find the executing character.",
    onlySingleTarget: "Please target exactly one target.",
    targetNoActor: "The target is not an actor.",
    notEnoughAsp: (current, required) => `${game.i18n.localize("DSAError.NotEnoughAsP")} (Found: ${current} AsP, Required: ${required} AsP)`,
    traditionName: "Tradition (Witch)",
    eyesGlow: (name) => `The eyes of ${name} glow briefly purple.`,
    nothingHappens: "Nothing happens."
  }
}[lang];

const userActor = actor;
const aspCost = 1;
const targets = Array.from(game.user.targets);

if (!userActor) {
  ui.notifications.error(dict.noActor);
  return;
}

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

const asp = foundry.utils.getProperty(userActor, "system.status.astralenergy.value") ?? 0;

if (asp < aspCost) {
  ui.notifications.warn(dict.notEnoughAsp(asp, aspCost));
  return;
}

await userActor.update({ "system.status.astralenergy.value": Math.max(0, asp - aspCost) });

if (typeof this.automatedAnimation === "function") {
  this.automatedAnimation(1);
}

const hasTradition = targetActor.items.some(
  (entry) => entry.type === "specialability" && entry.name === dict.traditionName,
);

if (hasTradition) {
  const gmIds = game.users.filter(u => u.isGM).map(u => u.id);
  const ownerIds = Object.entries(targetActor.ownership || {})
    .filter(([id, level]) => level === 3 && id !== "default")
    .map(([id]) => id);

  const whisperIds = [...new Set([...gmIds, ...ownerIds])];

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: userActor }),
    content: `<p>${dict.eyesGlow(target.name)}</p>`,
    whisper: whisperIds
  });

  return;
}

ui.notifications.info(dict.nothingHappens);
