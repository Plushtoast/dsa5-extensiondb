// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Astrale Meditation",
    talentLabel: "Selbstbeherrschung",
    skillBase: "Selbstbeherrschung",
    noActor: "Kein gültiger Akteur gefunden.",
    noSkill: (name) => `${name} hat das Talent "Selbstbeherrschung" nicht.`,
    cooldownEffectName: "Astrale Meditation - Abklingzeit",
    cooldownDesc: "Kann 24 Stunden lang keine weitere Astrale Meditation durchfuehren.",
    cooldownActive: (name) => `${name} kann derzeit keine weitere Astrale Meditation durchfuehren.`,
    promptMax: "Du kannst maximal {max} Lebenspunkte in Astralenergie umwandeln.",
    inputLabel: "LeP in AsP umwandeln",
    convert: "Lebensenergie umwandeln",
    cancel: "Abbrechen",
    checkFailed: (name, loss) =>
      `<p>${name} hat die Probe auf "Selbstbeherrschung" nicht bestanden.</p><p>${name} verliert dennoch ${loss} LeP (1W3).</p><p>Weitere Astrale Meditationen sind 24 Stunden lang nicht moeglich.</p>`,
    completed: (name, amount, loss) =>
      amount > 0
        ? `<p>${name} wandelt ${amount} LeP in AsP um.</p><p>${name} verliert anschliessend ${loss} LeP (1W3).</p><p>Weitere Astrale Meditationen sind 24 Stunden lang nicht moeglich.</p>`
        : `<p>${name} beendet die Astrale Meditation ohne Umwandlung.</p><p>${name} verliert anschliessend ${loss} LeP (1W3).</p><p>Weitere Astrale Meditationen sind 24 Stunden lang nicht moeglich.</p>`,
    guiText:
      "Eine der bekanntesten Techniken erfahrener Zauberer ist die Astrale Meditation. Durch sie kann ein Zauberkundiger seine Lebenskraft in astrale Energie umwandeln. Regel: Der Zauberer ist durch die Astrale Meditation in der Lage, LeP im Verhältnis 1 zu 1 in AsP umzuwandeln. Er muss sich dazu in stiller Umgebung aufhalten (z. B. in einem abgeschiedenen Waldstück oder einem ruhigen Zimmer), eine mindestens 5 Minuten andauernde Meditation durchführen und eine Probe auf Selbstbeherrschung (Störungen ignorieren) bestehen. Er kann maximal QS x3 LeP in AsP umwandeln. Allerdings verliert er am Ende der Meditation zusätzlich 1W3 LeP und er kann die nächsten 24 Stunden keine weitere Astrale Meditation durchführen – egal ob die Meditation erfolgreich war oder nicht.",
    overMax: (max) => `Eingabe überschreitet das Maximum von ${max}.`,
    notEnoughLP: "Nicht genügend LeP vorhanden.",
    noAeCapacity: "Es kann keine weitere Astralenergie aufgenommen werden.",
    subtitle: " (Astrale Meditation)",
  },
  en: {
    title: "Arcane Meditation",
    talentLabel: "Self-Control",
    skillBase: "Self-Control",
    noActor: "No valid actor found.",
    noSkill: (name) => `${name} does not have the skill "Self-Control".`,
    cooldownEffectName: "Arcane Meditation - Cooldown",
    cooldownDesc: "Cannot perform another Arcane Meditation for 24 hours.",
    cooldownActive: (name) => `${name} cannot perform another Arcane Meditation right now.`,
    promptMax: "You can convert a maximum of {max} Life Points into Astral Energy.",
    inputLabel: "Convert LP to AE",
    convert: "Convert Life Energy",
    cancel: "Cancel",
    checkFailed: (name, loss) =>
      `<p>${name} failed the "Self-Control" test.</p><p>${name} still loses ${loss} LP (1D3).</p><p>No further Arcane Meditation is possible for 24 hours.</p>`,
    completed: (name, amount, loss) =>
      amount > 0
        ? `<p>${name} converts ${amount} LP into AE.</p><p>${name} then loses ${loss} LP (1D3).</p><p>No further Arcane Meditation is possible for 24 hours.</p>`
        : `<p>${name} ends the Arcane Meditation without conversion.</p><p>${name} then loses ${loss} LP (1D3).</p><p>No further Arcane Meditation is possible for 24 hours.</p>`,
    guiText:
      "A spellcaster with Arcane Meditation can convert LP into AE. The caster must be in a quiet location (such as a remote part of a forest or a quiet room), meditate for at least 5 minutes, and make a Self-Control (Ignore Distractions) check. A maximum of QL x 3 LP can be converted into AE. At the end of the meditation, the caster loses an additional 1D3 LP and cannot perform another Arcane Meditation for 24 hours, whether the meditation succeeded or not.",
    overMax: (max) => `Input exceeds the maximum of ${max}.`,
    notEnoughLP: "Not enough LP available.",
    noAeCapacity: "No further Astral Energy can be restored.",
    subtitle: " (Arcane Meditation)",
  },
}[lang];

const COOLDOWN_SECONDS = 24 * 60 * 60;

if (!actor) {
  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.noActor));
  return;
}

const gp = foundry.utils.getProperty;
const sp = foundry.utils.setProperty;

const AE_PATH = "system.status.astralenergy.value";
const AE_MAX_PATH = "system.status.astralenergy.max";
const LP_PATH = "system.status.wounds.value";
const LP_MAX_PATH = "system.status.wounds.max";

const sendMessage = async (message) => {
  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(message));
};

function createCondition({ name, seconds, description }) {
  const condition = this.effectDummy(name, [], { seconds });
  foundry.utils.mergeObject(condition, {
    img: item?.img ?? condition.img,
    flags: {
      dsa5: {
        hideOnToken: true,
        ...(description ? { description } : {}),
      },
    },
  });
  return condition;
}

const cooldownEffect = actor.effects.find(
  (effect) => effect.name === dict.cooldownEffectName || effect.flags?.dsa5?.description === dict.cooldownDesc,
);

if (cooldownEffect) {
  await sendMessage(dict.cooldownActive(actor.name));
  return;
}

const skill = actor.items.find((x) => x.type === "skill" && x.name === dict.skillBase);
if (!skill) {
  await sendMessage(dict.noSkill(actor.name));
  return;
}

const setupData = await actor.setupSkill(skill, { subtitle: dict.subtitle }, actor.sheet?.getTokenId?.());
sp(setupData, "testData.opposable", false);
const res = await actor.basicTest(setupData);
const qs = Number(gp(res, "result.qualityStep")) || 0;
const actorName = actor.name ?? (lang === "de" ? "der Charakter" : "the character");

const cooldownCondition = createCondition.call(this, {
  name: dict.cooldownEffectName,
  seconds: COOLDOWN_SECONDS,
  description: dict.cooldownDesc,
});

await actor.addCondition(cooldownCondition);

async function applyPostLoss() {
  const lossRoll = await new Roll("1d3").evaluate();
  const loss = Number(lossRoll.total) || 1;
  const currentLP = Number(gp(actor, LP_PATH)) || 0;
  await actor.update({
    [LP_PATH]: Math.max(0, currentLP - loss),
  });
  return loss;
}

if (qs <= 0) {
  const loss = await applyPostLoss();
  await sendMessage(dict.checkFailed(actorName, loss));
  return;
}

const maxConvert = qs * 3;

const lepLabel = game.i18n.localize("LEP") || "Lebenspunkte";
const aspLabel = game.i18n.localize("ASP") || "Astralpunkte";

const currentLP = Number(gp(actor, LP_PATH)) || 0;
const maxLP = Number(gp(actor, LP_MAX_PATH)) || 0;
const currentAE = Number(gp(actor, AE_PATH)) || 0;
const maxAE = Number(gp(actor, AE_MAX_PATH)) || 0;
const inputMax = Math.min(currentLP, maxConvert, Math.max(0, maxAE - currentAE));

if (inputMax < 1) {
  const loss = await applyPostLoss();
  await sendMessage(dict.completed(actorName, 0, loss));
  return;
}

const styleId = "arcane-meditation-styles";
if (!document.getElementById(styleId)) {
  document.head.insertAdjacentHTML(
    "beforeend",
    `
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
    `,
  );
}

const infoText = dict.guiText;
const maxLine = dict.promptMax.replace("{max}", String(inputMax));

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

async function finishMeditation(rawVal, maxLimit) {
  let amount = Math.max(0, Math.floor(Number(rawVal) || 0));

  if (amount > maxLimit) {
    await sendMessage(dict.overMax(maxLimit));
    amount = maxLimit;
  }

  const currentLP = Number(gp(actor, LP_PATH)) || 0;
  const currentAE = Number(gp(actor, AE_PATH)) || 0;
  const maxAE = Number(gp(actor, AE_MAX_PATH)) || 0;
  const safeMax = Math.min(maxLimit, currentLP, Math.max(0, maxAE - currentAE));

  if (currentLP < amount) {
    await sendMessage(dict.notEnoughLP);
    amount = Math.max(0, Math.min(safeMax, currentLP));
  }

  if (safeMax < 1 && amount > 0) {
    await sendMessage(dict.noAeCapacity);
    amount = 0;
  }

  if (amount > 0) {
    await actor.update({
      [LP_PATH]: currentLP - amount,
      [AE_PATH]: currentAE + amount,
    });
  }

  const loss = await applyPostLoss();
  await sendMessage(dict.completed(actorName, amount, loss));
}

const dialog = new foundry.applications.api.DialogV2({
  window: {
    title: dict.title,
    resizable: true,
  },
  classes: ["dsa5"],
  position: { width: 450, height: "auto" },
  content: content,
  buttons: [
    {
      action: "convert",
      label: dict.convert,
      icon: "fas fa-magic",
      default: true,
      callback: (event, button, dialog) => {
        const inputEl = dialog.element.querySelector("#lepInput");
        return inputEl ? inputEl.value : 0;
      },
    },
    {
      action: "cancel",
      label: dict.cancel,
      icon: "fas fa-times",
      callback: () => 0,
    },
  ],
  submit: async (result) => {
    await finishMeditation(result ?? 0, inputMax);
  },
});

dialog.render({ force: true }).then(() => {
  const inputEl = dialog.element.querySelector("#lepInput");
  if (inputEl) {
    inputEl.addEventListener("input", (e) => {
      let val = parseInt(e.target.value);
      if (!isNaN(val) && val > inputMax) {
        e.target.value = inputMax;
      }
    });
  }
});
