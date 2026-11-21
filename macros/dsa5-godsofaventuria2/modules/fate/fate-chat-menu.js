import { DSA5GodsMenuConfig } from './config.js';
import { UnifiedFateDSA5 } from './dsa5-api.js';
import { getRegenBlessingActors } from './fate-context.js';

function getMessageFromLi(li) {
    const el = li?.length ? li[0] : li;
    return el?.dataset?.messageId ? game.messages.get(el.dataset.messageId) : null;
}

Hooks.on('dsa5.fateContextOptions', (fateOptions) => {
    const useSchip = fateOptions.find((option) => option.label === 'CHATCONTEXT.UseSchip');
    if (!useSchip) return;
    const coreVisible = useSchip.visible;
    useSchip.visible = (li) => coreVisible(li) || hasGodsPools(li);
});

Hooks.on('getChatMessageContextOptions', (html, options) => {
    options.push({
        label: 'GodsMenu.FateTab.UseSchip',
        icon: '<i class="fas fa-dice"></i>',
        visible: (li) => getRegenBlessingActors(getMessageFromLi(li)).length > 0,
        onClick: (event, li) => {
            const message = getMessageFromLi(li);
            if (!getRegenBlessingActors(message).length) return;

            const registry = { AppClass: UnifiedFateDSA5 };
            Hooks.callAll('dsa5.getFateSpendApp', registry);
            registry.AppClass.openForRollRequest?.(message);
        },
    });
});

function hasGodsPools(li) {
    const message = getMessageFromLi(li);
    if (!message?.flags?.data?.preData) return false;

    const actor = message.speaker?.actor ? game.actors.get(message.speaker.actor) : null;
    if (!actor || !(actor.isOwner || game.user.isGM)) return false;

    const specialPoints = foundry.utils.getProperty(actor, 'flags.dsa5.specialPoints');
    if (specialPoints && Object.values(specialPoints).some((p) => (p?.current || 0) > 0)) {
        return true;
    }

    const isRegen = (message.flags.data.postData?.rollType || message.flags.data.preData.source?.type) === 'regenerate';
    if (game.user.isGM && !(isRegen && message.flags.data.meisterRegenUsed)) {
        return DSA5GodsMenuConfig.getSchipSetting('masterschips').current > 0;
    }

    return false;
}
