/// This is a system macro used for automation. It is disfunctional without the proper context.

// Sprachweiche und Dictionary
const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    skillName: "Alchimie",
    noActor: "Kein Actor gefunden. Wähle ein Token oder setze actor vorher.",
    title: "Alchimie-Probe",
    laborLabel: "Welche Laborstufe ist vorhanden?",
    labor1: "Archaisches Labor",
    labor2: "Hexenküche",
    labor3: "Alchimistisches Labor",
    runCheck: "Probe ausführen",
    cancel: "Abbrechen",
    skillNotFound: (name, actorName) => `Skill "${name}" nicht gefunden für ${actorName}`,
    tradeSecretLabel: "Berufsgeheimnis",
    hasTradeSecret: (name) => `Actor hat das Berufsgeheimnis: ${name}`,
    noTradeSecretFor: (itemName) => `Actor besitzt kein Berufsgeheimnis für "${itemName}"`,
    tradeSecretName: (baseName) => `Berufsgeheimnis (${baseName})`,
    aspLabelTitle: (sfName) => `Bei der Analyse von Elixieren durch Alchimie kann der ${sfName} wie beim Brauen alchimistischer Elixiere für je 4 AsP eine Erleichterung von 1 einrechnen. Maximal lässt sich so eine Erleichterung von 2 erzielen.`,
    aspLabel: "Aufladen mit AsP:",
    aspNone: "-",
    notEnoughAsp: (need, have) => `Nicht genug AsP: benötigt ${need}, vorhanden ${have}.`,
    traditionZauberalchimistenName: "Tradition (Zauberalchimisten)",
    alchimieAnalytikerName: "Alchimieanalytiker",
    zauberalchimistDisplayName: "Zauberalchimist",
    alchimieAnalytikerDisplayName: "Alchimieanalytiker",
    logItemName: (itemName) => `Item-Name: ${itemName}`,
    logBrewDiff: (diff) => `Brauschwierigkeit: ${diff}`,
    logLaborMod: (mod) => `Labor-Modifikator aus Dropdown: ${mod}`,
    logHalfDiff: (val) => `Halbe Brauschwierigkeit (gerundet, Vorzeichen beibehalten): ${val}`,
    logHasSecret: (exists) => `Berufsgeheimnis vorhanden: ${exists ? "Ja" : "Nein"}`,
    logTotalMod: (mod) => `Gesamtmodifikator für die Probe: ${mod}`,
    logDone: (actorName) => `Probe für ${actorName} abgeschlossen`,
    logError: (actorName) => `Fehler bei Probe für ${actorName}:`,
    // QS-Texte (angepasst)
    qs1TextItem: (itemName) => `Bei dem Spagyrika handelt es sich um ${itemName}.`,
    qs2TextItemQs: (itemName, qs) => `Bei dem Spagyrika handelt es sich um ${itemName} der Qualitätsstufe ${qs}.`,
    // Optional
    noAspResource: "Astralenergie-Ressource nicht gefunden.",
    aspDeducted: (spent, newVal) => `Es wurden ${spent} AsP aufgewendet. Neuer AsP-Wert: ${newVal}.`
  },
  en: {
    skillName: "Alchemy",
    noActor: "No Actor found. Select a token or set actor first.",
    title: "Alchemy Test",
    laborLabel: "Which lab tier is available?",
    labor1: "Archaic Lab",
    labor2: "Witch Kitchen",
    labor3: "Alchemical Lab",
    runCheck: "Run Test",
    cancel: "Cancel",
    skillNotFound: (name, actorName) => `Skill "${name}" not found for ${actorName}`,
    tradeSecretLabel: "Trade Secret",
    hasTradeSecret: (name) => `Actor has the trade secret: ${name}`,
    noTradeSecretFor: (itemName) => `Actor lacks a trade secret for "${itemName}"`,
    tradeSecretName: (baseName) => `Trade Secret (${baseName})`,
    aspLabelTitle: (sfName) => `When analyzing elixirs via Alchemy, the ${sfName} may invest 4 AsP for +1 ease, up to +2 total, similar to brewing alchemical elixirs.`,
    aspLabel: "Infuse with AsP:",
    aspNone: "-",
    notEnoughAsp: (need, have) => `Not enough AsP: need ${need}, have ${have}.`,
    traditionZauberalchimistenName: "Tradition (Magical Alchemists)",
    alchimieAnalytikerName: "Alchemy Analyst",
    zauberalchimistDisplayName: "Magical Alchemist",
    alchimieAnalytikerDisplayName: "Alchemy Analyst",
    // Logging
    logItemName: (itemName) => `Item name: ${itemName}`,
    logBrewDiff: (diff) => `Brewing difficulty: ${diff}`,
    logLaborMod: (mod) => `Lab modifier from dropdown: ${mod}`,
    logHalfDiff: (val) => `Half brewing difficulty (rounded, sign preserved): ${val}`,
    logHasSecret: (exists) => `Trade secret present: ${exists ? "Yes" : "No"}`,
    logTotalMod: (mod) => `Total modifier for the test: ${mod}`,
    logDone: (actorName) => `Test for ${actorName} finished`,
    logError: (actorName) => `Error during test for ${actorName}:`,
    // QS texts (adjusted)
    qs1TextItem: (itemName) => `The spagyric is ${itemName}.`,
    qs2TextItemQs: (itemName, qs) => `The spagyric is ${itemName} of quality level ${qs}.`,
    noAspResource: "Astral energy resource not found.",
    aspDeducted: (spent, newVal) => `${spent} AsP spent. New AsP value: ${newVal}.`
  }
}[lang];

const skillName = dict.skillName;

let actorLocal = (typeof actor !== "undefined" && actor) ? actor : null;
if (!actorLocal) {
  const tok = canvas?.tokens?.controlled?.[0];
  actorLocal = tok?.actor ?? null;
}
if (!actorLocal) return ui.notifications.warn(dict.noActor);

// Item-Daten
const itemName = foundry.utils.getProperty(item, "name");
const brauschwierigkeit = Number(foundry.utils.getProperty(item, "system.difficulty")) || 0;

// Berufsgeheimnis prüfen
const tradeSecretName = dict.tradeSecretName(itemName);
const berufsgeheimnis = actorLocal.items.find(i =>
  i.type === "specialability" &&
  foundry.utils.getProperty(i, "system.category.value") === "secret" &&
  i.name === tradeSecretName
);
if (berufsgeheimnis) console.log(dict.hasTradeSecret(berufsgeheimnis.name));
else console.log(dict.noTradeSecretFor(itemName));

// Tradition/SF prüfen
const hasTraditionZauberalchimisten = !!actorLocal.items.find(i => i.type === "specialability" && i.name === dict.traditionZauberalchimistenName);
const hasAlchimieAnalytiker = !!actorLocal.items.find(i => i.type === "specialability" && i.name === dict.alchimieAnalytikerName);

// GUI-Content
let contentHtml = `
<div class="row-section">
  <div class="col sixty table-title lineheight">
    <label>${dict.laborLabel}</label>
  </div>
</div>
<div class="row-section">
  <div class="col fourty inputTooltipAvailable" style="max-width:100%;width:100%;">
    <select id="laborSelect" style="max-width: 100%; width: 100%;">
      <option value="1">${dict.labor1}</option>
      <option value="2" selected>${dict.labor2}</option>
      <option value="3">${dict.labor3}</option>
    </select>
  </div>
</div>
`;

// AsP-Infusion bei Tradition (Zauberalchimisten) oder Alchimieanalytiker
if (hasTraditionZauberalchimisten || hasAlchimieAnalytiker) {
  // Anzeige-Regel:
  // - Beides vorhanden -> "Zauberalchimist"
  // - Nur Alchimieanalytiker vorhanden -> "Alchimieanalytiker"
  // - Nur Tradition vorhanden -> "Zauberalchimist"
  const sfDisplayName = (hasTraditionZauberalchimisten && hasAlchimieAnalytiker)
    ? dict.zauberalchimistDisplayName
    : (hasAlchimieAnalytiker
        ? dict.alchimieAnalytikerDisplayName
        : dict.zauberalchimistDisplayName);

  contentHtml += `
<div class="row-section" style="margin-top:10px;">
  <div class="col sixty table-title lineheight" data-tooltip="${dict.aspLabelTitle(sfDisplayName)}">
    <label>${dict.aspLabel}</label>
  </div>
</div>
<div class="row-section">
  <div class="col fourty inputTooltipAvailable" style="max-width:100%;width:100%;">
    <select class="alchemyData" id="aspInfusionSelect" name="infusion" style="max-width: 100%; width: 100%;">
      <option value="0" selected="">${dict.aspNone}</option>
      <option value="1">4 AsP (+1)</option>
      <option value="2">8 AsP (+2)</option>
    </select>
  </div>
</div>
`;
}

new Dialog({
  title: dict.title,
  content: contentHtml,
  buttons: {
    roll: {
      label: dict.runCheck,
      callback: async (html) => {
        const selected = html.find("#laborSelect").val();

        // Labor-Modifikator
        let laborMod = 0;
        switch (selected) {
          case "1": laborMod = -2; break;
          case "2": laborMod = 0; break;
          case "3": laborMod = 1; break;
        }

        // Halbe Brauschwierigkeit mit Vorzeichen
        const brauMod = Math.round(Math.abs(brauschwierigkeit) / 2) * Math.sign(brauschwierigkeit);

        // Gesamtmodifikator Basis
        let gesamtMod = laborMod + brauMod;

        // Berufsgeheimnis -> +1
        if (berufsgeheimnis) gesamtMod += 1;

        // AsP-Infusion (nur wenn Tradition (Zauberalchimisten) oder Alchimieanalytiker vorhanden)
        let aspNeeded = 0;
        let aspEase = 0;
        let infusionVal = "0";
        if (hasTraditionZauberalchimisten || hasAlchimieAnalytiker) {
          infusionVal = html.find("#aspInfusionSelect").val();
          if (infusionVal === "1") { aspNeeded = 4; aspEase = 1; }
          else if (infusionVal === "2") { aspNeeded = 8; aspEase = 2; }

          if (aspNeeded > 0) {
            const aspObject = foundry.utils.getProperty(actorLocal, "system.status.astralenergy");
            if (!aspObject?.max && aspObject?.max !== 0) {
              ui.notifications.warn(dict.noAspResource);
              return; 
            }
            const currentAsp = Number(aspObject?.value ?? 0);
            if (currentAsp < aspNeeded) {
              ui.notifications.warn(dict.notEnoughAsp(aspNeeded, currentAsp));
              return; 
            }

            // genug AsP vorhanden -> Erleichterung anwenden, Abzug erfolgt NACH der Probe
            gesamtMod += aspEase;
          }
        }

        // Logging vor der Probe
        console.log(dict.logItemName(itemName));
        console.log(dict.logBrewDiff(brauschwierigkeit));
        console.log(dict.logLaborMod(laborMod));
        console.log(dict.logHalfDiff(brauMod));
        console.log(dict.logHasSecret(!!berufsgeheimnis));
        console.log(`SF/Tradition vorhanden - ${dict.traditionZauberalchimistenName}: ${hasTraditionZauberalchimisten ? "Ja" : "Nein"}`);
        console.log(`SF vorhanden - ${dict.alchimieAnalytikerName}: ${hasAlchimieAnalytiker ? "Ja" : "Nein"}`);
        const aspObjectLogBefore = foundry.utils.getProperty(actorLocal, "system.status.astralenergy");
        const currentAspLogBefore = Number(aspObjectLogBefore?.value ?? 0);
        console.log(`AsP-Auswahl: ${infusionVal} (${aspNeeded} AsP, +${aspEase})`);
        console.log(`Aktuelle AsP (vor Abzug): ${currentAspLogBefore}, benötigt: ${aspNeeded}`);
        console.log(dict.logTotalMod(gesamtMod));

        // Skill-Item suchen
        const skillItem = actorLocal.items.find(i =>
          i.name === skillName && ["skill","talent","ability"].includes(i.type)
        );
        if (!skillItem) {
          return ui.notifications.warn(dict.skillNotFound(skillName, actorLocal.name));
        }

        let testResult = null;
        try {
          // Probe vorbereiten
          const tokenId = actorLocal.sheet?.getTokenId ? actorLocal.sheet.getTokenId() : undefined;
          const setupData = await actorLocal.setupSkill(
            skillItem,
            { subtitle: ` (${skillName})`, modifier: gesamtMod },
            tokenId
          );

          // Test ausführen
          testResult = await actorLocal.basicTest(setupData);
          console.log(dict.logDone(actorLocal.name), testResult);

          // QS auswerten
          const qs = foundry.utils.getProperty(testResult, "result.qualityStep") || 0;

          // Chat-Ausgabe 
          let chatMessage = "";
          if (qs >= 2) {
            chatMessage = dict.qs2TextItemQs(itemName, qs);
          } else if (qs >= 1) {
            chatMessage = dict.qs1TextItem(itemName);
          }

          if (chatMessage) {
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: actorLocal }),
              content: `<div class="alchimie-result">${chatMessage}</div>`
            });
          }

        } catch (e) {
          console.error(dict.logError(actorLocal.name), e);
          ui.notifications.error(`${dict.logError(actorLocal.name)} ${e?.message ?? e}`);
        }

        // NACH der Probe: AsP abziehen, wenn eine AsP-Infusion gewählt war
        if ((hasTraditionZauberalchimisten || hasAlchimieAnalytiker) && aspNeeded > 0) {
          const aspObjectAfter = foundry.utils.getProperty(actorLocal, "system.status.astralenergy");
          const curAfter = Number(aspObjectAfter?.value ?? 0);
          const newVal = Math.max(0, curAfter - aspNeeded);
          await actorLocal.update({ "system.status.astralenergy.value": newVal });
          console.log(dict.aspDeducted(aspNeeded, newVal));
          ui.notifications.info(dict.aspDeducted(aspNeeded, newVal));
        }
      }
    },
    cancel: { label: dict.cancel }
  },
  default: "roll"
}).render(true);
