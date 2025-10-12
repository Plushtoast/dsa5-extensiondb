{
  "name": "Schicksalsrune (Wyrdruna)",
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
      "onUseEffect": "// This is a system macro used for automation. It is disfunctional without the proper context.\n\n/*\nSchicksalsrune (Wyrdruna) – onUseEffect (Gegenstand)\n- +1 Schicksalspunkt, falls nicht am Maximum\n- Danach ausschließlich den GEGENSTAND (type: \"equipment\") reduzieren (quantity -1) oder löschen, wenn Menge 1\n- Minimaler Quell-Check: this.parent ODER this.item.id (keine weiteren Fallbacks), strikt type===\"equipment\"\n- Füge anschließend die erloschene Rune (equipment) hinzu und setze deren Strukturwert auf den des verbrauchten Items\n*/\n\nconst { getProperty: GP, setProperty: SP } = foundry.utils;\nconst lang = game.i18n.lang == \"de\" ? \"de\" : \"en\";\nconst dict = {\n  de: {\n    noActor: \"Kein Akteur vorhanden.\",\n    notifyMax: \"Du hast bereits die maximale Anzahl an Schicksalspunkten.\",\n    notifyAdded: \"Schicksalspunkt hinzugefügt.\",\n    notFoundSource: \"Auslösendes Item (Gegenstand) nicht gefunden.\",\n    notEquipment: \"Auslösendes Dokument ist kein Gegenstand (equipment).\",\n    depletedName: \"Schicksalsrune (Wyrdruna) [erloschen]\",\n    addDepletedFail: \"Erloschene Rune konnte nicht hinzugefügt werden.\",\n  },\n  en: {\n    noActor: \"No actor present.\",\n    notifyMax: \"You already have the maximum number of Fate Points.\",\n    notifyAdded: \"Fate Point added.\",\n    notFoundSource: \"Triggering item (equipment) not found.\",\n    notEquipment: \"Triggering document is not an equipment item.\",\n    depletedName: \"Fate Rune (Wyrdruna) [depleted]\",\n    addDepletedFail: \"Could not add depleted rune.\",\n  }\n}[lang];\n\nif (!actor) { ui.notifications.warn(dict.noActor); return; }\n\n// 1) Fate-Points prüfen/erhöhen\nconst curFP = Number(GP(actor, \"system.status.fatePoints.value\")) || 0;\nconst maxFP = Number(GP(actor, \"system.status.fatePoints.max\")) || 0;\nif (maxFP && curFP >= maxFP) { ui.notifications.info(dict.notifyMax); return; }\n\nawait actor.update({ \"system.status.fatePoints.value\": (maxFP ? Math.min(curFP + 1, maxFP) : (curFP + 1)) });\nui.notifications.info(dict.notifyAdded);\n\n// 2) Auslösendes GEGENSTANDS-Item bestimmen: strikt this.parent ODER this.item.id\nlet sourceItem = null;\nif (this && this.parent && this.parent.documentName === \"Item\") {\n  sourceItem = this.parent;\n} else if (this?.item?.id) {\n  sourceItem = actor.items.get(this.item.id) ?? null;\n} else {\n  ui.notifications.warn(dict.notFoundSource);\n  return;\n}\n\n// 3) Verhindere Verwechslung: muss type === \"equipment\" sein\nif (!sourceItem || sourceItem.type !== \"equipment\") {\n  ui.notifications.warn(dict.notEquipment);\n  return;\n}\n\n// Strukturwert des verbrauchten Items merken\nconst srcStructureValue = Number(GP(sourceItem, \"system.structure.value\")) || 0;\n\n// 4) Menge reduzieren oder löschen (ohne weitere Fallbacks)\nconst qtyPath = \"system.quantity.value\";\nconst curQty = Number(GP(sourceItem, qtyPath)) || 0;\n\nif (curQty > 1) {\n  await sourceItem.update({ [qtyPath]: curQty - 1 });\n} else if (curQty === 1) {\n  await sourceItem.delete();\n} else {\n  await sourceItem.delete();\n}\n\n// 5) Erloschene Rune (equipment) laden und hinzufügen, Strukturwert setzen\nasync function getCompendiumEquipmentByName(name) {\n  const packs = Array.from(game.packs.values()).filter(p => p?.metadata?.system === \"dsa5\");\n  for (const p of packs) {\n    try {\n      const docs = await p.getDocuments({ name });\n      if (!docs?.length) continue;\n      const first = docs[0];\n      const raw = first.toObject();\n      if (raw?.type === \"equipment\") return raw; // nur Equipment zulassen\n      // wenn erster Treffer kein Equipment, keinen weiteren Fallback nutzen\n      return null;\n    } catch (e) {}\n  }\n  return null;\n}\n\nconst depletedName = dict.depletedName;\nlet depletedObj = await getCompendiumEquipmentByName(depletedName);\nif (!depletedObj) {\n  // keine Namens-/Typ-Fallbacks – abbrechen\n  ui.notifications.error(dict.addDepletedFail);\n  return;\n}\n\n// Strukturwert auf den des verbrauchten Items setzen\nSP(depletedObj, \"system.structure.value\", srcStructureValue);\n\n// Hinzufügen\ntry {\n  await actor.sheet._addLoot(depletedObj);\n} catch (e) {\n  try {\n    await actor.createEmbeddedDocuments(\"Item\", [depletedObj]);\n  } catch (e2) {\n    console.error(e2);\n    ui.notifications.error(dict.addDepletedFail);\n  }\n}\n"
    }
  },
  "_stats": {
    "coreVersion": "13.348",
    "systemId": "dsa5",
    "systemVersion": "7.3.3",
    "createdTime": 1760276764186,
    "modifiedTime": 1760276764186,
    "lastModifiedBy": "muiLafBEaPUcV6uM",
    "exportSource": {
      "worldId": "eng",
      "uuid": "Item.5Yvf7QJqoCaA5j1f",
      "coreVersion": "13.348",
      "systemId": "dsa5",
      "systemVersion": "7.3.3"
    }
  },
  "ownership": {
    "default": 0
  }
}
