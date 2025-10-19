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

// Nur Nahkampfwaffen ohne bestehenden Geschwärzt/Blackened-Effekt
const weapons = actor.items.filter(it => {
  if (it.type !== "meleeweapon") return false
  const hasBlackened = (it.effects ?? []).some(e => (e.name ?? "").match(new RegExp(dict.effectName, "i")))
  return !hasBlackened
})

const options = []
let index = 0
for (let item of weapons) {
  const el = `<input type="radio" id="item_${item.id}" class="dsahidden" name="choice" value="${item.id}" ${index == 0 ? "checked" : ""}/><label for="item_${item.id}" class="slot" data-id="${item.id}" data-tooltip="${item.name}">
          <div style="background-image:url('${item.img}')"></div>
  </label>`
  options.push(el)
  index += 1
}

const finishBlackened = async (choice) => {
  const weapon = actor.items.get(choice)
  if (!weapon) return

  const effectData = {
    name: dict.effectName,
    img: "icons/svg/aura.svg",
    description: dict.effectName,
    disabled: false,
    transfer: true,
    duration: {
      seconds: 3600,
      startTime: game.time.worldTime ?? 0
    },
    changes: [
      { key: "system.skillModifiers.step", mode: 0, value: `${dict.skillHide} 1`, priority: null }
    ],
    flags: {
      dsa5: {
        applyToOwner: true,
        hideOnToken: true,
        hidePlayers: false,
        description: dict.effectName
      },
      autoRemoveOnExpire: true
    },
    type: "base",
    statuses: []
  }

  // Effekt an der Waffe erzeugen
  const created = await weapon.createEmbeddedDocuments("ActiveEffect", [effectData])

  // Chat-Nachricht
  await ChatMessage.create(game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.msg(actor.name, weapon.name)))

  // Cleanup: Sobald der Effekt abläuft (disabled durch Duration), entfernen
  const effectId = created[0]?.id
  if (!effectId) return

  // Hook: wenn dieser Effekt disabled wird (Ablauf), wird er gelöscht.
  const hookId = Hooks.on("updateActiveEffect", async (effect, changes, context, userId) => {
    try {
      if (effect?.id !== effectId) return
      if (changes?.disabled === true || (changes?.duration?.remaining !== undefined && changes.duration.remaining <= 0)) {
        await weapon.deleteEmbeddedDocuments("ActiveEffect", [effectId])
        Hooks.off("updateActiveEffect", hookId)
      }
    } catch (err) {
      console.error("Auto-remove blackened effect failed:", err)
      Hooks.off("updateActiveEffect", hookId)
    }
  })
}

new foundry.applications.api.DialogV2({
  window: { title: dict.effectName },
  content: `<p>${dict.descr}</p><style>input[type="radio"]:checked + label { border-color: darkred; box-shadow: inset 0 0px 10px 3px black}</style><div class="bags row-section wrap" style="font-size: 45px;line-height: 50px;text-align: center;">
      ${options.join("")}
  </div>`,
  buttons: [{
    action: "ok",
    label: "ok",
    default: true,
    callback: (event, button, dialog) => button.form.elements.choice.value
  }],
  submit: result => {
    finishBlackened(result)
  }
}).render({ force: true })

