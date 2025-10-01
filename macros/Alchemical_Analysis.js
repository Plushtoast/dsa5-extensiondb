// This is a system macro used for automation. It is disfunctional without the proper context.



const i18n = {
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
    // Berufsgeheimnis/Trade Secret Texte
    tradeSecretLabel: "Berufsgeheimnis",
    hasTradeSecret: (name) => `✅ Actor hat das Berufsgeheimnis: ${name}`,
    noTradeSecretFor: (itemName) => `❌ Actor besitzt kein Berufsgeheimnis für "${itemName}"`,
    tradeSecretName: (baseName) => `Berufsgeheimnis (${baseName})`, // zusammengesetzter Name im DE-Charakterbogen
    // Logging
    logItemName: (itemName) => `🔹 Item-Name: ${itemName}`,
    logBrewDiff: (diff) => `🔹 Brauschwierigkeit: ${diff}`,
    logLaborMod: (mod) => `🔹 Labor-Modifikator aus Dropdown: ${mod}`,
    logHalfDiff: (val) => `🔹 Halbe Brauschwierigkeit (gerundet, Vorzeichen beibehalten): ${val}`,
    logHasSecret: (exists) => `🔹 Berufsgeheimnis vorhanden: ${exists ? "Ja" : "Nein"}`,
    logTotalMod: (mod) => `🔹 Gesamtmodifikator für die Probe: ${mod}`,
    logDone: (actorName) => `✅ Probe für ${actorName} abgeschlossen`,
    logError: (actorName) => `Fehler bei Probe für ${actorName}:`,
    // QS-Texte
    qs1Text: "Der Alchimist kann die Art des Spagyrikas feststellen.",
    qs2Text: "Er kann außerdem bestimmen, welche Qualität es hat."
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
    // Berufsgeheimnis/Trade Secret Texte
    tradeSecretLabel: "Trade Secret",
    hasTradeSecret: (name) => `✅ Actor has the trade secret: ${name}`,
    noTradeSecretFor: (itemName) => `❌ Actor lacks a trade secret for "${itemName}"`,
    tradeSecretName: (baseName) => `Trade Secret (${baseName})`, // zusammengesetzter Name im EN-Charakterbogen
    // Logging
    logItemName: (itemName) => `🔹 Item name: ${itemName}`,
    logBrewDiff: (diff) => `🔹 Brewing difficulty: ${diff}`,
    logLaborMod: (mod) => `🔹 Lab modifier from dropdown: ${mod}`,
    logHalfDiff: (val) => `🔹 Half brewing difficulty (rounded, sign preserved): ${val}`,
    logHasSecret: (exists) => `🔹 Trade secret present: ${exists ? "Yes" : "No"}`,
    logTotalMod: (mod) => `🔹 Total modifier for the test: ${mod}`,
    logDone: (actorName) => `✅ Test for ${actorName} finished`,
    logError: (actorName) => `Error during test for ${actorName}:`,
    // QS-Texte
    qs1Text: "The alchemist can determine the type of spagyric.",
    qs2Text: "They can also determine its quality."
  }
};
const lang = game.i18n?.lang === "en" ? "en" : "de";
const t = i18n[lang];

const skillName = t.skillName;

// Actor bestimmen: zuerst vorhandenes `actor`, sonst kontrolliertes Token
let actorLocal = (typeof actor !== "undefined" && actor) ? actor : null;
if (!actorLocal) {
  const tok = canvas?.tokens?.controlled?.[0];
  actorLocal = tok?.actor ?? null;
}
if (!actorLocal) return ui.notifications.warn(t.noActor);

// Item-Daten via foundry.utils.getProperty
const itemName = foundry.utils.getProperty(item, "name");
const brauschwierigkeit = Number(foundry.utils.getProperty(item, "system.difficulty")) || 0;

// Name des Berufsgeheimnisses gemäß Sprache zusammensetzen
const tradeSecretName = t.tradeSecretName(itemName);

// Berufsgeheimnis prüfen
const berufsgeheimnis = actorLocal.items.find(i =>
  i.type === "specialability" &&
  foundry.utils.getProperty(i, "system.category.value") === "secret" &&
  i.name === tradeSecretName
);

if (berufsgeheimnis) {
  console.log(t.hasTradeSecret(berufsgeheimnis.name));
} else {
  console.log(t.noTradeSecretFor(itemName));
}

const contentHtml = `
<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px;">
  <div style="display:flex; align-items:center; gap:10px;">
    <label for="laborSelect" style="flex:1;">${t.laborLabel}</label>
    <select id="laborSelect" style="flex:2; max-width:100%;">
      <option value="1">${t.labor1}</option>
      <option value="2" selected>${t.labor2}</option>
      <option value="3">${t.labor3}</option>
    </select>
  </div>
</div>
`;

new Dialog({
  title: t.title,
  content: contentHtml,
  buttons: {
    roll: {
      label: t.runCheck,
      callback: async (html) => {
        const selected = html.find("#laborSelect").val();

        // Labor-Modifikator
        let laborMod = 0;
        switch (selected) {
          case "1": laborMod = -2; break; // Archaisches Labor
          case "2": laborMod = 0; break;  // Hexenküche
          case "3": laborMod = 1; break;  // Alchimistisches Labor
        }

        // Halbe Brauschwierigkeit, Vorzeichen erhalten
        const brauMod = Math.round(Math.abs(brauschwierigkeit) / 2) * Math.sign(brauschwierigkeit);

        // Gesamtmodifikator
        let gesamtMod = laborMod + brauMod;

        // Trade Secret vorhanden -> +1
        if (berufsgeheimnis) gesamtMod += 1;

        // Logging
        console.log(t.logItemName(itemName));
        console.log(t.logBrewDiff(brauschwierigkeit));
        console.log(t.logLaborMod(laborMod));
        console.log(t.logHalfDiff(brauMod));
        console.log(t.logHasSecret(!!berufsgeheimnis));
        console.log(t.logTotalMod(gesamtMod));

        // Skill-Item suchen
        const skillItem = actorLocal.items.find(i =>
          i.name === skillName && ["skill","talent","ability"].includes(i.type)
        );
        if (!skillItem) {
          return ui.notifications.warn(t.skillNotFound(skillName, actorLocal.name));
        }

        try {
          // Probe vorbereiten
          const tokenId = actorLocal.sheet?.getTokenId ? actorLocal.sheet.getTokenId() : undefined;
          const setupData = await actorLocal.setupSkill(
            skillItem,
            { subtitle: ` (${skillName})`, modifier: gesamtMod },
            tokenId
          );

          // Test ausführen
          const testResult = await actorLocal.basicTest(setupData);

          console.log(t.logDone(actorLocal.name), testResult);

          // QS auswerten
          const qs = foundry.utils.getProperty(testResult, "result.qualityStep") || 0;

          // Chat-Ausgabe
          let chatMessage = "";
          if (qs >= 1) chatMessage += t.qs1Text;
          if (qs >= 2) chatMessage += (chatMessage ? "<br>" : "") + t.qs2Text;

          if (chatMessage) {
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: actorLocal }),
              content: `<div class="alchimie-result">${chatMessage}</div>`
            });
          }

        } catch (e) {
          console.error(t.logError(actorLocal.name), e);
          ui.notifications.error(`${t.logError(actorLocal.name)} ${e?.message ?? e}`);
        }
      }
    },
    cancel: { label: t.cancel }
  },
  default: "roll"
}).render(true);
