// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const { getProperty: getProp, duplicate: dup, mergeObject: mergeObj } = foundry.utils;

const dict = {
  de: {
    title: "Retro-Elixier: Reanimation",
    needTarget: "Bitte genau ein Ziel anvisieren.",
    targetNoActor: "Das Ziel ist kein Akteur.",
    notDefeated: "Ziel ist nicht besiegt.",
    lepMaxPath: "system.status.wounds.max",
    invalidDrop: "Nur Akteure (Tokens/Actors) dürfen hier abgelegt werden.",
    invalidDropType: "Nur Kreaturen der Klasse „Untoter (Hirnloser)“ sind erlaubt.",
    notifyNoScene: "Keine aktive Szene gefunden.",
    legend: "Beschwörung",
    imgTooltip: "Charakter",
    nameLabel: "Name:",
    nameEmpty: "Keine Beschwörung aktiv",
    typeLabel: "Typus:",
    sizeLabel: "Größenkategorie:",
    reanimate: "Reanimieren",
    cancel: "Abbrechen",
    chatSpawnInfo: (name, size, qs) => `<b>${name}</b> wird als Untoter beschworen (QS ${qs}). Größenkategorie: <b>${size ?? "-"}</b>.`,
    spawnFail: "Beschwörung fehlgeschlagen (Token konnte nicht erstellt werden).",
    infoLegend: "Hinweise zur Zustandsbestimmung",
    creationLegend: "Untotenerschaffung (benötigt mindestens Beobachterrechte)",
    creationText: "Du erschaffst einen Untoten mit dem Retroelixier. Wenn du stattdessen einen verstorbenen Akteur in ein untotes Wesen verwandeln möchtest, kannst du dafür ebenfalls Modifikationspakete nutzen.",
    creationCheckBtn: "Ziel prüfen & Modpakete anzeigen",
    modpackLegendMain: "Modifikationspaket",
    modpackLegendExtra: "Weitere Zustandsmerkmale",
    extraHint: "Wähle genau ein Zusatzpaket (optional) und/oder „Unvollständiger Körper“ zusätzlich.",
    mainRequired: "Bitte wähle zuerst ein Modifikationspaket (Lebender Leichnam, Skelett oder Mumie).",
    extraOnlyOne: "Bitte wähle höchstens ein Zusatzpaket.",
    pleaseDropUndead: "Bitte zuerst einen Untoten (Hirnloser) via Drag & Drop auswählen.",
    createdMulti: (name, count) => `<b>${name}</b> wurde ${count}x beschworen.`,
    guideText: `<p style="margin:0 0 8px 0;">Zunächst musst du den Todeszustand der Leiche oder des Kadavers bestimmen. Entweder handelt es sich um die Kategorie <b>Lebender Leichnam</b> (es ist also noch ausreichend Fleisch auf den Knochen vorhanden), <b>Skelett</b> (nur noch Knochen) oder <b>Mumie</b> (konservierte Leiche).</p><p style="margin:0 0 8px 0;">Die Zustandspakete geben an, wie die Werte des lebendigen Wesens zu modifizieren sind. Möchte man also z. B. das Skelett eines Trolls erheben, so werden die Werte des Trolls mit den entsprechenden Werten aus dem Modifikationspaket modifiziert.</p><p style="margin:0 0 8px 0;">Der Eintrag <b>neu</b> in den Paketbeschreibungen bedeutet, dass dieser Wert anstelle des alten Werts des Lebewesens eingesetzt wird.</p><p style="margin:0;">Wenn ein Kadaver noch weitere Zustandsmerkmale aufweist, kommen noch die weiteren Modifikatoren hinzu (z. B. <b>Brandleichnam</b>).</p>`,
    packLebender: "Lebender Leichnam",
    packSkelett: "Skelett",
    packMumie: "Mumie",
    packBrand: "Brandleiche/Brandkadaver",
    packEis: "Eisleiche/Eiskadaver",
    packKadaver: "Lebender Leichnam/Kadaver",
    packMoor: "Moorleiche/Moorkadaver",
    packWasser: "Wasserleiche/Wasserkadaver",
    packSkelettErhalten: "Erhaltenes Skelett",
    packSkelettReste: "Skelett mit Sehnen und Fleischresten",
    packBandagen: "Bandagenmumie",
    packGetrocknet: "Getrocknete Mumie",
    packWachs: "Wachsmumie",
    packIncomplete: "Unvollständiger Körper"
  },
  en: {
    title: "Retro Elixir: Reanimation",
    needTarget: "Please target exactly one token.",
    targetNoActor: "The target is not an actor.",
    notDefeated: "Target is not defeated.",
    lepMaxPath: "system.status.wounds.max",
    invalidDrop: "Only actor documents can be dropped here.",
    invalidDropType: "Only creatures with class “Undead (Mindless)” are allowed.",
    notifyNoScene: "No active scene found.",
    legend: "Summoning",
    imgTooltip: "Character",
    nameLabel: "Name:",
    nameEmpty: "No summoning active",
    typeLabel: "Type:",
    sizeLabel: "Size Category:",
    reanimate: "Reanimate",
    cancel: "Cancel",
    chatSpawnInfo: (name, size, qs) => `<b>${name}</b> is summoned as undead (QL ${qs}). Size Category: <b>${size ?? "-"}</b>.`,
    spawnFail: "Summoning failed (could not create token).",
    infoLegend: "Notes on state determination",
    creationLegend: "Undead Creation (requires at least observer rights)",
    creationText: "You create an undead with the retro elixir. If instead you want to turn a deceased actor into an undead, you can also use modification packages for that.",
    creationCheckBtn: "Check target & show packages",
    modpackLegendMain: "Modification Package",
    modpackLegendExtra: "Additional State Modifiers",
    extraHint: "Select at most one extra package (optional) and/or \"Incomplete Body\" additionally.",
    mainRequired: "Please select a main modification package first (Living Corpse, Skeleton or Mummy).",
    extraOnlyOne: "Please select at most one extra package.",
    pleaseDropUndead: "Please drag & drop an Undead (Mindless) actor first.",
    createdMulti: (name, count) => `<b>${name}</b> has been summoned ${count}x.`,
    guideText: `<p style="margin:0 0 8px 0;">First, you must determine the state of death of the corpse or carcass. It is either the category <b>Living Corpse</b> (there is still enough flesh on the bones), <b>Skeleton</b> (bones only) or <b>Mummy</b> (preserved corpse).</p><p style="margin:0 0 8px 0;">The state packages indicate how the values of the living being are to be modified. For example, if you want to raise the skeleton of a troll, the troll's values are modified with the corresponding values from the modification package.</p><p style="margin:0 0 8px 0;">The entry <b>new</b> in the package descriptions means that this value is used instead of the old value of the living being.</p><p style="margin:0;">If a carcass has other state characteristics, the other modifiers are added (e.g., <b>Burnt Corpse</b>).</p>`,
    packLebender: "Living Corpse",
    packSkelett: "Skeleton",
    packMumie: "Mummy",
    packBrand: "Burnt Corpse/Carcass",
    packEis: "Ice Corpse/Carcass",
    packKadaver: "Living Corpse/Carcass",
    packMoor: "Bog Body/Carcass",
    packWasser: "Drowned Corpse/Carcass",
    packSkelettErhalten: "Preserved Skeleton",
    packSkelettReste: "Skeleton with Tendons and Flesh Scraps",
    packBandagen: "Bandaged Mummy",
    packGetrocknet: "Dried Mummy",
    packWachs: "Wax Mummy",
    packIncomplete: "Incomplete Body"
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

/* QS/Dauer */
async function computeQSArrays(qs) {
  const atArr  = [0, 1, 1, 1, 2, 2];
  const rsArr  = [0, 0, 1, 1, 1, 2];
  const loyArr = [1, 1, 1, 2, 2, 2];
  let durationSeconds = 0;
  if (qs <= 2) { const r = new Roll("1d3"); await r.evaluate(); durationSeconds = r.total * 86400; }
  else if (qs <= 4) { const r = new Roll("1d6 + 3"); await r.evaluate(); durationSeconds = r.total * 86400; }
  else { const r = new Roll("2d6 + 8"); await r.evaluate(); durationSeconds = r.total * 86400; }
  const idx = Math.max(0, Math.min(5, qs - 1));
  return { at: atArr[idx], rs: rsArr[idx], loy: loyArr[idx], durationSeconds };
}

/* Update-/Create-Helper */
async function updateActorWithSockets(actorDoc, updateData) {
  try { await actorDoc.update(updateData); } catch (e) { ui.notifications.warn(lang === "de" ? "Update fehlgeschlagen (Rechte?)." : "Update failed (permissions?)."); }
}
async function addItemWithSockets(actorDoc, itemData) {
  try { await actorDoc.createEmbeddedDocuments("Item", [itemData]); } catch (e) { ui.notifications.warn(lang === "de" ? "Item-Erstellung fehlgeschlagen (Rechte?)." : "Item creation failed (permissions?)."); }
}
async function addEffectWithSockets(actorDoc, effectData) {
  try {
    if (typeof actorDoc.addCondition === "function") { await actorDoc.addCondition(effectData); return; }
    await actorDoc.createEmbeddedDocuments("ActiveEffect", [effectData]);
  } catch (e) { ui.notifications.warn(lang === "de" ? "Effekt-Erstellung fehlgeschlagen (Rechte?)." : "Effect creation failed (permissions?)."); }
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
  if (!itemData) return;
  await addItemWithSockets(actorDoc, itemData);
}

/* Modpaket-Item hinzufügen aus UUID */
async function addModPackItem(actorDoc, itemUuid) {
  const doc = await fromUuid(itemUuid);
  if (!doc || doc.documentName !== "Item") return;
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

  const onRemoveCode =
    "try { await actor.addCondition('dead'); } catch(e) {} " +
    "try { await actor.update({ 'system.status.wounds.value': 0 }); } catch(e) {}";

  return {
    name: "Retroelixier",
    origin: originSourceUuid || actor?.uuid || "Platzhalterorigin",
    icon: "icons/svg/aura.svg",
    changes,
    duration: { seconds: durationSeconds, startTime: game.time.worldTime },
    flags: { dsa5: { description: "Retroelixier", onRemove: onRemoveCode } }
  };
}

/* Sichtbarkeits-Effekt-Builder (ein-/ausblenden nach Sekunden) */
function buildVisibilityToggleEffectForTokenWithSeconds(tokenDoc, seconds, willBeHiddenAfter) {
  const tokenId = tokenDoc?.id ?? "";
  const sceneId = tokenDoc?.parent?.id ?? "";
  const newHiddenStr = JSON.stringify(!!willBeHiddenAfter);
  const tokenIdStr = JSON.stringify(String(tokenId));
  const sceneIdStr = JSON.stringify(String(sceneId));
  const onRemoveCode =
    "const tokenId=" + tokenIdStr + "; " +
    "const sceneId=" + sceneIdStr + "; " +
    "const newHidden=" + newHiddenStr + "; " +
    "const tok = canvas && canvas.scene && canvas.scene.tokens ? canvas.scene.tokens.get(tokenId) : null; " +
    "if (game.user.isGM) { if (tok) { await tok.update({ hidden: newHidden }); } } else { " +
    "await game.socket.emit('world', { type: 'updateDocument', documentType: 'Token', scope: 'world', collection: 'tokens', data: { _id: tokenId, hidden: newHidden }, options: { diff: true }, parent: { type: 'Scene', id: sceneId } }); }";

  return {
    name: lang === "de" ? "Zeit zur Reanimation" : "Time for Reanimation",
    icon: "icons/svg/clockwork.svg",
    duration: { seconds, startTime: game.time.worldTime },
    flags: { dsa5: { description: "Sichtbarkeitstimer", onRemove: onRemoveCode } },
    changes: []
  };
}

/* GUI-Startzustand bestimmen */
const targetsArrInit = Array.from(game.user.targets);
const hasExactlyOneTarget = targetsArrInit.length === 1;
const initialTarget = hasExactlyOneTarget ? targetsArrInit[0] : null;
const initialTargetActor = initialTarget?.actor || null;

let initialIsDefeated = false;
if (initialTargetActor) {
  initialIsDefeated = 
    !!(initialTarget?.document?.combatant?.defeated) || 
    (initialTargetActor.statuses && (initialTargetActor.statuses.has("dead") || initialTargetActor.statuses.has("defeated"))) ||
    initialTargetActor.effects.some(e => 
      e.getFlag("core", "statusId") === "defeated" || 
      ["besiegt", "defeated", "dead"].includes(e.name?.toLowerCase())
    );
}

let shownActor = null;
let selectedSize = "average";
const startWithTargetInGUI = !!initialTargetActor && initialIsDefeated;
if (startWithTargetInGUI) shownActor = initialTargetActor;

/* Größenoptionen */
const sizeMap = [
  { value: "tiny" }, { value: "small" }, { value: "average" }, { value: "big" }, { value: "giant" },
];
const sizeOptionsHtml = sizeMap.map(({ value }) => {
  const label = localizeSize(value);
  const sel = value === selectedSize ? ' selected' : '';
  return `<option value="${value}"${sel}>${label}</option>`;
}).join("");

/* Paket-Definition */
const PACKS = {
  main: [
    { key: "lebender", name: dict.packLebender,  uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.kLbStO87YJC1MGl9", hasBaseItem: true },
    { key: "skelett",  name: dict.packSkelett,   uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.fLsAlG18Irm33WbE", hasBaseItem: true },
    { key: "mumie",    name: dict.packMumie,     uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.4up7Ds2u1bvNW4r0", hasBaseItem: true },
  ],
  extraByMain: {
    lebender: [
      { name: dict.packBrand,   uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.jLdazNiUxNrjUFUd" },
      { name: dict.packEis,     uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.QV0J2XQTPD2bpGw2" },
      { name: dict.packKadaver, uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.t5Qd4ZQSJdvR659n" },
      { name: dict.packMoor,    uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.ZYsbRLmnahm5EW4o" },
      { name: dict.packWasser,  uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.LtkGA5O3nQHtxMlC" },
    ],
    skelett: [
      { name: dict.packSkelettErhalten, uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.W9mFlprSHb65Klud" },
      { name: dict.packSkelettReste,    uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.ajUph5iJBrrN0896" },
    ],
    mumie: [
      { name: dict.packBandagen,    uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.xDikAnIGFY8OD7jG" },
      { name: dict.packGetrocknet,  uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.pkXs6We3MAAy8qdD" },
      { name: dict.packWachs,       uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.nwRLzzP90kPw4rp4" },
    ],
  },
  incompleteBody: { name: dict.packIncomplete, uuid: "Compendium.dsa5-necromantheum.necromantheumequipment.Item.tlSRaMhVPBUBGz9Q" },
};

/* Hinweis-Block */
const guideHtml = `
<fieldset class="gap0px" style="margin-top:8px;">
  <legend id="guide-legend">${dict.infoLegend}</legend>
  <div id="guide-content" style="padding:10px; border:1px solid var(--color-border-light-primary,#999); border-radius:8px; background:var(--color-bg-option,#f3f3f3); line-height:1.3;">
  </div>
</fieldset>
`;

/* Pakete-Felder */
const mainPackHtml = `
<fieldset class="gap0px" style="margin-top:8px;" id="mainpack-fieldset">
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
const extraPackHtml = `
<fieldset class="gap0px" style="margin-top:8px;" id="extrapack-fieldset">
  <legend>${dict.modpackLegendExtra}</legend>
  <div style="margin-bottom:6px; color:#666; font-size:12px;">${dict.extraHint}</div>
  <div class="row-section wrap" id="extrapack-list"></div>
  <div class="row-section" style="margin-top:6px;">
    <label style="display:flex; gap:8px; align-items:center;">
      <input type="checkbox" id="incomplete-body-toggle">
      <span>${PACKS.incompleteBody.name}</span>
      <a class="showEntity small" data-uuid="${PACKS.incompleteBody.uuid}" style="margin-left:auto;"><i class="fas fa-info"></i></a>
    </label>
  </div>
</fieldset>
`;

/* Dialog-Inhalt */
const inspectorHtml = `
<fieldset class="gap0px">
  <legend>${dict.legend}</legend>
  <div class="row-section">
    <div class="col center">
      <div id="drop-zone" style="border:2px dashed #666; border-radius:8px; padding:6px; text-align:center; color:#888;">
        <img style="width:70px;height:70px;margin:0 auto;" class="profile" id="summon-img" src="${shownActor?.img || "icons/svg/mystery-man-black.svg"}" data-tooltip="${dict.imgTooltip}">
      </div>
    </div>
  </div>
  <div class="row-section">
    <div class="col fourty table-title"><label>${dict.nameLabel}</label></div>
    <div class="col sixty"><a class="showEntity" id="summon-name" data-uuid="${shownActor?.uuid || ""}">${shownActor?.name || dict.nameEmpty}</a></div>
  </div>
  <div class="row-section">
    <div class="col fourty table-title"><label>${dict.typeLabel}</label></div>
    <div class="col sixty"><span id="summon-type">${shownActor ? readClassValueString(shownActor) : ""}</span></div>
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

/* Dialog */
const dlg = new Dialog({
  title: dict.title,
  content: inspectorHtml,
  buttons: {
    reanimate: {
      label: dict.reanimate,
      callback: async (html) => {
        if (!Number.isFinite(qs) || qs < 1 || qs > 6) {
          ui.notifications.error(lang === "de" ? "QS fehlt oder ist ungültig (1..6)." : "QL missing/invalid (1..6).");
          return false;
        }
        const scene = game.scenes?.current;
        if (!scene) { ui.notifications.warn(dict.notifyNoScene); return false; }

        const currTargets = Array.from(game.user.targets);
        const currTarget = currTargets[0];
        const currTargetActor = currTarget?.actor || null;

        const summonUuid = html.find("#summon-name")?.[0]?.dataset?.uuid || "";
        const summonDoc = summonUuid ? await fromUuid(summonUuid) : null;
        const guiActor = summonDoc?.documentName === "Actor" ? summonDoc : shownActor;
        if (!guiActor) { ui.notifications.warn(dict.pleaseDropUndead); return false; }

        const sizeSelEl = html.find("#size-select")[0];
        const selectedSizeVal = String(sizeSelEl?.value || "average");
        const baseSizeRaw = readSizeCategoryRaw(guiActor);
        const shownSizeRaw = baseSizeRaw ?? selectedSizeVal;
        const sizeLabel = localizeSize(shownSizeRaw);

        const sameAsTarget = !!currTargetActor && (guiActor?.uuid === currTargetActor?.uuid);

        if (sameAsTarget) {
          const { x, y } = currTarget;
          let protoObj = {};
          try { protoObj = currTargetActor.prototypeToken?.toObject?.() ?? {}; } catch (e) {}
          const img = currTargetActor.prototypeToken?.texture?.src || currTargetActor.img || "icons/svg/mystery-man-black.svg";
          const spawnedName = `${currTargetActor.name} (${lang === "de" ? "reanimiert" : "reanimated"})`;

          const tokenData = mergeObj(
            dup(protoObj),
            {
              name: spawnedName,
              actorId: currTargetActor.id,
              x, y,
              texture: { src: img, tint: "#6b6b6b" },
              disposition: 0,
              hidden: true,
              delta: { ownership: actor.ownership }
            },
            { inplace: false }
          );
          if (!tokenData.name || tokenData.name === currTargetActor.name) tokenData.name = spawnedName;

          let created;
          try { created = await scene.createEmbeddedDocuments("Token", [tokenData]); }
          catch (e) { ui.notifications.error(dict.spawnFail); return false; }
          const newTok = Array.isArray(created) ? created[0] : created;
          if (!newTok) { ui.notifications.error(dict.spawnFail); return false; }
          const newActor = newTok.actor;

          try { await updateActorWithSockets(newActor, { name: spawnedName }); } catch (e) {}

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

          try {
            const speaker = ChatMessage.getSpeaker({ actor });
            await ChatMessage.create({ speaker, content: dict.chatSpawnInfo(currTargetActor.name, sizeLabel, qs) });
          } catch (e) {}

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

          const mainDef = PACKS.main.find(p => p.key === mainKey);
          if (mainDef?.hasBaseItem && mainUuid) { await addModPackItem(newActor, mainUuid); }
          if (extraUuid) { await addModPackItem(newActor, extraUuid); }
          if (addIncomplete) { await addModPackItem(newActor, PACKS.incompleteBody.uuid); }

          try { await addSkillLoyalitaetUntot(newActor); } catch (e) {}

          try {
            const originalClass = (readClassValueString(currTargetActor) || "").trim().toLowerCase();
            let newClass = lang === "de" ? "Untoter (Hirnloser)" : "Undead (Mindless)";
            if (originalClass.includes("humanoid") && originalClass.includes("nicht")) {
               newClass += lang === "de" ? ", nicht humanoid" : ", non-humanoid";
            } else if (originalClass.includes("humanoid")) {
               newClass += lang === "de" ? ", humanoid" : ", humanoid";
            }
            await updateActorWithSockets(newActor, { "system.creatureClass.value": newClass });
          } catch (e) {}

          const qsData = await computeQSArrays(qs);
          const originUuid = newActor?.uuid || actor?.uuid || null;
          const effectData = buildRetroelixierEffect(qsData, originUuid);
          try { await addEffectWithSockets(newActor, effectData); } catch (e) {}

          try {
            const maxL = readLePMax(newActor);
            await updateActorWithSockets(newActor, { "system.status.wounds.value": maxL });
          } catch (e) {}

          const rKR = await (new Roll("1d6")).evaluate();
          const visSeconds = rKR.total * 6;

          try {
            const targetCurrentHidden = getProp(currTarget.document ?? currTarget, "hidden") === true;
            const visEffectTarget = buildVisibilityToggleEffectForTokenWithSeconds(currTarget.document ?? currTarget, visSeconds, !targetCurrentHidden);
            await addEffectWithSockets(currTargetActor, visEffectTarget);
          } catch (e) {}

          try {
            const visEffectNew = buildVisibilityToggleEffectForTokenWithSeconds(newTok, visSeconds, false);
            await addEffectWithSockets(newActor, visEffectNew);
          } catch (e) {}

          return true;
        } else {
          async function createCreature(actorDoc) {
            const currentActorToken = actor.token ? actor.token : actor.getActiveTokens()[0];
            const baseX = currentActorToken ? currentActorToken.x : (currTarget?.x ?? 0);
            const baseY = currentActorToken ? currentActorToken.y : (currTarget?.y ?? 0);
            const tokenData = await actorDoc.getTokenDocument({
              name: actorDoc.name,
              x: baseX,
              y: baseY,
              hidden: true,
              actorLink: false,
              texture: { src: actorDoc.prototypeToken?.texture?.src || actorDoc.img || "icons/svg/mystery-man-black.svg" },
              delta: { ownership: actor.ownership }
            }, { parent: canvas.scene });
            return tokenData;
          }

          const count = 1;
          const tokens = [];
          for (let i = 0; i < count; i++) tokens.push(await createCreature(guiActor));

          let createdTokens;
          try { createdTokens = await canvas.scene.createEmbeddedDocuments("Token", tokens); }
          catch (e) { ui.notifications.error(dict.spawnFail || "Token creation failed."); return false; }
          if (!createdTokens || !createdTokens.length) { ui.notifications.error(dict.spawnFail || "Token creation failed (empty)."); return false; }

          const updates = [];
          for (let token of createdTokens) {
            const axis = [["x"], ["y"], ["x", "y"]][Math.floor(Math.random() * 3)];
            const update = { _id: token.id };
            for (const axe of axis) {
              const dir = Math.random() > 0.5 ? 1 : -1;
              update[axe] = token[axe] + canvas.scene.grid.size * dir;
            }
            updates.push(update);
          }
          const creations = updates.length ? await canvas.scene.updateEmbeddedDocuments("Token", updates) : createdTokens;

          for (let tok of creations) {
            const createdActor = tok.actor;
            try { await addSkillLoyalitaetUntot(createdActor); } catch (e) {}
            try {
              const qsData = await computeQSArrays(qs);
              const originUuid = createdActor?.uuid || actor?.uuid || null;
              const effectData = buildRetroelixierEffect(qsData, originUuid);
              await addEffectWithSockets(createdActor, effectData);
            } catch (e) {}
            try {
              const maxL = readLePMax(createdActor);
              await updateActorWithSockets(createdActor, { "system.status.wounds.value": maxL });
            } catch (e) {}

            const rKR = await (new Roll("1d6")).evaluate();
            const visSeconds = rKR.total * 6;
            try {
              const visEffectNew = buildVisibilityToggleEffectForTokenWithSeconds(tok, visSeconds, false);
              await addEffectWithSockets(createdActor, visEffectNew);
            } catch (e) {}
          }

          try {
            const speaker = ChatMessage.getSpeaker({ actor });
            await ChatMessage.create({ speaker, content: dict.createdMulti(guiActor.name, count) });
          } catch (e) {}

          return true;
        }
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

    const mainPackFieldset = html.find("#mainpack-fieldset")[0];
    const extraPackFieldset = html.find("#extrapack-fieldset")[0];
    const mainList = html.find("#mainpack-list")[0];
    const extraList = html.find("#extrapack-list")[0];

    async function openGuiActorSheet() {
      try {
        const currentUuid = nameEl?.dataset?.uuid || shownActor?.uuid || "";
        if (!currentUuid) return;
        const doc = await fromUuid(currentUuid);
        const act = doc?.documentName === "Actor" ? doc : (doc?.documentName === "Token" ? doc.actor : null);
        act?.sheet?.render?.(true);
      } catch (e) {}
    }

    function updateElixirPortionsText(val) {
      const v = String(val || "").toLowerCase();
      let text = "";
      if (lang === "de") {
        if (v === "tiny" || v === "winzig") text = "Es werden 0,25 Portionen des Elixiers benötigt.";
        else if (v === "small" || v === "klein") text = "Es werden 0,5 Portionen des Elixiers benötigt.";
        else if (v === "average" || v === "mittel") text = "Es wird eine Portion des Elixiers benötigt.";
        else if (v === "big" || v === "groß") text = "Es werden 2 Portionen des Elixiers benötigt.";
        else if (v === "giant" || v === "riesig") text = "Es werden 4 Portionen des Elixiers benötigt.";
      } else {
        if (v === "tiny") text = "0.25 portions of elixir required.";
        else if (v === "small") text = "0.5 portions of elixir required.";
        else if (v === "average") text = "1 portion of elixir required.";
        else if (v === "big") text = "2 portions of elixir required.";
        else if (v === "giant") text = "4 portions of elixir required.";
      }
      if (sizeDisplayEl) sizeDisplayEl.textContent = text;
    }

    function renderOriginalGuide() {
      const legendEl = document.getElementById("guide-legend");
      const contEl = document.getElementById("guide-content");
      if (legendEl) legendEl.textContent = dict.infoLegend;
      if (contEl) {
        contEl.innerHTML = dict.guideText;
      }
    }

    function renderCreationGuideWithButton() {
      const legendEl = document.getElementById("guide-legend");
      const contEl = document.getElementById("guide-content");
      if (legendEl) legendEl.textContent = dict.creationLegend;
      if (contEl) {
        contEl.innerHTML = `
          <p style="margin:0 0 8px 0;">${dict.creationText}</p>
          <div style="margin-top:8px;">
            <button id="creation-check-btn" type="button" style="padding:4px 8px;">${dict.creationCheckBtn}</button>
          </div>
        `;
        const btn = document.getElementById("creation-check-btn");
        if (btn) {
          btn.addEventListener("click", async () => {
            try {
              const tArr = Array.from(game.user.targets);
              const t = tArr[0];
              const tActor = t?.actor;
              if (!tActor) { ui.notifications.warn(dict.targetNoActor); return; }
              const defeated = 
                !!(t.document?.combatant?.defeated) || 
                (tActor.statuses && (tActor.statuses.has("dead") || tActor.statuses.has("defeated"))) ||
                tActor.effects.some(e => 
                  e.getFlag("core", "statusId") === "defeated" || 
                  ["besiegt", "defeated", "dead"].includes(e.name?.toLowerCase())
                );
              if (!defeated) { ui.notifications.info(dict.notDefeated); return; }
              shownActor = tActor;
              applyActorToGUI(shownActor);
              renderOriginalGuide();
              if (mainPackFieldset) mainPackFieldset.style.display = "";
              if (extraPackFieldset) extraPackFieldset.style.display = "";
            } catch (e) { ui.notifications.warn(lang === "de" ? "Prüfung fehlgeschlagen." : "Check failed."); }
          });
        }
      }
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

      const sameAsInitialTarget = !!initialTargetActor && (docForView?.uuid === initialTargetActor?.uuid);
      if (sameAsInitialTarget) {
        renderOriginalGuide();
        if (mainPackFieldset) mainPackFieldset.style.display = "";
        if (extraPackFieldset) extraPackFieldset.style.display = "";
      } else {
        renderCreationGuideWithButton();
        if (mainPackFieldset) mainPackFieldset.style.display = "none";
        if (extraPackFieldset) extraPackFieldset.style.display = "none";
      }
    }

    if (shownActor) {
      applyActorToGUI(shownActor);
    } else {
      if (imgEl) imgEl.src = "icons/svg/mystery-man-black.svg";
      if (nameEl) { nameEl.textContent = dict.nameEmpty; nameEl.dataset.uuid = ""; }
      if (typeEl) { typeEl.textContent = ""; }
      updateElixirPortionsText(sizeSelEl?.value);
      renderCreationGuideWithButton();
      if (mainPackFieldset) mainPackFieldset.style.display = "none";
      if (extraPackFieldset) extraPackFieldset.style.display = "none";
    }

    if (imgEl) { imgEl.style.cursor = "pointer"; imgEl.addEventListener("click", openGuiActorSheet); }
    if (sizeSelEl) sizeSelEl.addEventListener("change", (ev) => updateElixirPortionsText(ev.currentTarget.value));

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

    function renderExtraFor(mainKey) {
      const extras = PACKS.extraByMain[mainKey] || [];
      if (extraList) {
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
    }

    if (mainList) {
      mainList.querySelectorAll(".selectableRow").forEach((row) => {
        row.addEventListener("click", () => {
          mainList.querySelectorAll(".selectableRow").forEach(r => r.classList.remove("selected"));
          row.classList.add("selected");
          const key = row.dataset.key;
          renderExtraFor(key);
          if (extraList) extraList.querySelectorAll(".selectableRow").forEach(r => r.classList.remove("selected"));
        });
      });
    }
    if (extraList) extraList.innerHTML = "";
    const incToggle = html.find("#incomplete-body-toggle")[0];
    if (incToggle) incToggle.checked = false;

    const dropZone = html.find("#drop-zone")[0];
    if (dropZone) {
      dropZone.addEventListener("dragover", ev => ev.preventDefault());
      dropZone.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        try {
          const raw = ev.dataTransfer.getData("text/plain");
          if (!raw) return;
          const data = JSON.parse(raw);

          let droppedDoc = null;
          if (data?.uuid) droppedDoc = await fromUuid(data.uuid);
          else if (data?.type === "Actor" && data?.id) droppedDoc = game.actors?.get(data.id) || null;
          else if (data?.type === "Token" && data?.id && data?.scene) droppedDoc = await fromUuid(`Scene.${data.scene}.Token.${data.id}`);

          let droppedActor = null;
          if (droppedDoc?.documentName === "Actor") droppedActor = droppedDoc;
          else if (droppedDoc?.documentName === "Token") droppedActor = droppedDoc.actor;

          if (!droppedActor) { ui.notifications.warn(dict.invalidDrop); return; }

          const ccv = (readClassValueString(droppedActor) || "").trim().toLowerCase();
          const allowed = ccv.startsWith(lang === "de" ? "untoter (hirnloser" : "undead (mindless");
          if (!allowed) { ui.notifications.warn(dict.invalidDropType); return; }

          shownActor = droppedActor;
          applyActorToGUI(shownActor);

          if (imgEl) { imgEl.style.cursor = "pointer"; imgEl.addEventListener("click", openGuiActorSheet); }
        } catch (e) { ui.notifications.warn(dict.invalidDrop); }
      });
    }
  }
}, { width: 720 });

dlg.render(true);
