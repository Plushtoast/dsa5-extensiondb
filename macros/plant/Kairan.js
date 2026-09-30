const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
    de: {
        moonlightName: "Eingefangenes Mondlicht",
        noActor: "Kein gültiger Akteur gefunden.",
        noCalendar: "Es ist kein aktiver Kalender vorhanden.",
        noMoon: "Für den aktuellen Kalender sind keine Mondphasen konfiguriert.",
        moonPhaseName: "Rad",
        wrongPhase: (current, expected) => `Das Kairanrohr kann nur bei der Mondphase "${expected}" genutzt werden. Aktuell: ${current}.`,
        noSkill: (skill) => `Das Talent '${skill}' wurde nicht gefunden.`,
        successChat: "Das Kairanrohr leitet das Licht des Madamals erfolgreich in die Flüssigkeit.",
        failChat: "<b>Fehlschlag!</b> Der Ort oder die Ausrichtung war nicht optimal. Das Mondlicht konnte nicht eingefangen werden."
    },
    en: {
        moonlightName: "Captured Moonlight",
        noActor: "No valid actor found.",
        noCalendar: "No active calendar found.",
        noMoon: "No moon phases are configured for the current calendar.",
        moonPhaseName: "Wheel",
        wrongPhase: (current, expected) => `The Kairan stalk can only be used during the "${expected}" phase. Currently: ${current}.`,
        noSkill: (skill) => `The skill '${skill}' was not found.`,
        successChat: "<b>Moonlight captured!</b> The Kairan stalk successfully channels the light into the liquid.",
        failChat: "<b>Failure!</b> The location or alignment was not optimal. The moonlight escapes unused."
    }
}[lang];

if (!actor) return ui.notifications.warn(dict.noActor);

const calendar = game.time.calendar;
if (!calendar) return ui.notifications.warn(dict.noCalendar);

const components = calendar.timeToComponents(game.time.worldTime);
if (!components.moon) return ui.notifications.warn(dict.noMoon);

const phaseName = calendar.translate(components.moon.phase.name);
if (!phaseName.toLowerCase().includes(dict.moonPhaseName.toLowerCase())) {
    return ui.notifications.warn(dict.wrongPhase(phaseName, dict.moonPhaseName));
}

const skillName = game.i18n.localize("LocalizedIDs.astronomy");
const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
if (!skill) return ui.notifications.warn(dict.noSkill(skillName));

const setupData = await actor.setupSkill(skill, { modifier: -3 }, null);
const testResult = await actor.basicTest(setupData);

const speaker = ChatMessage.getSpeaker({ actor });

if (testResult.result.successLevel > 0) {
    const moonlightItem = {
        name: dict.moonlightName,
        type: "equipment",
        img: "systems/dsa5/icons/categories/Equipment.webp",
        system: {
            price: { value: 32 },
            equipmentType: { value: "alchemy" }
        }
    };
    
    await actor.createEmbeddedDocuments("Item", [moonlightItem]);
    ChatMessage.create({ speaker, content: dict.successChat });
} else {
    ChatMessage.create({ speaker, content: dict.failChat });
}
