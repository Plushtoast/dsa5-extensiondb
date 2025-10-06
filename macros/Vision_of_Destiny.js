// This is a system macro used for automation. It is disfunctional without the proper context.

if (!actor) {
  ui.notifications.error("Kein Actor gefunden – bitte Makro ausführen, während ein Actor ausgewählt ist.");
  return;
}

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Vision der Bestimmung",
    visionText: "Die Vision, die du wahrnimmst, zeigt dir den Willen deiner Gottheit auf.",
    bonusLine: (qs) => `Für ${qs} Stunden erhältst du einen Bonus von +1 auf:`,
    noFate: "hat keinen Schicksalspunkt zur Verfügung.",
    noSkill: 'hat keine Fertigkeit "Götter & Kulte".',
    skillName: "Götter & Kulte", 
    testFail: 'hat die Probe auf "Götter & Kulte" nicht bestanden.',
    fateSpent: "Schicksalspunkt wurde ausgegeben.",
    MU: "MU",
    KL: "KL",
    IN: "IN",
    CH: "CH",
    effectName: (attr) => `Vision der Bestimmung (${attr} +1)`,
    notifGain: (name, attr, hours) => `${name} erhält +1 ${attr} für ${hours} Stunden.`
  },
  en: {
    title: "Vision of Destiny",
    visionText: "The vision you perceive reveals your deity’s will.",
    bonusLine: (qs) => `For ${qs} hours you gain a +1 bonus to:`,
    noFate: "has no Fate Point available.",
    noSkill: 'does not have the "Religions" skill.',
    skillName: "Religions", 
    testFail: 'failed the "Religions" test.',
    fateSpent: "Fate Point has been spent.",
    MU: "COU",
    KL: "SGC",
    IN: "INT",
    CH: "CH",
    effectName: (attr) => `Vision of Destiny (${attr} +1)`,
    notifGain: (name, attr, hours) => `${name} gains +1 ${attr} for ${hours} hours.`
  }
}[lang];

(async () => {
  //  Schicksalspunkt prüfen (vor dem Test)
  const currentFate = foundry.utils.getProperty(actor.system, "status.fatePoints.value") ?? 0;
  if (currentFate <= 0) {
    ui.notifications.warn(`${actor.name} ${dict.noFate}`);
    return;
  }

  // Fertigkeit suchen
  const skill = actor.items.find(i => i.type === "skill" && i.name === dict.skillName);
  if (!skill) {
    ui.notifications.error(`${actor.name} ${dict.noSkill}`);
    return;
  }

  // Skill-Test ausführen
  const setupData = await actor.setupSkill(skill, {}, actor.sheet?.getTokenId?.());
  if (setupData?.testData) setupData.testData.opposable = false;
  const res = await actor.basicTest(setupData);

  // Schicksalspunkt abziehen
  try {
    await actor.update({ "system.status.fatePoints.value": Math.max(0, currentFate - 1) });
    ui.notifications.info(`${actor.name}: ${dict.fateSpent}`);
  } catch (e) {
    console.error(e);
    
  }

  const successLevel = res?.result?.successLevel ?? 0;
  if (successLevel > 0) {
    // Dauer = QS Stunden
    const qs = res.result.qs ?? res.result.qualityStep ?? 1;
    const durationSeconds = qs * 3600;

    new Dialog({
      title: dict.title,
      content: `
        <p>${dict.visionText}</p>
        <p>${dict.bonusLine(qs)}</p>
      `,
      buttons: {
        mu: { label: dict.MU, callback: async () => applyBonus("mu", dict.MU, durationSeconds, qs) },
        kl: { label: dict.KL, callback: async () => applyBonus("kl", dict.KL, durationSeconds, qs) },
        in: { label: dict.IN, callback: async () => applyBonus("in", dict.IN, durationSeconds, qs) },
        ch: { label: dict.CH, callback: async () => applyBonus("ch", dict.CH, durationSeconds, qs) }
      }
    }).render(true);

    async function applyBonus(attrKeyDe, attrLabelLocalized, durationSeconds, qsVal) {

      const path = `system.characteristics.${attrKeyDe}.modifier`;

      const effectData = {
        name: dict.effectName(attrLabelLocalized),
        icon: "icons/svg/aura.svg", 
        origin: actor.uuid,
        duration: { seconds: durationSeconds },
        changes: [{ key: path, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: 1 }],
        flags: { "vision-qs": qsVal }
      };

      await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
      const hoursText = Math.round(durationSeconds / 3600);
      ui.notifications.info(dict.notifGain(actor.name, attrLabelLocalized, hoursText));
    }
  } else {
    ui.notifications.warn(`${actor.name} ${dict.testFail}`);
  }
})();
