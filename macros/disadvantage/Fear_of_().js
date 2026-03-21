const lang = game.i18n.lang == "de" ? "de" : "en";
const dict = {
    de: { noActor: "Kein Actor gefunden." },
    en: { noActor: "No actor found." }
}[lang];

if (!actor) {
    ui.notifications.warn(dict.noActor);
    return;
}

const stepValue = item.system.step?.value || 0;

if (stepValue > 0) {
    const effectData = {
        name: item.name, 
        icon: "icons/svg/terror.svg",
        origin: item.uuid,
        changes: [
            {
                key: "system.condition.feared", 
                mode: 2,
                value: stepValue
            }
        ],
        flags: {
            core: { statusId: "furcht" }
        }
    };

    await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}
