// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
  de: {
    descr: "Welche Waffe soll geschwärzt werden?",
    msg: (actor, name) => `${actor} hat ${name} geschwärzt.`,
    effectName: "Geschwärzt Waffe",
    skillHide: "Verbergen",
    btnLabel: "Schwärzen"
  },
  en: {
    descr: "Which weapon should be treated with 'Blackened'?",
    msg: (actor, name) => `${actor} has blackened ${name}.`,
    effectName: "Blackened Weapon",
    skillHide: "Stealth",
    btnLabel: "Blacken"
  }
}[lang]

if (!actor) {
    ui.notifications.warn(lang === "de" ? "Kein Actor gefunden." : "No actor found.");
    return;
}

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

const options = []
let index = 0
for (let item of weapons) {
  const el = `
  <li>
      <label data-tooltip="${item.name}">
          <input type="radio" name="choice" value="${item.id}" ${index === 0 ? "checked" : ""} />
          <img src="${item.img}" width="40" height="40" class="dsa-card-icon-img"/>
          <span>${item.name}</span>
      </label>
  </li>`
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
  window: { title: dict.effectName, resizable: true },
  position: { width: 450, height: "auto" },
  classes: ["dsa5"], 
  content: `
  <div class="marginBottom">
      <p class="center"><i>${dict.descr}</i></p>
      
      <div class="dsa-card-list thinscroll dsa-card-scroll-box">
          <ul>
              ${options.join("")}
          </ul>
      </div>
  </div>`,
  buttons: [{
    action: "ok",
    label: dict.btnLabel,
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
