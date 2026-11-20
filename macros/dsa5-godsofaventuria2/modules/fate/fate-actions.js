import { DSA5_Utility, DiceDSA5, FateRolls } from './dsa5-api.js';
import { DSA5GodsMenuConfig } from './config.js';
import { promptRerollCheat } from './fate-dialogs.js';

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
            const faces = term?.faces || 20;
            const original = charData.res || term?.results?.[0]?.result || 1;
            const attr = charData.char || 'd20';
            const cssClass = charData.suc ? 'suc' : (charData.suc === false ? 'fail' : '');

            let tooltip = '';
            if (charData.tar) {
                const locChar = _loc(`CHARAbbrev.${attr.toUpperCase()}`);
                tooltip = `${locChar} vs ${charData.tar}`;
            }

            return { rollIndex, original, faces, attr, cssClass, tooltip };
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
        ui.notifications.warn(_loc("DSAError.noDieSelected"));
        return null;
    }

    const isPhex = app.dsaActor.items.some(item => item.type === 'specialability' && item.name === _loc('LocalizedIDs.traditionPhex'));

    const rerollData = await processReroll(
        Array.from(app.selectedForReroll).sort((a, b) => a - b),
        newTestData, data.postData, 'CHATCONTEXT.Reroll', false, app.dsaActor, isPhex, isCheat
    );

    if (!rerollData) return null;

    if (data.postData && data.postData.characteristics) {
        rerollData.changes.forEach(c => {
            const charObj = data.postData.characteristics[c.index];
            if (charObj) {
                charObj.res = c.val;
                if (charObj.tar !== undefined) {
                    charObj.suc = c.val <= charObj.tar;
                }
            }
        });
    }
    newTestData.fateUsed = true;

    const chatActionLabel = isMasterReroll ? _loc("GodsMenu.FateTab.MasterFate") : _loc("GodsMenu.FateTab.Reroll");
    const chatRollDetails = FateRolls.formatDieChangesHtml(rerollData.changedRolls);

    const flagToUpdate = isMasterReroll ? 'meisterSchicksalUsed' : FateRolls.FLAGS.FATE_REROLL;

    return { chatActionLabel, chatRollDetails, flagToUpdate };
}

// Schadenswurf wiederholen

export async function executeDamageReroll(app, data, newTestData, isCheat, isMasterDamageReroll) {
    if (app.selectedForDamageReroll.size === 0) {
        ui.notifications.warn(_loc("DSAError.noDieSelected"));
        return null;
    }
    if (app.tabGroups.sheet === 'rerollDamage' && app.selectedForDamageReroll.size > 1) {
        ui.notifications.warn(_loc("DSAError.maxOneDie"));
        return null;
    }

    const origDamageData = data.postData.damageRoll || data.preData.damageRoll;
    const originalRoll = DiceDSA5.fromRollData(origDamageData);
    if (!originalRoll?.terms) return null;

    const selectedIndices = Array.from(app.selectedForDamageReroll).sort((a, b) => a - b);
    const rerollFormulas = [];
    const diceMapping = [];

    let globalIndex = 0;
    for (let termIdx = 0; termIdx < originalRoll.terms.length; termIdx++) {
        const term = originalRoll.terms[termIdx];
        if (term.results) {
            for (let resIdx = 0; resIdx < term.results.length; resIdx++) {
                if (selectedIndices.includes(globalIndex)) {
                    rerollFormulas.push(`1d${term.faces}`);
                    diceMapping.push({ termIdx, resIdx, originalResult: term.results[resIdx].result });
                }
                globalIndex++;
            }
        }
    }

    let newRerollDie = await new Roll(rerollFormulas.join(' + ')).evaluate();
    newRerollDie = await DiceDSA5.manualRolls(newRerollDie, 'CHATCONTEXT.rerollDamage', { cheat: false });

    if (isCheat) {
        const diceData = diceMapping.map((mapping, idx) => ({
            rollIndex: idx, original: mapping.originalResult, faces: originalRoll.terms[mapping.termIdx].faces, attr: 'damage', cssClass: 'fail', tooltip: _loc('Trefferpunkte')
        }));
        const cheatResults = await promptRerollCheat(diceData);
        if (!cheatResults) {
            ui.notifications.warn(_loc("GodsMenu.FateTab.ActionCancelled"));
            return null;
        }
        let cheatIdx = 0;
        newRerollDie.terms.forEach(term => {
            if (term.results) term.results.forEach(res => { res.result = cheatResults[cheatIdx++]; });
        });
        if (typeof newRerollDie._evaluateTotal === 'function') newRerollDie._total = newRerollDie._evaluateTotal();
    }

    newRerollDie.dice.forEach(die => die.options.colorset = FateRolls.DICE_COLOR_BLACK);
    await DiceDSA5.showDiceSoNice(newRerollDie, data.messageMode);

    let finalRoll = Roll.fromData(originalRoll.toJSON());
    let newResultFlatIndex = 0;
    let damageChangesHtml = [];

    newRerollDie.terms.forEach(term => {
        if (term.results) {
            term.results.forEach(res => {
                let map = diceMapping[newResultFlatIndex];
                let oldVal = map.originalResult;
                let newVal = res.result;
                let faces = originalRoll.terms[map.termIdx].faces;

                const formatted = FateRolls.formatDieChange(oldVal, newVal, { char: 'damage', faces: faces });
                damageChangesHtml.push(formatted.html);

                finalRoll.terms[map.termIdx].results[map.resIdx].result = newVal;
                newResultFlatIndex++;
            });
        }
    });

    if (typeof finalRoll._evaluateTotal === 'function') finalRoll._total = finalRoll._evaluateTotal();
    finalRoll = await DiceDSA5.manualRolls(finalRoll, 'CHATCONTEXT.rerollDamage', { cheat: false });

    foundry.utils.setProperty(finalRoll, "options.diceSoNice", false);

    newTestData.damageRoll = finalRoll.toJSON();
    newTestData.damageRoll.options = newTestData.damageRoll.options || {};
    newTestData.damageRoll.options.diceSoNice = false;

    const chatActionLabel = isMasterDamageReroll ? _loc("GodsMenu.FateTab.MasterDarkness") : _loc("GodsMenu.FateTab.RerollDamage");
    const chatRollDetails = FateRolls.formatDieChangesHtml(damageChangesHtml);

    const flagToUpdate = isMasterDamageReroll ? null : FateRolls.FLAGS.FATE_DAMAGE_REROLL;
    return { chatActionLabel, chatRollDetails, flagToUpdate };
}

// Qualitätsstufe erhöhen

export async function executeAddQS(app, newTestData, cardOptions, avesDouble) {
    let qsToAdd = 1;
    if (avesDouble) {
        qsToAdd = 2;
    } else if (app.selectedPool === 'special' && DSA5GodsMenuConfig.isQsAndReroll(app.selectedSpecialKey, newTestData.source?.name || '')) {
        qsToAdd = 2;
    }

    DSA5_Utility.clearUserTargets();
    cardOptions.fatePointAddQSUsed = true;
    newTestData.qualityStep = qsToAdd;

    const chatActionLabel = _loc("GodsMenu.FateTab.AddQS");
    const chatRollDetails = _loc("GodsMenu.FateTab.AddQSChatDetail", { qs: qsToAdd });

    return { chatActionLabel, chatRollDetails, flagToUpdate: FateRolls.FLAGS.FATE_ADD_QS };
}

// Fieser Schaden

export async function executeFieserSchaden(app, data, newTestData, isCheat) {
    const origDamageData = data.postData.damageRoll || data.preData.damageRoll;
    const originalRoll = DiceDSA5.fromRollData(origDamageData);
    if (!originalRoll?.terms) return null;

    let extraDie = await new Roll("1d6").evaluate();
    let extraDamage = extraDie.total;

    if (isCheat) {
        const cheatResults = await promptRerollCheat([{
            rollIndex: 0, original: 6, faces: 6, attr: 'damage', cssClass: 'fail', tooltip: '+1D6'
        }]);
        if (!cheatResults) {
            ui.notifications.warn(_loc("GodsMenu.FateTab.ActionCancelled"));
            return null;
        }
        extraDamage = cheatResults[0];
    }

    const newFormula = `${originalRoll.formula} + 1d6`;
    const newTermsData = originalRoll.terms.map(t => t.toJSON());

    const plusData = new foundry.dice.terms.OperatorTerm({ operator: "+" }).toJSON();
    plusData.evaluated = true;
    newTermsData.push(plusData);

    const extraTermData = extraDie.terms[0].toJSON();
    if (isCheat) extraTermData.results[0].result = extraDamage;
    newTermsData.push(extraTermData);

    let newRoll = Roll.fromData({
        formula: newFormula,
        terms: newTermsData,
        evaluated: true,
        total: originalRoll.total + extraDamage
    });

    newRoll.dice.forEach(die => die.options.colorset = FateRolls.DICE_COLOR_BLACK);
    await DiceDSA5.showDiceSoNice(newRoll, data.messageMode);

    newTestData.damageRoll = newRoll.toJSON();

    const chatActionLabel = _loc("GodsMenu.FateTab.MasterNastyDamage");
    const chatRollDetails = _loc("GodsMenu.FateTab.ExtraDamage", { damage: extraDamage });

    return { chatActionLabel, chatRollDetails, flagToUpdate: 'fieserSchadenUsed' };
}

// Gescheiterter Angriff

export async function executeGescheitert(app, data, cardOptions) {
    const successLvl = data.postData?.successLevel ?? data.postData?.result?.successLevel ?? 0;
    const isCrit = (successLvl > 2) || data.postData?.result?.critical;
    const cost = isCrit ? 3 : 2;
    const failureText = _loc("Failure");

    data.postData.successLevel = -1;
    data.postData.success = false;
    data.postData.description = failureText;
    data.postData.critical = false;
    data.postData.halfDefense = false;
    if (data.postData.result) {
        data.postData.result.successLevel = -1;
        data.postData.result.success = false;
        data.postData.result.critical = false;
        data.postData.result.description = failureText;
    }
    if (data.postData.characteristics) data.postData.characteristics.forEach(c => c.success = false);
    if (data.postData.result?.characteristics) data.postData.result.characteristics.forEach(c => c.success = false);

    const chatActionLabel = _loc("GodsMenu.FateTab.MasterFailedAttack");
    const chatRollDetails = _loc("GodsMenu.FateTab.MasterFailedDesc", { cost: cost });

    cardOptions.skipNativePostFunction = true;

    return { chatActionLabel, chatRollDetails, cost };
}

// Modifikationen (Verbessern / Spezial Reroll)

export async function executeImprove(app, data, newTestData, isCheat, cardOptions) {
    let specialRollsText = [];
    let flagsToUpdate = [];

    // Götter und Erzdämonen Reroll
    if (app.selectedForSpecialReroll >= 0) {
        const isPhex = app.dsaActor.items.some(item => item.type === 'specialability' && item.name === _loc('LocalizedIDs.traditionPhex'));

        const rerollData = await processReroll(
            [app.selectedForSpecialReroll],
            newTestData, data.postData, 'CHATCONTEXT.Reroll', true, app.dsaActor, isPhex, isCheat
        );

        if (!rerollData) return null;
        specialRollsText = rerollData.changedRolls;
        flagsToUpdate.push(FateRolls.FLAGS.FATE_REROLL);
    }
    // Basis "Ergebnis verbessern"
    else if (app.tabGroups.sheet === 'improve' || app.selectedForImprove >= 0) {
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
    if (idx === undefined || idx < 0) {
        ui.notifications.warn(_loc('DSAError.noDieSelected'));
        return null;
    }

    const tpl = document.createElement('template');
    tpl.innerHTML = app.message.content || '';
    const span = tpl.content.querySelectorAll('.roll-result span.d6')[idx];
    if (!span) return null;

    const oldVal = parseInt(span.textContent, 10) || 0;
    const rawClass = span.getAttribute('class') || '';
    const attr = rawClass.match(/die-(LeP|AsP|KaP)/)?.[1] || 'LeP';
    const statCfg = REGEN_STAT_MAP[attr];

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

    const finalValue = newVal;
    const diff = finalValue - oldVal;
    span.textContent = String(finalValue);

    const updates = {};
    if (diff !== 0) {
        const catString = _loc(statCfg.label);
        const newStatVal = Math.max(0, (Number(data.postData?.[attr]) || 0) + diff);
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

    const changeHtml = FateRolls.formatDieChange(oldVal, finalValue, { char: attr, faces: 6 }).html;
    return {
        chatActionLabel: _loc('GodsMenu.FateTab.MasterRegen'),
        chatRollDetails: FateRolls.formatDieChangesHtml([changeHtml]),
        flagToUpdate: 'meisterRegenUsed',
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
            if (!schipToConsume.key) break;
            const path = `flags.dsa5.specialPoints.${schipToConsume.key}.current`;
            const currentVal = foundry.utils.getProperty(actor, path) || 0;
            await actor.update({ [path]: Math.max(0, currentVal - amount) });
            break;
        }
        case 'master': {
            const raw = game.settings.get('dsa5', 'masterschips') || '0/0';
            const [cur, max] = raw.split('/').map(Number);
            await game.settings.set('dsa5', 'masterschips', `${Math.max(0, cur - amount)}/${max}`);
            break;
        }
    }
}
