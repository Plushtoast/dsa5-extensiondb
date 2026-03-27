// This is a system macro used for automation. It is disfunctional without the proper context.

const activeActor = actor;
const activeItem = source;
const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
    de: {
        noActor: "Kein gültiger Akteur gefunden.",
        alreadyUsed: "Du hast heute bereits Egelschreckpaste verwendet.",
        effectName: "Egelschreckpaste",
        expiry: "Die Wirkung der Egelschreckpaste lässt nach."
    },
    en: {
        noActor: "No valid actor found.",
        alreadyUsed: "You have already used Leech repellent paste today.",
        effectName: "Egelschreckpaste",
        expiry: "The effect of the Leech repellent paste wears off."
    }
}[lang];

if (!activeActor) {
    ui.notifications.error(dict.noActor);
    return;
}

const hasCooldown = activeActor.effects.some(e => e.name === dict.effectName);

if (hasCooldown) {
    ui.notifications.warn(dict.alreadyUsed);
    return;
}

(async () => {
    try {
        await activeActor.applyDamage(-1);

        const effectData = {
            name: dict.effectName,
            icon: "icons/svg/aura.svg",
            duration: { seconds: 86400 },
            flags: {
                dsa5: {
                    onRemove: `ui.notifications.info("${dict.expiry}")`
                }
            }
        };

        await activeActor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    } catch (err) {
        console.error(err);
    }
})();
