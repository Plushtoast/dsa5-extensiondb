// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    warnSelectOne: "Bitte genau ein Ziel anvisieren.",
    warnNoActor: "Das Ziel ist kein Akteur.",
    rollLabel: "Heilwurf",
  },
  en: {
    warnSelectOne: "Please target exactly one token.",
    warnNoActor: "The target is no actor.",
    rollLabel: "Healing Roll",
  }
};


const targets = Array.from(game.user.targets);
if (targets.length !== 1) {
  ui.notifications.warn(dict[lang].warnSelectOne);
  return;
}

const target = targets[0];
const targetActor = target?.actor;
if (!targetActor) {
  ui.notifications.warn(dict[lang].warnNoActor);
  return;
}


const roll = await new Roll("1d6").evaluate();
roll.toMessage({ flavor: dict[lang].rollLabel });
const healAmount = roll.total;


const current = foundry.utils.getProperty(targetActor, "system.status.wounds.value") ?? 0;
const maxVal = foundry.utils.getProperty(targetActor, "system.status.wounds.max") ?? 0;
const cap = Number.isFinite(maxVal) ? maxVal : current;
const newValue = Math.min(cap, current + healAmount);


await this.socketedActorTransformation([target.id], { "system.status.wounds.value": newValue });
