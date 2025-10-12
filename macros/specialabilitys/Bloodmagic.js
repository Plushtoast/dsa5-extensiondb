// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Blutmagie (Selbstopfer)",
    talentLabel: "Selbstbeherrschung (Störungen ignorieren)",
    skillBase: "Selbstbeherrschung",
    promptMax: "Gib die Anzahl der LeP an, die du in AsP umwandeln möchtest.",
    inputLabel: "LeP in AsP umwandeln",
    convert: "Lebensenergie umwandeln",
    cancel: "Abbrechen",
    checkStart: "Probe auf Selbstbeherrschung wird gewürfelt...",
    checkFailed: "Probe nicht bestanden. Keine Umwandlung möglich.",
    convertedMsg: "Es wurden {amount} LeP in AsP umgewandelt.",
    postLoss: (loss, name) => `Zusätzlich verliert ${name} ${loss} LeP.`,
    guiText: "Der Held kann sein eigenes Blut opfern, um AsP dazu zugewinnen. Um Blutmagie einzusetzen, muss dem Zauberer zunächst eine Probe auf Selbstbeherrschung gelingen, andernfalls kann er 1 Tag lang keine Blutmagie einsetzen.Gelingt ihm die Probe, kann er LeP im Verhältnis 1 zu 1 in AsP umwandeln, verliert aber am Ende der Prozedur 1W3+1 LeP zusätzlich. Bei Ritualen und Zaubern des Merkmals Dämonisch ist die Probe des Zaubers um die zusätzlich geopferten LeP/2 erleichtert.",
    noToken: "Kein verknüpfter Token des Actors gefunden. Bitte Token auf der Szene verknüpfen.",
    notEnoughLP: "Nicht genügend LeP vorhanden.",
    demonTraitLabel: "Dämonisch",
    effectName: "Blutmagie (Selbstopfer) – Erleichterung Dämonisch",
  },
  en: {
    title: "Blood Magic (Self-Sacrifice)",
    talentLabel: "Self-Control (Ignore Distractions)",
    skillBase: "Self-Control",
    promptMax: "Enter the amount of LP you want to convert into AE.",
    inputLabel: "Convert LP to AE",
    convert: "Convert Life Energy",
    cancel: "Cancel",
    checkStart: "Rolling Self-Control check...",
    checkFailed: "Check failed. No conversion possible.",
    convertedMsg: "{amount} LP have been converted to AE.",
    postLoss: (loss, name) => `Additionally, ${name} loses ${loss} LP.`,
    guiText: "The hero can sacrifice their own blood to gain additional AE. To use Blood Magic, the caster must first succeed at a Self-Control check; otherwise, they cannot use Blood Magic for 1 day. If the check succeeds, they can convert LP to AE at a 1:1 ratio, but lose an additional 1D3+1 LP at the end of the procedure. For rituals and spells with the Demonic trait, the casting check is eased by the additionally sacrificed LP/2.",
    noToken: "No linked token of the actor found. Please link a token on the scene.",
    notEnoughLP: "Not enough LP available.",
    demonTraitLabel: "Demonic",
    effectName: "Blood Magic (Self-Sacrifice) – Ease Demonic",
  }
}[lang];

const gp = foundry.utils.getProperty;
const sp = foundry.utils.setProperty;

const AE_PATH = "system.status.astralenergy.value";
const AE_MAX_PATH = "system.status.astralenergy.max";
const LP_PATH = "system.status.wounds.value";
const LP_MAX_PATH = "system.status.wounds.max";

if (!actor) { ui.notifications.error(lang === "de" ? "Kein Actor vorhanden." : "No actor available."); return; }

// Skill finden
const skill = actor.items.find(x => x.type === "skill" && x.name === dict.skillBase);
if (!skill) { ui.notifications.warn(`${dict.talentLabel} nicht gefunden.`); return; }

// Probe
const setupData = await actor.setupSkill(skill, { subtitle: ` (${dict.talentLabel})` }, actor.sheet?.getTokenId?.());
sp(setupData, "testData.opposable", false);
ui.notifications.info(dict.checkStart);
const res = await actor.basicTest(setupData);
const qs = Number(gp(res, "result.qualityStep")) || 0;
this.automatedAnimation?.(gp(res, "result.successLevel"));
if (qs <= 0) { ui.notifications.warn(dict.checkFailed); return; }

const actorName = actor.name ?? (lang === "de" ? "der Charakter" : "the character");

// GUI
const infoText = dict.guiText;
const maxLine = dict.promptMax;
const content = `
<div style="display:flex; flex-direction:column;">
  <div style="white-space:pre-wrap; font-size:0.95rem; line-height:1.25rem; margin-bottom:0.375rem;">
    ${infoText}
  </div>
  <div style="font-weight:600; margin-bottom:0.375rem;">
    ${maxLine}
  </div>
  <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1.25rem;">
    <label style="min-width:220px;">${dict.inputLabel}</label>
    <input id="lepInput" type="number" min="0" step="1" value="1" style="width:120px;"/>
  </div>
</div>
`;

// Direkte Updates via actor.update (möglich da eigener Actor)
async function doConversion(html) {
  const inputEl = html.find("#lepInput")[0];
  const rawVal = Number(inputEl?.value ?? 0);
  const amount = Math.floor(rawVal);

  // Werte lesen
  const currentLP = Number(gp(actor, LP_PATH)) || 0;
  const currentAE = Number(gp(actor, AE_PATH)) || 0;
  const maxAE = Number(gp(actor, AE_MAX_PATH)) || 0;

  // LP verfügbar?
  if (currentLP < amount) {
    ui.notifications.error(dict.notEnoughLP);
    return false;
  }

  // LP -> AE, AE deckeln
  const aeToAdd = Math.min(amount, Math.max(0, maxAE - currentAE));
  const newAE = currentAE + aeToAdd;
  const newLP = Math.max(0, currentLP - amount);

  // Update des eigenen Actors
  await actor.update({
    [LP_PATH]: newLP,
    [AE_PATH]: newAE
  });

  // Chat: Umwandlung
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: dict.convertedMsg.replace("{amount}", String(aeToAdd))
  });

  // 1W3+1 LeP Verlust
  let loss = 2;
  try {
    const lossRoll = new Roll("1d3+1").evaluateSync();
    loss = Number(lossRoll.total) || 2;
  } catch (err) {
    const lossRoll = new Roll("1d3+1");
    await lossRoll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: lang === "de" ? "1W3+1 LeP Verlust" : "1D3+1 LP loss" });
    loss = Number(lossRoll.total) || 2;
  }

  // Verlust anwenden
  const lpAfterConv = Number(gp(actor, LP_PATH)) || newLP;
  const lpAfterLoss = Math.max(0, lpAfterConv - loss);

  await actor.update({
    [LP_PATH]: lpAfterLoss
  });

  // Abschlussmeldung
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: dict.postLoss(loss, actorName)
  });

  // 24h Effekt – Erleichterung Merkmal "Dämonisch" um (zusätzlich geopferte LeP / 2), ab 0,5 aufrunden
  const easeValue = Math.round(amount / 2);
  if (easeValue > 0) {
    await actor.createEmbeddedDocuments("ActiveEffect", [
      {
        name: dict.effectName,
        icon: "icons/svg/aura.svg",
        duration: { seconds: 86400, startTime: game.time.worldTime },
        flags: { dsa5: { meditationDemonicEase: true, amount, easeValue } },
        changes: [
          { key: "system.skillModifiers.feature.step", mode: 0, value: `${dict.demonTraitLabel} ${easeValue}`, priority: 20 }
        ]
      }
    ]);
  }

  return true;
}

let dialogRef = null;

dialogRef = new Dialog({
  title: dict.title,
  content,
  buttons: {
    convert: {
      label: dict.convert,
      callback: async (html) => {
        return await doConversion(html);
      }
    },
    cancel: { label: dict.cancel }
  },
  default: "convert",
  render: (html) => {

    const inputEl = html.find("#lepInput")[0];
    if (inputEl) {
      inputEl.addEventListener("keydown", async (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          await doConversion(html);
        }
      });
    }
  }
}).render(true);
