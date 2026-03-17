// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noTarget: "Kein Ziel ausgewählt! Bitte ein Token anvisieren.",
    noItemClass: "Die DSA5-Itemklasse ist nicht verfügbar.",
    nameBreath: "Rachenputzer",
    burning: "Brennend",
    ctxMissing: "Kontext fehlt: Actor nicht gesetzt.",
    qsInvalid: "Qualitätsstufe (QS) fehlt oder ist ungültig (1–6).",
    combatSkill: "Bögen",
  },
  en: {
    noTarget: "No target selected! Please aim at a token.",
    noItemClass: "The DSA5 item class is not available.",
    nameBreath: "Throat Scrubber",
    burning: "Burning",
    ctxMissing: "Context missing: Actor not set.",
    qsInvalid: "Quality level (QS) missing or invalid (1–6).",
    combatSkill: "Bows",
  },
}[lang];

const sendMessage = async (message) => {
  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(message));
};

if (!actor) {
  await sendMessage(dict.ctxMissing);
  return;
}

const qualityStep = Number(qs) || 0;
if (qualityStep < 1 || qualityStep > 6) {
  await sendMessage(dict.qsInvalid);
  return;
}

const target = Array.from(game.user.targets)[0];
if (!target) {
  await sendMessage(dict.noTarget);
  return;
}

const Itemdsa5 = game?.dsa5?.entities?.Itemdsa5;
if (!Itemdsa5) {
  await sendMessage(dict.noItemClass);
  return;
}

const sourceTokenId = actor.getActiveTokens()[0]?.id;

const dieTable = ["1d6", "1d6+2", "2d6", "2d6+2", "2d6+6", "2d6+6"];
const ranges = ["0/3/3", "0/6/6", "0/8/8", "0/12/12", "0/16/16", "0/32/32"];
const die = dieTable[qualityStep - 1];
const reach = ranges[qualityStep - 1];

const roll = await new Roll(die).evaluate();
const damage = roll.total ?? 0;

const weaponData = {
  name: dict.nameBreath,
  type: "rangeweapon",
  img: "systems/dsa5/icons/categories/Rangeweapon.webp",
  system: {
    damage: { value: String(damage) },
    reloadTime: { value: 0, progress: 0 },
    reach: { value: reach },
    ammunitiongroup: { value: "-" },
    combatskill: { value: dict.combatSkill },
    worn: { value: false },
    structure: { max: 0, value: 0 },
    quantity: { value: 1 },
    price: { value: 0 },
    weight: { value: 0 },
    effect: { value: "", attributes: "" },
  },
  effects: [],
};

if (qualityStep >= 3) {
  weaponData.effects.push({
    name: dict.burning,
    type: "",
    img: "icons/svg/aura.svg",
    changes: [],
    duration: { startTime: null, seconds: null, rounds: null },
    flags: { dsa5: { advancedFunction: 2, args3: `await actor.addCondition("burning");` } },
    disabled: false,
    transfer: false,
  });
}

const weapon = new Itemdsa5(weaponData);

const dialogOptions = {
  mode: "attack",
  bypass: true,
  cheat: true,
  predefinedResult: [{ val: 2, index: 0 }], // auto-hit
};

const sub = Itemdsa5.getSubClass(weapon.type);
const setupData = await sub.setupDialog(
  null,
  dialogOptions,
  weapon,
  actor,
  sourceTokenId
);

setupData.testData.targets = [target.id];
const defenseMalus = qualityStep === 6 ? -2 : 0;
if (Array.isArray(setupData.testData.situationalModifiers)) {
  setupData.testData.situationalModifiers.push({
    name: game.i18n.localize("MODS.defenseMalus"),
    value: defenseMalus,
    type: "defenseMalus",
    selected: true,
  });
}

await actor.basicTest(setupData);
