// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
  de: {
    selectTokenWarn: "Bitte zuerst deinen Token auswählen oder ein verknüpftes Charakter-Actor besitzen.",
    selectOneTargetWarn: "Bitte genau ein Ziel auswählen.",
    noOwnerWarn: "Kein Spieler besitzt das gewählte Ziel.",
    actionLabel: "Weissagung",
    wantsToDo: "möchte dir eine",
    actionVerb: "machen.",
    macroMissingWarn: "Makro-UUID fehlt oder ist ungültig."
  },
  en: {
    selectTokenWarn: "Please select your token first or have a linked character actor.",
    selectOneTargetWarn: "Please select exactly one target.",
    noOwnerWarn: "No player owns the selected target.",
    actionLabel: "Divination",
    wantsToDo: "wants to give you a",
    actionVerb: "",
    macroMissingWarn: "Macro UUID is missing or invalid."
  }
};
const t = dict[lang];


const sourceActor = actor;
if (!sourceActor) {
  ui.notifications.warn(t.selectTokenWarn);
  return;
}

// Zieldefinition
const targets = Array.from(game.user.targets);
if (targets.length !== 1) {
  ui.notifications.warn(t.selectOneTargetWarn);
  return;
}
const targetToken = targets[0];
const targetActor = targetToken?.actor;

// Besitzerprüfung des Ziel-Akteurs
const targetUsers = game.users.players.filter(u => targetActor?.testUserPermission(u, "OWNER"));
if (targetUsers.length === 0) {
  ui.notifications.warn(t.noOwnerWarn);
  return;
}
const whisperRecipients = targetUsers.map(u => u.id);


const macroUUID = "Compendium.dsa5-magic-2.magic2abilitymacros.Macro.c1PJW34kpBCyHiKu"; // Platzhalter
if (!macroUUID) {
  ui.notifications.warn(t.macroMissingWarn);
  return;
}

// Namen über foundry.utils.getProperty
const senderName = foundry.utils.getProperty(sourceActor, "name") || sourceActor.name;

// Chat-Nachricht mit Foundry-Makro-Link
const messageContent = `
<div style="text-align:center; font-style: italic; margin-bottom: 10px;">
  ${senderName} ${t.wantsToDo} @UUID[${macroUUID}]{${t.actionLabel}} ${t.actionVerb}
</div>
`;

await ChatMessage.create({
  content: messageContent,
  whisper: whisperRecipients
});

