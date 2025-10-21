// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en"
const dict = {
    de: {
        skillName: "Willenskraft",
        skillNotFound: "Fertigkeit Willenskraft wurde nicht gefunden.",
        successMessage: (data) => {
          return `
            <b>${data.name}</b> besteht die Willenskraft-Probe!<br>
            <b>QS</b>: ${data.availableQs}<br>
            <b>Zusatzwurf (2W6):</b> ${data.rollResult}<br>
            <b>Gewonnene AsP:</b> ${data.gainedAsp}<br>
            <b>Neue AsP</b>: ${data.newAsp} / ${data.maxAsp}
          `
        },
        failMessage: (name) => {
          return `<b>${name}</b> scheitert an der Willenskraft-Probe. Keine AsP gewonnen.`
        }
    },
    en: {
        skillName: "Willpower",
        skillNotFound: "Skill Willpower not found.",
        successMessage: (data) => {
          return `
            <b>${data.name}</b> succeeds the Willpower check!<br>
            <b>QL</b>: ${data.availableQs}<br>
            <b>Bonus Roll (2D6):</b> ${data.rollResult}<br>
            <b>Gained AE:</b> ${data.gainedAsp}<br>
            <b>New AE:</b> ${data.newAsp} / ${data.maxAsp}
          `
        },
        failMessage: (name) => {
          return `<b>${name}</b> fails the Willpower check. No AE gained.`
        }
    }
}[lang]

const skill = actor.items.find(i => i.type === "skill" && i.name === dict.skillName);

if (!skill) return ui.notifications.warn(dict.skillNotFound);

actor.setupSkill(skill, { subtitle: ` (${game.i18n.localize('TYPES.Item.specialability')})` }, actor.sheet.getTokenId()).then(async (setupData) => {
  const res = await actor.basicTest(setupData);

  const availableQs = res.result.qualityStep || 0;
  this.automatedAnimation?.(res.result.successLevel);

  if (availableQs > 0) {
    // Zusatzwurf 2W6
    const roll = await new Roll("2d6").evaluate();
    const gainedAsp = availableQs + roll.total;

    // AsP-Update
    const currentAsp = foundry.utils.getProperty(actor.system, "status.astralenergy.value") || 0;
    const maxAsp = foundry.utils.getProperty(actor.system, "status.astralenergy.max") || 0;
    const newAsp = Math.min(currentAsp + gainedAsp, maxAsp);

    await actor.update({ "system.status.astralenergy.value": newAsp });

    // Chatmeldung bei Erfolg
    const msgData = {
      name: actor.name,
      availableQS: availableQs,
      rollResult: roll.total,
      newAsp: newAsp,
      maxAsp: maxAsp,
      gainedAsp: gainedAsp
    }
    const msg = game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.successMessage(msgData));
    ChatMessage.create(msg);
  } else {
    // Chatmeldung bei QS 0
    const msg = game.dsa5.apps.DSA5_Utility.chatDataSetup(dict.failMessage(actor.name));
    ChatMessage.create(msg);
  }
});
