// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
  de: {
    descr: "Welche Waffe soll geschwärzt werden?",
    msg: (actor, name) => `${actor} hat ${name} geschwärzt.`,
    effectName: "Geschwärzt Waffe",
    skillHide: "Verbergen"
  },
  en: {
    descr: "Which weapon should be treated with 'Blackened'?",
    msg: (actor, name) => `${actor} has blackened ${name}.`,
    effectName: "Blackened Weapon",
    skillHide: "Stealth" 
  }
}[lang]

if (!actor) {
    ui.notifications.warn(lang === "de" ? "Kein Actor gefunden." : "No actor found.");
    return;
}

// Nur Nahkampfwaffen erlauben, die aktuell KEINEN AKTIVEN Geschwärzt-Effekt haben.
const weapons = actor.items.filter(it => {
  if (it.type !== "meleeweapon") return false
  const hasActiveBlackened = (it.effects ?? []).some(e => 
      (e.name ?? "").match(new RegExp(dict.effectName, "i")) && e.disabled === false
  )
  return !hasActiveBlackened
})

if (weapons.length === 0) {
    ui.notifications.warn(lang === "de" ? "Keine passenden Waffen gefunden." : "No matching weapons found.");
    return;
}

const styleId = "blackened-weapon-styles";
if (!document.getElementById(styleId)) {
    document.head.insertAdjacentHTML("beforeend", `
        <style id="${styleId}">
            /* Alle Regeln greifen NUR innerhalb unseres speziellen Containers */
            #dsa-blackened-weapon-container .weapon-choice { display: inline-block; cursor: pointer; margin: 8px; }
            #dsa-blackened-weapon-container .weapon-choice input[type="radio"] { display: none !important; }
            #dsa-blackened-weapon-container .weapon-img {
                width: 50px; height: 50px; background-size: cover; background-position: center;
                border: 1px solid #7a7971; 
                border-radius: 3px; 
                box-shadow: 0 0 3px rgba(0,0,0,0.3);
                transition: all 0.2s ease-in-out; 
                opacity: 0.8;
            }
            #dsa-blackened-weapon-container .weapon-choice:hover .weapon-img { opacity: 1.0; }
            #dsa-blackened-weapon-container .weapon-choice input[type="radio"]:checked + .weapon-img {
                border: 2px solid #000000 !important; 
                box-shadow: inset 0 0 8px rgba(0,0,0,0.7) !important;
                opacity: 1.0 !important;
            }
            #dsa-blackened-weapon-container .weapon-wrap { 
                display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; margin-top: 15px; margin-bottom: 10px; 
            }
        </style>
    `);
}

const options = []
let index = 0
for (let item of weapons) {
  const el = `
  <label class="weapon-choice" data-tooltip="${item.name}">
      <input type="radio" name="choice" value="${item.id}" ${index === 0 ? "checked" : ""} />
      <div class="weapon-img" style="background-image:url('${item.img}')"></div>
  </label>`
  options.push(el)
  index += 1
}

const finishBlackened = async (choice) => {
  if (!choice) return;
  const weapon = actor.items.get(choice)
  if (!weapon) return

  const durationData = {
    seconds: 3600,
    startTime: game.time.worldTime ?? 0
  }

  const existingEffect = weapon.effects.find(e => (e.name ?? "").match(new RegExp(dict.effectName, "i")))

  if (existingEffect) {
    await existingEffect.update({
        disabled: false,
        duration: durationData
    })
  } else {
    const effectData = {
      name: dict.effectName,
      img: "icons/svg/aura.svg",
      description: dict.effectName,
      disabled: false,
      transfer: true,
      duration: durationData,
      changes: [
        { key: "system.skillModifiers.step", mode: 0, value: `${dict.skillHide} 1`, priority: null }
      ],
      flags: {
        dsa5: {
          applyToOwner: true,
          hideOnToken: true,
          hidePlayers: false,
          description: dict.effectName
        }
      },
      type: "base",
      statuses: []
    }
    await weapon.createEmbeddedDocuments("ActiveEffect", [effectData])
  }

  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.msg(actor.name, weapon.name)))
}

new foundry.applications.api.DialogV2({
  window: { title: dict.effectName },
  classes: ["dsa5"], 
  content: `
  <div id="dsa-blackened-weapon-container">
      <p style="text-align: center; font-style: italic;">${dict.descr}</p>
      <div class="weapon-wrap">
          ${options.join("")}
      </div>
  </div>`,
  buttons: [{
    action: "ok",
    label: "ok",
    default: true,
    callback: (event, button, dialog) => {
        const checked = dialog.element.querySelector('input[name="choice"]:checked');
        return checked ? checked.value : null;
    }
  }],
  submit: result => {
    finishBlackened(result)
  }
}).render({ force: true })
