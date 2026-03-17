// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein Actor gefunden – bitte Makro ausführen, während ein Actor ausgewählt ist.",
    noFate: "{name} hat keinen Schicksalspunkt zur Verfügung.",
    fateSpentInfo: "Ein Schicksalspunkt wurde ausgegeben.",
    noSkill: '{name} hat keine Fertigkeit "Götter & Kulte".',
    testFailed: '{name} hat die Probe auf "Götter & Kulte" nicht bestanden.',
    testSuccessRapture: "{name} hat die Probe bestanden und erhält 2 Stufen Entrückung.",
    skillName: "Götter & Kulte"
  },
  en: {
    noActor: "No actor found – please run the macro while an actor is selected.",
    noFate: "{name} has no Fate Point available.",
    fateSpentInfo: "A Fate Point has been spent.",
    noSkill: '{name} does not have the skill "Religions".',
    testFailed: '{name} failed the "Religions" test.',
    testSuccessRapture: "{name} succeeded and gains 2 levels of Rapture.",
    skillName: "Religions"
  }
}[lang];

if (!actor) {
  ui.notifications.error(dict.noActor);
  return;
}

(async () => {
  // Vorab: Prüfen, ob mindestens 1 Schicksalspunkt vorhanden ist
  const currentFatePre = foundry.utils.getProperty(actor.system, "status.fatePoints.value") ?? 0;
  if (currentFatePre <= 0) {
    ui.notifications.warn(dict.noFate.replace("{name}", actor.name));
    return;
  }

  // Skill suchen
  const skillName = dict.skillName;
  const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
  if (!skill) {
    ui.notifications.error(dict.noSkill.replace("{name}", actor.name));
    return;
  }

  // Skill-Test vorbereiten und ausführen
  const setupData = await actor.setupSkill(skill, {}, actor.sheet?.getTokenId?.());
  setupData.testData.opposable = false;
  const res = await actor.basicTest(setupData);

  // Schicksalspunkt prüfen und abziehen
  const currentFate = foundry.utils.getProperty(actor.system, "status.fatePoints.value") ?? 0;
  if (currentFate <= 0) {
    // Falls andere Effekte Fate zwischenzeitlich verändert haben
    ui.notifications.warn(dict.noFate.replace("{name}", actor.name));
    return;
  }
  await actor.update({ "system.status.fatePoints.value": currentFate - 1 });
  ui.notifications.info(dict.fateSpentInfo);

  // Bei Erfolg Entrückung hinzufügen
  if (res?.result?.successLevel > 0) {
    if (actor.addCondition) {
      await actor.addCondition("raptured"); // erste Stufe
      await actor.addCondition("raptured"); // zweite Stufe
      ui.notifications.info(dict.testSuccessRapture.replace("{name}", actor.name));
    } else {
      ui.notifications.warn("System-Funktion 'addCondition' ist nicht verfügbar.");
    }
  } else {
    ui.notifications.warn(dict.testFailed.replace("{name}", actor.name));
  }
})();
