// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noTarget: "Kein Ziel ausgewählt! Bitte ein Token anvisieren.",
    namedust: "Bannstaub",
    ctxMissing: "Kontext fehlt: Actor nicht gesetzt.",
    qsInvalid: "Qualitätsstufe (QS) fehlt oder ist ungültig (1–6).",
    noToken: "Kein aktives Token des Auslösers gefunden.",
    noScene: "Keine aktive Szene gefunden.",
    combatSkill: "Wurfwaffen",
    aspLoss: "AsP-Verlust",
    regenBlocked: "Astralregeneration blockiert",
  },
  en: {
    noTarget: "No target selected! Please aim at a token.",
    namedust: "Banedust",
    ctxMissing: "Context missing: Actor not set.",
    qsInvalid: "Quality level (QS) missing or invalid (1–6).",
    noToken: "No active token of the source actor found.",
    noScene: "No active scene found.",
    combatSkill: "Throwing Weapons",
    aspLoss: "AE Loss",
    regenBlocked: "Astral Regeneration Blocked",
  },
};
const L = (k) => (dict?.[lang]?.[k]) ?? k;


if (!actor) { ui.notifications.error(L("ctxMissing")); return; }
if (typeof qs === "undefined" || qs < 1 || qs > 6) { ui.notifications.error(L("qsInvalid")); return; }

const target = Array.from(game.user.targets)[0];
if (!target) { ui.notifications.error(L("noTarget")); return; }

const scene = game.scenes?.active;
if (!scene) { ui.notifications.error(L("noScene")); return; }


const sourceActorDoc = actor;
const sourceTokenId = actor.getActiveTokens()?.[0]?.id;
if (!sourceTokenId) { ui.notifications.error(L("noToken")); return; }

// QS-abhängig
async function rollTotal(formula) { const r = new Roll(formula); await r.evaluate(); return r.total ?? 0; }
async function regenDaysSeconds(q) {
  switch (q) {
    case 1: return 0;
    case 2: return 24*60*60;
    case 3: return (await rollTotal("1d2")+1)*24*60*60;
    case 4: return (await rollTotal("1d3")+2)*24*60*60;
    case 5: return (await rollTotal("1d3")+3)*24*60*60;
    case 6: return (await rollTotal("2d3")+3)*24*60*60;
    default: return 0;
  }
}
async function aeLossAmount(q) {
  switch (q) {
    case 1: return await rollTotal("1d6+2");
    case 2: return await rollTotal("2d6+4");
    case 3: return await rollTotal("3d6+6");
    case 4: return await rollTotal("4d6+8");
    case 5: return await rollTotal("5d6+10");
    case 6: return await rollTotal("6d6+12");
    default: return 0;
  }
}

const reach = "5/10/15";
const blockSeconds = await regenDaysSeconds(qs);
const lossAE = await aeLossAmount(qs);

// args3: Effekt nur nach erfolgreichen Angriff möglich
const args3Script = `
  // This is a system macro used for automation. It is disfunctional without the proper context.
  const utils = foundry.utils;
  if (!actor) {
    ui.notifications.error("${L("ctxMissing")}");
    return;
  }

  const aePath = "system.status.astralenergy.value";
  const current = Number(utils.getProperty(actor, aePath) ?? 0) || 0;
  const newVal = Math.max(0, current - (${lossAE}));

  if (game.dsa5?.apps?.socketedActorTransformation) {
    await game.dsa5.apps.socketedActorTransformation(actor, { [aePath]: newVal });
  } else {
    await actor.update({ [aePath]: newVal });
  }
  ui.notifications.info("${L("aspLoss")}: ${lossAE}");

  if (${blockSeconds} > 0) {
    const eff = {
      name: "${L("regenBlocked")}",
      img: "icons/svg/aura.svg",
      changes: [
        { key: "system.status.regeneration.AsPgearmodifier", mode: 2, value: -100, priority: 60 }
      ],
      duration: { seconds: ${blockSeconds}, startTime: null, rounds: null },
      flags: { dsa5: {}, core: {} },
      disabled: false,
      transfer: false,
    };

    if (typeof this?.socketedConditionAddActor === "function") {
      await this.socketedConditionAddActor([actor], eff);
    } else if (typeof actor.addCondition === "function") {
      await actor.addCondition(eff);
    }
  }
`;

// Dummywaffe 
const Itemdsa5 = game?.dsa5?.entities?.Itemdsa5;
const weapon = new Itemdsa5({
  name: L("namedust"),
  type: "rangeweapon",
  img: "systems/dsa5/icons/categories/Rangeweapon.webp",
  system: {
    damage: { value: "0" },
    reloadTime: { value: 0, progress: 0 },
    reach: { value: reach },
    ammunitiongroup: { value: "-" },
    combatskill: { value: L("combatSkill") }, // de: Wurfwaffen, en: Throwing Weapons
    worn: { value: false },
    structure: { max: 0, value: 0 },
    quantity: { value: 1 },
    price: { value: 0 },
    weight: { value: 0 },
    effect: { value: "", attributes: "" },
  },
  effects: [
    {
      name: L("namedust"),
      type: "",
      img: "icons/svg/aura.svg",
      changes: [],
      duration: { startTime: null, seconds: null, rounds: null },
      flags: { dsa5: { advancedFunction: 2, args3: args3Script } },
      disabled: false,
      transfer: false,
    }
  ]
});

// Dialog: regulärer Angriff, Angreifer = actor (Auslöser)
const sub = Itemdsa5.getSubClass(weapon.type);
const dialogOptions = { mode: "attack", bypass: false, cheat: false };

const setupData = await sub.setupDialog(
  null,
  dialogOptions,
  weapon,
  sourceActorDoc,
  sourceTokenId
);

// Ziel setzen (kein Verteidigungs-Malus mehr)
setupData.testData.targets = [target.id];

// Angriff 
await sourceActorDoc.basicTest(setupData);
