// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang === "de" ? "de" : "en";
const KR = (r) => r * 6;
const dict = {
  de: {
    bloodrush: "Blutrausch",
    qualityLabel: "QS",
  },
  en: {
    bloodrush: "Bloodrush",
    qualityLabel: "QL",
  },
}[lang];

const berserkDurationsKR = { 3: 5, 4: 10, 5: 20, 6: 40 };

const q = Number(typeof qs !== "undefined" ? qs : 0);
if (!q || q < 1 || q > 6) return;

function createCondition({ name, description, changes = [], seconds, onRemove }) {
  const condition = this.effectDummy(item.name, changes, { seconds });

  foundry.utils.mergeObject(condition, {
    name,
    img: item.img ?? condition.img,
    flags: {
      dsa5: {
        description,
        hideOnToken: true,
        ...(onRemove ? { onRemove } : {}),
      },
    },
  });

  return condition;
}

let condition;

switch (q) {
  case 1:
    condition = createCondition.call(this, {
      name: `${item.name} (${dict.qualityLabel}${q})`,
      description: item.name,
      changes: [
        { key: "system.meleeStats.attack", mode: 2, value: 1 },
        { key: "system.meleeStats.parry", mode: 2, value: -2 },
      ],
      seconds: KR(5),
      onRemove: "actor.addCondition('stunned')",
    });
    break;
  case 2:
    condition = createCondition.call(this, {
      name: `${item.name} (${dict.qualityLabel}${q})`,
      description: item.name,
      changes: [
        { key: "system.meleeStats.attack", mode: 2, value: 2 },
        { key: "system.meleeStats.parry", mode: 2, value: -4 },
      ],
      seconds: KR(5),
    });
    break;
  default:
    await actor.addTimedCondition("bloodrush", 1, false, false, {
      name: `${item.name} - ${dict.bloodrush}`,
      duration: { seconds: KR(berserkDurationsKR[q]) },
      flags: {
        dsa5: {
          description: dict.bloodrush,
          hideOnToken: true,
        },
      },
    });
    return;
}

await actor.addCondition(condition);
