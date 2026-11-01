// Schema type: onUseEffect
// Parameters injected by the system:
//   args   {OnUseEffectExecutionArgs} - Execution metadata for this activation.
//   item   {Itemdsa5} - The item that was used.
//   actor  {Actordsa5} - The actor who used the item.
//   this   {OnUseEffect} - Helper instance.

const { ApplicationV2 } = foundry.applications.api;

const dict = {
  de: {
    desc: "Wähle eine ausgerüstete, nicht-magische Nahkampfwaffe. Solange du sie in Händen hältst, längstens aber bis zum nächsten Sonnenaufgang, gilt sie als magische Waffe.",
    title: item.name,
    noWeapons: "Keine gültigen Waffen gefunden.",
    btnApply: "Geisterwaffe",
    success: (weaponName) => `<b>${actor.name}</b> lässt <b>${weaponName}</b> temporär als magische Waffe gelten.`,
  },
  en: {
    desc: "Select an equipped, non-magical melee weapon. As long as it is held, but no longer than until the next sunrise, it is considered a magical weapon.",
    title: item.name,
    noWeapons: "No valid weapons found.",
    btnApply: "Ghost Weapon",
    success: (weaponName) => `<b>${actor.name}</b> temporarily designates <b>${weaponName}</b> as a magical weapon.`,
  },
}[game.i18n.lang === "en" ? "en" : "de"];

const getEligibleWeapons = () => actor.items.filter((i) => {
  if (i.type !== "meleeweapon" || !i.system.worn?.value) return false;
  const attr = i.system.effect?.attributes || "";
  return !attr.includes(_loc("WEAPON.magical"));
});

if (getEligibleWeapons().length === 0) {
  ui.notifications.warn(dict.noWeapons);
  return;
}

class WaffeBestimmenApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "waffe-bestimmen-app",
    classes: ["dsa5"],
    window: { title: dict.title, resizable: true },
    position: { width: 420, height: "auto" },
    actions: {
      selectWeapon(event, target) {
        this._onSelectWeapon(event, target);
      },
      applyEffect(event, target) {
        this._onApplyEffect(event, target);
      },
    },
  };

  constructor(options) {
    super(options);
    this.selectedWeaponId = null;
  }

  async _prepareContext() {
    const weapons = getEligibleWeapons();
    if (this.selectedWeaponId && !weapons.some((weapon) => weapon.id === this.selectedWeaponId)) {
      this.selectedWeaponId = null;
    }
    return {
      hasWeapons: weapons.length > 0,
      actionDisabled: !this.selectedWeaponId,
      weapons,
    };
  }

  async _renderHTML(context) {
    if (!context.hasWeapons) {
      return `<div class="paddingBox center"><i>${dict.noWeapons}</i></div>`;
    }

    const weaponHtml = context.weapons
      .map((weapon) => {
        const isSelected = this.selectedWeaponId === weapon.id;
        return `
          <li>
            <label data-action="selectWeapon" data-id="${weapon.id}">
              <input type="radio" name="weaponChoice" value="${weapon.id}" ${isSelected ? "checked" : ""} />
              <img src="${weapon.img}" width="40" height="40" class="dsa-card-icon-img"/>
              <span>${weapon.name}</span>
            </label>
          </li>`;
      })
      .join("");

    return `
      <div class="marginBottom">
        <p class="center"><i>${dict.desc}</i></p>
        <div class="dsa-card-list thinscroll dsa-card-scroll-box">
          <ul>
            ${weaponHtml}
          </ul>
        </div>
        <div class="row-section margin-top">
          <button class="col dsa5 button" data-action="applyEffect" ${context.actionDisabled ? "disabled" : ""}>
            ${dict.btnApply}
          </button>
        </div>
      </div>
    `;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }

  _onSelectWeapon(_event, target) {
    const { id } = target.dataset;
    this.selectedWeaponId = this.selectedWeaponId === id ? null : id;
    this.render();
  }

  async _onApplyEffect(_event, target) {
    target.disabled = true;

    const targetWeapon = actor.items.get(this.selectedWeaponId);
    if (!targetWeapon) return;

    const SECONDS_PER_DAY = 86400;
    const SECONDS_PER_HOUR = 3600;
    const WORLD_TIME = game.time.worldTime;

    const calendarSettings = game.settings.get("dsa5", "calendarSettings") || {};
    const dawnHour = calendarSettings.dawn !== undefined ? Number(calendarSettings.dawn) : 5;
    const dawnSeconds = dawnHour * SECONDS_PER_HOUR;

    const currentDaySeconds = WORLD_TIME % SECONDS_PER_DAY;

    let durationSecs = 0;
    if (currentDaySeconds < dawnSeconds) {
      durationSecs = dawnSeconds - currentDaySeconds;
    } else {
      durationSecs = (SECONDS_PER_DAY - currentDaySeconds) + dawnSeconds;
    }

    const magicString = _loc("WEAPON.magical");
    const currentAttr = targetWeapon.system.effect?.attributes || "";
    const newAttr = currentAttr.trim() !== "" ? `${currentAttr}, ${magicString}` : magicString;
    await targetWeapon.update({ "system.effect.attributes": newAttr });

    const onRemoveMacro = `
      const targetActor = typeof effect !== 'undefined' ? effect.parent : null;
      if (targetActor) {
        const weapon = targetActor.items.get("${targetWeapon.id}");
        if (weapon) {
          let attr = weapon.system.effect?.attributes || "";
          let cleanedAttr = attr.replace("${magicString}", "").replace(/,\\s*,/g, ",").replace(/^,\\s*/, "").replace(/,\\s*$/, "").trim();
          await weapon.update({ "system.effect.attributes": cleanedAttr });
          
          const lang = game.i18n.lang === "en" ? "en" : "de";
          const msg = lang === "en" 
            ? "The magical effect on <b>${targetWeapon.name}</b> has faded."
            : "Die magische Wirkung auf <b>${targetWeapon.name}</b> ist abgeklungen.";
          ui.notifications.info(msg);
        }
      }
    `;

    const effectName = `${item.name} (${targetWeapon.name})`;
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: effectName,
      img: "icons/svg/aura.svg",
      type: "base",
      start: { time: WORLD_TIME },
      duration: { value: durationSecs, units: "seconds" },
      system: { visibility: { hideOnToken: false, hidePlayers: false } },
      flags: { dsa5: { onRemove: onRemoveMacro } }
    }]);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p>${dict.success(targetWeapon.name)}</p>`
    });

    this.close();
  }
}

new WaffeBestimmenApp().render(true);
