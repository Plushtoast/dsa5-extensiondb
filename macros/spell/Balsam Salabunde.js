const dict = {
  de: {
    castSpell: (actorName, spellName) => `<b>${actorName}</b> moechte den Zauber <b>${spellName}</b> wirken.`,
    buttonLabel: 'Balsamsalabunde',
    casterOrTargetNotFound: 'Caster oder Ziel nicht gefunden!',
    dialogTitle: (spellName) => `Zauber: ${spellName}`,
    dialogDescription: (spellName) => `Die Zahl der einsetzbaren Astralpunkte entspricht dem Faehigkeitswert des Zauberers in ${spellName}. Gib an, wie viele AsP du zusaetzlich in den Zauber investieren moechtest.`,
    skillValue: 'Faehigkeitswert',
    astralEnergy: 'Astralpunktevorrat',
    baseCost: 'Grundkosten',
    invalidNumber: 'Bitte gib eine gueltige Zahl ein.',
    negativeValues: 'Negative Werte sind nicht erlaubt.',
    healingExceedsSkill: (fw) => `Der Gesamtwert der Heilung darf den FW (${fw}) nicht ueberschreiten.`,
    notEnoughAstralEnergy: (casterName, available, required) => `${casterName} hat nicht genug AsP! (${available} verfuegbar, benoetigt: ${required})`,
    healingApplied: (casterName, targetName, heal, totalCost) => `${casterName} heilt ${targetName} um ${heal} LeP (Kosten: ${totalCost} AsP zusaetzlich zur Basis).`,
    executionError: (err) => `Fehler beim Ausfuehren von Balsamsalabunde: ${err}`,
  },
  en: {
    castSpell: (actorName, spellName) => `<b>${actorName}</b> wants to cast <b>${spellName}</b>.`,
    buttonLabel: 'Balsam Salabunde',
    casterOrTargetNotFound: 'Caster or target not found!',
    dialogTitle: (spellName) => `Spell: ${spellName}`,
    dialogDescription: (spellName) => `The number of astral points that can be invested equals the caster's skill value in ${spellName}. Enter how many additional AsP you want to invest in the spell.`,
    skillValue: 'Skill Value',
    astralEnergy: 'Astral Energy',
    baseCost: 'Base Cost',
    invalidNumber: 'Please enter a valid number.',
    negativeValues: 'Negative values are not allowed.',
    healingExceedsSkill: (fw) => `The total healing value must not exceed the skill value (${fw}).`,
    notEnoughAstralEnergy: (casterName, available, required) => `${casterName} does not have enough AsP! (${available} available, required: ${required})`,
    healingApplied: (casterName, targetName, heal, totalCost) => `${casterName} heals ${targetName} for ${heal} LP (cost: ${totalCost} AsP in addition to the base cost).`,
    executionError: (err) => `Error while executing Balsam Salabunde: ${err}`,
  },
}[game.i18n.lang == 'de' ? 'de' : 'en'];

// --- Grundkosten aus source ---
const baseCost = source.system.AsPCost?.value || 0;

// --- Chatnachricht mit Button erstellen ---
const chatContent = `
<div class="dsa-balsam-chat" style="margin:10px 0; text-align:center;">
  <p>${dict.castSpell(sourceActor.name, source.name)}</p>
  <div style="margin-top:5px; display:flex; justify-content:center;">
    <button 
      class="balsam-btn" 
      style="padding: 5px 15px; font-weight: bold;" 
      data-source-actor-id="${sourceActor.id}"
      data-target-actor-id="${actor.id}"
      data-qs="${qs || 0}"
    >
      ${dict.buttonLabel}
    </button>
  </div>
</div>
`;

// --- Empfänger: GM + Besitzer von sourceActor ---
const recipients = ChatMessage.getWhisperRecipients("GM").concat(
  Object.keys(sourceActor.ownership).filter(uid => sourceActor.ownership[uid] === 3)
);

// --- Nachricht erstellen ---
ChatMessage.create({
  content: chatContent,
  whisper: recipients
});

// --- Klick-Handler für Button ---
Hooks.once("renderChatMessage", (message, html) => {
  html.find(".balsam-btn").click(async ev => {
    try {
      // --- IDs aus data-Attributen auslesen ---
      const casterId = ev.currentTarget.dataset.sourceActorId;
      const targetId = ev.currentTarget.dataset.targetActorId;
      const qsValue = Number(ev.currentTarget.dataset.qs) || 0;

      const caster = game.actors.get(casterId);
      const actor = game.actors.get(targetId);
      if (!caster || !actor) throw new Error(dict.casterOrTargetNotFound);

      // --- FW direkt aus source ---
      const fw = source.system.talentValue.value || 0;
      let currentAsp = caster.system.status.astralenergy.value;

      // --- Dialog ---
      new foundry.applications.api.DialogV2({
        window: { title: dict.dialogTitle(source.name) },
        content: `
          <div style="text-align: center; margin-bottom: 10px;">
            <p>${dict.dialogDescription(source.name)}</p>
            <p>${dict.skillValue}: <b>${fw}</b></p>
            <p>${dict.astralEnergy}: <b>${currentAsp}</b></p>
            <p>${dict.baseCost}: <b>${baseCost}</b> AsP</p>
          </div>
          <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
            <input id="aspInput" type="number" value="0" min="0" max="${fw}" style="width: 60px; text-align: center;">
          </div>
        `,
        buttons: [
          {
            action: 'yes',
            icon: 'fa fa-check',
            label: 'yes',
            callback: async (event, button, dialog) => {
              const html = $(button.form)
              let input = html.find("#aspInput").val();
              let value = Number(input);

              // --- Eingabe prüfen ---
              if (isNaN(value)) return ui.notifications.warn(dict.invalidNumber);
              if (value < 0) return ui.notifications.warn(dict.negativeValues);
              if ((value + baseCost) > fw) return ui.notifications.warn(dict.healingExceedsSkill(fw));

              // --- Heilungswert und Gesamtkosten berechnen ---
              let heal = (value === 0) ? baseCost : value + baseCost;
              let totalCost = heal - baseCost;

              // --- Prüfen, ob genug AsP vorhanden sind ---
              if (heal > caster.system.status.astralenergy.value) {
                return ui.notifications.warn(dict.notEnoughAstralEnergy(caster.name, caster.system.status.astralenergy.value, heal));
              }

              // --- Effekt auf Ziel ---
              await actor.applyDamage(heal * -1);

              // --- AsP-Kosten für Caster abziehen ---
              await caster.update({ "system.status.astralenergy.value": caster.system.status.astralenergy.value - heal });

              ui.notifications.info(dict.healingApplied(caster.name, actor.name, heal, totalCost));
            }
          },
          {
            action: 'cancel',
            icon: 'fas fa-times',
            label: 'cancel',
          }
        ],
      }).render(true);

    } catch (err) {
      ui.notifications.error(dict.executionError(err));
      console.error(err);
    }
  });
});
