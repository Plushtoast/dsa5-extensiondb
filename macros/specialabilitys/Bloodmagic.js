// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Blutmagie (Selbstopfer)",
    talentLabel: "Selbstbeherrschung",
    skillBase: "Selbstbeherrschung",
    promptMax: "Gib die Anzahl der LeP an, die du in AsP umwandeln möchtest.",
    inputLabel: "LeP in AsP umwandeln",
    convert: "Lebensenergie umwandeln",
    cancel: "Abbrechen",
    checkFailed: "Probe nicht bestanden. Keine Umwandlung möglich.",
    convertedMsg: "Es wurden {amount} LeP in AsP umgewandelt.",
    postLoss: (loss, name) => `Zusätzlich verliert ${name} ${loss} LeP.`,
    guiText: "Der Held kann sein eigenes Blut opfern, um AsP dazuzugewinnen. Um Blutmagie einzusetzen, muss dem Zauberer zunächst eine Probe auf Selbstbeherrschung gelingen, andernfalls kann er 1 Tag lang keine Blutmagie einsetzen. Gelingt ihm die Probe, kann er LeP im Verhältnis 1 zu 1 in AsP umwandeln, verliert aber am Ende der Prozedur 1W3+1 LeP zusätzlich. Bei Ritualen und Zaubern des Merkmals Dämonisch ist die Probe des Zaubers um die zusätzlich geopferten LeP/2 erleichtert.",
    noToken: "Kein verknüpfter Token des Actors gefunden. Bitte Token auf der Szene verknüpfen.",
    notEnoughLP: "Nicht genügend LeP vorhanden.",
    demonTraitLabel: "Dämonisch",
    effectName: "Blutmagie (Selbstopfer)",
  },
  en: {
    title: "Blood Magic (Self-Sacrifice)",
    talentLabel: "Self-Control",
    skillBase: "Self-Control",
    promptMax: "Enter the amount of LP you want to convert into AE.",
    inputLabel: "Convert LP to AE",
    convert: "Convert Life Energy",
    cancel: "Cancel",
    checkFailed: "Check failed. No conversion possible.",
    convertedMsg: "{amount} LP have been converted to AE.",
    postLoss: (loss, name) => `Additionally, ${name} loses ${loss} LP.`,
    guiText: "The hero can sacrifice their own blood to gain additional AE. To use Blood Magic, the caster must first succeed at a Self-Control check; otherwise, they cannot use Blood Magic for 1 day. If the check succeeds, they can convert LP to AE at a 1:1 ratio, but lose an additional 1D3+1 LP at the end of the procedure. For rituals and spells with the Demonic trait, the casting check is eased by the additionally sacrificed LP/2.",
    noToken: "No linked token of the actor found. Please link a token on the scene.",
    notEnoughLP: "Not enough LP available.",
    demonTraitLabel: "Demonic",
    effectName: "Blood Magic (Self-Sacrifice)",
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

const actorName = actor.name ?? (lang === "de" ? "der Charakter" : "the character");

const lepLabel = game.i18n.localize("LEP") || "Lebenspunkte";
const aspLabel = game.i18n.localize("ASP") || "Astralpunkte";

const currentLP = Number(gp(actor, LP_PATH)) || 0;
const maxLP = Number(gp(actor, LP_MAX_PATH)) || 0;
const currentAE = Number(gp(actor, AE_PATH)) || 0;
const maxAE = Number(gp(actor, AE_MAX_PATH)) || 0;

const styleId = "bloodmagic-styles";
if (!document.getElementById(styleId)) {
    document.head.insertAdjacentHTML("beforeend", `
        <style id="${styleId}">
            #dsa-bloodmagic-container { display: flex; flex-direction: column; }
            #dsa-bloodmagic-container .info-text { font-size: 0.95rem; line-height: 1.25rem; margin-bottom: 10px; font-style: italic; }
            #dsa-bloodmagic-container .max-line { font-weight: bold; margin-bottom: 10px; text-align: center; }
            /* Statusleiste mit Zeilenumbruch und ohne bunte Farben */
            #dsa-bloodmagic-container .status-bars { 
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
            #dsa-bloodmagic-container .input-group { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 15px; }
            #dsa-bloodmagic-container .lep-input { width: 80px; text-align: center; font-weight: bold; }
        </style>
    `);
}

const content = `
<div id="dsa-bloodmagic-container">
  <div class="info-text">
    ${dict.guiText}
  </div>
  <hr>
  <div class="max-line">
    ${dict.promptMax}
  </div>
  
  <div class="status-bars">
    <span>${lepLabel}: ${currentLP} / ${maxLP}</span>
    <span>${aspLabel}: ${currentAE} / ${maxAE}</span>
  </div>

  <div class="input-group">
    <label for="lepInput">${dict.inputLabel}:</label>
    <input id="lepInput" name="lepInput" class="lep-input" type="number" min="0" step="1" max="${currentLP}" value="1" autofocus />
  </div>
</div>
`;

async function doConversion(rawVal) {
    const amount = Math.floor(Number(rawVal));
    if (amount <= 0) return;

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

    let loss = 2;
    try {
        const lossRoll = await new Roll("1d3+1").evaluate();
        loss = Number(lossRoll.total) || 2;
    } catch (err) {
        console.warn("Blutmagie: Fehler beim Würfeln des LeP-Verlusts.", err);
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

    const easeValue = Math.ceil(amount / 2);
    if (easeValue > 0) {
        const effectData = {
            name: dict.effectName,
            img: "icons/svg/blood.svg", 
            description: dict.effectName,
            disabled: false,
            duration: { seconds: 86400, startTime: game.time.worldTime },
            changes: [
                { key: "system.skillModifiers.feature.step", mode: 0, value: `${dict.demonTraitLabel} ${easeValue}`, priority: 20 }
            ],
            flags: { dsa5: { meditationDemonicEase: true, amount, easeValue } },
            type: "base",
            statuses: []
        };
        await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    }
}

new foundry.applications.api.DialogV2({
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
        icon: "fas fa-tint", 
        default: true,
        callback: async (event, button, dialog) => {
            const inputEl = dialog.element.querySelector('#lepInput');
            const rawVal = inputEl ? inputEl.value : 0;
            await doConversion(rawVal);
        }
    }, {
        action: "cancel",
        label: dict.cancel,
        icon: "fas fa-times"
    }]
}).render({ force: true });
