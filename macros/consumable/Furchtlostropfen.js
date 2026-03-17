// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein gueltiger Akteur gefunden.",
    invalidQs: "QS fehlt oder ist ungueltig.",
  },
  en: {
    noActor: "No valid actor found.",
    invalidQs: "QL is missing or invalid.",
  },
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
    },
  });

  return condition;
}

const reduceBy = [1, 1, 1, 2, 3, 4][qs - 1];

const roll = await new Roll(["1d3+3", "1d3+4", "1d3+5", "1d3+6", "1d3+8", "1d3+8"][qs - 1]).evaluate();
const seconds = 3600 * roll.total;

await actor.removeCondition("feared", reduceBy, false);

const resistanceCondition = createCondition.call(this, {
  changes: [{ key: "system.resistances.effects", mode: 0, value: "feared 4" }],
  seconds,
});

await actor.addCondition(resistanceCondition);
