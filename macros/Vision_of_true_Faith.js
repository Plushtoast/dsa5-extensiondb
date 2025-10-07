// This is a system macro used for automation. It is disfunctional without the proper context.


const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein Actor gefunden – bitte Makro ausführen, während ein Actor ausgewählt ist.",
    noFate: "{name} hat keinen Schicksalspunkt zur Verfügung.",
    noSkill: '{name} hat keine Fertigkeit "Götter & Kulte".',
    testFailed: '{name} hat die Probe auf "Götter & Kulte" nicht bestanden.',
    gained: "{name} erhält durch die Vision: Willenskraft +{wp}, SK +{sk} (für 12 Stunden).",
    noBonus: "{name} erhält keine zusätzlichen Boni (QS {qs}).",
    effectName: "Vision des Wahren Glaubens",
    skillName: "Götter & Kulte",
    willpowerLabel: "Willenskraft"
  },
  en: {
    noActor: "No actor found — please run the macro while an actor is selected.",
    noFate: "{name} has no Fate Point available.",
    noSkill: '{name} does not have the skill "Religions".',
    testFailed: '{name} failed the "Religions" skill test.',
    gained: "{name} gains from the vision: Willpower +{wp}, SP +{sk} (for 12 hours).",
    noBonus: "{name} gains no additional bonuses (QS {qs}).",
    effectName: "Vision of True Faith",
    skillName: "Religions",
    willpowerLabel: "Willpower"
  }
}[lang];

if (!actor) {
  ui.notifications.error(dict.noActor);
  return;
}

async function run() {
  const currentFate = foundry.utils.getProperty(actor.system, "status.fatePoints.value") ?? 0;
  if (currentFate <= 0) {
    ui.notifications.warn(dict.noFate.replace("{name}", actor.name));
    return;
  }

  const skillName = dict.skillName;
  const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
  if (!skill) {
    ui.notifications.error(dict.noSkill.replace("{name}", actor.name));
    return;
  }

  const setupData = await actor.setupSkill(skill, {}, actor.sheet?.getTokenId?.());
  foundry.utils.setProperty(setupData, "testData.opposable", false);
  const res = await actor.basicTest(setupData);

  await actor.update({ "system.status.fatePoints.value": currentFate - 1 });

  if (res.result?.successLevel > 0) {
    const qs = res.result.qs ?? res.result.qualityStep ?? 1;

    let willpowerBonus = 0;
    let skBonus = 0;
    if (qs >= 1) willpowerBonus += 1;
    if (qs >= 2) willpowerBonus += 1;
    if (qs >= 3) skBonus += 1;
    if (qs >= 4) willpowerBonus += 1;
    if (qs >= 5) willpowerBonus += 1;
    if (qs >= 6) skBonus += 1;

    const effectData = {
      name: dict.effectName,
      icon: "icons/svg/aura.svg",
      origin: actor.uuid,
      duration: { seconds: 12 * 3600 },
      changes: []
    };

    if (willpowerBonus > 0) {
      effectData.changes.push({
        key: "system.skillModifiers.step",
        mode: 0, 
        value: `${dict.willpowerLabel} ${willpowerBonus}`
      });
    }

    if (skBonus > 0) {
      effectData.changes.push({
        key: "system.status.soulpower.modifier",
        mode: 2,
        value: skBonus
      });
    }

    if (effectData.changes.length > 0) {
      await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
      ui.notifications.info(
        dict.gained
          .replace("{name}", actor.name)
          .replace("{wp}", willpowerBonus)
          .replace("{sk}", skBonus)
      );
    } else {
      ui.notifications.info(dict.noBonus.replace("{qs}", qs));
    }
  } else {
    ui.notifications.warn(dict.testFailed.replace("{name}", actor.name));
  }
}

run();
