import { DSA5_Utility } from './dsa5-api.js';
import { getRegenFateStatus } from './compendium2-fate-context.js';

Hooks.on('dsa5.fateContextOptions', (fateOptions) => {
    const useSchip = fateOptions.find((option) => option.label === 'CHATCONTEXT.UseSchip');
    if (!useSchip) return;

    const coreVisible = useSchip.visible;
    useSchip.visible = (li) => coreVisible(li) || canUseRegenSchip(li);
});

function canUseRegenSchip(li) {
    const el = li.length ? li[0] : li;
    const message = game.messages.get(el.dataset?.messageId);
    if (!message?.flags?.data?.preData) return false;

    const actor = DSA5_Utility.getSpeaker(message.speaker);
    if (!actor || !(actor.isOwner || game.user.isGM)) return false;

    const status = getRegenFateStatus(actor, message.flags.data);
    return status.isRegen && (status.heilkraftAvailable > 0 || status.canReroll);
}
