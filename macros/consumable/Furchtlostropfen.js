// This is a system macro used for automation. It is disfunctional without the proper context.

// QS-abhängige Werte
const reduceBy = [1, 1, 1, 2, 3, 4][qs - 1];

// Dauer ermitteln
const roll = await new Roll(["1d3+3", "1d3+4", "1d3+5", "1d3+6", "1d3+8"][qs - 1]).evaluate();
const seconds = 3600 * roll.total;

// Stufe aus actor.hasCondition("feared") herauslesen
function getCurrentFearLevelFromHasCondition() {
  const cond = actor.hasCondition?.("feared");
  if (!cond) return 0;
  const changeLevel = (cond.changes || [])
    .map(c => {
      const m = String(c.value ?? "").match(/feared\s+(\d+)/i);
      return m ? Number(m[1]) : null;
    })
    .find(v => Number.isFinite(v));
  if (Number.isFinite(changeLevel)) return changeLevel;

  const lvlA = Number(foundry.utils.getProperty(cond, "flags.dsa5.level"));
  if (Number.isFinite(lvlA)) return lvlA;
  const lvlB = Number(foundry.utils.getProperty(cond, "flags.dsa5.value"));
  if (Number.isFinite(lvlB)) return lvlB;

  return 0;
}

//  Reduktion: 
let current = getCurrentFearLevelFromHasCondition();
for (let i = 0; i < reduceBy && current > 0; i++) {
  await actor.addCondition("feared", -1, false);
  current = getCurrentFearLevelFromHasCondition();
}

//  Falls Level jetzt 0: „feared“-Effekt entfernen 
if (current <= 0 && typeof actor.removeCondition === "function") {
  await actor.removeCondition("feared");
}

// Temporären Resistenz-Effekt setzen: feared auf dropFear
const tempEffect = {
  name: "Furchtlos-Tropfen",
  img: "icons/svg/aura.svg",
  type: "base",
  changes: [
    { key: "system.resistances.effects", mode: 0, value: `feared 4` }
  ],
  duration: { seconds },
  flags: { dsa5: { hideOnToken: true } }
};
await actor.createEmbeddedDocuments("ActiveEffect", [tempEffect]);

