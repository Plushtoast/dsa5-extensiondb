// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    perfectedPacifist: "Vollendeter Pazifist",
    perfectedPacifistDescQS4: "Der Anwender wird zum vollendeten Pazifisten. Er versucht alle kulturschaffenden Lebewesen, die er wahrnehmen kann, von der Sinnlosigkeit von Gewalt und Zwietracht zu überzeugen.",
    perfectedPacifistDescQS5: "Der Anwender wird zum vollendeten Pazifisten. Er versucht alle intelligenten Lebewesen (ja, selbst Dämonen), die er wahrnehmen kann, von der Sinnlosigkeit von Gewalt und Zwietracht zu überzeugen.",
    perfectedPacifistDescQS6: "Der Anwender wird zum vollendeten Pazifisten. Er versucht alle intelligenten Lebewesen (ja, selbst Dämonen), die er wahrnehmen kann, von der Sinnlosigkeit von Gewalt und Zwietracht zu überzeugen. Außerdem versucht der Anwender, alle Waffen an sich zu bringen, die er wahrnimmt, und sie zu zerstören. Bei Widerstand bleibt er entschlossen und verwendet sämtliche friedlichen Mittel, die ihm zur Verfügung stehen, um sein Ziel zu erreichen.",
    itemName: "Friedenswasser"
  },
  en: {
    perfectedPacifist: "Perfected Pacifist",
    perfectedPacifistDescQS4: "The user becomes a perfected pacifist. They try to convince all culture-bearing beings they can perceive of the futility of violence and strife.",
    perfectedPacifistDescQS5: "The user becomes a perfected pacifist. They try to convince all intelligent beings (yes, even demons) they can perceive of the futility of violence and strife.",
    perfectedPacifistDescQS6: "The user becomes a perfected pacifist. They try to convince all intelligent beings (yes, even demons) they can perceive of the futility of violence and strife. In addition, the user attempts to seize all weapons they perceive and destroy them. In case of resistance, they remain determined and use all peaceful means at their disposal to achieve their goal.",
    itemName: "Water of Peace"
  }
};

if (typeof qs === "undefined" || !Number.isFinite(qs) || qs < 1) {
  ui.notifications?.warn("QS missing or invalid / QS fehlt oder ist ungültig.");
  return;
}

const reduceBy = [1, 2, 3, 3, 3, 3][qs - 1];

const roll = await new Roll(["1d6", "1d6+2", "1d6+4", "1d6+4", "1d6+4", "1d6+4"][qs - 1]).evaluate();
const seconds = 3600 * roll.total;

// Aktuelle Furchtstufe lesen
function getFearLevel() {
  const cond = actor.hasCondition?.("feared");
  if (!cond) return 0;
  const lvl = Number(foundry.utils.getProperty(cond, "flags.dsa5.value"));
  return Number.isFinite(lvl) ? lvl : 0;
}

// Entfernen oder Reduzieren
const currentFear = getFearLevel();

if (reduceBy >= currentFear) {
  // Volle Entfernung: lösche den ActiveEffect direkt
  const cond = actor.hasCondition?.("feared");
  if (cond?._id) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", [cond._id]);
  }
} else {
  // Reduzieren um reduceBy
  await actor.addCondition("feared", -reduceBy, false);
}

// Widerstand 
await actor.addCondition({
  name: dict[lang].itemName,
  img: "icons/svg/aura.svg",
  type: "base",
  changes: [{ key: "system.resistances.effects", mode: 0, value: "feared 4" }],
  duration: { seconds },
  flags: { dsa5: { hideOnToken: true } }
}, 0, false);

// Zusatzeffekt ab QS 4: "Vollendeter Pazifist"
if (qs >= 4) {
  // Dauer: QS 4 -> 15 Min, ab QS 5 -> 30 Min
  const extraSeconds = qs === 4 ? 15 * 60 : 30 * 60;

  // Beschreibung abhängig von QS
  const description = qs >= 6
    ? dict[lang].perfectedPacifistDescQS6
    : (qs >= 5 ? dict[lang].perfectedPacifistDescQS5 : dict[lang].perfectedPacifistDescQS4);

  // Effekt-Änderungen
  const extraChanges = [
    { key: "system.carryModifier", mode: 0, value: "+1, -1" }
  ];

  // ActiveEffect 
  const aeData = {
    name: dict[lang].perfectedPacifist,
    img: "icons/svg/aura.svg",
    type: "base",
    changes: extraChanges,
    duration: { seconds: extraSeconds },
    flags: {
      dsa5: { hideOnToken: false } 
    },
    description
  };

  foundry.utils.setProperty(aeData, "flags.core", { statusId: "perfected-pacifist" });
  foundry.utils.setProperty(aeData, "flags.dsa5.description", description);
  foundry.utils.setProperty(aeData, "flags.dsa5.inspector", description);

  await actor.addCondition(aeData, 0, false);
}
