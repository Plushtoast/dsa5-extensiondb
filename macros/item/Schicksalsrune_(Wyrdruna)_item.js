{
  "name": "Fate Rune (Wyrdruna)",
  "type": "equipment",
  "img": "systems/dsa5/icons/categories/magicalsign.webp",
  "system": {
    "description": {
      "value": ""
    },
    "gmdescription": {
      "value": ""
    },
    "obfuscation": {
      "details": false,
      "description": false,
      "enchantment": false,
      "effects": false
    },
    "price": {
      "value": 0
    },
    "quantity": {
      "value": 1
    },
    "weight": {
      "value": 0
    },
    "effect": {
      "value": "Die Nutzung dieser Rune gewährt einen Schicksalspunkt.",
      "attributes": ""
    },
    "parent_id": "",
    "tradeLocked": false,
    "equipmentType": {
      "value": "writing"
    },
    "structure": {
      "value": 1234,
      "max": 6
    },
    "capacity": 0,
    "region": "",
    "worn": {
      "value": false,
      "wearable": false
    },
    "isArtifact": false
  },
  "effects": [
    {
      "name": "Schicksalsrune (Wyrdruna)",
      "origin": "Actor.umeOHbLeX4T8QMmp.Item.HpKqqhLIwblVFIi9",
      "flags": {
        "dsa5": {
          "description": "Schicksalsrune (Wyrdruna)",
          "auto": null,
          "manual": 0,
          "value": null,
          "hideOnToken": false,
          "hidePlayers": false,
          "isAura": false,
          "disposition": "0",
          "auraRadius": "",
          "borderColor": "",
          "borderThickness": null,
          "removeMessage": "",
          "onRemove": "const qtyPath = \"system.quantity.value\";\nconst curQty = Number(GP(sourceItem, qtyPath)) || 0;\n\nif (curQty > 1) {\n  await sourceItem.update({ [qtyPath]: curQty - 1 });\n} else if (curQty === 1) {\n  await sourceItem.delete();\n} else {\n  await sourceItem.delete();\n}"
        }
      },
      "img": "icons/svg/aura.svg",
      "_id": "8oZN3yWQk8vd5Pkv",
      "type": "base",
      "system": {},
      "changes": [
        {
          "key": "system.carryModifier",
          "mode": 2,
          "value": "+1, -1",
          "priority": null
        }
      ],
      "disabled": false,
      "duration": {
        "startTime": null,
        "combat": null,
        "seconds": null,
        "rounds": null,
        "turns": null,
        "startRound": null,
        "startTurn": null
      },
      "description": "",
      "tint": "#ffffff",
      "transfer": true,
      "statuses": [],
      "sort": 0,
      "_stats": {
        "coreVersion": "13.348",
        "systemId": "dsa5",
        "systemVersion": "7.3.3",
        "lastModifiedBy": null
      }
    }
  ],
  "folder": null,
  "flags": {
    "dsa5": {
      "onUseEffect": "//This is a system macro used for automation. It is disfunctional without the proper context.
const { getProperty: GP, setProperty: SP } = foundry.utils;
const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    noActor: "Kein Akteur vorhanden.",
    notifyMax: "Du hast bereits die maximale Anzahl an Schicksalspunkten.",
    notifyAdded: "Schicksalspunkt hinzugefügt.",
    notFoundSource: "Auslösendes Item (Gegenstand) nicht gefunden.",
    notEquipment: "Auslösendes Dokument ist kein Gegenstand (equipment).",
    depletedName: "Schicksalsrune (Wyrdruna) [erloschen]",
    addDepletedFail: "Erloschene Rune konnte nicht hinzugefügt werden.",
  },
  en: {
    noActor: "No actor present.",
    notifyMax: "You already have the maximum number of Fate Points.",
    notifyAdded: "Fate Point added.",
    notFoundSource: "Triggering item (equipment) not found.",
    notEquipment: "Triggering document is not an equipment item.",
    depletedName: "Fate Rune (Wyrdruna) [depleted]",
    addDepletedFail: "Could not add depleted rune.",
  }
}[lang];

if (!actor) { ui.notifications.warn(dict.noActor); return; }

// 1) Fate-Points prüfen/erhöhen
const curFP = Number(GP(actor, "system.status.fatePoints.value")) || 0;
const maxFP = Number(GP(actor, "system.status.fatePoints.max")) || 0;
if (maxFP && curFP >= maxFP) { ui.notifications.info(dict.notifyMax); return; }

await actor.update({ "system.status.fatePoints.value": (maxFP ? Math.min(curFP + 1, maxFP) : (curFP + 1)) });
ui.notifications.info(dict.notifyAdded);

// 2) Auslösendes GEGENSTANDS-Item bestimmen: strikt this.parent ODER this.item.id
let sourceItem = null;
if (this && this.parent && this.parent.documentName === "Item") {
  sourceItem = this.parent;
} else if (this?.item?.id) {
  sourceItem = actor.items.get(this.item.id) ?? null;
} else {
  ui.notifications.warn(dict.notFoundSource);
  return;
}

// 3) Verhindere Verwechslung: muss type === "equipment" sein
if (!sourceItem || sourceItem.type !== "equipment") {
  ui.notifications.warn(dict.notEquipment);
  return;
}

// Strukturwert des verbrauchten Items merken
const srcStructureValue = Number(GP(sourceItem, "system.structure.value")) || 0;

// 4) Menge reduzieren oder löschen (ohne weitere Fallbacks)
const qtyPath = "system.quantity.value";
const curQty = Number(GP(sourceItem, qtyPath)) || 0;

if (curQty > 1) {
  await sourceItem.update({ [qtyPath]: curQty - 1 });
} else if (curQty === 1) {
  await sourceItem.delete();
} else {
  await sourceItem.delete();
}

// 5) Erloschene Rune (equipment) laden und hinzufügen, Strukturwert setzen
async function getCompendiumEquipmentByName(name) {
  const packs = Array.from(game.packs.values()).filter(p => p?.metadata?.system === "dsa5");
  for (const p of packs) {
    try {
      const docs = await p.getDocuments({ name });
      if (!docs?.length) continue;
      const first = docs[0];
      const raw = first.toObject();
      if (raw?.type === "equipment") return raw; // nur Equipment zulassen
      // wenn erster Treffer kein Equipment, keinen weiteren Fallback nutzen
      return null;
    } catch (e) {}
  }
  return null;
}

const depletedName = dict.depletedName;
let depletedObj = await getCompendiumEquipmentByName(depletedName);
if (!depletedObj) {
  // keine Namens-/Typ-Fallbacks – abbrechen
  ui.notifications.error(dict.addDepletedFail);
  return;
}

// Strukturwert auf den des verbrauchten Items setzen
SP(depletedObj, "system.structure.value", srcStructureValue);

// Hinzufügen
try {
  await actor.sheet._addLoot(depletedObj);
} catch (e) {
  try {
    await actor.createEmbeddedDocuments("Item", [depletedObj]);
  } catch (e2) {
    console.error(e2);
    ui.notifications.error(dict.addDepletedFail);
  }
}
"
    }
  },
  "_stats": {
    }
  },
  "ownership": {
    "default": 0
  }
}
