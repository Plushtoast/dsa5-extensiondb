// --- Grundkosten aus source ---
const baseCost = source.system.AsPCost?.value || 0;

// --- Chatnachricht mit Button erstellen ---
const chatContent = `
<div class="dsa-balsam-chat" style="margin:10px 0; text-align:center;">
  <p><b>${sourceActor.name}</b> möchte den Zauber <b>${source.name}</b> wirken.</p>
  <div style="margin-top:5px; display:flex; justify-content:center;">
    <button 
      class="balsam-btn" 
      style="padding: 5px 15px; font-weight: bold;" 
      data-source-actor-id="${sourceActor.id}"
      data-target-actor-id="${actor.id}"
      data-qs="${qs || 0}"
    >
      Balsamsalabunde
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
      if (!caster || !actor) throw new Error("Caster oder Ziel nicht gefunden!");

      // --- FW direkt aus source ---
      const fw = source.system.talentValue.value || 0;
      let currentAsp = caster.system.status.astralenergy.value;

      // --- Dialog ---
      new Dialog({
        title: `Zauber: ${source.name}`,
        content: `
          <div style="text-align: center; margin-bottom: 10px;">
            <p>Die Zahl der einsetzbaren Astralpunkte entspricht dem Fähigkeitswert des Zauberers in ${source.name}. Gib an, wie viele AsP du zusätzlich in den Zauber investieren möchtest.</p>
            <p>Fähigkeitswert: <b>${fw}</b></p>
            <p>Astralpunktevorrat: <b>${currentAsp}</b></p>
            <p>Grundkosten: <b>${baseCost}</b> AsP</p>
          </div>
          <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
            <input id="aspInput" type="number" value="0" min="0" max="${fw}" style="width: 60px; text-align: center;">
          </div>
        `,
        buttons: {
          accept: {
            label: "Annehmen",
            callback: async (html) => {
              let input = html.find("#aspInput").val();
              let value = Number(input);

              // --- Eingabe prüfen ---
              if (isNaN(value)) return ui.notifications.warn("Bitte gib eine gültige Zahl ein.");
              if (value < 0) return ui.notifications.warn("Negative Werte sind nicht erlaubt.");
              if ((value + baseCost) > fw) return ui.notifications.warn(`Der Gesamtwert der Heilung darf den FW (${fw}) nicht überschreiten.`);

              // --- Heilungswert und Gesamtkosten berechnen ---
              let heal = (value === 0) ? baseCost : value + baseCost;
              let totalCost = heal - baseCost;

              // --- Prüfen, ob genug AsP vorhanden sind ---
              if (heal > caster.system.status.astralenergy.value) {
                return ui.notifications.warn(`${caster.name} hat nicht genug AsP! (${caster.system.status.astralenergy.value} verfügbar, benötigt: ${heal})`);
              }

              // --- Effekt auf Ziel ---
              await actor.applyDamage(heal * -1);

              // --- AsP-Kosten für Caster abziehen ---
              await caster.update({ "system.status.astralenergy.value": caster.system.status.astralenergy.value - heal });

              ui.notifications.info(`${caster.name} heilt ${actor.name} um ${heal} LeP (Kosten: ${totalCost} AsP zusätzlich zur Basis).`);
            }
          },
          cancel: { label: "Abbrechen" }
        },
        default: "accept" // Enter-Taste aktiviert "Annehmen"
      }).render(true);

    } catch (err) {
      ui.notifications.error(`Fehler beim Ausführen von Balsamsalabunde: ${err}`);
      console.error(err);
    }
  });
});
