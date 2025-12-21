// This is a system macro used for automation.

const lang = game.i18n.lang == "de" ? "de" : "en";

const dict = {
  de: {
    noKap: (name) => { return `${name} verfügt nicht über Karmaenergie.` },
    notEnoughKap: (name) => { return `${name} hat nicht genügend Karmaenergie.` },
    onlySingleTarget: "Bitte genau ein Ziel anvisieren.",
    targetNoActor: "Das Ziel ist kein Akteur.",
    wisdomMessage: (user, target) => { return `<p>${user} spricht einen Weisheitssegen auf ${target}.</p>` },
    effectName: "Weisheitssegen"
  },
  en: {
    noKap: (name) => { return `${name} does not have karma energy.` },
    notEnoughKap: (name) => { return `${name} does not have enough karma energy.` },
    onlySingleTarget: "Please target exactly one target.",
    targetNoActor: "The target is not an actor.",
    wisdomMessage: (user, target) => { return `<p>${user} casts a wisdom blessing on ${target}.</p>` },
    effectName: "Wisdom Blessing"
  }
}[lang];

const userActor = actor;

const kapObject = foundry.utils.getProperty(userActor, "system.status.karmaenergy");

if (!kapObject.max) {
  ui.notifications.warn(dict.noKap(userActor.name));
  return;
}
if (kapObject.value < 1) {
  ui.notifications.warn(dict.notEnoughKap(userActor.name));
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

await userActor.update({ "system.status.karmaenergy.value": kapObject.value - 1 });

const effectData = {
    name: dict.effectName,
    icon: "icons/svg/aura.svg",   
    duration: {
        seconds: 43200               
    },
    changes: [
        {
            key: "system.carryModifier", 
            mode: 2,
            value: "1, -1"
        }
    ]
};

await targetActor.createEmbeddedDocuments("ActiveEffect", [effectData]);

ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor: userActor }),
  content: dict.wisdomMessage(userActor.name, target.name)
});
