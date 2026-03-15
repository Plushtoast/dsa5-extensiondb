// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gueltiger Akteur gefunden.",
    invalidQs: "QS fehlt oder ist ungueltig.",
    perfectedPacifist: "Vollendeter Pazifist",
    perfectedPacifistDesc: (qualityStep) => {
      switch (qualityStep) {
        case 4:
          return "Der Anwender wird zum vollendeten Pazifisten. Er versucht alle kulturschaffenden Lebewesen, die er wahrnehmen kann, von der Sinnlosigkeit von Gewalt und Zwietracht zu ueberzeugen.";
        case 5:
          return "Der Anwender wird zum vollendeten Pazifisten. Er versucht alle intelligenten Lebewesen (ja, selbst Daemonen), die er wahrnehmen kann, von der Sinnlosigkeit von Gewalt und Zwietracht zu ueberzeugen.";
        default:
          return "Der Anwender wird zum vollendeten Pazifisten. Er versucht alle intelligenten Lebewesen (ja, selbst Daemonen), die er wahrnehmen kann, von der Sinnlosigkeit von Gewalt und Zwietracht zu ueberzeugen. Ausserdem versucht der Anwender, alle Waffen an sich zu bringen, die er wahrnimmt, und sie zu zerstoeren. Bei Widerstand bleibt er entschlossen und verwendet saemtliche friedlichen Mittel, die ihm zur Verfuegung stehen, um sein Ziel zu erreichen.";
      }
    },
  },
  en: {
    noActor: "No valid actor found.",
    invalidQs: "QL is missing or invalid.",
    perfectedPacifist: "Perfected Pacifist",
    perfectedPacifistDesc: (qualityLevel) => {
      switch (qualityLevel) {
        case 4:
          return "The user becomes a perfected pacifist. They try to convince all culture-bearing beings they can perceive of the futility of violence and strife.";
        case 5:
          return "The user becomes a perfected pacifist. They try to convince all intelligent beings (yes, even demons) they can perceive of the futility of violence and strife.";
        default:
          return "The user becomes a perfected pacifist. They try to convince all intelligent beings (yes, even demons) they can perceive of the futility of violence and strife. In addition, the user attempts to seize all weapons they perceive and destroy them. In case of resistance, they remain determined and use all peaceful means at their disposal to achieve their goal.";
      }
    },
  }
}[lang];

if (!actor) {
  ui.notifications?.error(dict.noActor);
  return;
}

if (typeof qs === "undefined" || !Number.isFinite(qs) || qs < 1) {
  ui.notifications?.warn(dict.invalidQs);
  return;
}

function createCondition({ name = item.name, changes = [], seconds, description, hideOnToken = true }) {
  const condition = this.effectDummy(name, changes, { seconds });

  foundry.utils.mergeObject(condition, {
    img: item.img ?? condition.img,
    flags: {
      dsa5: {
        hideOnToken,
        ...(description ? { description, inspector: description } : {}),
      },
      ...(coreFlags ? { core: coreFlags } : {}),
    },
  });

  return condition;
}

const reduceBy = [1, 2, 3, 3, 3, 3][qs - 1];

const roll = await new Roll(["1d6", "1d6+2", "1d6+4", "1d6+4", "1d6+4", "1d6+4"][qs - 1]).evaluate();
const seconds = 3600 * roll.total;

await actor.removeCondition("feared", reduceBy, false);

const resistanceCondition = createCondition.call(this, {
  changes: [{ key: "system.resistances.effects", mode: 0, value: "feared 4" }],
  seconds,
});

await actor.addCondition(resistanceCondition);

// Zusatzeffekt ab QS 4: "Vollendeter Pazifist"
if (qs >= 4) {
  // Dauer: QS 4 -> 15 Min, ab QS 5 -> 30 Min
  const extraSeconds = qs === 4 ? 15 * 60 : 30 * 60;

  const description = dict.perfectedPacifistDesc(qs);

  const pacifistCondition = createCondition.call(this, {
    name: dict.perfectedPacifist,
    seconds: extraSeconds,
    description,
    hideOnToken: false,
  });

  await actor.addCondition(pacifistCondition);
}
