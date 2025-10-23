// This is a system macro used for automation. It is disfunctional without the proper context.

// Hinweis: Angriff/Item-Makro (nicht SF). Charakter = actor (sourceActorDoc = actor), Ziel = game.user.targets[0].
// Burning wird ausschließlich über die DSA5-Condition-API gesetzt/erhöht (interaktiv).
// Wenn Brennend entfernt wird, endet auch der periodische Tick.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noTarget: "Kein Ziel ausgewählt! Bitte ein Token anvisieren.",
    nameelixir: "Hylailer Feuer",
    ctxMissing: "Kontext fehlt: Actor nicht gesetzt.",
    qsInvalid: "Qualitätsstufe (QS) fehlt oder ist ungültig (1–6).",
    noToken: "Kein aktives Token des Auslösers gefunden.",
    noScene: "Keine aktive Szene gefunden.",
    combatSkill: "Wurfwaffen",
    koerperbeherrschung: "Körperbeherrschung",
    transferBlocked: "Das Hylailer Feuer zündet nicht.",
    transferSuccess: "Das Hylailer Feuer zündet.",
    tickMsg: "Hylailer Feuer lodert erneut (Brennend +1).",
    tickStopped: "Das Hylailer Feuer wurde gelöscht.",
  },
  en: {
    noTarget: "No target selected! Please aim at a token.",
    nameelixir: "Hylailic Fire",
    ctxMissing: "Context missing: Actor not set.",
    qsInvalid: "Quality level (QS) missing or invalid (1–6).",
    noToken: "No active token of the source actor found.",
    noScene: "No active scene found.",
    combatSkill: "Throwing Weapons",
    koerperbeherrschung: "Body Control",
    transferBlocked: "The Hylailic Fire does not ignite.",
    transferSuccess: "The Hylailic Fire ignites.",
    tickMsg: "Hylailic Fire flares again (Burning +1).",
    tickStopped: "The Hylailic Fire has been extinguished.",
  },
};
const L = (k) => (dict?.[lang]?.[k]) ?? k;

// Basis-Checks
if (!actor) { ui.notifications.error(L("ctxMissing")); return; }
if (typeof qs === "undefined" || qs < 1 || qs > 6) { ui.notifications.error(L("qsInvalid")); return; }

const target = Array.from(game.user.targets)[0];
if (!target) { ui.notifications.error(L("noTarget")); return; }

const scene = game.scenes?.active;
if (!scene) { ui.notifications.error(L("noScene")); return; }

const sourceActorDoc = actor;
const sourceTokenId = actor.getActiveTokens()?.[0]?.id;
if (!sourceTokenId) { ui.notifications.error(L("noToken")); return; }

// QS => Effekt-Rundendauer (würfeln)
async function rollTotal(formula) {
  const r = new Roll(formula);
  await r.evaluate();
  return r.total ?? 0;
}
async function effectRounds(q) {
  switch (q) {
    case 1: return await rollTotal("1d6");
    case 2: return await rollTotal("1d6+2");
    case 3: return await rollTotal("2d6+4");
    case 4: return await rollTotal("2d6+6");
    case 5: return await rollTotal("3d6+8");
    case 6: return await rollTotal("3d6+10");
    default: return 0;
  }
}

const reach = "2/4/8";
const rounds = await effectRounds(qs);

// args3: Wurf abhängig von QS; nach Treffer: Malus-Effekt + Burning ; Tick alle 5 KR und Stop bei Entfernen
const args3Script = `
// This is a system macro used for automation. It is disfunctional without the proper context.
const utils = foundry.utils;
if (!actor) {
  ui.notifications.error("${L("ctxMissing")}");
  return;
}

// QS aus Außenvariable "qs"
const triggerQS = Number(qs);

// Wurf-Tabelle: QS1: 1-2, QS2: 1-3, QS3: 1-3, QS4: 1-4, QS5: 1-4, QS6: 1-5
const gates = { 1:2, 2:3, 3:3, 4:4, 5:4, 6:5 };
const gate = gates[triggerQS] ?? 2;

// W6-Wurf und Wurfvergleich
const gateRoll = await (new Roll("1d6")).evaluate();
const passed = (gateRoll.total <= gate);

// Einfache Chatmeldung
ChatMessage.create({ content: passed ? "${L("transferSuccess")}" : "${L("transferBlocked")}" });
if (!passed) return;

// Dauer: 6 Sekunden pro KR
const currentWorldTime = game.time.worldTime || 0;
const secondsTotal = (${rounds}) * 6;

// 1) Skill-Malus als eigener Effekt
const skillEff = {
  name: "${L("nameelixir")} - ${L("koerperbeherrschung")} Malus",
  img: "icons/svg/aura.svg",
  changes: [
    { key: "system.skillModifiers.step", mode: 0, value: "${L("koerperbeherrschung")} 5", priority: 20 }
  ],
  duration: { startTime: currentWorldTime, seconds: secondsTotal, rounds: ${rounds} },
  flags: { dsa5: {}, core: {} },
  disabled: false,
  transfer: false
};
await actor.createEmbeddedDocuments("ActiveEffect", [skillEff]);

// 2) Burning 
async function addBurningCondition() {
  if (typeof actor.addCondition === "function") {
    await actor.addCondition("burning");
    return;
  }
  const condEff = {
    name: "${L("nameelixir")} - Brennend",
    img: "icons/svg/fire.svg",
    flags: { dsa5: { conditionId: "burning" }, core: { statusId: "burning" } },
    duration: { startTime: game.time.worldTime || 0, seconds: 6, rounds: 1 },
    disabled: false,
    transfer: false
  };
  if (typeof this?.socketedConditionAddActor === "function") {
    await this.socketedConditionAddActor([actor], condEff);
  } else {
    await actor.createEmbeddedDocuments("ActiveEffect", [condEff]);
  }
}

// Initial sofort 1x Brennend hinzufügen/erhöhen
await addBurningCondition();

// Periodisch alle 5 KR erneut (nur bei aktivem Kampf) UND bei Entfernen von Brennend stoppen
try {
  const combat = game.combat;
  const tickFlagPath = "flags.hylailFireTick";
  let tickHandler = null;
  let stopHandlers = [];

  // Helper: Tick stoppen (Flag deaktivieren, Hook entfernen, Stop-Hooks entfernen)
  const stopTick = async () => {
    const flag = foundry.utils.getProperty(actor, tickFlagPath);
    if (flag?.active) {
      await actor.update({ [tickFlagPath]: { active: false } });
    }
    if (tickHandler) {
      Hooks.off("updateCombat", tickHandler);
      tickHandler = null;
    }
    for (const h of stopHandlers) {
      try { Hooks.off(h.hook, h.fn); } catch {}
    }
    stopHandlers = [];
    ChatMessage.create({ content: "${L("tickStopped")}" });
  };

  // Stop-Listener: wenn Burning-Condition am Actor entfernt wird
  const aeRemovedHandler = async (effect, options, userId) => {
    try {
      if (effect?.parent?.id !== actor.id) return;
      const isBurning = (effect?.flags?.core?.statusId === "burning") || (effect?.flags?.dsa5?.conditionId === "burning") || (effect?.name?.toLowerCase()?.includes("brenn"));
      if (isBurning) await stopTick();
    } catch {}
  };
  Hooks.on("deleteActiveEffect", aeRemovedHandler);
  stopHandlers.push({ hook: "deleteActiveEffect", fn: aeRemovedHandler });

  const itemRemovedHandler = async (item, options, userId) => {
    try {
      if (item?.parent?.id !== actor.id) return;
      const isBurning = (item?.type === "condition" && item?.system?.conditionId === "burning") || (item?.name?.toLowerCase()?.includes("brenn"));
      if (isBurning) await stopTick();
    } catch {}
  };
  Hooks.on("deleteItem", itemRemovedHandler);
  stopHandlers.push({ hook: "deleteItem", fn: itemRemovedHandler });

  if (!combat) {
    console.warn("Hylailic Fire: kein aktiver Kampf – periodischer Tick wird nicht registriert, Stop-Listener bleiben aktiv.");
    await actor.update({ [tickFlagPath]: { active: true, lastAppliedRound: null, endRound: null } });
  } else {
    const startRound = combat.round ?? 0;
    const endRound = startRound + ${rounds};
    await actor.update({ [tickFlagPath]: { active: true, lastAppliedRound: startRound, endRound } });

    tickHandler = async (cmbt, changed, options, userId) => {
      if (cmbt.id !== combat.id) return;
      const currentRound = cmbt?.round ?? 0;
      const flag = foundry.utils.getProperty(actor, tickFlagPath);
      if (!flag?.active) return;

      if (flag.endRound != null && currentRound >= flag.endRound) {
        await stopTick();
        return;
      }

      const delta = currentRound - (flag.lastAppliedRound ?? currentRound);
      if (delta >= 5) {
        await addBurningCondition();
        await actor.update({ [tickFlagPath]: { active: true, lastAppliedRound: currentRound, endRound: flag.endRound } });
        ChatMessage.create({ content: "${L("tickMsg")}" });
      }
    };

    Hooks.on("updateCombat", tickHandler);
  }
} catch (e) {
  console.error("Hylailic Fire periodic tick error:", e);
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
