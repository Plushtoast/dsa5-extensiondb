// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein Ziel-Actor gefunden – bitte sicherstellen, dass 'actor' übergeben ist.",
    noSource: "Kein Quellen-Actor gefunden – bitte sicherstellen, dass 'sourceActor' übergeben ist.",
    noQS: "Keine QS übergeben – bitte 'qs' bereitstellen.",
    logInitQS: "QS des Zaubers initial",
    calcMalus: "Berechneter Malus",
    effectName: "Juckpulver",
    effectIcon: "icons/svg/aura.svg",
    effectAppliedChat: "erliegt dem Juckpulver!",
    resistSkillName: "Selbstbeherrschung",
    cannotResist: "kann nicht widerstehen und erleidet sofort den Effekt!",
    firstResistFail: "hat die erste Widerstandsprobe nicht bestanden!",
    firstResistPass: "widersteht zunächst dem Juckpulver...",
    resistEffectName: "Juckpulver-Widerstand",
    resistEffectIcon: "systems/dsa5/icons/spellicons/spells/juckpulver.webp",
    resistEffectDesc: "Widersteht periodischen Juckpulverproben",
    resistRenewPass: "widersteht erneut dem Juckpulver und der Effekt wird erneuert.",
    resistRenewFail: "scheitert an der Widerstandsprobe und erleidet den Effekt!",
    createEffectFail: "Aktiver Effekt konnte nicht erstellt werden. (Rechte?)",
    createResistFail: "Widerstands-Effekt konnte nicht erstellt werden. (Rechte?)",
  },
  en: {
    noActor: "No target actor found – please ensure 'actor' is passed.",
    noSource: "No source actor found – please ensure 'sourceActor' is passed.",
    noQS: "No QS provided – please pass 'qs'.",
    logInitQS: "Initial spell QS",
    calcMalus: "Calculated penalty",
    effectName: "Itching Powder",
    effectIcon: "icons/svg/aura.svg",
    effectAppliedChat: "succumbs to the itching powder!",
    resistSkillName: "Self-Control",
    cannotResist: "cannot resist and immediately suffers the effect!",
    firstResistFail: "failed the first resistance test!",
    firstResistPass: "initially resists the itching powder...",
    resistEffectName: "Itching Powder – Resistance",
    resistEffectIcon: "systems/dsa5/icons/spellicons/spells/juckpulver.webp",
    resistEffectDesc: "Resists periodic itching powder checks",
    resistRenewPass: "resists again and the effect is renewed.",
    resistRenewFail: "fails the resistance test and suffers the effect!",
    createEffectFail: "Could not create active effect. (Permissions?)",
    createResistFail: "Could not create resistance effect. (Permissions?)",
  }
}[lang];

// Grundprüfungen
if (!actor) {
  ui.notifications.error(dict.noActor);
  return;
}
if (!sourceActor) {
  ui.notifications.error(dict.noSource);
  return;
}
if (typeof qs === "undefined" || qs === null) {
  ui.notifications.error(dict.noQS);
  return;
}

(async () => {
  console.log(`${dict.logInitQS}: ${qs}`);

  const malus = Math.round(qs / 2) * -1;
  console.log(`${dict.calcMalus}: ${malus}`);

  async function applyJuckpulver() {
    const juckpulver = {
      name: dict.effectName,
      icon: dict.effectIcon,
      changes: [
        { key: "system.rangeStats.attack", mode: 2, value: malus },
        { key: "system.status.dodge.gearmodifier", mode: 2, value: malus },
        { key: "system.meleeStats.attack", mode: 2, value: malus },
        { key: "system.skillModifiers.global", mode: 0, value: malus },
        { key: "system.meleeStats.parry", mode: 2, value: malus }
      ],
      duration: { seconds: 30 },
      flags: { dsa5: { description: dict.effectName, malus: malus } }
    };

    try {
      await actor.createEmbeddedDocuments("ActiveEffect", [juckpulver]);
    } catch (err) {
      console.error("Failed to create effect. Consider GM socket mediation.", err);
      ui.notifications.error(dict.createEffectFail);
      return;
    }

    ChatMessage.create({
      speaker: { alias: actor.name },
      content: `<b>${actor.name}</b> ${dict.effectAppliedChat}`
    });
  }

  async function resistanceTest() {
    const skillName = dict.resistSkillName;
    const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
    if (!skill) {
      ui.notifications.warn(`${actor.name} ${dict.cannotResist}`);
      await applyJuckpulver();
      return null;
    }

    const setupData = await actor.setupSkill(skill, {}, actor.sheet?.getTokenId?.());
    foundry.utils.setProperty(setupData, "testData.opposable", false);
    const res = await actor.basicTest(setupData);
    return foundry.utils.getProperty(res, "result.successLevel") > 0;
  }

  async function createResistanceEffect() {
    const resistanceEffect = {
      name: dict.resistEffectName,
      icon: dict.resistEffectIcon,
      flags: { dsa5: { description: dict.resistEffectDesc } },
      origin: actor.uuid,
      duration: { seconds: 60 }
    };

    let created;
    try {
      [created] = await actor.createEmbeddedDocuments("ActiveEffect", [resistanceEffect]);
    } catch (err) {
      console.error("Failed to create resistance effect. Consider GM socket mediation.", err);
      ui.notifications.error(dict.createResistFail);
      return;
    }

    const effectId = created.id;
    const hookId = Hooks.on("deleteActiveEffect", async (deletedEffect) => {
      try {
        if (!deletedEffect || deletedEffect.id !== effectId) return;

        const again = await resistanceTest();
        if (again === null) {
          Hooks.off("deleteActiveEffect", hookId);
          return;
        }

        if (again) {
          ui.notifications.info(`${actor.name} ${dict.resistRenewPass}`);
          await createResistanceEffect();
        } else {
          ui.notifications.warn(`${actor.name} ${dict.resistRenewFail}`);
          await applyJuckpulver();
        }

        Hooks.off("deleteActiveEffect", hookId);
      } catch (err) {
        console.error("Error in resistance refresh hook:", err);
        Hooks.off("deleteActiveEffect", hookId);
      }
    });
  }

  // Erste Widerstandsprobe
  const first = await resistanceTest();
  if (first === null) return;
  if (!first) {
    ui.notifications.warn(`${actor.name} ${dict.firstResistFail}`);
    await applyJuckpulver();
    return;
  }
  ui.notifications.info(`${actor.name} ${dict.firstResistPass}`);

  await createResistanceEffect();
})();

  // Effekt initial erstellen
  await createResistanceEffect();

})();
