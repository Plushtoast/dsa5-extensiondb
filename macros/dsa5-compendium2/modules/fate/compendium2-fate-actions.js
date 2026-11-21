import { DiceDSA5, FateRolls } from './dsa5-api.js';

const STAT_MAP = {
    LeP: { label: 'wounds', color: 'mu' },
    AsP: { label: 'astralenergy', color: 'ge' },
    KaP: { label: 'karmaenergy', color: 'in' }
};

function updateCardStat($content, catString, newVal) {
    $content.find(`input.roll-edit[data-tooltip="${catString}"]`).first().val(newVal).attr('value', newVal);
    $content.find('.card-content').each(function () {
        if ($(this).html().includes(`<b>${catString}</b>:`)) {
            $(this).html(`\n        <b>${catString}</b>: ${newVal}\n    `);
        }
    });
}

export async function executeAddRegen(app, data, isCheat) {
    const count = app.selectedForHeilkraft.size;
    if (!count) return null;

    const sfNameLoc = _loc('LocalizedIDs.healingPower');
    let healRoll = await new Roll(`${count}d6`).evaluate();
    healRoll = await DiceDSA5.manualRolls(healRoll, sfNameLoc, { cheat: isCheat });
    await DiceDSA5._addRollDiceSoNice(data, healRoll, game.dsa5.apps.DiceSoNiceCustomization.getAttributeConfiguration('mu'));

    const newLeP = (data.postData.LeP || 0) + healRoll.total;
    const $content = $(`<div>${app.message.content}</div>`);
    const extraDiceHtml = healRoll.terms[0].results
        .map(r => `\n    <span data-tooltip="${sfNameLoc}" class="display-toggle fail die-LeP d6">${r.result}</span>`)
        .join('');

    $content.find('.roll-result .die-LeP').last().after(extraDiceHtml);
    updateCardStat($content, _loc('wounds'), newLeP);

    return {
        chatType: 'addRegen',
        chatActionLabel: _loc('CHATFATE.tabAddRegen'),
        chatRollDetails: '',
        updates: {
            content: $content.html(),
            'flags.data.fatePointHeilkraftUsedCount': (data.fatePointHeilkraftUsedCount || 0) + count,
            'flags.data.postData.LeP': newLeP
        },
        cost: count
    };
}

export async function executeRerollRegen(app, data, isCheat) {
    const count = app.selectedForRegenReroll.size;
    if (!count) return null;

    const selectedIndices = Array.from(app.selectedForRegenReroll).sort((a, b) => a - b);
    let reroll = await new Roll(`${count}d6`).evaluate();
    reroll = await DiceDSA5.manualRolls(reroll, _loc('CHATCONTEXT.Reroll'), { cheat: isCheat });

    const diffs = { LeP: 0, AsP: 0, KaP: 0 };
    const damageChangesHtml = [];
    let colorAttr = 'mu';

    const $content = $(`<div>${app.message.content}</div>`);
    const spans = $content.find('.roll-result span.d6');

    for (let i = 0; i < count; i++) {
        const $span = spans.eq(selectedIndices[i]);
        const oldVal = parseInt($span.text()) || 0;
        const newVal = reroll.terms[0].results[i].result;
        const attr = ($span.attr('class') || '').match(/die-(LeP|AsP|KaP)/)?.[1] || 'LeP';

        colorAttr = STAT_MAP[attr].color;
        const finalValue = Math.max(newVal, oldVal);
        damageChangesHtml.push(FateRolls.formatDieChange(oldVal, finalValue, { char: attr, faces: 6 }).html);

        diffs[attr] += finalValue - oldVal;
        $span.text(finalValue);
    }

    const updates = { 'flags.data.fatePointRegenRerollUsed': true };
    for (const [stat, diff] of Object.entries(diffs)) {
        if (!diff) continue;
        const newVal = (data.postData[stat] || 0) + diff;
        updates[`flags.data.postData.${stat}`] = newVal;
        updateCardStat($content, _loc(STAT_MAP[stat].label), newVal);
    }
    updates.content = $content.html();

    await DiceDSA5._addRollDiceSoNice(data, reroll, game.dsa5.apps.DiceSoNiceCustomization.getAttributeConfiguration(colorAttr));

    return {
        chatType: 'rerollRegen',
        chatActionLabel: _loc('CHATFATE.tabRerollRegen'),
        chatRollDetails: FateRolls.formatDieChangesHtml(damageChangesHtml),
        updates,
        cost: count
    };
}
