// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noTarget: "Kein Ziel ausgewählt! Bitte ein Token anvisieren.",
    nameelixir: "Alchimistensäure",
    ctxMissing: "Kontext fehlt: Actor nicht gesetzt.",
    qsInvalid: "Qualitätsstufe (QS) fehlt oder ist ungültig (1–6).",
    noToken: "Kein aktives Token des Auslösers gefunden.",
    noScene: "Keine aktive Szene gefunden.",
    combatSkill: "Wurfwaffen",
    koerperbeherrschung: "Körperbeherrschung",
  },
  en: {
    noTarget: "No target selected! Please aim at a token.",
    nameelixir: "Alchemist's acid",
    ctxMissing: "Context missing: Actor not set.",
    qsInvalid: "Quality level (QS) missing or invalid (1–6).",
    noToken: "No active token of the source actor found.",
    noScene: "No active scene found.",
    combatSkill: "Throwing Weapons",
    koerperbeherrschung: "Body Control",
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

// QS = Rundendauer
async function rollTotal(formula) {
  const r = new Roll(formula);
  await r.evaluate();
  return r.total ?? 0;
}

async function effectRounds(q) {
  switch (q) {
    case 1: return await rollTotal("1d3");
    case 2: return await rollTotal("1d6");
    case 3: return await rollTotal("1d6+2");
    case 4: return await rollTotal("1d6+4");
    case 5: return await rollTotal("1d6+6");
    case 6: return await rollTotal("1d6+8");
    default: return 0;
  }
}

const reach = "2/4/8";
const rounds = await effectRounds(qs);

// args3: Effekt nur nach erfolgreichem Angriff; setzt rundenbasierten Effekt auf das Ziel
const args3Script = `
  // This is a system macro used for automation. It is disfunctional without the proper context.
  const utils = foundry.utils;
  if (!actor) {
    ui.notifications.error("${L("ctxMissing")}");
    return;
  }
  // Effekt auf den getroffenen Akteur anwenden.
  const eff = {
    name: "${L("nameelixir")}",
    img: "icons/svg/aura.svg",
    changes: [
      // Proben auf Körperbeherrschung sind um 2 erschwert
      { key: "system.skillModifiers.step", mode: 0, value: "${L("koerperbeherrschung")} 2", priority: 20 },
      { key: "system.repeatingEffects.startOfRound.wounds", mode: 0, value: "-1d3", priority: 20 }
    ],
    duration: { startTime: null, seconds: null, rounds: ${rounds} },
    flags: { dsa5: {}, core: {} },
    disabled: false,
    transfer: false
  };

  if (typeof this?.socketedConditionAddActor === "function") {
    await this.socketedConditionAddActor([actor], eff);
  } else if (typeof actor.addCondition === "function") {
    await actor.addCondition(eff);
  }
`;

// Dummywaffe
const Itemdsa5 = game?.dsa5?.entities?.Itemdsa5;
const weapon = new Itemdsa5({
  name: L("nameelixir"),
  type: "rangeweapon",
  img: "systems/dsa5/icons/categories/Rangeweapon.webp",
  system: {
    damage: { value: "0" },
    reloadTime: { value: 0, progress: 0 },
    reach: { value: reach },
    ammunitiongroup: { value: "-" },
    combatskill: { value: L("combatSkill") }, 
    worn: { value: false },
    structure: { max: 0, value: 0 },
    quantity: { value: 1 },
    price: { value: 0 },
    weight: { value: 0 },
    effect: { value: "", attributes: "" },
  },
  effects: [
    {
      name: L("nameelixir"),
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

const sub = Itemdsa5.getSubClass(weapon.type);
const dialogOptions = { mode: "attack", bypass: false, cheat: false };

const setupData = await sub.setupDialog(
  null,
  dialogOptions,
  weapon,
  sourceActorDoc,
  sourceTokenId
);

// Ziel setzen
setupData.testData.targets = [target.id];

// Angriff
await sourceActorDoc.basicTest(setupData);
