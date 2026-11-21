import { DSA5_Utility, DiceDSA5, FateRolls } from './dsa5-api.js';
import { DSA5GodsMenuConfig } from './config.js';
import { promptRerollCheat, promptRegenDistribution } from './fate-dialogs.js';
import { REGEN_BLESSING_CONFIG, getEligibleCompanions } from './fate-context.js';
import { applyRegenBlessing } from './fate-effects.js';

const REGEN_STAT_MAP = {
    LeP: { label: 'wounds', color: 'mu' },
    AsP: { label: 'astralenergy', color: 'ge' },
    KaP: { label: 'karmaenergy', color: 'in' },
};

// Wurf-Reroll und Auswertung

export async function processReroll(diceIndices, testData, postData, rollContext, useMinimum = false, actor = null, isPhex = false, isCheat = false) {
    if (!(testData.roll instanceof Roll)) testData.roll = DiceDSA5.fromRollData(testData.roll);

    let cheatResults = null;
    if (isCheat) {
        const diceData = diceIndices.map((dieIndex, rollIndex) => {
            const charData = postData?.characteristics?.[dieIndex] || {};
            const term = testData.roll.terms[dieIndex * 2];
            const attr = charData.char || 'd20';
            return {
                rollIndex,
                original: charData.res ?? term.results[0].result,
                faces: term.faces,
                attr,
                cssClass: charData.suc ? 'suc' : (charData.suc === false ? 'fail' : ''),
                tooltip: charData.tar ? `${_loc(`CHARAbbrev.${attr.toUpperCase()}`)} vs ${charData.tar}` : '',
            };
        });

        cheatResults = await promptRerollCheat(diceData);
        if (!cheatResults) return null;
    }

    return FateRolls.processSelectedReroll(diceIndices, testData, {
        rollContext,
        useMinimum,
        actor,
        isPhex,
        cheatResults,
    });
}

// Reroll (W20)

export async function executeReroll(app, data, newTestData, isCheat, isMasterReroll) {
    if (app.selectedForReroll.size === 0) {
        ui.notifications.warn(_loc('DSAError.noDieSelected'));
        return null;
    }

    const isPhex = DSA5GodsMenuConfig.hasPhexTradition(app.dsaActor);
    const rerollData = await processReroll(
        Array.from(app.selectedForReroll).sort((a, b) => a - b),
        newTestData, data.postData, 'CHATCONTEXT.Reroll', false, app.dsaActor, isPhex, isCheat,
    );
    if (!rerollData) return null;

    if (data.postData.characteristics) {
        rerollData.changes.forEach((c) => {
            const charObj = data.postData.characteristics[c.index];
            if (charObj) {
                charObj.res = c.val;
                if (charObj.tar !== undefined) charObj.suc = c.val <= charObj.tar;
            }
        });
    }
    newTestData.fateUsed = true;

    return {
        chatActionLabel: _loc(isMasterReroll ? 'GodsMenu.FateTab.MasterFate' : 'GodsMenu.FateTab.Reroll'),
        chatRollDetails: FateRolls.formatDieChangesHtml(rerollData.changedRolls),
        flagToUpdate: isMasterReroll ? 'meisterSchicksalUsed' : FateRolls.FLAGS.FATE_REROLL,
    };
}

// Schadenswurf wiederholen

export async function processDamageReroll(selectedIndices, origDamageData, messageMode, isCheat = false) {
    const originalRoll = DiceDSA5.fromRollData(origDamageData);
    if (!originalRoll?.terms) return null;

    const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
    const rerollFormulas = [];
    const diceMapping = [];

    let globalIndex = 0;
    for (let termIdx = 0; termIdx < originalRoll.terms.length; termIdx++) {
        const term = originalRoll.terms[termIdx];
        if (!term.results) continue;
        for (let resIdx = 0; resIdx < term.results.length; resIdx++) {
            if (sortedIndices.includes(globalIndex)) {
                rerollFormulas.push(`1d${term.faces}`);
                diceMapping.push({ termIdx, resIdx, originalResult: term.results[resIdx].result });
            }
            globalIndex++;
        }
    }

    if (!rerollFormulas.length) return null;

    let newRerollDie = await new Roll(rerollFormulas.join(' + ')).evaluate();
    newRerollDie = await DiceDSA5.manualRolls(newRerollDie, 'CHATCONTEXT.rerollDamage', { cheat: false });

    if (isCheat) {
        const diceData = diceMapping.map((mapping, idx) => ({
            rollIndex: idx,
            original: mapping.originalResult,
            faces: originalRoll.terms[mapping.termIdx].faces,
            attr: 'damage',
            cssClass: 'fail',
            tooltip: _loc('Trefferpunkte'),
        }));
        const cheatResults = await promptRerollCheat(diceData);
        if (!cheatResults) {
            ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
            return null;
        }
        let cheatIdx = 0;
        newRerollDie.terms.forEach((term) => {
            term.results?.forEach((res) => { res.result = cheatResults[cheatIdx++]; });
        });
        newRerollDie._total = newRerollDie._evaluateTotal();
    }

    newRerollDie.dice.forEach((die) => { die.options.colorset = FateRolls.DICE_COLOR_BLACK; });
    await DiceDSA5.showDiceSoNice(newRerollDie, messageMode);

    let finalRoll = Roll.fromData(originalRoll.toJSON());
    let newResultFlatIndex = 0;
    const damageChangesHtml = [];

    newRerollDie.terms.forEach((term) => {
        term.results?.forEach((res) => {
            const map = diceMapping[newResultFlatIndex++];
            const faces = originalRoll.terms[map.termIdx].faces;
            damageChangesHtml.push(FateRolls.formatDieChange(map.originalResult, res.result, { char: 'damage', faces }).html);
            finalRoll.terms[map.termIdx].results[map.resIdx].result = res.result;
        });
    });

    finalRoll._total = finalRoll._evaluateTotal();
    finalRoll = await DiceDSA5.manualRolls(finalRoll, 'CHATCONTEXT.rerollDamage', { cheat: false });

    foundry.utils.setProperty(finalRoll, 'options.diceSoNice', false);
    const damageRoll = finalRoll.toJSON();
    damageRoll.options.diceSoNice = false;

    return {
        damageRoll,
        chatRollDetails: FateRolls.formatDieChangesHtml(damageChangesHtml),
    };
}

export async function executeDamageReroll(app, data, newTestData, isCheat, isMasterDamageReroll) {
    if (app.selectedForDamageReroll.size === 0) {
        ui.notifications.warn(_loc('DSAError.noDieSelected'));
        return null;
    }
    if (app.tabGroups.sheet === 'rerollDamage' && app.selectedForDamageReroll.size > 1) {
        ui.notifications.warn(_loc('DSAError.maxOneDie'));
        return null;
    }

    const origDamageData = data.postData.damageRoll || data.preData.damageRoll;
    const result = await processDamageReroll(app.selectedForDamageReroll, origDamageData, data.messageMode, isCheat);
    if (!result) return null;

    newTestData.damageRoll = result.damageRoll;

    return {
        chatActionLabel: _loc(isMasterDamageReroll ? 'GodsMenu.FateTab.MasterDarkness' : 'GodsMenu.FateTab.RerollDamage'),
        chatRollDetails: result.chatRollDetails,
        flagToUpdate: isMasterDamageReroll ? null : FateRolls.FLAGS.FATE_DAMAGE_REROLL,
    };
}

// Qualitätsstufe erhöhen

export async function executeAddQS(app, newTestData, cardOptions, avesDouble) {
    const qsToAdd = (avesDouble || (app.selectedPool === 'special' && DSA5GodsMenuConfig.isQsAndReroll(app.selectedSpecialKey, newTestData.source?.name || '')))
        ? 2
        : 1;

    DSA5_Utility.clearUserTargets();
    cardOptions.fatePointAddQSUsed = true;
    newTestData.qualityStep = qsToAdd;

    return {
        chatActionLabel: _loc('GodsMenu.FateTab.AddQS'),
        chatRollDetails: _loc('GodsMenu.FateTab.AddQSChatDetail', { qs: qsToAdd }),
        flagToUpdate: FateRolls.FLAGS.FATE_ADD_QS,
    };
}

// Fieser Schaden

export async function executeFieserSchaden(app, data, newTestData, isCheat) {
    const origDamageData = data.postData.damageRoll || data.preData.damageRoll;
    const originalRoll = DiceDSA5.fromRollData(origDamageData);
    if (!originalRoll?.terms) return null;

    const extraDie = await new Roll('1d6').evaluate();
    let extraDamage = extraDie.total;

    if (isCheat) {
        const cheatResults = await promptRerollCheat([{
            rollIndex: 0, original: 6, faces: 6, attr: 'damage', cssClass: 'fail', tooltip: '+1D6',
        }]);
        if (!cheatResults) {
            ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
            return null;
        }
        extraDamage = cheatResults[0];
    }

    const newTermsData = originalRoll.terms.map((t) => t.toJSON());
    const plusData = new foundry.dice.terms.OperatorTerm({ operator: '+' }).toJSON();
    plusData.evaluated = true;
    newTermsData.push(plusData);

    const extraTermData = extraDie.terms[0].toJSON();
    if (isCheat) extraTermData.results[0].result = extraDamage;
    newTermsData.push(extraTermData);

    const newRoll = Roll.fromData({
        formula: `${originalRoll.formula} + 1d6`,
        terms: newTermsData,
        evaluated: true,
        total: originalRoll.total + extraDamage,
    });

    newRoll.dice.forEach((die) => { die.options.colorset = FateRolls.DICE_COLOR_BLACK; });
    await DiceDSA5.showDiceSoNice(newRoll, data.messageMode);

    newTestData.damageRoll = newRoll.toJSON();

    return {
        chatActionLabel: _loc('GodsMenu.FateTab.MasterNastyDamage'),
        chatRollDetails: _loc('GodsMenu.FateTab.ExtraDamage', { damage: extraDamage }),
        flagToUpdate: 'fieserSchadenUsed',
    };
}

// Gescheiterter Angriff

export async function executeGescheitert(app, data, cardOptions) {
    const successLvl = data.postData.successLevel ?? data.postData.result?.successLevel ?? 0;
    const isCrit = (successLvl > 2) || data.postData.result?.critical;
    const cost = isCrit ? 3 : 2;
    const failureText = _loc('Failure');

    for (const target of [data.postData, data.postData.result].filter(Boolean)) {
        target.successLevel = -1;
        target.success = false;
        target.critical = false;
        target.description = failureText;
        target.characteristics?.forEach((c) => { c.success = false; });
    }
    data.postData.halfDefense = false;

    cardOptions.skipNativePostFunction = true;

    return {
        chatActionLabel: _loc('GodsMenu.FateTab.MasterFailedAttack'),
        chatRollDetails: _loc('GodsMenu.FateTab.MasterFailedDesc', { cost }),
        cost,
    };
}

// Modifikationen (Verbessern / Spezial Reroll)

export async function executeImprove(app, data, newTestData, isCheat, cardOptions) {
    let specialRollsText = [];
    const flagsToUpdate = [];

    if (app.selectedForSpecialReroll >= 0) {
        const isPhex = DSA5GodsMenuConfig.hasPhexTradition(app.dsaActor);
        const rerollData = await processReroll(
            [app.selectedForSpecialReroll],
            newTestData, data.postData, 'CHATCONTEXT.Reroll', true, app.dsaActor, isPhex, isCheat,
        );
        if (!rerollData) return null;
        specialRollsText = rerollData.changedRolls;
        flagsToUpdate.push(FateRolls.FLAGS.FATE_REROLL);
    } else if (app.tabGroups.sheet === 'improve' || app.selectedForImprove >= 0) {
        const multiDie = (data.postData.characteristics?.length ?? 0) > 1;
        const dieIndex = multiDie ? app.selectedForImprove : 0;
        if (multiDie && dieIndex < 0) {
            ui.notifications.warn(_loc('DSAError.noDieSelected'));
            return null;
        }
        FateRolls.applyImprovement(newTestData, dieIndex, FateRolls.IMPROVEMENT_VALUE, { multiDie });
        flagsToUpdate.push(FateRolls.FLAGS.FATE_IMPROVED);
    }

    newTestData.fateUsed = true;

    if (DSA5GodsMenuConfig.isQsAndReroll(app.selectedSpecialKey, newTestData.source?.name || '')) {
        cardOptions.fatePointAddQSUsed = true;
        newTestData.qualityStep = (newTestData.qualityStep || 0) + 2;
        flagsToUpdate.push(FateRolls.FLAGS.FATE_ADD_QS);
    }

    const chatActionLabel = app.tabGroups.sheet.startsWith('specialAction_')
        ? `${_loc('GodsMenu.FateTab.SpecialSchipAction')} [${DSA5GodsMenuConfig.schipName(app.selectedSpecialKey)}]`
        : _loc('GodsMenu.FateTab.Improve');

    return { chatActionLabel, flagsToUpdate, specialRollsText };
}

// Regeneration wiederholen (Meisterschip, zweites Ergebnis bindend)

export async function executeMasterRegen(app, data, isCheat, cardOptions) {
    const idx = app.selectedForMasterRegen;
    if (idx < 0) {
        ui.notifications.warn(_loc('DSAError.noDieSelected'));
        return null;
    }

    const tpl = document.createElement('template');
    tpl.innerHTML = app.message.content;
    const span = tpl.content.querySelectorAll('.roll-result span.d6')[idx];
    if (!span) return null;

    const oldVal = parseInt(span.textContent, 10);
    const attr = span.getAttribute('class')?.match(/die-(LeP|AsP|KaP)/)?.[1];
    const statCfg = REGEN_STAT_MAP[attr];
    if (!statCfg) return null;

    let reroll = await new Roll('1d6').evaluate();
    if (!isCheat) {
        reroll = await DiceDSA5.manualRolls(reroll, 'CHATCONTEXT.Reroll', { cheat: false });
    }
    let newVal = reroll.terms[0].results[0].result;

    if (isCheat) {
        const cheatResults = await promptRerollCheat([{
            rollIndex: 0,
            original: oldVal,
            faces: 6,
            attr,
            cssClass: 'fail',
            tooltip: span.getAttribute('data-tooltip') || _loc(statCfg.label),
        }]);
        if (!cheatResults) {
            ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
            return null;
        }
        newVal = cheatResults[0];
        reroll.terms[0].results[0].result = newVal;
        reroll._total = newVal;
    }

    await DiceDSA5._addRollDiceSoNice(
        data,
        reroll,
        game.dsa5.apps.DiceSoNiceCustomization.getAttributeConfiguration(statCfg.color),
    );

    const diff = newVal - oldVal;
    span.textContent = String(newVal);

    const updates = {};
    if (diff !== 0) {
        const catString = _loc(statCfg.label);
        const newStatVal = Math.max(0, (Number(data.postData[attr]) || 0) + diff);
        updates[`flags.data.postData.${attr}`] = newStatVal;

        const input = tpl.content.querySelector(`input.roll-edit[data-tooltip="${catString}"]`);
        if (input) {
            input.value = String(newStatVal);
            input.setAttribute('value', String(newStatVal));
        }
        tpl.content.querySelectorAll('.card-content').forEach((el) => {
            if (el.innerHTML.includes(`<b>${catString}</b>:`)) {
                el.innerHTML = `\n        <b>${catString}</b>: ${newStatVal}\n    `;
            }
        });
    }
    updates.content = tpl.innerHTML;

    await app.message.update(updates);
    cardOptions.skipNativePostFunction = true;

    const changeHtml = FateRolls.formatDieChange(oldVal, newVal, { char: attr, faces: 6 }).html;
    return {
        chatActionLabel: _loc('GodsMenu.FateTab.MasterRegen'),
        chatRollDetails: FateRolls.formatDieChangesHtml([changeHtml]),
        flagToUpdate: 'meisterRegenUsed',
    };
}

// Regenerations-Segen auf Probenaufforderung (Mada / Travia): Vorbereitung vor dem 2W6-Wurf

export async function prepareRegenBlessing(app, key) {
    const cfg = REGEN_BLESSING_CONFIG[key];
    if (!cfg) return null;

    if (app.message.flags?.dsa5?.rollRequest?.finalized) {
        ui.notifications.warn(_loc('GodsMenu.FateTab.GodsRegenDistributeFinalized'));
        return null;
    }
    if ((app.message.flags?.data?.fateSpecialUsed || []).includes(key)) {
        ui.notifications.warn(_loc('GodsMenu.FateTab.GodsRegenDistributeAlreadyUsed'));
        return null;
    }
    if (!game.user.isGM && !game.users.activeGM) {
        ui.notifications.error(_loc('GodsMenu.FateTab.GodsRegenDistributeNoGM'));
        return null;
    }

    const companions = getEligibleCompanions(app.dsaActor, app.message, key);
    if (!companions.length) {
        ui.notifications.warn(_loc('GodsMenu.FateTab.GodsRegenDistributeNoCompanions'));
        return null;
    }

    const allocations = await promptRegenDistribution({ key, cfg, companions });
    if (!allocations?.length) {
        ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
        return null;
    }
    return allocations;
}

// Regenerations-Segen auf Probenaufforderung (Mada / Travia): Anwendung nach dem 2W6-Wurf

export async function executeRegenBlessing(app, key, allocations, cardOptions) {
    const cfg = REGEN_BLESSING_CONFIG[key];
    const result = await applyRegenBlessing({
        key,
        casterId: app.dsaActor.id,
        messageId: app.message.id,
        allocations,
    });

    if (!result?.ok) {
        if (result?.reason === 'alreadyUsed') ui.notifications.warn(_loc('GodsMenu.FateTab.GodsRegenDistributeAlreadyUsed'));
        else if (result?.reason === 'finalized') ui.notifications.warn(_loc('GodsMenu.FateTab.GodsRegenDistributeFinalized'));
        else ui.notifications.error(_loc('GodsMenu.FateTab.GodsRegenDistributeNoGM'));
        return null;
    }

    cardOptions.skipNativePostFunction = true;

    return {
        chatActionLabel: `${DSA5GodsMenuConfig.schipName(key)}-Schip`,
        chatRollDetails: result.applied.map((a) => `<p><b>${a.name}</b>: +${a.amount} ${cfg.resource}</p>`).join(''),
    };
}

// Hilfsfunktionen (Schips abziehen)

export async function consumeSchip(actor, schipToConsume) {
    if (!schipToConsume) return;
    const amount = schipToConsume.amount || 1;

    switch (schipToConsume.pool) {
        case 'personal':
            for (let i = 0; i < amount; i++) {
                await FateRolls.reduceSchips(actor, FateRolls.SCHIP_SOURCES.PERSONAL, { tossCoin: false });
            }
            break;
        case 'group':
            for (let i = 0; i < amount; i++) {
                await FateRolls.reduceSchips(actor, FateRolls.SCHIP_SOURCES.GROUP, { tossCoin: false });
            }
            break;
        case 'special': {
            const path = `flags.dsa5.specialPoints.${schipToConsume.key}.current`;
            const currentVal = foundry.utils.getProperty(actor, path) || 0;
            await actor.update({ [path]: Math.max(0, currentVal - amount) });
            break;
        }
        case 'master': {
            const { current, max } = DSA5GodsMenuConfig.getSchipSetting('masterschips');
            await DSA5GodsMenuConfig.setSchipSetting('masterschips', current - amount, max);
            break;
        }
    }
}
