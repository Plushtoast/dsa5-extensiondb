// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gültiger Akteur gefunden.",
    effectName: "Horuschenöl",
    kraftakt: "Kraftakt"
  },
  en: {
    noActor: "No valid actor found.",
    effectName: "Horus Oil", //Platzhalter
    kraftakt: "Feat of Strength"
  },
}[lang];

if (!actor) {
  ui.notifications.warn(dict.noActor);
  return;
}

const durationSeconds = 36000

// Prüfen, ob der Effekt bereits auf dem Actor liegt
const existingEffect = actor.effects.find(e => e.name === dict.effectName);

if (!existingEffect) {
  // Fall 1: Effekt existiert noch nicht
  const changes = [
    {
      key: "system.characteristics.kk.gearmodifier",
      mode: 2,
      value: 1
    }
  ];

  const effectData = {
    name: dict.effectName,
    icon: "icons/svg/aura.svg", 
    changes: changes,
    duration: { seconds: durationSeconds, startTime: game.time.worldTime },
    flags: {
      dsa5: {
        description: dict.effectName,
        hideOnToken: true,
      }
    }
  };

  await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  
  // Erste Einnahme: 1 Schadenspunkt
  await actor.applyDamage(1); 

} else {
  // Fall 2: Effekt existiert 
  const changes = foundry.utils.duplicate(existingEffect.changes || []);
  
  //  "Kraftakt" bereits vorhanden?
  const kraftaktChange = changes.find(c => c.key === "system.skillModifiers.step" && c.value.includes(dict.kraftakt));
  let newBonus = 1;

  if (kraftaktChange) {
    // Kraftakt da
    const currentBonus = Number(kraftaktChange.value.replace(`${dict.kraftakt} `, ""));
    newBonus = (isNaN(currentBonus) ? 0 : currentBonus) + 1;
    kraftaktChange.value = `${dict.kraftakt} ${newBonus}`;
  } else {
    // Kraftakt nicht da
    changes.push({
      key: "system.skillModifiers.step",
      mode: 0,
      value: `${dict.kraftakt} 1`
    });
  }

  // Den existierenden Effekt überschreiben
  await existingEffect.update({ changes: changes });
  
  // exponentiellenr Schaden
  const damageAmount = Math.pow(2, newBonus);
  await actor.applyDamage(damageAmount); 
}
