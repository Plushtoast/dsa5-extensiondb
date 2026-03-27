// This is a system macro used for automation. It is disfunctional without the proper context.

const lang = game.i18n.lang === "de" ? "de" : "en";
const dict = {
    de: {
        title: "Ratte - Angst vor Feuer",
        panicText: "Panik vor Feuer: Wenn Riesenratten mit einer größeren Menge von Feuer konfrontiert werden (etwa Fackelgröße), fliehen sie bei 1–3 auf 1W6."
    },
    en: {
        title: "Rat - Fear of Fire",
        panicText: "Panic from Fire: When giant rats are confronted with a larger amount of fire (about torch size), they flee on a 1-3 on 1d6."
    }
}[lang];

if (typeof testData === "undefined" || !testData) return;
if (testData.mode !== "attack") return;

function hasActiveTorch(targetActor) {
    if (!targetActor) return false;
    const torchItems = targetActor.items.filter(item => {
        const onUse = item.flags?.dsa5?.onUseEffect || "";
        return onUse.includes('applyVisionOrLight(true, "torch"');
    });
    if (torchItems.length === 0) return false;
    return torchItems.some(torchItem => targetActor.effects.some(e => e.name === torchItem.name));
}

const targets = Array.from(game.user.targets);
if (targets.length === 0) return;

const targetHasTorch = targets.some(t => hasActiveTorch(t.actor));
if (!targetHasTorch) return;

const app = data?.dialogState?.dialog;
if (app) {
    if (app._ratFearRolled) return;
    app._ratFearRolled = true;
}

(async () => {
    const roll = await new Roll("1d6").evaluate();
    
    await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: `<b>${dict.title}</b>`
    });

    if (roll.total <= 3) {
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker(),
            content: `<div>
                        <b>${dict.title}</b><br>
                        <i>${dict.panicText}</i>
                      </div>`,
            whisper: ChatMessage.getWhisperRecipients("GM")
        });
    }
})();
