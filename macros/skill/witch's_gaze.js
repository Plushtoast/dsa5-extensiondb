// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";

const dict = {
  de: {
    onlySingleTarget: "Bitte genau ein Ziel anvisieren.",
    targetNoActor: "Das Ziel ist kein Akteur.",
    traditionName: "Tradition (Hexen)",
    eyesGlow: (name) => `Die Augen von ${name} leuchten kurz purpurn auf.`,
    nothingHappens: "Nichts passiert.",
    noActor: "Konnte den ausführenden Charakter nicht finden."
  },
  en: {
    onlySingleTarget: "Please target exactly one target.",
    targetNoActor: "The target is not an actor.",
    traditionName: "Tradition (Witch)",
    eyesGlow: (name) => `The eyes of ${name} glow briefly purple.`,
    nothingHappens: "Nothing happens.",
    noActor: "Could not find the executing character."
  }
}[lang];


if (!actor) {
  ui.notifications.error(dict.noActor);
  return;
}


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


const aspCost = 1;

const asp = foundry.utils.getProperty(actor, "system.status.astralenergy.value") ?? 0;

if (asp < aspCost) {
  ui.notifications.warn(`${game.i18n.localize("DSAError.NotEnoughAsP")} (Gefunden: ${asp} AsP, Benötigt: ${aspCost} AsP)`);
  return;
}


await actor.update({ "system.status.astralenergy.value": Math.max(0, asp - aspCost) });

if (typeof this.automatedAnimation === "function") {
  this.automatedAnimation(1);
}


const hasTradition = targetActor.items.some(i => i.type === "specialability" && i.name === dict.traditionName);

if (hasTradition) {

  const gmIds = game.users.filter(u => u.isGM).map(u => u.id);
  

  const ownerIds = Object.entries(targetActor.ownership || {})
    .filter(([id, level]) => level === 3 && id !== "default")
    .map(([id]) => id);


  const whisperIds = [...new Set([...gmIds, ...ownerIds])];

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    content: `<p>${dict.eyesGlow(target.name)}</p>`,
    whisper: whisperIds
  });
} else {
  ui.notifications.info(dict.nothingHappens);
}
