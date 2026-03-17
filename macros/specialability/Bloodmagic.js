// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Blutmagie (Selbstopfer)",
    talentLabel: "Selbstbeherrschung",
    skillBase: "Selbstbeherrschung",
    noActor: "Kein gueltiger Akteur gefunden.",
    noSkill: (name) => `${name} hat das Talent "Selbstbeherrschung" nicht.`,
    cooldownEffectName: "Blutmagie (Selbstopfer) - Abklingzeit",
    cooldownDesc: "Kann 24 Stunden lang keine weitere Blutmagie (Selbstopfer) einsetzen.",
    cooldownActive: (name) => `${name} kann derzeit keine weitere Blutmagie (Selbstopfer) einsetzen.`,
    promptMax: "Gib die Anzahl der LeP an, die du in AsP umwandeln möchtest.",
    inputLabel: "LeP in AsP umwandeln",
    convert: "Lebensenergie umwandeln",
    cancel: "Abbrechen",
    checkFailed: (name) =>
      `${name} hat die Probe auf "Selbstbeherrschung" nicht bestanden. Blutmagie (Selbstopfer) ist fuer 24 Stunden gesperrt.`,
    convertedMsg: (name, amount) => `${name} wandelt ${amount} LeP in AsP um.`,
    postLoss: (loss, name) => `Zusaetzlich verliert ${name} ${loss} LeP (1W3+1).`,
    guiText:
      "Der Held kann sein eigenes Blut opfern, um AsP dazuzugewinnen. Um Blutmagie einzusetzen, muss dem Zauberer zunächst eine Probe auf Selbstbeherrschung gelingen, andernfalls kann er 1 Tag lang keine Blutmagie einsetzen. Gelingt ihm die Probe, kann er LeP im Verhältnis 1 zu 1 in AsP umwandeln, verliert aber am Ende der Prozedur 1W3+1 LeP zusätzlich. Bei Ritualen und Zaubern des Merkmals Dämonisch ist die Probe des Zaubers um die zusätzlich geopferten LeP/2 erleichtert.",
    notEnoughLP: "Nicht genügend LeP vorhanden.",
    noAeCapacity: "Es kann keine weitere Astralenergie aufgenommen werden.",
    overMax: (max) => `Eingabe ueberschreitet das Maximum von ${max}.`,
    demonTraitLabel: "Dämonisch",
    effectName: "Blutmagie (Selbstopfer)",
    subtitle: " (Blutmagie)",
  },
  en: {
    title: "Blood Magic (Self-Sacrifice)",
    talentLabel: "Self-Control",
    skillBase: "Self-Control",
    noActor: "No valid actor found.",
    noSkill: (name) => `${name} does not have the skill "Self-Control".`,
    cooldownEffectName: "Blood Magic (Self-Sacrifice) - Cooldown",
    cooldownDesc: "Cannot use Blood Magic (Self-Sacrifice) again for 24 hours.",
    cooldownActive: (name) => `${name} cannot use Blood Magic (Self-Sacrifice) right now.`,
    promptMax: "Enter the amount of LP you want to convert into AE.",
    inputLabel: "Convert LP to AE",
    convert: "Convert Life Energy",
    cancel: "Cancel",
    checkFailed: (name) => `${name} failed the "Self-Control" check. Blood Magic (Self-Sacrifice) is blocked for 24 hours.`,
    convertedMsg: (name, amount) => `${name} converts ${amount} LP into AE.`,
    postLoss: (loss, name) => `Additionally, ${name} loses ${loss} LP (1D3+1).`,
    guiText:
      "The hero can sacrifice their own blood to gain additional AE. To use Blood Magic, the caster must first succeed at a Self-Control check; otherwise, they cannot use Blood Magic for 1 day. If the check succeeds, they can convert LP to AE at a 1:1 ratio, but lose an additional 1D3+1 LP at the end of the procedure. For rituals and spells with the Demonic trait, the casting check is eased by the additionally sacrificed LP/2.",
    notEnoughLP: "Not enough LP available.",
    noAeCapacity: "No further Astral Energy can be restored.",
    overMax: (max) => `Input exceeds the maximum of ${max}.`,
    demonTraitLabel: "Demonic",
    effectName: "Blood Magic (Self-Sacrifice)",
    subtitle: " (Blood Magic)",
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

function createCondition({ name, changes = [], seconds, description, flags }) {
  const condition = this.effectDummy(name, changes, { seconds });
  foundry.utils.mergeObject(condition, {
    img: item?.img ?? "icons/svg/blood.svg",
    flags: {
      dsa5: {
        hideOnToken: true,
        ...(description ? { description } : {}),
        ...flags,
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
const succeeded = (Number(gp(res, "result.qualityStep")) || 0) > 0;

if (!succeeded) {
  const cooldownCondition = createCondition.call(this, {
    name: dict.cooldownEffectName,
    seconds: COOLDOWN_SECONDS,
    description: dict.cooldownDesc,
  });
  await actor.addCondition(cooldownCondition);
  await sendMessage(dict.checkFailed(actor.name ?? (lang === "de" ? "Der Charakter" : "The character")));
  return;
}

const actorName = actor.name ?? (lang === "de" ? "der Charakter" : "the character");

const lepLabel = game.i18n.localize("LEP") || "Lebenspunkte";
const aspLabel = game.i18n.localize("ASP") || "Astralpunkte";

const currentLP = Number(gp(actor, LP_PATH)) || 0;
const maxLP = Number(gp(actor, LP_MAX_PATH)) || 0;
const currentAE = Number(gp(actor, AE_PATH)) || 0;
const maxAE = Number(gp(actor, AE_MAX_PATH)) || 0;
const maxConvertible = Math.min(currentLP, Math.max(0, maxAE - currentAE));

if (maxConvertible < 1) {
  await sendMessage(dict.noAeCapacity);
  return;
}

const styleId = "bloodmagic-styles";
if (!document.getElementById(styleId)) {
  document.head.insertAdjacentHTML(
    "beforeend",
    `
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
    `,
  );
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
    <input id="lepInput" name="lepInput" class="lep-input" type="number" min="0" step="1" max="${maxConvertible}" value="${maxConvertible}" autofocus />
  </div>
</div>
`;

async function doConversion(rawVal, maxLimit) {
  let amount = Math.max(0, Math.floor(Number(rawVal) || 0));
  if (amount > maxLimit) {
    await sendMessage(dict.overMax(maxLimit));
    amount = maxLimit;
  }
  if (amount <= 0) return;

  const currentLP = Number(gp(actor, LP_PATH)) || 0;
  const currentAE = Number(gp(actor, AE_PATH)) || 0;
  const maxAE = Number(gp(actor, AE_MAX_PATH)) || 0;
  const safeMax = Math.min(maxLimit, currentLP, Math.max(0, maxAE - currentAE));

  if (currentLP < amount) {
    await sendMessage(dict.notEnoughLP);
    amount = Math.max(0, Math.min(safeMax, currentLP));
  }

  if (safeMax < 1) {
    await sendMessage(dict.noAeCapacity);
    return;
  }

  if (amount > safeMax) {
    amount = safeMax;
  }

  await actor.update({
    [LP_PATH]: currentLP - amount,
    [AE_PATH]: currentAE + amount,
  });

  await sendMessage(dict.convertedMsg(actorName, amount));

  const lossRoll = await new Roll("1d3+1").evaluate();
  const loss = Number(lossRoll.total) || 2;
  const lpAfterConv = Number(gp(actor, LP_PATH)) || currentLP - amount;

  await actor.update({
    [LP_PATH]: Math.max(0, lpAfterConv - loss),
  });

  await sendMessage(dict.postLoss(loss, actorName));

  const easeValue = Math.ceil(amount / 2);
  if (easeValue > 0) {
    const condition = createCondition.call(this, {
      name: item?.name ?? dict.effectName,
      seconds: COOLDOWN_SECONDS,
      description: item?.name ?? dict.effectName,
      changes: [
        { key: "system.skillModifiers.feature.step", mode: 0, value: `${dict.demonTraitLabel} ${easeValue}`, priority: 20 },
      ],
      flags: { meditationDemonicEase: true, amount, easeValue },
    });
    await actor.addCondition(condition);
  }
}

new foundry.applications.api.DialogV2({
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
      icon: "fas fa-tint",
      default: true,
      callback: async (event, button, dialog) => {
        const inputEl = dialog.element.querySelector("#lepInput");
        const rawVal = inputEl ? inputEl.value : 0;
        await doConversion(rawVal, maxConvertible);
      },
    },
    {
      action: "cancel",
      label: dict.cancel,
      icon: "fas fa-times",
    },
  ],
}).render({ force: true });
