const { ApplicationV2 } = foundry.applications.api;

const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
  de: {
    title: "Lebensenergie übertragen",
    description:
      "Der Taarnaj gibt verletzten Lebewesen von seiner Lebensenergie, um sie von der Schwelle des Todes zu holen. Der Geist gibt dabei mindestens so viele LeP, wie notwendig sind, um das verletzte Wesen zu stabilisieren, kann aber auch beschließen, bereits leichte Verletzungen zu heilen.",
    noActor: "Kein gültiger Akteur gefunden.",
    onlySingleTarget: "Bitte genau ein Ziel anvisieren.",
    targetNoActor: "Das Ziel ist kein Akteur.",
    targetFullLeP: (name) => `${name} verfügt bereits über volle Lebensenergie.`,
    notEnoughLeP: (name) => `${name} hat nicht genügend LeP.`,
    currentLeP: "Aktuelle LeP",
    transferLeP: (name) => `An ${name} zu übertragene LeP`,
    confirm: "Lebensenergie übertragen",
    healMessage: (user, target, amount) =>
      `<p><b>${user}</b> überträgt <b>${amount} LeP</b> auf <b>${target}</b>.</p>`,
  },
  en: {
    title: "Transfer Life Energy",
    description:
      "The Taarnaj gives injured creatures some of its life energy to bring them back from the brink of death. The spirit gives at least as many LP as necessary to stabilize the injured creature, but may also choose to heal minor injuries.",
    noActor: "No valid actor found.",
    onlySingleTarget: "Please target exactly one target.",
    targetNoActor: "The target is not an actor.",
    targetFullLeP: (name) => `${name} is already at full life energy.`,
    notEnoughLeP: (name) => `${name} does not have enough LP.`,
    currentLeP: "Current LP",
    transferLeP: (name) => `LP to transfer to ${name}`,
    confirm: "Transfer Life Energy",
    healMessage: (user, target, amount) =>
      `<p><b>${user}</b> transfers <b>${amount} LP</b> to <b>${target}</b>.</p>`,
  },
}[lang];

class TaarnajTransferDialog extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "taarnaj-transfer-app",
    classes: ["dsa5"],
    window: {
      title: dict.title,
      resizable: true,
      contentClasses: ["standard-form"],
    },
    position: { width: 460, height: "auto" },
    actions: {
      adjustCosts: this.#onAdjustCosts,
      confirm: this.#onConfirm,
    },
  };

  constructor(actor, targetToken, onUseContext, args, options) {
    super(options);
    this.actor = actor;
    this.targetToken = targetToken;
    this.targetActor = targetToken.actor;
    this.onUseContext = onUseContext;
    this.args = args;
    this.lepCost = 1;
    this._validateCosts();
  }

  async _prepareContext() {
    return {
      description: dict.description,
      currentLeP: this.actor.system.status.wounds.value,
      lepCost: this.lepCost,
      targetName: this.targetToken.name,
    };
  }

  async _renderHTML(context) {
    const wrapper = document.createElement("div");
    wrapper.className = "flexcol gap10px dsap-2";
    wrapper.innerHTML = `
      <div class="dsa-info-box dsam-0">
        <p class="dsa-info-text">${context.description}</p>
      </div>

      <div class="flexrow flexAlignCenter dsa-justify-between">
        <span><b>${dict.currentLeP} (${this.actor.name}):</b></span>
        <span class="dsa-value">${context.currentLeP}</span>
      </div>

      <div class="flexrow flexAlignCenter dsa-justify-between">
        <span><b>${dict.transferLeP(context.targetName)}:</b></span>
        <div class="flex0 flexrow dsaflex-no-wrap flexAlignCenter gap5px">
          <button type="button" class="dsadesignbutton" data-action="adjustCosts" data-dir="left">
            <i class="fas fa-minus"></i>
          </button>
          <input type="number" class="fg-cost-input fg-lep-cost" value="${context.lepCost}" min="1" style="width: 60px; text-align: center;" />
          <button type="button" class="dsadesignbutton" data-action="adjustCosts" data-dir="right">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>

      <footer class="form-footer flexrow gap5px dsamt-2">
        <button type="button" class="sheetButton" data-action="confirm">
          ${dict.confirm}
        </button>
      </footer>
    `;
    return wrapper;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = this.element;
    for (const inp of html.querySelectorAll(".fg-cost-input")) {
      inp.addEventListener("change", () => this.#onManualInput());
      inp.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          this.#onManualInput();
        }
      });
    }
  }

  #onManualInput() {
    const html = this.element;
    this.lepCost = parseInt(html.querySelector(".fg-lep-cost").value) || 1;
    this._validateCosts();
    this.render();
  }

  _validateCosts() {
    const targetWounds = this.targetActor.system.status.wounds;
    const missingTargetLeP = Math.max(0, targetWounds.max - targetWounds.value);
    const maxTransferable = Math.max(1, Math.min(this.actor.system.status.wounds.value, missingTargetLeP));
    this.lepCost = Math.clamp(this.lepCost, 1, maxTransferable);
  }

  static #onAdjustCosts(event, target) {
    const dir = target.dataset.dir;
    if (dir === "left") {
      this.lepCost--;
    } else {
      this.lepCost++;
    }
    this._validateCosts();
    this.render();
  }

  static async #onConfirm() {
    if (this.actor.system.status.wounds.value < this.lepCost) {
      return ui.notifications.warn(dict.notEnoughLeP(this.actor.name));
    }

    const targetWounds = this.targetActor.system.status.wounds;
    const newTargetLeP = Math.min(targetWounds.value + this.lepCost, targetWounds.max);
    const transferredAmount = Math.max(0, newTargetLeP - targetWounds.value);

    if (transferredAmount <= 0) {
      return ui.notifications.warn(dict.targetFullLeP(this.targetToken.name));
    }

    await this.actor.applyDamage(transferredAmount);
    await this.onUseContext.socketedActorTransformation([this.targetToken.id], {
      "system.status.wounds.value": newTargetLeP,
    });

    const msg = dict.healMessage(this.actor.name, this.targetToken.name, transferredAmount);
    await ChatMessage.create(
      game.dsa5.apps.DSA5_Utility.chatDataSetup(msg, this.args?.messageMode)
    );

    this.close();
  }
}

if (!actor) {
  return ui.notifications.warn(dict.noActor);
}

const targets = Array.from(game.user.targets);
if (targets.length !== 1) {
  return ui.notifications.warn(dict.onlySingleTarget);
}

const targetToken = targets[0];
const targetActor = targetToken.actor;
if (!targetActor) {
  return ui.notifications.warn(dict.targetNoActor);
}

if (actor.system.status.wounds.value < 1) {
  return ui.notifications.warn(dict.notEnoughLeP(actor.name));
}

if (targetActor.system.status.wounds.value >= targetActor.system.status.wounds.max) {
  return ui.notifications.warn(dict.targetFullLeP(targetToken.name));
}

new TaarnajTransferDialog(actor, targetToken, this, args).render(true);
