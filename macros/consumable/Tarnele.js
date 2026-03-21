// This is a system macro used for automation. It is disfunctional without the proper context.


const { getProperty } = foundry.utils;

// Schmerzstufe auslesen
const getPain = () => Number(getProperty(actor, "system.condition.inpain"));

// LePTemp um +1 erhöhen
{
  const before = Number(getProperty(actor, "system.status.regeneration.LePTemp")) || 0;
  await actor.update({ "system.status.regeneration.LePTemp": before + 1 });
}

// Active Effect anlegen
const EFFECT_NAME = "Tarnelensalbe";
const EFFECT_ICON = "icons/svg/blood.svg";
const shouldBeDisabled = getPain() !== 1;

let eff = actor.effects.find(e => e.name === EFFECT_NAME);

if (!eff) {
  await actor.createEmbeddedDocuments("ActiveEffect", [
    {
      name: EFFECT_NAME,
      icon: EFFECT_ICON,
      origin: actor.uuid,
      disabled: shouldBeDisabled, // aktiv nur bei inpain === 1
      duration: { seconds: 3600 },
      changes: [
        { key: "system.resistances.effects", mode: 0, value: "inpain 1", priority: 20 }
      ]
    }
  ]);
} else {
  if (eff.disabled !== shouldBeDisabled) {
    await eff.update({ disabled: shouldBeDisabled });
  }
}
