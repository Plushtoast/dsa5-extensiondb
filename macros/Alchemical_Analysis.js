// This is a system macro used for automation. It is disfunctional without the proper context.

const { getProperty: getProp, setProperty: setProp } = foundry.utils;
const { DialogV2 } = foundry.applications.api;

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    skillName: "Alchimie",
    noActor: "Kein Actor gefunden. Wähle ein Token oder setze einen Actor.",
    noItem: "Dieses Makro muss als Item-Makro direkt aus einem Item heraus gestartet werden.",
    title: "Alchimie-Probe",
    laborLabel: "Welche Laborstufe ist vorhanden?",
    labor1: "Archaisches Labor (-2)",
    labor2: "Hexenküche (+0)",
    labor3: "Alchimistisches Labor (+1)",
    runCheck: "Probe ausführen",
    cancel: "Abbrechen",
    skillNotFound: (name, actorName) => `Talent "${name}" nicht gefunden für ${actorName}.`,
    tradeSecretName: (baseName) => `Berufsgeheimnis (${baseName})`,
    aspLabelTitle: "Bei der Analyse von Elixieren durch Alchimie kann für je 4 AsP eine Erleichterung von 1 eingerechnet werden (max. +2).",
    aspLabel: "Aufladen mit AsP:",
    aspNone: "-",
    notEnoughAsp: (need, have) => `Nicht genug AsP: benötigt ${need}, vorhanden ${have}.`,
    traditionZauberalchimistenName: "Tradition (Zauberalchimisten)",
    alchimieAnalytikerName: "Alchimieanalytiker",
    logError: (actorName) => `Fehler bei Probe für ${actorName}:`,
    qs1TextItem: (itemName) => `Bei dem Spagyrika handelt es sich um ${itemName}.`,
    qs2TextItemQs: (itemName, qs) => `Bei dem Spagyrika handelt es sich um ${itemName} der Qualitätsstufe ${qs}.`,
    noAspResource: "Astralenergie-Ressource nicht gefunden.",
    aspDeducted: (spent, newVal) => `Es wurden ${spent} AsP aufgewendet. Neuer AsP-Wert: ${newVal}.`,
    aspPath: "system.status.astralenergy.value",
    aspMaxPath: "system.status.astralenergy.max"
  },
  en: {
    skillName: "Alchemy",
    noActor: "No Actor found. Select a token or set actor first.",
    noItem: "This macro must be executed as an Item Macro directly from an item.",
    title: "Alchemy Test",
    laborLabel: "Which lab tier is available?",
    labor1: "Archaic Lab (-2)",
    labor2: "Witch Kitchen (+0)",
    labor3: "Alchemical Lab (+1)",
    runCheck: "Run Test",
    cancel: "Cancel",
    skillNotFound: (name, actorName) => `Skill "${name}" not found for ${actorName}.`,
    tradeSecretName: (baseName) => `Trade Secret (${baseName})`,
    aspLabelTitle: "When analyzing elixirs via Alchemy, you may invest 4 AE for +1 ease, up to +2 total.",
    aspLabel: "Infuse with AE:",
    aspNone: "-",
    notEnoughAsp: (need, have) => `Not enough AE: need ${need}, have ${have}.`,
    traditionZauberalchimistenName: "Tradition (Magical Alchemists)",
    alchimieAnalytikerName: "Alchemy Analyst",
    logError: (actorName) => `Error during test for ${actorName}:`,
    qs1TextItem: (itemName) => `The spagyric is ${itemName}.`,
    qs2TextItemQs: (itemName, qs) => `The spagyric is ${itemName} of quality level ${qs}.`,
    noAspResource: "Astral energy resource not found.",
    aspDeducted: (spent, newVal) => `${spent} AE spent. New AE value: ${newVal}.`,
    aspPath: "system.status.astralenergy.value",
    aspMaxPath: "system.status.astralenergy.max"
  }
}[lang];

// Initiale Prüfungen
const currentActor = canvas.tokens.controlled[0]?.actor || game.user.character || (typeof actor !== "undefined" ? actor : null);
if (!currentActor) return ui.notifications.warn(dict.noActor);

if (typeof item === "undefined" || !item) return ui.notifications.warn(dict.noItem);

function getAsp(a) { return Number(getProp(a, dict.aspPath) ?? 0) || 0; }
async function spendAsp(a, amount) {
  const current = getAsp(a);
  const newVal = Math.max(0, current - amount);
  await a.update({ [dict.aspPath]: newVal });
  return newVal;
}

// Item & Actor Daten auslesen
const itemName = getProp(item, "name");
const brauschwierigkeit = Number(getProp(item, "system.difficulty")) || 0;

const tradeSecretName = dict.tradeSecretName(itemName);
const hasTradeSecret = !!currentActor.items.find(i => 
  i.type === "specialability" && 
  getProp(i, "system.category.value") === "secret" && 
  i.name === tradeSecretName
);

const hasTraditionZauberalchimisten = !!currentActor.items.find(i => i.type === "specialability" && i.name === dict.traditionZauberalchimistenName);
const hasAlchimieAnalytiker = !!currentActor.items.find(i => i.type === "specialability" && i.name === dict.alchimieAnalytikerName);

let contentHtml = `
  <div class="dsa5" style="margin-bottom: 10px;">
    <div class="form-group">
      <label>${dict.laborLabel}</label>
      <select id="laborSelect">
        <option value="-2">${dict.labor1}</option>
        <option value="0" selected>${dict.labor2}</option>
        <option value="1">${dict.labor3}</option>
      </select>
    </div>
`;

if (hasTraditionZauberalchimisten || hasAlchimieAnalytiker) {
  contentHtml += `
    <div class="form-group" title="${dict.aspLabelTitle}">
      <label>${dict.aspLabel}</label>
      <select id="aspInfusionSelect">
        <option value="0" selected>${dict.aspNone}</option>
        <option value="1">4 AsP (+1 Erleichterung)</option>
        <option value="2">8 AsP (+2 Erleichterung)</option>
      </select>
    </div>
  `;
}
contentHtml += `</div>`;

class AlchemyTestDialog extends DialogV2 {
  constructor() {
    super({
      window: { title: `${dict.title}: ${itemName}`, resizable: false },
      position: { width: 400, height: "auto" },
      content: contentHtml,
      buttons: [
        {
          action: "roll",
          label: dict.runCheck,
          icon: "fas fa-dice-d20",
          callback: async () => await this._onRoll()
        },
        {
          action: "cancel",
          label: dict.cancel,
          icon: "fas fa-times"
        }
      ]
    });
  }

  async _onRoll() {
    // Werte aus der UI auslesen
    const laborMod = Number(this.element.querySelector("#laborSelect").value);
    
    const brauMod = Math.round(Math.abs(brauschwierigkeit) / 2) * Math.sign(brauschwierigkeit);
    
    let gesamtMod = laborMod + brauMod;
    if (hasTradeSecret) gesamtMod += 1;

    let aspNeeded = 0;
    let aspEase = 0;
    
    if (hasTraditionZauberalchimisten || hasAlchimieAnalytiker) {
      const infusionSelect = this.element.querySelector("#aspInfusionSelect");
      if (infusionSelect) {
        const val = infusionSelect.value;
        if (val === "1") { aspNeeded = 4; aspEase = 1; }
        else if (val === "2") { aspNeeded = 8; aspEase = 2; }
      }
    }

    if (aspNeeded > 0) {
      const currentAsp = getAsp(currentActor);
      if (currentAsp < aspNeeded) {
        ui.notifications.warn(dict.notEnoughAsp(aspNeeded, currentAsp));
        return; 
      }
      gesamtMod += aspEase;
    }

    const skillItem = currentActor.items.find(i => i.name === dict.skillName && ["skill", "talent", "ability"].includes(i.type));
    if (!skillItem) {
      ui.notifications.warn(dict.skillNotFound(dict.skillName, currentActor.name));
      return;
    }

    try {
      const tokenId = currentActor.sheet?.getTokenId ? currentActor.sheet.getTokenId() : undefined;
      const setupData = await currentActor.setupSkill(
        skillItem,
        { subtitle: ` (${itemName})`, modifier: gesamtMod },
        tokenId
      );

      const testResult = await currentActor.basicTest(setupData);
      const qs = getProp(testResult, "result.qualityStep") || 0;

      let chatMessage = "";
      if (qs >= 2) chatMessage = dict.qs2TextItemQs(itemName, qs);
      else if (qs >= 1) chatMessage = dict.qs1TextItem(itemName);

      if (chatMessage) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: currentActor }),
          content: `<div class="dsa5 alchimie-result" style="padding: 5px;">${chatMessage}</div>`
        });
      }

      if (aspNeeded > 0) {
        const newVal = await spendAsp(currentActor, aspNeeded);
        ui.notifications.info(dict.aspDeducted(aspNeeded, newVal));
      }

    } catch (e) {
      console.error(dict.logError(currentActor.name), e);
      ui.notifications.error(`${dict.logError(currentActor.name)} ${e?.message ?? e}`);
    }
  }
}

// Dialog starten
new AlchemyTestDialog().render(true);
