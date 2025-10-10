// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    title: "Astrale Meditation",
    talentLabel: "Selbstbeherrschung (Störungen ignorieren)",
    skillBase: "Selbstbeherrschung",
    promptMax: "Du kannst maximal {max} Lebenspunkte in Astralenergie umwandeln.",
    inputLabel: "LeP in AsP umwandeln",
    convert: "Lebensenergie umwandeln",
    cancel: "Abbrechen",
    checkStart: "Probe auf Selbstbeherrschung wird gewürfelt...",
    checkFailed: "Probe nicht bestanden. Keine Umwandlung möglich.",
    convertedMsg: "Es wurden {amount} LeP in AsP umgewandelt.",
    postLoss: (loss, name) => `Zusätzlich verliert ${name} ${loss} LeP (1W3).`,
    aePath: "system.status.astralenergy.value",
    aeMaxPath: "system.status.astralenergy.max",
    lpPath: "system.status.wounds.value",
    lpMaxPath: "system.status.wounds.max",
    guiText: "Eine der bekanntesten Techniken erfahrener Zauberer ist die Astrale Meditation. Durch sie kann ein Zauberkundiger seine Lebenskraft in astrale Energie umwandeln. Regel: Der Zauberer ist durch die Astrale Meditation in der Lage, LeP im Verhältnis 1 zu 1 in AsP umzuwandeln. Er muss sich dazu in stiller Umgebung aufhalten (z. B. in einem abgeschiedenen Waldstück oder einem ruhigen Zimmer), eine mindestens 5 Minuten andauernde Meditation durchführen und eine Probe auf Selbstbeherrschung (Störungen ignorieren) bestehen. Er kann maximal QS x3 LeP in AsP umwandeln. Allerdings verliert er am Ende der Meditation zusätzlich 1W3 LeP und er kann die nächsten 24 Stunden keine weitere Astrale Meditation durchführen – egal ob die Meditation erfolgreich war oder nicht.",
    noToken: "Kein verknüpfter Token des Actors gefunden. Bitte Token auf der Szene verknüpfen.",
    overMax: (max) => `Eingabe überschreitet das Maximum von ${max}.`,
    notEnoughLP: "Nicht genügend LeP vorhanden.",
  },
  en: {
    title: "Arcane Meditation",
    talentLabel: "Self-Control (Ignore Distractions)",
    skillBase: "Self-Control",
    promptMax: "You can convert a maximum of {max} Life Points into Astral Energy.",
    inputLabel: "Convert LP to AE",
    convert: "Convert Life Energy",
    cancel: "Cancel",
    checkStart: "Rolling Self-Control check...",
    checkFailed: "Check failed. No conversion possible.",
    convertedMsg: "{amount} LP have been converted to AE.",
    postLoss: (loss, name) => `Additionally, ${name} loses ${loss} LP (1D3).`,
    aePath: "system.status.astralenergy.value",
    aeMaxPath: "system.status.astralenergy.max",
    lpPath: "system.status.wounds.value",
    lpMaxPath: "system.status.wounds.max",
    guiText: "A spellcaster with Arcane Meditation can convert LP into AE. The caster must be in a quiet location (such as in a remote part of the forest, or a quiet room), meditate for at least 5 minutes, and make a Self-Control (Ignore Distractions) check. This converts a maximum of QL x 3 LP to AE. At the end of the meditation period, the caster loses an additional 1D6 LP and will not recover any LP or AE for 24h during any regeneration phases, whether the Arcane Meditation succeeded or not.",
    noToken: "No linked token of the actor found. Please link a token on the scene.",
    overMax: (max) => `Input exceeds the maximum of ${max}.`,
    notEnoughLP: "Not enough LP available.",
  }
}[lang];

const gp = foundry.utils.getProperty;
const sp = foundry.utils.setProperty;

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

const maxConvert = qs * 3;
const actorName = actor.name ?? (lang === "de" ? "der Charakter" : "the character");

// GUI
const infoText = dict.guiText;
const maxLine = dict.promptMax.replace("{max}", String(maxConvert));
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
    <input id="lepInput" type="number" min="0" step="1" value="${maxConvert}" style="width:120px;"/>
  </div>
</div>
`;

// Kernlogik: direkte Updates via actor.update (möglich da eigener Actor)
async function doConversion(html, maxLimit, disableBtn) {
  const inputEl = html.find("#lepInput")[0];
  const rawVal = Number(inputEl?.value ?? 0);
  const amount = Math.floor(rawVal);


  if (amount > maxLimit) {
    if (disableBtn) {
      disableBtn.disabled = true;
      disableBtn.classList.add("disabled");
    }
    ui.notifications.warn(dict.overMax(maxLimit));
    return false;
  } else {
    if (disableBtn) {
      disableBtn.disabled = false;
      disableBtn.classList.remove("disabled");
    }
  }

  // Werte lesen
  const currentLP = Number(gp(actor, dict.lpPath)) || 0;
  const currentAE = Number(gp(actor, dict.aePath)) || 0;
  const maxAE = Number(gp(actor, dict.aeMaxPath)) || 0;

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
    [dict.lpPath]: newLP,
    [dict.aePath]: newAE
  });

  // Chat: Umwandlung
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: dict.convertedMsg.replace("{amount}", String(aeToAdd))
  });

  // 1W3 LeP Verlust – evaluieren
  let loss = 1;
  try {
    const lossRoll = new Roll("1d3").evaluateSync();
    loss = Number(lossRoll.total) || 1;
  } catch (err) {
    const lossRoll = new Roll("1d3");
    await lossRoll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: lang === "de" ? "1W3 LeP Verlust" : "1D3 LP loss" });
    loss = Number(lossRoll.total) || 1;
  }

  // Verlust anwenden
  const lpAfterConv = Number(gp(actor, dict.lpPath)) || newLP;
  const lpAfterLoss = Math.max(0, lpAfterConv - loss);

  await actor.update({
    [dict.lpPath]: lpAfterLoss
  });

  // Abschlussmeldung
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: dict.postLoss(loss, actorName)
  });

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
        // Den Button-Node aus dem Dialog holen, um ihn bei Over-Max zu deaktivieren
        const btn = dialogRef.element?.find('button[data-button="convert"]')?.get(0);
        return await doConversion(html, maxConvert, btn);
      }
    },
    cancel: { label: dict.cancel }
  },
  default: "convert",
  render: (html) => {
    const inputEl = html.find("#lepInput")[0];
    const btn = dialogRef?.element?.find('button[data-button="convert"]')?.get(0);

    // Enter bestätigt die Eingabe
    if (inputEl) {
      inputEl.addEventListener("keydown", async (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          await doConversion(html, maxConvert, btn);
        }
      });

      // Live-Validierung: Button bei Over-Max visuell deaktivieren
      inputEl.addEventListener("input", () => {
        const val = Math.floor(Number(inputEl.value ?? 0));
        if (btn) {
          if (val > maxConvert) {
            btn.disabled = true;
            btn.classList.add("disabled");
          } else {
            btn.disabled = false;
            btn.classList.remove("disabled");
          }
        }
      });

      
      const initialVal = Math.floor(Number(inputEl.value ?? 0));
      if (btn) {
        btn.disabled = initialVal > maxConvert;
        btn.classList.toggle("disabled", initialVal > maxConvert);
      }
    }
  }
