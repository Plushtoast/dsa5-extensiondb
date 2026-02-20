import MagicalAlchemistDSA5 from './magical-alchemist-dsa5.js';
import DSA5_Utility from '/systems/dsa5/modules/system/helpers/utility-dsa5.js';

const getMessageFromLi = (li) => game.messages.get(li.dataset.messageId);

const getActorFromMessage = (message) => {
    return message.speaker?.actor ? game.actors.get(message.speaker.actor) : null;
};

Hooks.once('init', async function() {
    await loadTemplates([
        "modules/dsa5-magic-2/templates/magical-alchemist-dialog.hbs"
    ]);
});

Hooks.on('getChatMessageContextOptions', (app, options, c) => {
    options.push({
        name: "MAGICAL_ALCHEMIST.alchemistName",
        icon: '<img src="systems/dsa5/icons/traditionen/zauberalchimisten.webp" style="width: 10px; height: 10px; display: inline-block; vertical-align: middle; margin-left: 2px; margin-right: 10px; border: none; margin-bottom: 0;">',
        condition: (li) => {
            const el = li[0] || li; 
            const message = getMessageFromLi(el);
            const data = message?.flags?.data;
            
            if (!data || data.postData?.rollType !== 'talent' || message.flags.dsa5?.magicalAlchemistUsed) return false;

            const talentName = data.preData?.source?.name;
			const localizedAlchemyName = game.i18n.localize("LocalizedIDs.alchemy");
            
            if (talentName !== localizedAlchemyName) return false;
            
            const level = data.postData.successLevel;
            if (level === -1 || level === -3) return false;

            const actor = DSA5_Utility.getSpeaker(message.speaker) || getActorFromMessage(message);
            if (!actor) return false;
            
            const traditionName = game.i18n.localize("MAGICAL_ALCHEMIST.tradition");

            return actor.items.some(i => 
                i.type === "specialability" && 
                i.name.includes(traditionName)
            );
        },
        callback: (li) => {
            const el = li[0] || li;
            MagicalAlchemistDSA5.handleMagicalAlchemist(getMessageFromLi(el));
        }
    });
});
