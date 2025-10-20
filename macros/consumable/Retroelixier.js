// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const { getProperty: getProp, hasProperty: hasProp, duplicate: dup, mergeObject: mergeObj } = foundry.utils;

const dict = {
  de: {
    title: "Retro-Elixier: Reanimation",
    needTarget: "Bitte genau ein Ziel anvisieren.",
    targetNoActor: "Das Ziel ist kein Akteur.",
    notDefeated: "Ziel ist nicht besiegt.",
    lepMaxPath: "system.status.wounds.max",
    invalidDrop: "Nur Akteure (Tokens/Actors) dürfen hier abgelegt werden.",
    notifyNoScene: "Keine aktive Szene gefunden.",
    legend: "Beschwörung",
    imgTooltip: "Charakter",
    nameLabel: "Name:",
    nameEmpty: "Keine Beschwörung aktiv (drag and drop, mindestens Observerrechte)",
    typeLabel: "Typus:",
    sizeLabel: "Größenkategorie:",
    reanimate: "Reanimieren",
    cancel: "Abbrechen",
    chatSpawnInfo: (name, size, qs) => `<b>${name}</b> wird als Untoter beschworen (QS ${qs}). Größenkategorie: <b>${size ?? "-"}</b>.`,
    spawnFail: "Beschwörung fehlgeschlagen (Token konnte nicht erstellt werden).",
    infoLegend: "Hinweise zur Zustandsbestimmung",
    modpackLegendMain: "Modifikationspaket",
    modpackLegendExtra: "Weitere Zustandsmerkmale",
    extraHint: "Wähle genau ein Zusatzpaket (optional) und/oder „Unvollständiger Körper“ zusätzlich.",
    mainRequired: "Bitte wähle zuerst ein Modifikationspaket (Lebender Leichnam, Skelett oder Mumie).",
    extraOnlyOne: "Bitte wähle höchstens ein Zusatzpaket.",
  },
  en: {
    title: "Retro Elixir: Reanimation",
    needTarget: "Please target exactly one token.",
    targetNoActor: "The target is not an actor.",
    notDefeated: "Target is not defeated.",
    lepMaxPath: "system.status.wounds.max",
    invalidDrop: "Only actor documents can be dropped here.",
    notifyNoScene: "No active scene found.",
    legend: "Summoning",
    imgTooltip: "Character",
    nameLabel: "Name:",
    nameEmpty: "No summoning active (drag and drop, at least observer permission)",
    typeLabel: "Type:",
    sizeLabel: "Size Category:",
    reanimate: "Reanimate",
    cancel: "Cancel",
    chatSpawnInfo: (name, size, qs) => `<b>${name}</b> is summoned as undead (QL ${qs}). Size Category: <b>${size ?? "-"}</b>.`,
    spawnFail: "Summoning failed (could not create token).",
    infoLegend: "Notes on state determination",
    modpackLegendMain: "Modification Package",
    modpackLegendExtra: "Additional State Modifiers",
    extraHint: "Select at most one extra package (optional) and/or \"Unvollständiger Körper\" additionally.",
    mainRequired: "Please select a main modification package first (Lebender Leichnam, Skelett or Mumie).",
    extraOnlyOne: "Please select at most one extra package.",
  }
}[lang];

/* Hilfsfunktionen */
function readSizeCategoryRaw(act) {
  const raw = getProp(act, "system.status.size.value");
  const norm = String(raw ?? "").toLowerCase().trim();
  return norm || null;
}
function localizeSize(norm) {
  const map = {
    tiny: { de: "Winzig", en: "Tiny" },
    small: { de: "Klein", en: "Small" },
    average: { de: "Mittel", en: "Medium" },
    big: { de: "Groß", en: "Large" },
    giant: { de: "Riesig", en: "Huge" },
    winzig: { de: "Winzig", en: "Tiny" },
    klein: { de: "Klein", en: "Small" },
    mittel: { de: "Mittel", en: "Medium" },
    groß: { de: "Groß", en: "Large" },
    riesig: { de: "Riesig", en: "Huge" },
  };
  const entry = map[norm];
  return entry ? entry[lang] : (norm || "-");
}
function readLePMax(act) {
  const v = getProp(act, dict.lepMaxPath);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function readClassValueString(act) {
  const val = getProp(act, "system.creatureClass.value");
  return val || "";
}

/* QS-Abhängige Arrays und Dauer */
async function computeQSArrays(qs) {
  const atArr  = [0, 1, 1, 1, 2, 2];
  const rsArr  = [0, 0, 1, 1, 1, 2];
  const loyArr = [1, 1, 1, 2, 2, 2];

  let durationSeconds = 0;
  if (qs <= 2) {
    const r = new Roll("1d3"); await r.evaluate();
    durationSeconds = r.total * 24 * 60 * 60;
  } else if (qs <= 4) {
    const r = new Roll("1d6 + 3"); await r.evaluate();
    durationSeconds = r.total * 24 * 60 * 60;
  } else {
    const r = new Roll("2d6 + 8"); await r.evaluate();
    durationSeconds = r.total * 24 * 60 * 60;
  }

  const idx = qs - 1;
  return { at: atArr[idx], rs: rsArr[idx], loy: loyArr[idx], durationSeconds };
}

/* Update-Helper */
async function updateActorWithSockets(actorDoc, updateData) {
  try {
    await actorDoc.update(updateData);
  } catch (e) {
    ui.notifications.warn(lang === "de" ? "Update fehlgeschlagen (Rechte?)." : "Update failed (permissions?).");
  }
}

/* Token-Update: */
async function updateTokenWithSockets(tokenDoc, updateData) {
  try {
    await tokenDoc.update(updateData);
  } catch (e) {
    ui.notifications.warn(lang === "de" ? "Token-Update fehlgeschlagen (Rechte?)." : "Token update failed (permissions?).");
  }
}

/* Effekt anlegen: bevorzugt addCondition, sonst createEmbeddedDocuments */
async function addEffectWithSockets(actorDoc, effectData, tokenIdOptional = null) {
  try {
    if (typeof actorDoc.addCondition === "function") {
      await actorDoc.addCondition(effectData);
      return;
    }
    await actorDoc.createEmbeddedDocuments("ActiveEffect", [effectData]);
  } catch (e) {
    ui.notifications.warn(lang === "de" ? "Effekt-Erstellung fehlgeschlagen (Rechte?)." : "Effect creation failed (permissions?).");
  }
}

/* Item hinzufügen: createEmbeddedDocuments */
async function addItemWithSockets(actorDoc, itemData) {
  try {
    await actorDoc.createEmbeddedDocuments("Item", [itemData]);
  } catch (e) {
    ui.notifications.warn(lang === "de" ? "Item-Erstellung fehlgeschlagen (Rechte?)." : "Item creation failed (permissions?).");
  }
}

/* Skill „Loyalität (Untot)“ hinzufügen */
async function addSkillLoyalitaetUntot(actorDoc) {
  const talentName = "Loyalität (Untot)";
  let itemData = null;
  for (const pack of game.packs.filter(p => p.metadata.type === "Item" && p.metadata.system === "dsa5")) {
    try {
      const index = await pack.getIndex();
      const entry = index.find(e => e.name === talentName && e.type === "skill");
      if (entry) { const doc = await pack.getDocument(entry._id); itemData = doc.toObject(); break; }
    } catch (e) {}
  }
  if (!itemData) { return; }
  await addItemWithSockets(actorDoc, itemData);
}

/* Modpaket-Item hinzufügen aus UUID */
async function addModPackItem(actorDoc, itemUuid) {
  const doc = await fromUuid(itemUuid);
  if (!doc || doc.documentName !== "Item") { return; }
  await addItemWithSockets(actorDoc, doc.toObject());
}

/* Effekt-Builder: Retroelixier */
function buildRetroelixierEffect(qsData, originSourceUuid) {
  const { durationSeconds, at, rs, loy } = qsData;

  const changes = [];
  if (at) {
    changes.push({ key: "system.meleeStats.attack", mode: 2, value: at });
    changes.push({ key: "system.rangeStats.attack", mode: 2, value: at });
  }
  if (rs) changes.push({ key: "system.totalArmor", mode: 2, value: rs });
  if (loy) changes.push({ key: "system.skillModifiers.FP", mode: 0, value: `Loyalität (Untot) ${loy}` });

  const onRemoveCode = `
    await actor.addCondition("dead");
    await actor.update({ "system.status.wounds.value": 0 });
  `;

  return {
    name: "Retroelixier",
    origin: originSourceUuid || actor?.uuid || "Platzhalterorigin",
    icon: "icons/svg/aura.svg",
    changes,
    duration: { seconds: durationSeconds, startTime: game.time.worldTime },
    flags: { dsa5: { description: "Retroelixier", onRemove: onRemoveCode } }
  };
}

/* Sichtbarkeits-Effekt-Builder mit externer Dauer */
function buildVisibilityToggleEffectForTokenWithSeconds(tokenDoc, seconds, willBeHiddenAfter) {
  const onRemoveCode = `
    const tokenId = "${tokenDoc.id}";
    const sceneId = "${tokenDoc.parent?.id}";
    const newHidden = ${JSON.stringify(willBeHiddenAfter)};
    const token = canvas?.scene?.tokens?.get(tokenId);
    if (game.user.isGM) {
      if (token) await token.update({ hidden: newHidden });
    } else {
      await game.socket.emit("world", {
        type: "updateDocument",
        documentType: "Token",
        scope: "world",
        collection: "tokens",
        data: { _id: tokenId, hidden: newHidden },
        options: { diff: true },
        parent: { type: "Scene", id: sceneId }
      });
    }
  `;

  return {
    name: lang === "de" ? "Zeit zur Reanimation" : "Zeit zur Reanimation",
    icon: "icons/svg/clockwork.svg",
    duration: { seconds, startTime: game.time.worldTime },
    flags: { dsa5: { description: "Sichtbarkeitstimer", onRemove: onRemoveCode } },
    changes: []
  };
}

/* 1) Zielprüfung */
const targets = Array.from(game.user.targets);
if (targets.length !== 1) { ui.notifications.warn(dict.needTarget); return; }
const target = targets[0];
const targetActor = target?.actor;
if (!targetActor) { ui.notifications.warn(dict.targetNoActor); return; }

/* 2) Status „besiegt“ prüfen */
const isDefeated =
  !!(target.document?.combatant?.defeated ?? false) ||
  !!target.actor?.effects?.some(e =>
    e?.getFlag?.("core", "statusId") === "defeated" ||
    e?.name?.toLowerCase?.() === "besiegt"
  );
if (!isDefeated) {
  ui.notifications.info(dict.notDefeated);
  return;
}

/* 3) GUI und Logik */
let shownActor = targetActor;
let selectedSize = "average";

/* Lokalisierte Größenoptionen ohne Mods in Labels */
const sizeMap = [
  { value: "tiny" },
  { value: "small" },
  { value: "average" },
  { value: "big" },
  { value: "giant" },
];
const sizeOptionsHtml = sizeMap.map(({ value }) => {
  const label = localizeSize(value);
  const sel = value === selectedSize ? ' selected' : '';
  return `<option value="${value}"${sel}>${label}</option>`;
}).join("");

/* Feld: Hinweise */
const guideHtml = `
<fieldset class="gap0px" style="margin-top:8px;">
  <legend>${dict.infoLegend}</legend>
  <div style="padding:10px; border:1px solid var(--color-border-light-primary,#999); border-radius:8px; background:var(--color-bg-option,#f3f3f3); line-height:1.3;">
    <p style="margin:0 0 8px 0;">
      Zunächst musst du den Todeszustand der Leiche oder des Kadavers bestimmen.
      Entweder handelt es sich um die Kategorie <b>Lebender Leichnam</b> (es ist also
      noch ausreichend Fleisch auf den Knochen vorhanden), <b>Skelett</b> (nur noch Knochen)
      oder <b>Mumie</b> (konservierte Leiche).
    </p>
    <p style="margin:0 0 8px 0;">
      Die Zustandspakete geben an, wie die Werte des lebendigen Wesens zu modifizieren sind.
      Möchte man also z. B. das Skelett eines Trolls erheben, so werden die Werte des Trolls
      mit den entsprechenden Werten aus dem Modifikationspaket modifiziert.
    </p>
    <p style="margin:0 0 8px 0;">
      Der Eintrag <b>neu</b> in den Paketbeschreibungen bedeutet, dass dieser Wert anstelle des alten Werts des Lebewesens eingesetzt wird.
    </p>
    <p style="margin:0;">
      Wenn ein Kadaver noch weitere Zustandsmerkmale aufweist, kommen noch die weiteren Modifikatoren hinzu
      (z. B. <b>Brandleichnam</b>).
    </p>
  </div>
</fieldset>
`;

/* Paket-Definition */
const PACKS = {
  main: [
    { key: "lebender", name: "Lebender Leichnam",  uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.kLbStO87YJC1MGl9", hasBaseItem: true },
    { key: "skelett",  name: "Skelett",            uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.fLsAlG18Irm33WbE", hasBaseItem: true },
    { key: "mumie",    name: "Mumie",              uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.4up7Ds2u1bvNW4r0", hasBaseItem: true },
  ],
  extraByMain: {
    lebender: [
      { name: "Brandleiche/Brandkadaver",    uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.jLdazNiUxNrjUFUd" },
      { name: "Eisleiche/Eiskadaver",        uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.QV0J2XQTPD2bpGw2" },
      { name: "Lebender Leichnam/Kadaver",   uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.t5Qd4ZQSJdvR659n" },
      { name: "Moorleiche/Moorkadaver",      uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.ZYsbRLmnahm5EW4o" },
      { name: "Wasserleiche/Wasserkadaver",  uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.LtkGA5O3nQHtxMlC" },
    ],
    skelett: [
      { name: "Erhaltenes Skelett",                   uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.W9mFlprSHb65Klud" },
      { name: "Skelett mit Sehnen und Fleischresten", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.ajUph5iJBrrN0896" },
    ],
    mumie: [
      { name: "Bandagenmumie",       uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.xDikAnIGFY8OD7jG" },
      { name: "Getrocknete Mumie",   uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.pkXs6We3MAAy8qdD" },
      { name: "Wachsmumie",          uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.nwRLzzP90kPw4rp4" },
    ],
  },
  incompleteBody: { name: "Unvollständiger Körper", uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.tlSRaMhVPBUBGz9Q" },
};

/* Hauptpaket-Feld */
const mainPackHtml = `
<fieldset class="gap0px" style="margin-top:8px;">
  <legend>${dict.modpackLegendMain}</legend>
  <div class="row-section wrap" id="mainpack-list">
    ${PACKS.main.map(p => `
      <div class="row-section col two wrap tableOdd selectableRow" data-uuid="${p.uuid || ""}" data-key="${p.key}">
        <div class="col eighty lineheight">${p.name}</div>
        <div class="col ten"></div>
        <div class="col ten"><a class="showEntity small" data-uuid="${p.uuid || ""}"><i class="fas fa-info"></i></a></div>
      </div>
    `).join("")}
  </div>
</fieldset>
`;

/* Zusatzpaket-Feld */
const extraPackHtml = `
<fieldset class="gap0px" style="margin-top:8px;">
  <legend>${dict.modpackLegendExtra}</legend>
  <div style="margin-bottom:6px; color:#666; font-size:12px;">${dict.extraHint}</div>
  <div class="row-section wrap" id="extrapack-list">
    <!-- gefüllt nach Hauptpaketwahl -->
  </div>
  <div class="row-section" style="margin-top:6px;">
    <label style="display:flex; gap:8px; align-items:center;">
      <input type="checkbox" id="incomplete-body-toggle">
      <span>${PACKS.incompleteBody.name}</span>
      <a class="showEntity small" data-uuid="${PACKS.incompleteBody.uuid}" style="margin-left:auto;"><i class="fas fa-info"></i></a>
    </label>
  </div>
</fieldset>
`;

/* Voller Dialog-Inhalt */
const inspectorHtml = `
<fieldset class="gap0px">
  <legend>${dict.legend}</legend>
  <div class="row-section">
    <div class="col center">
      <div id="drop-zone" style="border:2px dashed #666; border-radius:8px; padding:6px; text-align:center; color:#888;">
        <img style="width:70px;height:70px;margin:0 auto;" class="profile" id="summon-img" src="${targetActor?.img || "icons/svg/mystery-man-black.svg"}" data-tooltip="${dict.imgTooltip}">
      </div>
    </div>
  </div>
  <div class="row-section">
    <div class="col fourty table-title"><label>${dict.nameLabel}</label></div>
    <div class="col sixty"><a class="showEntity" id="summon-name" data-uuid="${targetActor?.uuid || ""}">${targetActor?.name || dict.nameEmpty}</a></div>
  </div>
  <div class="row-section">
    <div class="col fourty table-title"><label>${dict.typeLabel}</label></div>
    <div class="col sixty"><span id="summon-type">${readClassValueString(targetActor)}</span></div>
  </div>
  <div class="row-section">
    <div class="col fourty table-title"><label>${dict.sizeLabel}</label></div>
    <div class="col sixty">
      <select name="Größenkategorie" class="moreModifiers" data-name="Größenkategorie" id="size-select">${sizeOptionsHtml}</select>
      <span id="size-display" style="margin-left:8px;"></span>
    </div>
  </div>
</fieldset>

${guideHtml}

${mainPackHtml}
${extraPackHtml}
`;

const dlg = new Dialog({
  title: dict.title,
  content: inspectorHtml,
  buttons: {
    reanimate: {
      label: dict.reanimate,
      callback: async (html) => {
        // QS vorhanden 1..6
        if (!Number.isFinite(qs) || qs < 1 || qs > 6) {
          ui.notifications.error("QS fehlt oder ist ungültig (1..6). Das Makro erwartet eine vorhandene Variable 'qs'.");
          return false;
        }

        // Größe
        let selectedSize = "average";
        try {
          const sizeSelEl = html.find("#size-select")[0];
          selectedSize = String(sizeSelEl?.value || "average");
        } catch {}

        // Auswahl prüfen
        const mainList = html.find("#mainpack-list")[0];
        const extraList = html.find("#extrapack-list")[0];
        const incToggle = html.find("#incomplete-body-toggle")[0];

        const selectedMain = mainList?.querySelector(".selectableRow.selected");
        if (!selectedMain) { ui.notifications.warn(dict.mainRequired); return false; }
        const mainKey = selectedMain.dataset.key;
        const mainUuid = selectedMain.dataset.uuid || null;

        const selectedExtra = extraList?.querySelector(".selectableRow.selected");
        const extraUuid = selectedExtra?.dataset?.uuid || null;
        const addIncomplete = !!incToggle?.checked;

        // Szene / Token-Kopie
        const scene = game.scenes?.current;
        if (!scene) { ui.notifications.warn(dict.notifyNoScene); return false; }

        const targetsArr = Array.from(game.user.targets);
        const target = targetsArr[0];
        const shownActor = target.actor;

        const { x, y } = target;
        let protoObj = {};
        try { protoObj = shownActor.prototypeToken?.toObject?.() ?? {}; } catch {}
        const img = shownActor.prototypeToken?.texture?.src || shownActor.img || "icons/svg/mystery-man-black.svg";

        // Name des neu gespawnten Tokens und Actors: "<Zielname> (reanimiert)"
        const spawnedName = `${shownActor.name} (reanimiert)`;

        // Token-Daten; Ownership via delta vom beschwörenden Actor übernehmen, initial hidden:true
        const tokenData = mergeObject(
          duplicate(protoObj),
          {
            name: spawnedName,
            actorId: shownActor.id,
            x, y,
            texture: { src: img },
            disposition: 0,
            hidden: true,
            delta: {
              ownership: actor.ownership
            }
          },
          { inplace: false }
        );
        if (!tokenData.name || tokenData.name === shownActor.name) tokenData.name = spawnedName;

        // Token erstellen
        let created;
        try { created = await scene.createEmbeddedDocuments("Token", [tokenData]); }
        catch (e) { ui.notifications.error(dict.spawnFail); return false; }

        const newTok = Array.isArray(created) ? created[0] : created;
        if (!newTok) { ui.notifications.error(dict.spawnFail); return false; }
        const newActor = newTok.actor;

        // Actor-Namen des neuen Exemplars setzen
        try { await updateActorWithSockets(newActor, { name: spawnedName }); }
        catch (e) { ui.notifications.warn(lang === "de" ? "Actor-Umbenennung fehlgeschlagen." : "Actor rename failed."); }

        // Token nach Spawn leicht versetzen
        try {
          const grid = canvas.scene?.grid?.size ?? 0;
          if (grid > 0) {
            const axisOptions = [["x"], ["y"], ["x","y"]];
            const axis = axisOptions[Math.floor(Math.random() * axisOptions.length)];
            const update = { _id: newTok.id };
            for (const axe of axis) {
              const dir = Math.random() > 0.5 ? 1 : -1;
              update[axe] = (newTok[axe] ?? 0) + grid * dir;
            }
            await scene.updateEmbeddedDocuments("Token", [update]);
          }
        } catch (e) {}

        // Chat-Info
        const baseSizeRaw = readSizeCategoryRaw(shownActor);
        const shownSizeRaw = baseSizeRaw ?? selectedSize;
        const sizeLabel = localizeSize(shownSizeRaw);
        try {
          const speaker = ChatMessage.getSpeaker({ actor });
          await ChatMessage.create({ speaker, content: dict.chatSpawnInfo(shownActor.name, sizeLabel, qs) });
        } catch {}

        // Pakete übertragen:
        const mainDef = PACKS.main.find(p => p.key === mainKey);
        if (mainDef?.hasBaseItem && mainUuid) {
          try { await addModPackItem(newActor, mainUuid); } catch (e) {}
        }
        if (extraUuid) {
          try { await addModPackItem(newActor, extraUuid); } catch (e) {}
        }
        if (addIncomplete) {
          try { await addModPackItem(newActor, PACKS.incompleteBody.uuid); } catch (e) {}
        }

        // Skill "Loyalität (Untot)"
        try { await addSkillLoyalitaetUntot(newActor); } catch (e) {}

        // Kreaturenklasse setzen
        try {
          const originalClass = (readClassValueString(target.actor) || "").trim().toLowerCase();
          let newClass = "Untoter (Hirnloser)";
          if (originalClass === "tier, nicht humanoid") newClass = "Untoter (Hirnloser), nicht humanoid";
          else if (originalClass === "kulturschaffender, humanoid") newClass = "Untoter (Hirnloser), humanoid";
          await updateActorWithSockets(newActor, { "system.creatureClass.value": newClass });
        } catch (e) {}

        // QS-Effekt
        const qsData = await computeQSArrays(qs);
        const originUuid = newActor?.uuid || actor?.uuid || null;
        const effectData = buildRetroelixierEffect(qsData, originUuid);
        try {
          const tokenIdForB = newTok.id;
          await addEffectWithSockets(newActor, effectData, tokenIdForB);
        } catch (e) {}

        // LP auf Maximum
        try {
          const maxL = readLePMax(newActor);
          await updateActorWithSockets(newActor, { "system.status.wounds.value": maxL });
        } catch (e) {}

        // Dauer bis Reanimation 1d6 KR -> Sekunden = KR * 6
        const rKR = await (new Roll("1d6")).evaluate();
        const visSeconds = rKR.total * 6;

        // Sichtbarkeits-Effekt auf Ziel (AKTUELL NUR ALS SL FUNKTIONSFÄHIG)
        try {
          const targetCurrentHidden = getProp(target.document ?? target, "hidden") === true;
          const visEffectTarget = buildVisibilityToggleEffectForTokenWithSeconds(target.document ?? target, visSeconds, !targetCurrentHidden);
          await addEffectWithSockets(targetActor, visEffectTarget, target.id);
        } catch (e) {}

        // Sichtbarkeits-Effekt auf neues Token (wird sichtbar nach Ablauf, hidden:false)
        try {
          const visEffectNew = buildVisibilityToggleEffectForTokenWithSeconds(newTok, visSeconds, false);
          await addEffectWithSockets(newActor, visEffectNew, newTok.id);
        } catch (e) {}

        return true;
      }
    },
    cancel: { label: dict.cancel }
  },
  render: (html) => {
    const imgEl = html.find("#summon-img")[0];
    const nameEl = html.find("#summon-name")[0];
    const typeEl = html.find("#summon-type")[0];
    const sizeSelEl = html.find("#size-select")[0];
    const sizeDisplayEl = html.find("#size-display")[0];

    function updateElixirPortionsText(val) {
      const v = String(val || "").toLowerCase();
      let text = "";
      if (lang === "de") {
        if (v === "tiny" || v === "winzig") text = "Es werden 0,25 Portionen des Elixiers benötigt.";
        else if (v === "small" || v === "klein") text = "Es werden 0,5 Portionen des Elixiers benötigt.";
        else if (v === "average" || v === "mittel") text = "Es wird eine Portion des Elixiers benötigt.";
        else if (v === "big" || v === "groß") text = "Es werden 2 Portionen des Elixiers benötigt.";
        else if (v === "giant" || v === "riesig") text = "Es werden 4 Portionen des Elixiers benötigt.";
        else text = "";
      }
      if (sizeDisplayEl) sizeDisplayEl.textContent = text;
    }

    function applyActorToGUI(docForView) {
      const img = docForView?.img || "icons/svg/mystery-man-black.svg";
      if (imgEl) imgEl.src = img;
      if (nameEl) {
        nameEl.textContent = docForView?.name || dict.nameEmpty;
        nameEl.dataset.uuid = docForView?.uuid || "";
      }
      const ccVal = readClassValueString(docForView);
      if (typeEl) typeEl.textContent = ccVal || "";

      const baseSizeRaw = readSizeCategoryRaw(docForView);
      if (baseSizeRaw && sizeSelEl) {
        sizeSelEl.value = String(baseSizeRaw);
        updateElixirPortionsText(baseSizeRaw);
      } else {
        updateElixirPortionsText(sizeSelEl?.value);
      }
    }

    applyActorToGUI(shownActor);

    if (sizeSelEl) {
      sizeSelEl.addEventListener("change", (ev) => {
        updateElixirPortionsText(ev.currentTarget.value);
      });
    }

    html.find("a.showEntity").on("click", async (ev) => {
      ev.preventDefault();
      const uuid = ev.currentTarget.dataset.uuid;
      if (!uuid) return;
      try { (await fromUuid(uuid))?.sheet?.render?.(true); } catch {}
    });

    const styleId = "selectableRow-selected-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `.selectableRow.selected { outline: 2px solid var(--color-border-highlight, #3fa5ff); border-radius: 6px; }`;
      document.head.appendChild(style);
    }

    const mainList = html.find("#mainpack-list")[0];
    const extraList = html.find("#extrapack-list")[0];

    function renderExtraFor(mainKey) {
      const extras = PACKS.extraByMain[mainKey] || [];
      extraList.innerHTML = extras.map(p => `
        <div class="row-section col two wrap tableOdd selectableRow" data-uuid="${p.uuid}">
          <div class="col eighty lineheight">${p.name}</div>
          <div class="col ten"></div>
          <div class="col ten"><a class="showEntity small" data-uuid="${p.uuid}"><i class="fas fa-info"></i></a></div>
        </div>
      `).join("");

      extraList.querySelectorAll(".selectableRow").forEach((row) => {
        row.addEventListener("click", () => {
          extraList.querySelectorAll(".selectableRow").forEach(r => r.classList.remove("selected"));
          row.classList.add("selected");
        });
      });
      extraList.querySelectorAll("a.showEntity").forEach((a) => {
        a.addEventListener("click", async (ev) => {
          ev.preventDefault();
          const uuid = a.dataset.uuid;
          if (!uuid) return;
          try { (await fromUuid(uuid))?.sheet?.render?.(true); } catch {}
        });
      });
    }

    mainList.querySelectorAll(".selectableRow").forEach((row) => {
      row.addEventListener("click", () => {
        mainList.querySelectorAll(".selectableRow").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");
        const key = row.dataset.key;
        renderExtraFor(key);
        if (extraList) extraList.querySelectorAll(".selectableRow").forEach(r => r.classList.remove("selected"));
      });
    });

    extraList.innerHTML = "";
    const incToggle = html.find("#incomplete-body-toggle")[0];
    if (incToggle) incToggle.checked = false;
  }
}, { width: 720 });

dlg.render(true);
