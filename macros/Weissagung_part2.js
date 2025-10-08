// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    dialogTitle: "Weissagung",
    dialogText: `"Prophezeiungen sind meistens ein zweischneidiges Schwert. 
Personen, die sich auf die Kunst der Weissagung verstehen, 
können durch einen Blick in die vermeintliche Zukunft gute Ratschläge erteilen, 
jedoch verunsichern sie oft auch denjenigen, an den die Prophezeiung gerichtet ist."`,
    acceptLabel: "Annehmen",
    declineLabel: "Ablehnen",
    noActorError: "Kein Actor gefunden – bitte Makro aus einer Chatkarte eines Items/Zaubers auslösen.",
    effectName: "Weissagung: IN-Proben",
    effectDesc: "Erschwernis -1 auf alle Proben mit IN.",
    acceptedInfo: (name, current, max, extra) => `${name} erhält 1 Schicksalspunkt (${current}/${max}) und den Effekt "Weissagung" ${extra}.`,
    declinedInfo: "Die Weissagung wurde abgelehnt.",
    inPenaltyLabel: "(IN-Erschwernis)"
  },
  en: {
    dialogTitle: "Divination",
    dialogText: `"Prophecies are often a double-edged sword.
People skilled in divination may offer good advice by glimpsing the supposed future,
yet they often unsettle the one to whom the prophecy is addressed."`,
    acceptLabel: "Accept",
    declineLabel: "Decline",
    noActorError: "No actor found – please trigger the macro from an item/spell chat card.",
    effectName: "Divination: IN Tests",
    effectDesc: "Penalty -1 to all tests using IN.",
    acceptedInfo: (name, current, max, extra) => `${name} gains 1 Fate Point (${current}/${max}) and the effect "Divination" ${extra}.`,
    declinedInfo: "The divination was declined.",
    inPenaltyLabel: "(IN penalty)"
  }
};
const t = dict[lang];


if (!actor) {
  ui.notifications.error(t.noActorError);
  return;
}

new Dialog({
  title: t.dialogTitle,
  content: `
    <p style="font-style: italic;">
      ${t.dialogText}
    </p>
  `,
  buttons: {
    accept: {
      icon: '<i class="fas fa-check"></i>',
      label: t.acceptLabel,
      callback: async () => {
        let current = foundry.utils.getProperty(actor, "system.status.fatePoints.value") ?? 0;
        let max = foundry.utils.getProperty(actor, "system.status.fatePoints.max") ?? 0;

        const effectData = {
          name: t.effectName,
          icon: "icons/svg/aura.svg",
          origin: actor.uuid,
          duration: { rounds: null }, // unbegrenzt
          changes: [
            {
              key: "system.skillModifiers.global",
              value: -1,
              mode: 0, 
              priority: 20,
            }
          ],
          flags: {
            dsa5: {
              description: t.effectDesc,
            },
          },
        };

        // Sonderfall: Maximum bereits erreicht
        if (current >= max) {
          effectData.changes.push({
            key: "system.status.fatePoints.gearmodifier",
            value: 1,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            priority: 20,
          });

          await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

          await actor.update({ "system.status.fatePoints.value": current + 1 });
          current += 1;
          max += 1;
        } else {
          // Effekt mit IN-Erschwernis
          await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

          await actor.update({ "system.status.fatePoints.value": current + 1 });
          current += 1;
        }

        const extra = t.inPenaltyLabel + (current >= max ? " " : "");
        ui.notifications.info(t.acceptedInfo(actor.name, current, max, extra));
      }
    },
    decline: {
      icon: '<i class="fas fa-times"></i>',
      label: t.declineLabel,
      callback: () => {
        ui.notifications.info(t.declinedInfo);
      }
    }
  },
  default: "accept"
}).render(true);

