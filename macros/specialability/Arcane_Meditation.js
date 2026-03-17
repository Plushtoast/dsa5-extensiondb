// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Astrale Meditation",
    talentLabel: "Selbstbeherrschung",
    skillBase: "Selbstbeherrschung",
    promptMax: "Du kannst maximal {max} Lebenspunkte in Astralenergie umwandeln.",
    inputLabel: "LeP in AsP umwandeln",
    convert: "Lebensenergie umwandeln",
    cancel: "Abbrechen",
    checkFailed: "Probe nicht bestanden. Keine Umwandlung möglich.",
    convertedMsg: "Es wurden {amount} LeP in AsP umgewandelt.",
    postLoss: (loss, name) => `Zusätzlich verliert ${name} ${loss} LeP (1W3).`,
    guiText: "Eine der bekanntesten Techniken erfahrener Zauberer ist die Astrale Meditation. Durch sie kann ein Zauberkundiger seine Lebenskraft in astrale Energie umwandeln. Regel: Der Zauberer ist durch die Astrale Meditation in der Lage, LeP im Verhältnis 1 zu 1 in AsP umzuwandeln. Er muss sich dazu in stiller Umgebung aufhalten (z. B. in einem abgeschiedenen Waldstück oder einem ruhigen Zimmer), eine mindestens 5 Minuten andauernde Meditation durchführen und eine Probe auf Selbstbeherrschung (Störungen ignorieren) bestehen. Er kann maximal QS x3 LeP in AsP umwandeln. Allerdings verliert er am Ende der Meditation zusätzlich 1W3 LeP und er kann die nächsten 24 Stunden keine weitere Astrale Meditation durchführen – egal ob die Meditation erfolgreich war oder nicht.",
    noToken: "Kein verknüpfter Token des Actors gefunden. Bitte Token auf der Szene verknüpfen.",
    overMax: (max) => `Eingabe überschreitet das Maximum von ${max}.`,
    notEnoughLP: "Nicht genügend LeP vorhanden.",
  },
  en: {
    title: "Arcane Meditation",
    talentLabel: "Self-Control",
    skillBase: "Self-Control",
    promptMax: "You can convert a maximum of {max} Life Points into Astral Energy.",
    inputLabel: "Convert LP to AE",
    convert: "Convert Life Energy",
    cancel: "Cancel",
    checkFailed: "Check failed. No conversion possible.",
    convertedMsg: "{amount} LP have been converted to AE.",
    postLoss: (loss, name) => `Additionally, ${name} loses ${loss} LP (1D3).`,
    guiText: "A spellcaster with Arcane Meditation can convert LP into AE. The caster must be in a quiet location (such as in a remote part of the forest, or a quiet room), meditate for at least 5 minutes, and make a Self-Control (Ignore Distractions) check. This converts a maximum of QL x 3 LP to AE. At the end of the meditation period, the caster loses an additional 1D6 LP and will not recover any LP or AE for 24h during any regeneration phases, whether the Arcane Meditation succeeded or not.",
    noToken: "No linked token of the actor found. Please link a token on the scene.",
    overMax: (max) => `Input exceeds the maximum of ${max}.`,
    notEnoughLP: "Not enough LP available.",
  }
}[lang];

if (!actor) { ui.notifications.error(lang === "de" ? "Kein Actor vorhanden." : "No actor available."); return; }

const gp = foundry.utils.getProperty;
const sp = foundry.utils.setProperty;

const AE_PATH = "system.status.astralenergy.value";
const AE_MAX_PATH = "system.status.astralenergy.max";
const LP_PATH = "system.status.wounds.value";
const LP_MAX_PATH = "system.status.wounds.max";

const skill = actor.items.find(x => x.type === "skill" && x.name === dict.skillBase);
if (!skill) { ui.notifications.warn(`Talent "${dict.skillBase}" nicht gefunden.`); return; }

const setupData = await actor.setupSkill(skill, { subtitle: ` (${dict.talentLabel})` }, actor.sheet?.getTokenId?.());
sp(setupData, "testData.opposable", false);
const res = await actor.basicTest(setupData);
const qs = Number(gp(res, "result.qualityStep")) || 0;

if (qs <= 0) { 
    ui.notifications.warn(dict.checkFailed); 
    return; 
}

const maxConvert = qs * 3;
const actorName = actor.name ?? (lang === "de" ? "der Charakter" : "the character");

const lepLabel = game.i18n.localize("LEP") || "Lebenspunkte";
const aspLabel = game.i18n.localize("ASP") || "Astralpunkte";

const currentLP = Number(gp(actor, LP_PATH)) || 0;
const maxLP = Number(gp(actor, LP_MAX_PATH)) || 0;
const currentAE = Number(gp(actor, AE_PATH)) || 0;
const maxAE = Number(gp(actor, AE_MAX_PATH)) || 0;

const styleId = "arcane-meditation-styles";
if (!document.getElementById(styleId)) {
    document.head.insertAdjacentHTML("beforeend", `
        <style id="${styleId}">
            #dsa-arcanemeditation-container { display: flex; flex-direction: column; }
            #dsa-arcanemeditation-container .info-text { font-size: 0.95rem; line-height: 1.25rem; margin-bottom: 10px; font-style: italic; }
            #dsa-arcanemeditation-container .max-line { font-weight: bold; margin-bottom: 10px; text-align: center; }
            #dsa-arcanemeditation-container .status-bars { 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                gap: 5px; 
                margin-bottom: 15px; 
                font-weight: bold; 
                padding: 10px 0; 
                border-top: 1px solid #7a7971; 
                border-bottom: 1px solid #7a7971; 
                background: rgba(0,0,0,0.03); 
                font-size: 1.1em; 
            }
            #dsa-arcanemeditation-container .input-group { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 15px; }
            #dsa-arcanemeditation-container .lep-input { width: 80px; text-align: center; font-weight: bold; }
        </style>
    `);
}

const infoText = dict.guiText;
const maxLine = dict.promptMax.replace("{max}", String(maxConvert));
const inputMax = Math.min(currentLP, maxConvert);

const content = `
<div id="dsa-arcanemeditation-container">
  <div class="info-text">
    ${infoText}
  </div>
  <hr>
  <div class="max-line">
    ${maxLine}
  </div>
  
  <div class="status-bars">
    <span>${lepLabel}: ${currentLP} / ${maxLP}</span>
    <span>${aspLabel}: ${currentAE} / ${maxAE}</span>
  </div>

  <div class="input-group">
    <label for="lepInput">${dict.inputLabel}:</label>
    <input id="lepInput" name="lepInput" class="lep-input" type="number" min="0" step="1" max="${inputMax}" value="${inputMax}" autofocus />
  </div>
</div>
`;

async function doConversion(rawVal, maxLimit) {
    const amount = Math.floor(Number(rawVal));
    if (amount <= 0) return;

    if (amount > maxLimit) {
        ui.notifications.warn(dict.overMax(maxLimit));
        return;
    }

    const currentLP = Number(gp(actor, LP_PATH)) || 0;
    const currentAE = Number(gp(actor, AE_PATH)) || 0;
    const maxAE = Number(gp(actor, AE_MAX_PATH)) || 0;

    if (currentLP < amount) {
        ui.notifications.error(dict.notEnoughLP);
        return false;
    }

    const aeToAdd = Math.min(amount, Math.max(0, maxAE - currentAE));
    const newAE = currentAE + aeToAdd;
    const newLP = Math.max(0, currentLP - amount);

    await actor.update({
        [LP_PATH]: newLP,
        [AE_PATH]: newAE
    });

    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: dict.convertedMsg.replace("{amount}", String(aeToAdd))
    });

    let loss = 1;
    try {
        const lossRoll = await new Roll("1d3").evaluate();
        loss = Number(lossRoll.total) || 1;
    } catch (err) {
        console.warn("Astrale Meditation: Fehler beim Würfeln des LeP-Verlusts.", err);
    }

    const lpAfterConv = Number(gp(actor, LP_PATH)) || newLP;
    const lpAfterLoss = Math.max(0, lpAfterConv - loss);

    await actor.update({
        [LP_PATH]: lpAfterLoss
    });

    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: dict.postLoss(loss, actorName)
    });
}

const dialog = new foundry.applications.api.DialogV2({
    window: { 
        title: dict.title,
        resizable: true
    },
    classes: ["dsa5"],
    position: { width: 450, height: "auto" },
    content: content,
    buttons: [{
        action: "convert",
        label: dict.convert,
        icon: "fas fa-magic", 
        default: true,
        callback: async (event, button, dialog) => {
            const inputEl = dialog.element.querySelector('#lepInput');
            const rawVal = inputEl ? inputEl.value : 0;
            await doConversion(rawVal, maxConvert);
        }
    }, {
        action: "cancel",
        label: dict.cancel,
        icon: "fas fa-times"
    }]
});

dialog.render({ force: true }).then(() => {
    const inputEl = dialog.element.querySelector('#lepInput');
    if (inputEl) {
        inputEl.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (!isNaN(val) && val > inputMax) {
                e.target.value = inputMax;
            }
        });
    }
});
