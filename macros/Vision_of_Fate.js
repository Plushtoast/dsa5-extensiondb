// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein Actor gefunden – bitte Makro ausführen, während ein Actor ausgewählt ist.",
    maxFP: "{name} hat bereits das Maximum an Schicksalspunkten erreicht. Die Probe findet nicht statt.",
    noSkill: '{name} hat keine Fertigkeit "Götter & Kulte".',
    testFailed: '{name} hat die Probe auf "Götter & Kulte" nicht bestanden.',
    gainedFP: '{name} erhält 1 Schicksalspunkt ({current}/{max}) und den Effekt "Vision des Schicksals" für {hours} Stunden.',
    effectName: "Vision des Schicksals",
    effectDesc: "Erschwernis -1 auf Fertigkeiten, Nahkampf, Parade, Ausweichen und Fernkampf.",
    skillName: "Götter & Kulte",
  },
  en: {
    noActor: "No actor found – please run the macro while an actor is selected.",
    maxFP: "{name} has already reached the maximum Fate Points. The roll will not be performed.",
    noSkill: '{name} does not have the skill "Religions".',
    testFailed: '{name} failed the "Religions" check.',
    gainedFP: '{name} gains 1 Fate Point ({current}/{max}) and the effect "Vision of Fate" for {hours} hours.',
    effectName: "Vision of Fate",
    effectDesc: "Penalty -1 to skills, melee, parry, dodge and ranged.",
    skillName: "Religions", 
  }
}[lang];

if (!actor) {
  ui.notifications.error(dict.noActor);
  return;
}

(async () => {
  const { getProperty, setProperty } = foundry.utils;

  let current = getProperty(actor.system, "status.fatePoints.value") ?? 0;
  let max = getProperty(actor.system, "status.fatePoints.max") ?? 0;

  if (current >= max) {
    ui.notifications.info(dict.maxFP.replace("{name}", actor.name));
    return;
  }

  const skill = actor.items.find(i => i.type === "skill" && i.name === dict.skillName);
  if (!skill) {
    ui.notifications.error(dict.noSkill.replace("{name}", actor.name));
    return;
  }

  const setupData = await actor.setupSkill(skill, {}, actor.sheet.getTokenId());
  setProperty(setupData, "testData.opposable", false);

  const res = await actor.basicTest(setupData);
  const ql = res?.result?.qualityStep || 0;

  if ((res?.result?.successLevel || 0) > 0) {
    await actor.update({ "system.status.fatePoints.value": current + 1 });
    current += 1;

    const durationSec = Math.max(0, 43200 - 3600 * ql);
    // Stunden auf ganze Zahl runden (keine Nachkommastellen)
    const durationHours = Math.round(durationSec / 3600);

    if (durationSec > 0) {
      const effectData = {
        name: dict.effectName,
        icon: "icons/svg/aura.svg",
        origin: actor.uuid,
        duration: { seconds: durationSec },
        changes: [
          { key: "system.skillModifiers.global", value: -1, mode: 0, priority: 20 },
          { key: "system.meleeStats.attack", value: -1, mode: 2, priority: 20 },
          { key: "system.meleeStats.parry", value: -1, mode: 2, priority: 20 },
          { key: "system.status.dodge.gearmodifier", value: -1, mode: 2, priority: 20 },
          { key: "system.rangeStats.attack", value: -1, mode: 2, priority: 20 },
        ],
        flags: { dsa5: { description: dict.effectDesc } },
      };
      await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    }

    ui.notifications.info(
      dict.gainedFP
        .replace("{name}", actor.name)
        .replace("{current}", current)
        .replace("{max}", max)
        .replace("{hours}", durationHours)
    );
  } else {
    ui.notifications.warn(dict.testFailed.replace("{name}", actor.name));
  }
})();
