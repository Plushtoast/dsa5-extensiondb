{
  "name": "Schicksalsrune (Wyrdruna) [erloschen]",
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
      "value": "Die Nutzung dieser Rune im aufgeladenen Zustand gewährt einen Schicksalspunkt. Das Aufladen dauert 2 Stunden.",
      "attributes": ""
    },
    "parent_id": "",
    "tradeLocked": false,
    "equipmentType": {
      "value": "writing"
    },
    "structure": {
      "value": 0,
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
  "effects": [],
  "folder": null,
  "flags": {
    "dsa5": {
      "onUseEffect": "// This is a system macro used for automation. It is disfunctional without the proper context.\n\n// args3 – Wyrdruna komplett:\n// Voraussetzungen: 20 AsP vorhanden UND mind. eine Sonderfähigkeit: \"Tradition (Runenschöpfer)\" ODER \"Zauberrunenkunde\" (beide type=\"specialability\")\n// Ablauf: IN/IN/CH-Probe mit Fähigkeitswert-Bonus (talentValue.value) in Höhe des Levels der SF \"Fate Rune (Wyrdruna)\" → bei Erfolg 20 AsP abziehen → geladene Rune hinzufügen\n// Strukturwert der geladenen Rune = Strukturwert des auslösenden Items; Effektdauer = 2592000 × QS, gedeckelt durch 2592000 × Strukturwert des Auslösers\n// Danach Auslöser (erloschene Rune) um 1 reduzieren oder löschen\n\nconst getProp = foundry.utils.getProperty;\nconst setProp = foundry.utils.setProperty;\nconst lang = game.i18n.lang == \"de\" ? \"de\" : \"en\";\n\nconst dict = {\n  de: {\n    start: \"Wyrdruna: Start\",\n    end: \"Wyrdruna: Ende\",\n    noActor: \"Kein Akteur im Kontext.\",\n    notEnoughAE: \"Nicht genügend Astralenergie (20 AsP benötigt).\",\n    missingReq: \"Voraussetzung fehlt: Tradition (Runenschöpfer) oder Zauberrunenkunde.\",\n    missingFateSF: \"Sonderfähigkeit 'Schicksalsrune (Wyrdruna)' nicht gefunden – Fähigkeitswert-Bonus = 0.\",\n    attrFail: \"Eigenschaftsprobe (IN/IN/CH) misslungen.\",\n    aeConsumed: \"20 AsP abgezogen.\",\n    addedRune: \"Geladene Schicksalsrune erstellt.\",\n    noSourceItem: \"Auslösendes Item nicht gefunden.\",\n    chargedName: \"Schicksalsrune (Wyrdruna)\",\n    neutralName: \"Eigenschaftsprobe: IN/IN/CH\",\n    neutralLabel: \" (Wyrdruna IN/IN/CH)\",\n    reqTradition: \"Tradition (Runenschöpfer)\",\n    reqSkill: \"Zauberrunenkunde\",\n    fateSfName: \"Schicksalsrune (Wyrdruna)\",\n  },\n  en: {\n    start: \"Wyrdruna: Start\",\n    end: \"Wyrdruna: End\",\n    noActor: \"No actor in context.\",\n    notEnoughAE: \"Not enough Astral Energy (requires 20 AE).\",\n    missingReq: \"Missing requirement: Tradition (Rune Crafter) or Rune Lore.\",\n    missingFateSF: \"Special Ability 'Fate Rune (Wyrdruna)' not found – skill value bonus = 0.\",\n    attrFail: \"Attribute check (IN/IN/CH) failed.\",\n    aeConsumed: \"20 AE consumed.\",\n    addedRune: \"Charged Fate Rune created.\",\n    noSourceItem: \"Triggering item not found.\",\n    chargedName: \"Fate Rune (Wyrdruna)\",\n    neutralName: \"Attribute Check: IN/IN/CH\",\n    neutralLabel: \" (Wyrdruna IN/IN/CH)\",\n    reqTradition: \"Tradition (Rune Crafter)\",\n    reqSkill: \"Rune Lore\",\n    fateSfName: \"Fate Rune (Wyrdruna)\",\n  }\n}[lang];\n\ntry {\n  // 0) Auslösendes Item robust ermitteln\n  var sourceItem = null;\n\n  // Flag-Pfad\n  var sourceItemId = null;\n  if (typeof this !== \"undefined\" && this && this.flags && this.flags.dsa5 && typeof this.flags.dsa5.sourceItemId !== \"undefined\") {\n    sourceItemId = this.flags.dsa5.sourceItemId;\n  }\n  if (sourceItemId) {\n    var byId = actor.items.get(sourceItemId);\n    if (byId) sourceItem = byId;\n  }\n\n  // Fallback: this.item\n  if (!sourceItem) {\n    var hasThisItem = (typeof this !== \"undefined\") && this && this.item ? true : false;\n    if (hasThisItem) {\n      if (this.item instanceof Item && this.item.id) {\n        sourceItem = this.item;\n      } else {\n        var fallbackId = getProp(this, \"item.id\");\n        if (fallbackId) {\n          var byFallbackId = actor.items.get(fallbackId);\n          if (byFallbackId) sourceItem = byFallbackId;\n        }\n        if (!sourceItem) {\n          var fallbackName = getProp(this, \"item.name\");\n          if (fallbackName) {\n            var matches = actor.items.filter(i => i.name === fallbackName);\n            if (matches.length === 1) {\n              sourceItem = matches[0];\n            } else if (matches.length > 1) {\n              var srcVal = Number(getProp(this, \"item.system.structure.value\")) || null;\n              if (srcVal !== null) {\n                var same = matches.filter(i => (Number(getProp(i, \"system.structure.value\")) || 0) === srcVal);\n                sourceItem = same.length ? same[0] : matches[0];\n              } else {\n                sourceItem = matches[0];\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n\n  if (!sourceItem) {\n    ui.notifications.warn(dict.noSourceItem);\n    return;\n  }\n\n  // 1) Voraussetzungen prüfen: 20 AsP und Sonderfähigkeiten\n  function getAE() {\n    return Number(getProp(actor, \"system.status.astralenergy.value\")) || 0;\n  }\n  var ae = getAE();\n  if (ae < 20) {\n    ui.notifications.warn(dict.notEnoughAE);\n    return;\n  }\n\n  var hasTradition = !!actor.items.find(i => i.type === \"specialability\" && i.name === dict.reqTradition);\n  var hasSkill = !!actor.items.find(i => i.type === \"specialability\" && i.name === dict.reqSkill);\n  if (!hasTradition && !hasSkill) {\n    ui.notifications.warn(dict.missingReq);\n    return;\n  }\n\n  // 1b) Fähigkeitswert-Bonus aus Level der SF\n  var fateSf = actor.items.find(i => i.type === \"specialability\" && i.name === dict.fateSfName);\n  var fwBonus = 0;\n  if (fateSf) {\n    fwBonus = Number(getProp(fateSf, \"system.step.value\")) || 0;\n  }\n\n  // 2) NEUTRALE IN/IN/CH-Probe ohne Dialog, Skill value (talentValue.value) setzen\n  async function rollININCH(tokenID, options) {\n    const ItemCls = getDocumentClass(\"Item\");\n    const dummy = new ItemCls({\n      name: dict.neutralName,\n      type: \"skill\",\n      system: {\n        characteristic1: { value: \"in\" },\n        characteristic2: { value: \"in\" },\n        characteristic3: { value: \"ch\" }\n      }\n    }, { noHook: true });\n\n    const tok = tokenID\n      || (actor.getActiveTokens && actor.getActiveTokens()?.[0]?.id)\n      || (canvas && canvas.tokens && canvas.tokens.controlled && canvas.tokens.controlled[0] && canvas.tokens.controlled[0].id)\n      || null;\n\n    const setup = await actor.setupSkill(dummy, { subtitle: dict.neutralLabel, ...(options || {}) }, tok);\n\n    // talentValue.value erhöhen\n    const tlvPath = \"testData.source.system.talentValue.value\";\n    const currentTLV = Number(getProp(setup, tlvPath)) || 0;\n    setProp(setup, tlvPath, currentTLV + fwBonus);\n\n    // Standard-Optionen\n    setProp(setup, \"testData.opposable\", false);\n    setProp(setup, \"options.fastForward\", true);\n    setProp(setup, \"options.noDialog\", true);\n    setProp(setup, \"options.render\", false);\n    setProp(setup, \"options.createMessage\", false);\n\n    // Sicherheit: Charakteristiken setzen\n    setProp(setup, \"system.characteristic1.value\", \"in\");\n    setProp(setup, \"system.characteristic2.value\", \"in\");\n    setProp(setup, \"system.characteristic3.value\", \"ch\");\n\n    const res = await actor.basicTest(setup);\n    const qs =\n      Number(getProp(res, \"result.qualityStep\")) ||\n      Number(getProp(res, \"qualityStep\")) ||\n      Number(getProp(res, \"qs\")) || 0;\n\n    return { success: qs > 0, qs, raw: res };\n  }\n\n  const attr = await rollININCH(actor.getActiveTokens?.()?.[0]?.id, {});\n  if (!attr.success) {\n    ui.notifications.warn(dict.attrFail);\n    return;\n  }\n\n  // 3) 20 AsP abziehen\n  ae = getAE();\n  await actor.update({ \"system.status.astralenergy.value\": Math.max(0, ae - 20) });\n\n  // 4) Geladene Rune erzeugen/holen, Strukturwert übernehmen, Effektdauer = 2592000 × QS (gedeckelt durch 2592000 × Strukturwert des Auslösers)\n\n  // ÄNDERUNG: Sicherstellen, dass ausschließlich der GEGENSTAND (equipment) geholt/erstellt wird\n  async function getCompendiumEquipmentByName(name) {\n    const packs = Array.from(game.packs.values()).filter(p => p?.metadata?.system === \"dsa5\");\n    for (const p of packs) {\n      try {\n        const docs = await p.getDocuments({ name });\n        const doc = docs?.[0];\n        if (!doc) continue;\n        const raw = doc.toObject();\n        if (raw?.type === \"equipment\") return raw; // nur Equipment zulassen\n        // wenn erster Treffer kein Equipment ist, keine Sonderfähigkeit übernehmen\n        continue;\n      } catch (e) { /* ignore */ }\n    }\n    return null;\n  }\n\n  const chargedName = dict.chargedName;\n  var chargedObj = await getCompendiumEquipmentByName(chargedName);\n  const srcSP = Number(getProp(sourceItem, \"system.structure.value\")) || 0;\n\n  if (!chargedObj) {\n    // Wenn kein Equipment-Dokument gefunden wurde, baue ein minimales Equipment-Objekt (Name bleibt identisch)\n    chargedObj = {\n      name: chargedName,\n      type: \"equipment\",\n      img: \"systems/dsa5/icons/categories/magicalsign.webp\",\n      system: {\n        structure: { value: srcSP, max: 6 },\n        quantity: { value: 1 },\n        equipmentType: { value: \"writing\" }\n      },\n      effects: []\n    };\n  } else {\n    setProp(chargedObj, \"system.structure.value\", srcSP);\n  }\n\n  const effects = Array.isArray(chargedObj.effects) ? chargedObj.effects : [];\n  if (effects.length === 0) {\n    effects.push({\n      name: chargedObj.name,\n      img: chargedObj.img || \"icons/svg/aura.svg\",\n      changes: [],\n      duration: {},\n      flags: { dsa5: {} },\n      disabled: false,\n      transfer: false\n    });\n  }\n\n  // Effektdauer: 2592000 × QS, gedeckelt durch 2592000 × Strukturwert des Auslösers\n  const maxSeconds = 2592000 * srcSP;\n  const seconds = Math.min(2592000 * (Number(attr.qs) || 0), maxSeconds);\n\n  setProp(effects[0], \"duration.seconds\", Math.max(0, Number(seconds) || 0));\n  setProp(effects[0], \"duration.startTime\", game.time.worldTime);\n  setProp(chargedObj, \"effects\", effects);\n\n  try {\n    await actor.sheet._addLoot(chargedObj);\n  } catch (e) {\n    await actor.createEmbeddedDocuments(\"Item\", [chargedObj]);\n  }\n\n  // 5) Auslösendes Item reduzieren oder löschen\n  const qtyPath = \"system.quantity.value\";\n  const hasQty = getProp(sourceItem, qtyPath) !== undefined;\n  if (hasQty) {\n    const curQty = Number(getProp(sourceItem, qtyPath)) || 0;\n    if (curQty > 1) {\n      const upd = {}; upd[qtyPath] = curQty - 1;\n      await sourceItem.update(upd);\n    } else {\n      await sourceItem.delete();\n    }\n  } else {\n    await sourceItem.delete();\n  }\n\n} catch (e) {\n  console.error(e);\n  ui.notifications.error(\"Wyrdruna args3 error: \" + (e && e.message ? e.message : e));\n}\n"
    }
  },
  "_stats": {
    "coreVersion": "13.348",
    "systemId": "dsa5",
    "systemVersion": "7.3.3",
    "createdTime": 1760276945862,
    "modifiedTime": 1760276945862,
    "lastModifiedBy": "muiLafBEaPUcV6uM",
    "exportSource": {
      "worldId": "eng",
      "uuid": "Item.eF2QMKsbAx2DMhnQ",
      "coreVersion": "13.348",
      "systemId": "dsa5",
      "systemVersion": "7.3.3"
    }
  },
  "ownership": {
    "default": 0
  }
}
