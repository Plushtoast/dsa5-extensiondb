import SavantDSA5 from './savant-dsa5.js';
import DSA5_Utility from '/systems/dsa5/modules/system/helpers/utility-dsa5.js';

const getMessageFromLi = (li) => game.messages.get(li.dataset.messageId);
const getActorFromMessage = (message) => message.speaker?.actor ? game.actors.get(message.speaker.actor) : null;

Hooks.once('init', async function() {
    await loadTemplates(["modules/dsa5-magic-1/templates/savant-dialog.hbs"]);
});

Hooks.on('getChatMessageContextOptions', (app, options, c) => {
    options.push({
        name: "SAVANT.name",
        icon: '<i class="fas fa-magic"></i>',
        condition: (li) => {
            const el = li[0] || li; 
            const message = getMessageFromLi(el);
            const data = message?.flags?.data;
            if (!data || data.postData?.rollType !== 'talent' || message.flags.dsa5?.savantUsed) return false;
            if (data.postData.successLevel === -1 || data.postData.successLevel === -3) return false;

            const actor = DSA5_Utility.getSpeaker(message.speaker) || getActorFromMessage(message);
            if (!actor) return false;
            
            const sourceName = data.preData.source.name;
            const traditionName = game.i18n.localize("SAVANT.tradition");

            return actor.items.some(i => i.type === "specialability" && 
                i.name.includes(traditionName) && 
                i.name.includes(sourceName));
        },
        callback: (li) => SavantDSA5.handleSavant(getMessageFromLi(li[0] || li))
    });
});
