{
  "name": "Fate Rune (Wyrdruna)",
  "type": "specialability",
  "img": "systems/dsa5/icons/categories/ability_general.webp",
  "system": {
    "description": {
      "value": ""
    },
    "gmdescription": {
      "value": ""
    },
    "APValue": {
      "value": "4"
    },
    "requirements": {
      "value": ""
    },
    "rule": {
      "value": ""
    },
    "maxRank": {
      "value": 20
    },
    "step": {
      "value": 1,
      "circle": "1",
      "canNotMultiply": false
    },
    "category": {
      "value": "magicalsign",
      "sub": 0
    },
    "distribution": "",
    "list": {
      "value": ""
    },
    "effect": {
      "value": ""
    },
    "permanentEffects": false,
    "duration": {
      "value": ""
    }
  },
  "effects": [],
  "folder": "Bw8W4TBG5BI4ViSj",
  "flags": {
    "dsa5": {
      "onUseEffect": 
      "// This is a system macro used for automation. It is disfunctional without the proper context.


(async () => {
  const { getProperty, setProperty } = foundry.utils;
  const lang = game.i18n.lang == "de" ? "de" : "en";

  const dict = {
    de: {
      titleSpeed: "Herstellungsgeschwindigkeit",
      titleMaterial: "Material",
      speedText: "Der Träger der Schicksalsrune kann die Rune wie einen Schicksalspunkt einsetzen. Nach dem Einsatz erlischt die Rune.",
      speedHeader: "Herstellungszeit",
      speedSlow: "Langsam",
      speedSlowTip: "4 Tage",
      speedFast: "Schnell",
      speedFastTip: "4 Aktionen",
      skillArt: "Malen & Zeichnen",
      skillCloth: "Stoffbearbeitung",
      skillLeather: "Lederbearbeitung",
      skillMetal: "Metallbearbeitung",
      skillStone: "Steinbearbeitung",
      matLeather: "Lederbearbeitung",
      matArt: "Malen & Zeichnen",
      matMetal: "Metallbearbeitung",
      matStone: "Steinbearbeitung",
      matCloth: "Stoffbearbeitung",
      needsActor: "Dieses Makro benötigt einen Akteur.",
      noBlutrune: "Die SF Blutrunen ist nicht vorhanden – Materialauswahl wird geöffnet.",
      blutruneFound: "SF Blutrunen vorhanden – Geschwindigkeitsauswahl wird geöffnet.",
      aspNotEnough: "Nicht genügend Astralenergie.",
      aspConsumed: "20 AsP abgezogen.",
      talentFail: "Die Handwerksprobe ist misslungen. Prozess beendet.",
      attrFail: "Eigenschaftsprobe misslungen.",
      itemName: "Schicksalsrune (Wyrdruna)",
      itemNameDepleted: "Schicksalsrune (Wyrdruna) [erloschen]",
      sfBlutrune: "Blutrunen",
      notifyCreated: "Rune (geladen) erstellt",
      fastOnUseOverridden: "onUseEffect reduziert: Fate-Point-Check + Itemverbrauch.",
      lepSpentInfo: (spent, before, after) => `LeP abgezogen: ${spent} (von ${before} → ${after}).`,
      neutralName: "Eigenschaftsprobe: IN/IN/CH",
      neutralLabel: " (Wyrdruna IN/IN/CH)",
      effFastSet: (qs, sec) => `Effektdauer (Schnell) gesetzt: QS ${qs} → ${sec} Sekunden.`,
      effSlowSet: (qs, sec) => `Effektdauer (Langsam) gesetzt: QS ${qs} → ${sec} Sekunden.`,
      fateSfName: "Schicksalsrune (Wyrdruna)"
    },
    en: {
      titleSpeed: "Manufacturing Speed",
      titleMaterial: "Material",
      speedText: "The bearer of the Fate Rune can use the rune like a Fate Point. After use, the rune extinguishes.",
      speedHeader: "Manufacturing Time",
      speedSlow: "Slow",
      speedSlowTip: "4 days",
      speedFast: "Fast",
      speedFastTip: "4 actions",
      skillArt: "Artistic Ability",
      skillCloth: "Clothworking",
      skillLeather: "Leatherworking",
      skillMetal: "Metalworking",
      skillStone: "Earthencraft",
      matLeather: "Leatherworking",
      matArt: "Artistic Ability",
      matMetal: "Metalworking",
      matStone: "Earthencraft",
      matCloth: "Clothworking",
      needsActor: "This macro requires an actor.",
      noBlutrune: "The Blood Runes SF is missing – opening speed selection.",
      blutruneFound: "Blood Runes SF found – opening speed selection.",
      aspNotEnough: "Not enough Astral Energy.",
      aspConsumed: "20 AE consumed.",
      talentFail: "The crafting check failed. Process aborted.",
      attrFail: "Attribute check failed.",
      itemName: "Fate Rune (Wyrdruna)",
      itemNameDepleted: "Fate Rune (Wyrdruna) [depleted]",
      sfBlutrune: "Blood Runes",
      notifyCreated: "Rune (charged) created",
      fastOnUseOverridden: "onUseEffect minimized: Fate point check + item consumption.",
      lepSpentInfo: (spent, before, after) => `LP spent: ${spent} (from ${before} → ${after}).`,
      neutralName: "Attribute Check: IN/IN/CH",
      neutralLabel: " (Wyrdruna IN/IN/CH)",
      effFastSet: (qs, sec) => `Effect duration (Fast) set: QS ${qs} → ${sec} seconds.`,
      effSlowSet: (qs, sec) => `Effect duration (Slow) set: QS ${qs} → ${sec} seconds.`,
      fateSfName: "Fate Rune (Wyrdruna)"
    },
  }[lang];

  if (!actor) {
    ui.notifications.warn(dict.needsActor);
    return;
  }

  const hasBlutrune = actor.items.some((i) => i.type === "specialability" && i.name === dict.sfBlutrune);

  // Compendium: Equipment-Item erzwingen (niemals die Sonderfähigkeit nehmen)
  async function getCompendiumEquipmentByName(name) {
    const packs = Array.from(game.packs.values()).filter(p => p?.metadata?.system === "dsa5");
    for (const p of packs) {
      try {
        const docs = await p.getDocuments({ name });
        if (!docs?.length) continue;

        // Versuch: direktes Equipment-Dokument
        const eqDoc = docs.find(d => (d.type || d?.toObject?.().type) === "equipment");
        if (eqDoc) return eqDoc.toObject();

        // Alternativ: iteriere alle Treffer
        for (const d of docs) {
          const raw = d.toObject();
          if (raw?.type === "equipment") return raw;
        }
      } catch (e) { /* weiter */ }
    }
    // Fallback: Minimal-Equipment
    return {
      name,
      type: "equipment",
      img: "systems/dsa5/icons/categories/magicalsign.webp",
      system: {
        description: { value: "" },
        gmdescription: { value: "" },
        price: { value: 0 },
        quantity: { value: 1 },
        weight: { value: 0 },
        effect: { value: "", attributes: "" },
        equipmentType: { value: "writing" },
        structure: { value: 0, max: 6 },
        worn: { value: false, wearable: false }
      },
      effects: []
    };
  }

  function getAsp() {
    return Number(getProperty(actor, "system.status.astralenergy.value")) || 0;
  }
  async function consumeAsp20() {
    const asp = getAsp();
    if (asp < 20) return false;
    await actor.update({ "system.status.astralenergy.value": asp - 20 });
    ui.notifications.info(dict.aspConsumed);
    return true;
  }

  async function rollSkillByName(skillName) {
    const skill = actor.items.find(x => x.type === "skill" && x.name === skillName);
    if (!skill) {
      ui.notifications.error(`${actor.name} ${lang === "de" ? "hat das Talent" : "does not have the skill"} ${skillName}.`);
      return { success: false, qs: 0 };
    }
    const setup = await actor.setupSkill(skill, { subtitle: ` (${dict.itemName})` });
    setProperty(setup, "testData.opposable", false);
    setProperty(setup, "options.fastForward", true);
    setProperty(setup, "options.noDialog", true);
    setProperty(setup, "options.render", false);
    setProperty(setup, "options.createMessage", false);

    const res = await actor.basicTest(setup);
    const qs = Number(getProperty(res, "result.qualityStep")) || 0;
    return { success: qs > 0, qs };
  }

  // Fähigkeitswert-Bonus aus SF "Schicksalsrune (Wyrdruna)" / "Fate Rune (Wyrdruna)" (system.step.value)
  function getFateRuneLevelBonus() {
    const sf = actor.items.find(i => i.type === "specialability" && i.name === dict.fateSfName);
    return Number(getProperty(sf, "system.step.value")) || 0;
  }

  // Neutrale IN/IN/CH-Probe mit bonus auf talentValue.value
  async function rollAttributeININCH(tokenID, options = {}) {
    const cls = getDocumentClass("Item");
    const neutralName = dict.neutralName;
    const neutralLabel = options?.subtitle ?? dict.neutralLabel;

    const tok = tokenID
      ?? actor.getActiveTokens?.()?.[0]?.id
      ?? canvas?.tokens?.controlled?.[0]?.id
      ?? null;

    const dummySkill = new cls({
      name: neutralName, type: "skill",
      system: {
        characteristic1: { value: "in" },
        characteristic2: { value: "in" },
        characteristic3: { value: "ch" }
      }
    }, { noHook: true });

    const setupData = await actor.setupSkill(dummySkill, { ...options, subtitle: neutralLabel }, tok);

    const tlvPath = "testData.source.system.talentValue.value";
    const currentTLV = Number(getProperty(setupData, tlvPath)) || 0;
    const fwBonus = getFateRuneLevelBonus();
    setProperty(setupData, tlvPath, currentTLV + fwBonus);

    setProperty(setupData, "testData.opposable", false);
    setProperty(setupData, "options.fastForward", true);
    setProperty(setupData, "options.noDialog", true);
    setProperty(setupData, "options.render", false);
    setProperty(setupData, "options.createMessage", false);

    const res = await actor.basicTest(setupData);
    const qs =
      Number(getProperty(res, "result.qualityStep")) ||
      Number(getProperty(res, "qualityStep")) ||
      Number(getProperty(res, "qs")) || 0;

    return { ...res, result: { ...(res.result ?? {}), qualityStep: qs } };
  }

  // Schnell-Pfad: LeP IMMER abziehen – auch bei Fehlschlag der Handwerksprobe
  async function spendLePFastPathAlways() {
    const roll = await new Roll("1d3+1").evaluate();
    const damage = Number(roll.total) || 0;
    if (damage <= 0) return;

    if (typeof actor.applyDamage === "function") {
      try {
        const before = Number(getProperty(actor, "system.status.wounds.value")) || 0;
        const max = Number(getProperty(actor, "system.status.wounds.max")) || 0;
        await actor.applyDamage(damage);
        const after = Number(getProperty(actor, "system.status.wounds.value")) || before;
        ui.notifications.info(dict.lepSpentInfo(damage, before, Math.min(after, max)));
        return;
      } catch (e) { /* Fallback unten */ }
    }

    const cur = Number(getProperty(actor, "system.status.wounds.value")) || 0;
    const max = Number(getProperty(actor, "system.status.wounds.max")) || 0;
    const targetWounds = Math.min(cur + damage, max);
    await actor.update({ "system.status.wounds.value": targetWounds });
    ui.notifications.info(dict.lepSpentInfo(damage, cur, targetWounds));
  }

  // Reduzierter onUseEffect – NUR für die im schnellen Pfad erzeugte Instanz setzen
  function buildRuneOnUseEffect() {
    return `
// This is a system macro used for automation. It is disfunctional without the proper context.

/*
Schicksalsrune (Wyrdruna) – onUseEffect (Gegenstand)
- +1 Schicksalspunkt, falls nicht am Maximum
- Danach verbrauchbaren Gegenstand reduzieren (quantity -1) oder löschen, wenn Menge 1
- Keine erloschene Rune erzeugen
*/

const { getProperty: GP } = foundry.utils;
const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein Akteur vorhanden.",
    notifyMax: "Du hast bereits die maximale Anzahl an Schicksalspunkten.",
    notifyAdded: "Schicksalspunkt hinzugefügt.",
    notFoundSource: "Auslösendes Item nicht gefunden.",
  },
  en: {
    noActor: "No actor present.",
    notifyMax: "You already have the maximum number of Fate Points.",
    notifyAdded: "Fate Point added.",
    notFoundSource: "Triggering item not found.",
  }
}[lang];

if (!actor) { ui.notifications.warn(dict.noActor); return; }

const cur = Number(GP(actor, "system.status.fatePoints.value")) || 0;
const max = Number(GP(actor, "system.status.fatePoints.max")) || 0;

if (max && cur >= max) {
  ui.notifications.info(dict.notifyMax);
  return;
}

const next = max ? Math.min(cur + 1, max) : (cur + 1);
await actor.update({ "system.status.fatePoints.value": next });
ui.notifications.info(dict.notifyAdded);

let sourceItem = null;
if (this && this.parent && this.parent.documentName === "Item") {
  sourceItem = this.parent;
} else if (this?.item?.id) {
  sourceItem = actor.items.get(this.item.id) ?? null;
} else if (this?.item?.name) {
  sourceItem = actor.items.find(i => i.type === "equipment" && i.name === this.item.name) ?? null;
}

if (!sourceItem) { ui.notifications.warn(dict.notFoundSource); return; }

const qtyPath = "system.quantity.value";
const hasQty = typeof GP(sourceItem, qtyPath) !== "undefined";
if (hasQty) {
  const curQty = Number(GP(sourceItem, qtyPath)) || 0;
  if (curQty > 1) {
    await sourceItem.update({ [qtyPath]: curQty - 1 });
  } else {
    await sourceItem.delete();
  }
} else {
  await sourceItem.delete();
}
`.trim();
  }

  // Schnell-Pfad: Rune erzeugen und onUseEffect der Instanz auf reduzierten Code setzen
  async function addLoadedRuneWithFastArgs3AndDuration(finalQS_HW, finalQS_IN) {
    const obj = await getCompendiumEquipmentByName(dict.itemName);
    if (!obj || obj.type !== "equipment") {
      ui.notifications.error(`Item vom Typ 'equipment' nicht gefunden: ${dict.itemName}`);
      return;
    }

    // Pflichtfelder absichern
    if (!Number.isFinite(Number(getProperty(obj, "system.quantity.value"))))
      setProperty(obj, "system.quantity.value", 1);
    if (!Number.isFinite(Number(getProperty(obj, "system.structure.max"))))
      setProperty(obj, "system.structure.max", 6);
    const spValue = Math.max(0, Number(finalQS_HW) || 0);
    setProperty(obj, "system.structure.value", spValue);
    if (!getProperty(obj, "system.equipmentType.value"))
      setProperty(obj, "system.equipmentType.value", "writing");

    // Dauer über ersten Effekt
    let effects = Array.isArray(obj.effects) ? obj.effects : [];
    if (effects.length === 0) {
      effects.push({
        name: dict.itemName,
        img: obj.img || "icons/svg/aura.svg",
        changes: [],
        duration: {},
        flags: { dsa5: {} },
        disabled: false,
        transfer: false
      });
    }
    const qsIN = Math.max(0, Number(finalQS_IN) || 0);
    const qsHW = Math.max(0, Number(finalQS_HW) || 0);
    const seconds = Math.min(qsIN, qsHW) * 600;
    setProperty(effects[0], "duration.seconds", seconds);
    setProperty(effects[0], "duration.startTime", game.time.worldTime);
    setProperty(obj, "effects", effects);

    // Item einfügen
    let createdItem = null;
    try {
      await actor.sheet._addLoot(obj);
      // Erzeugte Instanz auffinden
      createdItem = actor.items.find(i =>
        i.type === "equipment" &&
        i.name === dict.itemName &&
        Number(getProperty(i, "system.structure.value")) === spValue
      ) || null;
    } catch (e) {
      try {
        delete obj._id;
        const created = await actor.createEmbeddedDocuments("Item", [obj]);
        createdItem = created?.[0] || null;
      } catch (ee) {
        ui.notifications.error(lang === "de" ? "Rune konnte nicht hinzugefügt werden." : "Could not add rune.");
        console.error(ee);
        return;
      }
    }

    // flags.dsa5.onUseEffect → reduzierter Code
    if (createdItem) {
      const onUseReduced = buildRuneOnUseEffect();
      await createdItem.update({ "flags.dsa5.onUseEffect": onUseReduced });
      ui.notifications.info(dict.fastOnUseOverridden);
    }

    ui.notifications.info(dict.effFastSet(Math.min(qsIN, qsHW), seconds));
    ui.notifications.info(dict.notifyCreated);
  }

  // Langsam-Pfad: Rune unverändert aus dem Compendium (kein Override des onUseEffect)
  async function addLoadedRuneWithSlowDuration(finalQS_HW, finalQS_IN) {
    const obj = await getCompendiumEquipmentByName(dict.itemName);
    if (!obj || obj.type !== "equipment") {
      ui.notifications.error(`Item vom Typ 'equipment' nicht gefunden: ${dict.itemName}`);
      return;
    }

    if (!Number.isFinite(Number(getProperty(obj, "system.quantity.value"))))
      setProperty(obj, "system.quantity.value", 1);
    if (!Number.isFinite(Number(getProperty(obj, "system.structure.max"))))
      setProperty(obj, "system.structure.max", 6);
    const spValue = Math.max(0, Number(finalQS_HW) || 0);
    setProperty(obj, "system.structure.value", spValue);
    if (!getProperty(obj, "system.equipmentType.value"))
      setProperty(obj, "system.equipmentType.value", "writing");

    let effects = Array.isArray(obj.effects) ? obj.effects : [];
    if (effects.length === 0) {
      effects.push({
        name: dict.itemName,
        img: obj.img || "icons/svg/aura.svg",
        changes: [],
        duration: {},
        flags: { dsa5: {} },
        disabled: false,
        transfer: false
      });
    }
    const qsIN = Math.max(0, Number(finalQS_IN) || 0);
    const qsHW = Math.max(0, Number(finalQS_HW) || 0);
    const seconds = Math.min(qsIN, qsHW) * 2592000;
    setProperty(effects[0], "duration.seconds", seconds);
    setProperty(effects[0], "duration.startTime", game.time.worldTime);
    setProperty(obj, "effects", effects);

    try {
      await actor.sheet._addLoot(obj);
    } catch (e) {
      try {
        delete obj._id;
        await actor.createEmbeddedDocuments("Item", [obj]);
      } catch (ee) {
        ui.notifications.error(lang === "de" ? "Rune konnte nicht hinzugefügt werden." : "Could not add rune.");
        console.error(ee);
        return;
      }
    }

    ui.notifications.info(dict.effSlowSet(Math.min(qsIN, qsHW), seconds));
    ui.notifications.info(dict.notifyCreated);
  }

  // Dialoge
  async function openSpeedDialog() {
    const dlg = new Dialog({
      title: dict.titleSpeed,
      content: `
        <div>
          <p>${dict.speedText}</p>
          <p><b>${dict.speedHeader}</b></p>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn-slow" title="${dict.speedSlowTip}">${dict.speedSlow}</button>
            <button type="button" class="btn-fast" title="${dict.speedFastTip}">${dict.speedFast}</button>
          </div>
        </div>
      `,
      buttons: {},
      render: (html) => {
        html.find(".btn-fast").on("click", async () => {
          const skillName = dict.skillArt;

          // 1) Handwerksprobe (Malen & Zeichnen)
          const hw = await rollSkillByName(skillName);
          const hwSuccess = hw.success;
          const hwQS = hw.qs;
          dlg.close();

          // Schnell: LeP IMMER abziehen – auch bei Fehlschlag
          await spendLePFastPathAlways();

          if (!hwSuccess) {
            ui.notifications.warn(dict.talentFail);
            return;
          }

          // 2) IN/IN/CH-Probe
          const attrRes = await rollAttributeININCH(actor.getActiveTokens?.()?.[0]?.id, { subtitle: dict.neutralLabel });
          const attrQS = Number(getProperty(attrRes, "result.qualityStep")) || 0;
          const attrSuccess = attrQS > 0;
          if (!attrSuccess) { ui.notifications.warn(dict.attrFail); return; }

          // 3) AsP prüfen/abziehen
          if (getAsp() < 20) { ui.notifications.warn(dict.aspNotEnough); return; }
          const ok = await consumeAsp20();
          if (!ok) return;

          // 4) Geladene Rune erzeugen und Instanz-Logik reduzieren
          await addLoadedRuneWithFastArgs3AndDuration(hwQS, attrQS);
        });

        html.find(".btn-slow").on("click", async () => {
          dlg.close();
          await openMaterialDialog();
        });
      }
    });
    dlg.render(true);
  }

  async function openMaterialDialog() {
    const dlg = new Dialog({
      title: dict.titleMaterial,
      content: `
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          <button class="mat mat-leather">${dict.matLeather}</button>
          <button class="mat mat-art">${dict.matArt}</button>
          <button class="mat mat-metal">${dict.matMetal}</button>
          <button class="mat mat-stone">${dict.matStone}</button>
          <button class="mat mat-cloth">${dict.matCloth}</button>
        </div>
      `,
      buttons: {},
      render: (html) => {
        const handle = async (skillName) => {
          const hw = await rollSkillByName(skillName);
          const hwSuccess = hw.success;
          const hwQS = hw.qs;
          dlg.close();

          // Langsam: bei Misslingen sofort beenden (keine AsP, keine Rune)
          if (!hwSuccess) { ui.notifications.warn(dict.talentFail); return; }

          const attrRes = await rollAttributeININCH(actor.getActiveTokens?.()?.[0]?.id, { subtitle: dict.neutralLabel });
          const attrQS = Number(getProperty(attrRes, "result.qualityStep")) || 0;
          const attrSuccess = attrQS > 0;

          if (!attrSuccess) { ui.notifications.warn(dict.attrFail); return; }
          if (getAsp() < 20) { ui.notifications.warn(dict.aspNotEnough); return; }
          const ok = await consumeAsp20();
          if (!ok) return;

          // Langsam: Rune unverändert
          await addLoadedRuneWithSlowDuration(hwQS, attrQS);
        };

        html.find(".mat-leather").on("click", () => handle(dict.skillLeather));
        html.find(".mat-art").on("click", () => handle(dict.skillArt));
        html.find(".mat-metal").on("click", () => handle(dict.skillMetal));
        html.find(".mat-stone").on("click", () => handle(dict.skillStone));
        html.find(".mat-cloth").on("click", () => handle(dict.skillCloth));
      }
    });
    dlg.render(true);
  }

  if (hasBlutrune) {
    await openSpeedDialog();
  } else {
    await openMaterialDialog();
  }
})();"
    }
  },

}
