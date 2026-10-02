const { getProperty } = foundry.utils;
const { DialogV2 } = foundry.applications.api;

const lang = game.i18n.lang === "de" ? "de" : "en";

const dict = {
    de: {
        noToken: "Bitte wähle zuerst den Token der Schildkröte aus.",
        noOwner: (name) => `${name} ist kein Begleiter oder hat keinen zugewiesenen Besitzer.`,
        ownerNotFound: "Der Besitzer der Schildkröte konnte in der Welt nicht gefunden werden.",
        maxFate: (ownerName, maxFate) => `<b>${ownerName}</b> hat bereits das Maximum an Schicksalspunkten (${maxFate}) erreicht. Die Schildkröte behält ihren Schip.`,
        transferFate: (actorName, ownerName) => `<b>${actorName}</b> überträgt einen Schicksalspunkt auf <b>${ownerName}</b>.`,
        payAmount: "10 Dukaten",
        dialogDesc: (payAmount, style) => `Nach der Übertragung muss der Gefährte der Schildkröte diese längere Zeit verhätscheln und Nahrung im Wert von ca. <a id="pay-btn" style="${style}">${payAmount}</a> für sie besorgen, bevor die Schildkröte eine neue Übertragung in Erwägung zieht.`,
        feedHint: "Bitte bezahle zuerst das Futter, um den Vorgang abzuschließen.",
        noPaymentApi: "Die DSA5-Zahlungsfunktion ist nicht verfügbar.",
        notEnoughMoney: (ownerName) => `${ownerName} hat nicht genug Geld für das Schildkrötenfutter!`,
        paidMsg: (payAmount, ownerName) => `${payAmount} wurden von ${ownerName} bezahlt.`,
        dialogTitle: "Schicksalsgefährte: Schildkröte",
        btnFeed: "Verpflegen",
        btnCancel: "Abbrechen",
        feedSuccess: (ownerName, actorName) => `<b>${ownerName}</b> hat <b>${actorName}</b> ausgiebig gefüttert.<br>Die Schildkröte hat nun wieder <b>1 Schicksalspunkt</b> zur Verfügung!`
    },
    en: {
        noToken: "Please select the turtle's token first.",
        noOwner: (name) => `${name} is not a companion or has no assigned owner.`,
        ownerNotFound: "The turtle's owner could not be found in the world.",
        maxFate: (ownerName, maxFate) => `<b>${ownerName}</b> has already reached the maximum amount of fate points (${maxFate}). The turtle keeps its fate point.`,
        transferFate: (actorName, ownerName) => `<b>${actorName}</b> transfers a fate point to <b>${ownerName}</b>.`,
        payAmount: "10 Ducats",
        dialogDesc: (payAmount, style) => `After the transfer, the creature must pamper the turtle for a longer period of time and provide food worth approx. <a id="pay-btn" style="${style}">${payAmount}</a> before the turtle will consider another transfer.`,
        feedHint: "Please pay for the food first to complete the process.",
        noPaymentApi: "The DSA5 payment API is not available.",
        notEnoughMoney: (ownerName) => `${ownerName} does not have enough money for the turtle food!`,
        paidMsg: (payAmount, ownerName) => `${payAmount} were paid by ${ownerName}.`,
        dialogTitle: "Fate Companion: Turtle",
        btnFeed: "Care",
        btnCancel: "Cancel",
        feedSuccess: (ownerName, actorName) => `<b>${ownerName}</b> has fed <b>${actorName}</b> extensively.<br>The turtle now has <b>1 fate point</b> available again!`
    }
}[lang];

if (!actor) {
    ui.notifications.warn(dict.noToken);
    return;
}

const owners = getProperty(actor, "system.companionData.owners");
if (!owners || owners.length === 0) {
    ui.notifications.warn(dict.noOwner(actor.name));
    return;
}

const owner = await fromUuid(owners[0]);
if (!owner) {
    ui.notifications.error(dict.ownerNotFound);
    return;
}

const ownerMaxFate = owner.system.status.fatePoints.current + owner.system.status.fatePoints.modifier;
const ownerCurrentFate = owner.system.status.fatePoints.value;
const turtleCurrentFate = actor.system.status.fatePoints.value;

if (turtleCurrentFate > 0 && ownerCurrentFate >= ownerMaxFate) {
    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        content: dict.maxFate(owner.name, ownerMaxFate)
    });
    return;
}

if (turtleCurrentFate > 0) {
    await actor.update({ "system.status.fatePoints.value": Math.max(0, turtleCurrentFate - 1) });
    await owner.update({ "system.status.fatePoints.value": ownerCurrentFate + 1 });
    
    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        content: dict.transferFate(actor.name, owner.name)
    });
    return;
}

const tinyBtnStyle = "display: inline-block; padding: 1px 6px; margin: 0 2px; border: 1px solid #968678; background: #e2d8c9; border-radius: 3px; cursor: pointer; font-weight: bold; color: inherit; text-decoration: none; line-height: 1.2;";

const dialogHtml = `
    <div style="margin-bottom: 10px;">
        <p style="margin-bottom: 8px; line-height: 1.6;">
            ${dict.dialogDesc(dict.payAmount, tinyBtnStyle)}
        </p>
        <br>
        <p id="feed-hint" style="color: darkred; font-weight: bold; margin-bottom: 0;">${dict.feedHint}</p>
    </div>
`;

let isPaid = false;
const paymentAmountInSilver = 100;

class TurtleFeedDialog extends DialogV2 {
    _onRender(context, options) {
        super._onRender(context, options);
        
        const html = this.element;
        if (!html) return;

        const payBtn = html.querySelector("#pay-btn");
        const feedHint = html.querySelector("#feed-hint");
        const feedBtn = html.querySelector('button[data-action="feed"]');

        if (feedBtn) {
            feedBtn.disabled = true;
            feedBtn.style.pointerEvents = "none";
            feedBtn.style.opacity = "0.4";
            feedBtn.style.filter = "grayscale(100%)";
        }

        payBtn?.addEventListener("click", async (e) => {
            e.preventDefault();
            
            const payment = game.dsa5?.apps?.DSA5Payment;
            if (!payment) {
                ui.notifications.error(dict.noPaymentApi);
                return;
            }

            let canPayRaw = await payment.canPay(owner, paymentAmountInSilver);
            const canPayObj = typeof canPayRaw === "boolean" ? { success: canPayRaw } : canPayRaw;

            if (!canPayObj.success) {
                ui.notifications.warn(dict.notEnoughMoney(owner.name));
                return;
            }

            await payment.payMoney(owner, paymentAmountInSilver, true, true, "Schildkrötenfutter");
            isPaid = true;
            
            if (feedBtn) {
                feedBtn.disabled = false;
                feedBtn.style.pointerEvents = "auto";
                feedBtn.style.opacity = "1";
                feedBtn.style.filter = "none";
            }
            
            if (feedHint) feedHint.style.display = "none";
            payBtn.style.opacity = "0.5";
            payBtn.style.pointerEvents = "none";
            payBtn.style.cursor = "default";
            ui.notifications.info(dict.paidMsg(dict.payAmount, owner.name));
        });
    }
}

new TurtleFeedDialog({
    window: {
        title: dict.dialogTitle,
        resizable: true,
    },
    position: {
        width: 450,
        height: "auto",
    },
    content: dialogHtml,
    buttons: [
        {
            action: "feed",
            label: dict.btnFeed,
            callback: async () => {
                if (isPaid) {
                    await actor.update({ "system.status.fatePoints.value": 1 });
                    
                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ actor: actor }),
                        content: dict.feedSuccess(owner.name, actor.name)
                    });
                }
            }
        },
        {
            action: "cancel",
            label: dict.btnCancel
        }
    ]
}).render(true);
