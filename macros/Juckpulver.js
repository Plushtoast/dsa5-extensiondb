// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";

const dict = {
  de: {
    noActor: "Kein Ziel-Actor gefunden.",
    noSource: "Kein Quellen-Actor gefunden.",
    noQS: "Keine QS übergeben.",
    effectName: "Juckpulver",
    effectIcon: "icons/svg/aura.svg",
    effectAppliedChat: "erliegt dem Juckpulver!",
    resistSkillName: "Selbstbeherrschung",
    cannotResist: "hat kein Talent 'Selbstbeherrschung' -> Sofortiger Effekt!",
    firstResistFail: "hat die erste Widerstandsprobe nicht bestanden!",
    firstResistPass: "widersteht zunächst dem Juckpulver...",
    resistEffectName: "Juckpulver-Widerstand",
    resistEffectIcon: "systems/dsa5/icons/spellicons/spells/juckpulver.webp",
    resistEffectDesc: "Widersteht aktuell (Prüfung jede KR)",
    resistRenewPass: "widersteht erneut dem Juckpulver (nächste Runde...).",
    resistRenewFail: "scheitert an der Widerstandsprobe und erleidet den Rest-Effekt!",
    createEffectFail: "Effekt konnte nicht erstellt werden.",
    survived: "hat das Juckpulver vollständig abgeschüttelt!",
    requestTitle: "Widerstandsprobe", // Titel wie im Original
    timeout: "Zeit abgelaufen (Keine Probe gewürfelt). Wertet als Misserfolg.",
    labelEffect: "Effekt",
    labelTarget: "Ziel"
  },
  en: {
    noActor: "No target actor found.",
    noSource: "No source actor found.",
    noQS: "No QS provided.",
    effectName: "Itching Powder",
    effectIcon: "icons/svg/aura.svg",
    effectAppliedChat: "succumbs to the itching powder!",
    resistSkillName: "Self-Control",
    cannotResist: "has no 'Self-Control' skill -> Immediate effect!",
    firstResistFail: "failed the first resistance test!",
    firstResistPass: "initially resists the itching powder...",
    resistEffectName: "Itching Powder – Resistance",
    resistEffectIcon: "systems/dsa5/icons/spellicons/spells/juckpulver.webp",
    resistEffectDesc: "Resists periodically (Check every round)",
    resistRenewPass: "resists again (next round...).",
    resistRenewFail: "fails the resistance test and suffers the remaining effect!",
    createEffectFail: "Could not create active effect.",
    survived: "shook off the itching powder completely!",
    requestTitle: "Resistance Roll",
    timeout: "Timed out (no roll). Counting as failure.",
    labelEffect: "Effect",
    labelTarget: "Target"
  }
}[lang];

// Validierung
if (!actor) { ui.notifications.error(dict.noActor); return; }
if (typeof qs === "undefined" || qs === null) { ui.notifications.error(dict.noQS); return; }

// --- LOGIK START ---

const malus = Math.round(qs / 2) * -1;
const skillName = dict.resistSkillName;

// 1. Malus anwenden
async function applyJuckpulver(durationSeconds) {
  const juckpulver = {
    name: dict.effectName,
    icon: dict.effectIcon,
    changes: [
      { key: "system.rangeStats.attack", mode: 2, value: malus },
      { key: "system.status.dodge.gearmodifier", mode: 2, value: malus },
      { key: "system.meleeStats.attack", mode: 2, value: malus },
      { key: "system.skillModifiers.global", mode: 0, value: malus },
      { key: "system.meleeStats.parry", mode: 2, value: malus }
    ],
    duration: { seconds: durationSeconds },
    flags: { dsa5: { description: dict.effectName, malus: malus } }
  };

  try {
      await actor.createEmbeddedDocuments("ActiveEffect", [juckpulver]);
      ChatMessage.create({
        speaker: { alias: actor.name },
        content: `<b>${actor.name}</b> ${dict.effectAppliedChat} (${durationSeconds}s)`
      });
  } catch (err) {
      console.error(err);
      ui.notifications.error(dict.createEffectFail);
  }
}

// 2. Aufforderung im Chat + Warten
async function requestRollAndListen() {
  const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
  if (!skill) return false;

  // --- HTML KONSTRUKTION NACH TEMPLATE (resist-roll.hbs) ---
  const content = `
    <div class="dsa5 chat-card">
      <div>
        <b>${dict.requestTitle}</b>
      </div>
      <div class="row-section">
        <div class="col third attacker">
           <img src="${actor.img}" width="50" height="50" style="border:none"/>
        </div>
        <div class="col ten"></div>
        <div class="col sixty" style="margin-top:10px">
          <div>
            <b>${dict.labelEffect}</b>:
            ${dict.effectName}
          </div>
          <div>
            <b>${dict.labelTarget}</b>:
            ${actor.name}
          </div>
        </div>
      </div>

      <div class="center flexrow">
        <button style="margin-top:10px" class="resistEffect onlyTarget"
          data-skill="${skillName}"
          data-mod="0"
          data-actor="${actor.id}"
          data-mode="target"
        >
          ${skillName} 0
        </button>
      </div>
    </div>
  `;

  await ChatMessage.create({ content, speaker: { alias: actor.name } });

  // Listener Logic
  return new Promise((resolve) => {
    let handled = false;
    
    // Timeout 60s
    const timeout = setTimeout(() => {
      if (!handled) {
        Hooks.off("createChatMessage", hookId);
        ui.notifications.warn(dict.timeout);
        resolve(false); 
      }
    }, 60000);

    const hookId = Hooks.on("createChatMessage", async (msg) => {
      const preData = msg.flags?.data?.preData;
      const isCorrectActor = (msg.speaker?.actor === actor.id) || (preData?.actor === actor.id);
      const isCorrectSkill = preData?.source?.name === skillName;
      
      if (msg.isRoll && isCorrectActor && isCorrectSkill) {
        handled = true;
        Hooks.off("createChatMessage", hookId);
        clearTimeout(timeout);
        const successLevel = msg.flags?.data?.postData?.successLevel || 0;
        resolve(successLevel > 0);
      }
    });
  });
}

// 3. Rekursive Runden-Logik
async function processRound(roundsLeft) {
  if (roundsLeft <= 0) {
    ChatMessage.create({speaker: { alias: actor.name }, content: dict.survived});
    return;
  }

  // Dummy Effekt (6 Sekunden)
  const resistanceEffect = {
    name: `${dict.resistEffectName} (${roundsLeft})`, 
    icon: dict.resistEffectIcon,
    flags: { dsa5: { description: dict.resistEffectDesc } },
    origin: actor.uuid,
    duration: { seconds: 6 } 
  };

  let createdArr;
  try {
    createdArr = await actor.createEmbeddedDocuments("ActiveEffect", [resistanceEffect]);
  } catch(e) { console.error(e); return; }
  
  const effectId = createdArr[0].id;

  const hookId = Hooks.on("deleteActiveEffect", async (deletedEffect) => {
    if (!deletedEffect || deletedEffect.id !== effectId) return;
    Hooks.off("deleteActiveEffect", hookId);

    // Neue Probe anfordern
    const success = await requestRollAndListen();

    if (!success) {
      const remainingSeconds = (roundsLeft - 1) * 6;
      if (remainingSeconds > 0) {
        ui.notifications.warn(`${actor.name} ${dict.resistRenewFail}`);
        await applyJuckpulver(remainingSeconds);
      } else {
        ui.notifications.info(`${actor.name} ${dict.survived}`);
      }
    } else {
      ui.notifications.info(`${actor.name} ${dict.resistRenewPass}`);
      await processRound(roundsLeft - 1);
    }
  });
}

// --- START ---

const firstSuccess = await requestRollAndListen();

if (!firstSuccess) {
  ui.notifications.warn(`${actor.name} ${dict.firstResistFail}`);
  await applyJuckpulver(30); 
} else {
  ui.notifications.info(`${actor.name} ${dict.firstResistPass}`);
  await processRound(5);
}
