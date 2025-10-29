// This is a system macro used for automation. It is disfunctional without the proper context.


const reduceBy = [1, 1, 1, 2, 3, 4][qs - 1];

const roll = await new Roll(["1d3+3", "1d3+4", "1d3+5", "1d3+6", "1d3+8", "1d3+8"][qs - 1]).evaluate();
const seconds = 3600 * roll.total;

// Aktuelle Furchtstufe lesen 
function getFearLevel() {
  const cond = actor.hasCondition?.("feared");
  if (!cond) return 0;
  const lvl = Number(foundry.utils.getProperty(cond, "flags.dsa5.value"));
  return Number.isFinite(lvl) ? lvl : 0;
}

//  Entfernen oder Reduzieren
const currentFear = getFearLevel();

if (reduceBy >= currentFear) {
  // Volle Entfernung: lösche den ActiveEffect direkt (
  const cond = actor.hasCondition?.("feared");
  if (cond?._id) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", [cond._id]);
  }
} else {
  // Reduzieren um reduceBy
  await actor.addCondition("feared", -reduceBy, false);
}

// Wiederstand
await actor.addCondition({
  name: "Furchtlos-Tropfen",
  img: "icons/svg/aura.svg",
  type: "base",
  changes: [{ key: "system.resistances.effects", mode: 0, value: "feared 4" }],
  duration: { seconds },
  flags: { dsa5: { hideOnToken: true } }
}, 0, false);
