import { DSA5GodsMenuConfig } from './config.js';
import { promptSchipSwap, promptManualConditions, promptAvesCheat, promptSpecialRollCheat } from './fate-dialogs.js';
import { getDemonConditionRemovals, applyDemonConditionRemovals, applyDemonSchipRegen } from './fate-effects.js';
import { executeReroll, executeDamageReroll, executeAddQS, executeFieserSchaden, executeGescheitert, executeImprove, executeMasterRegen, consumeSchip, processReroll } from './fate-actions.js';
import { DSA5_Utility, DiceDSA5, FateRolls, UnifiedFateDSA5 } from './dsa5-api.js';
import { buildUnifiedFateContext, STANDARD_FATE_TABS, STANDARD_ONLY_SPECIAL_KEYS } from './fate-context.js';
import './fate-chat-menu.js';

const { renderTemplate } = foundry.applications.handlebars;

export default class GodsFateDSA5 extends UnifiedFateDSA5 {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
        foundry.utils.deepClone(UnifiedFateDSA5.DEFAULT_OPTIONS),
        {
            actions: {
                toggleMasterRegenDie: function (e, t) { this._onToggleMasterRegenDie(e, t); },
            },
        },
    );

    static PARTS = {
        main: {
            template: 'modules/dsa5-godsofaventuria2/templates/fate/unified-fate-dialog.hbs',
            templates: ['systems/dsa5/templates/system/dsatabs.hbs'],
        },
    };

    static {
        Hooks.on('dsa5.getFateSpendApp', (registry) => {
            registry.AppClass = this;
        });
    }

    async _buildFateContext(baseContext) {
        return buildUnifiedFateContext(this, baseContext);
    }

    _canSelectPool(pool, key) {
        if (pool === 'special') return !!key;
        return ['personal', 'group', 'master'].includes(pool);
    }

    _onSchipButtonClick(target) {
        if (target.dataset.pool === 'special' && target.classList.contains('emptySchip')) {
            return ui.notifications.warn(_loc('DSAError.schipEmpty'));
        }
        return super._onSchipButtonClick(target);
    }

    _onToggleSpecialDie(event, target) {
        const idx = parseInt(target.closest('[data-index]').dataset.index);
        this.selectedForSpecialReroll = this.selectedForSpecialReroll === idx ? -1 : idx;
        this.render();
    }

    _onToggleMasterRegenDie(event, target) {
        const idx = parseInt(target?.closest('[data-index]')?.dataset?.index, 10);
        if (Number.isNaN(idx)) return;
        this.selectedForMasterRegen = this.selectedForMasterRegen === idx ? -1 : idx;
        this.render();
    }

    _validateDieSelection() {
        const tab = this.tabGroups.sheet || '';
        if (tab === 'noOption' || tab === 'masterPlaceholder') {
            ui.notifications.warn(_loc('GodsMenu.FateTab.NoOptionNotify'));
            return false;
        }
        if (tab.startsWith('specialAction_')) return true;
        if (tab === 'meisterschicksal') {
            if (this.selectedForReroll.size === 0) return this._warnNoDieSelected();
            return true;
        }
        if (tab === 'beistand') {
            if (this.selectedForDamageReroll.size === 0) return this._warnNoDieSelected();
            return true;
        }
        if (tab === 'meisterRegen') {
            if ((this.selectedForMasterRegen ?? -1) < 0) return this._warnNoDieSelected();
            return true;
        }
        return super._validateDieSelection();
    }

    _validateSelectedPool() {
        if (this.selectedPool === 'personal' || this.selectedPool === 'group') {
            return super._validateSelectedPool();
        }
        switch (this.selectedPool) {
            case 'special': {
                if (!this.selectedSpecialKey) {
                    ui.notifications.error(_loc('DSAError.noSpecialSchipSelected'));
                    return false;
                }
                const currentVal = foundry.utils.getProperty(this.dsaActor, `flags.dsa5.specialPoints.${this.selectedSpecialKey}.current`) || 0;
                if (currentVal <= 0) {
                    ui.notifications.error(_loc('DSAError.specialSchipEmpty'));
                    return false;
                }
                return !this.#blockedFromGodSchips();
            }
            case 'master':
                return true;
            default:
                return super._validateSelectedPool();
        }
    }

    async _onConfirm(event, target, isCheat = false) {
        event?.preventDefault?.();
        if (this.tabGroups.sheet.startsWith('specialAction_')) {
            this.selectedPool = 'special';
            this.selectedSpecialKey = this.tabGroups.sheet.replace('specialAction_', '');
        }
        if (this.selectedPool === 'special' || this.selectedPool === 'master') {
            return this.#onGodsConfirm(event, target, isCheat);
        }
        return super._onConfirm(event, target, isCheat);
    }

    async #buildChatContent(actionLabel, rollDetails = '', specialRollHtml = '', finalSchipPool = null, finalSchipKey = null, isConsumed = true, consumedAmount = 1, { blocked = false } = {}) {
        let max = 0;
        let available = 0;
        let tooltip = '';
        let iconPath = '';

        const displayPool = finalSchipPool || this.selectedPool;
        const displayKey = finalSchipKey || this.selectedSpecialKey;
        const consumedMod = isConsumed ? consumedAmount : 0;

        let actorName = this.dsaActor.name;
        let actionText = blocked ? _loc('GodsMenu.FateTab.usageBlocked') : _loc('GodsMenu.usesPointFor');
        const headingKey = blocked ? 'GodsMenu.FateTab.UsageBlockedTitle' : 'CHATFATE.fatepointUsed';

        switch (displayPool) {
            case 'personal':
                max = this.dsaActor.system.status.fatePoints.current || this.dsaActor.system.status.fatePoints.max || 0;
                available = Math.max(0, (this.dsaActor.system.status.fatePoints.value || 0) - consumedMod);
                tooltip = _loc('CHATFATE.PointsRemaining');
                break;
            case 'group': {
                const raw = game.settings.get('dsa5', 'groupschips') || '0/0';
                const [cur, m] = raw.split('/').map(Number);
                max = m || cur || 0;
                available = Math.max(0, cur - consumedMod);
                tooltip = _loc('CHATFATE.GroupPointsRemaining');
                break;
            }
            case 'special':
                if (displayKey) {
                    const sData = foundry.utils.getProperty(this.dsaActor, `flags.dsa5.specialPoints.${displayKey}`);
                    max = sData?.value || 0;
                    available = Math.max(0, (sData?.current || 0) - consumedMod);
                    iconPath = DSA5GodsMenuConfig.chipIcon(displayKey);
                    tooltip = _loc('GodsMenu.FateTab.SpecialPointsRemaining', { name: DSA5GodsMenuConfig.schipName(displayKey) });
                }
                break;
            case 'master': {
                const raw = game.settings.get('dsa5', 'masterschips') || '0/0';
                const [cur, m] = raw.split('/').map(Number);
                max = m || cur || 0;
                available = Math.max(0, cur - consumedMod);
                tooltip = _loc('GodsMenu.FateTab.MasterPointsRemaining');
                actorName = game.i18n.has('Gamemaster') ? _loc('Gamemaster') : 'Der Spielleiter';
                if (!blocked) actionText = _loc('GodsMenu.FateTab.MasterUsesPointFor');
                break;
            }
        }

        const schips = [];
        for (let i = 0; i < max; i++) {
            const isFull = i < available;
            let cssClass = isFull ? 'fullSchip' : 'emptySchip';
            let style = '';

            switch (displayPool) {
                case 'special':
                    cssClass += ' gods-schip custom-special-schips';
                    if (iconPath) {
                        style = `background-image: url('${iconPath}');`;
                        if (!isFull) style += ' filter: grayscale(100%) opacity(0.4);';
                    }
                    break;
                case 'master': {
                    cssClass += ' master-schip-bg';
                    const mPath = isFull ? 'systems/dsa5/icons/meisterschip.webp' : 'systems/dsa5/icons/gray_meisterschip.webp';
                    style = `background-image: url('${mPath}');`;
                    break;
                }
            }
            schips.push({ cssClass, style });
        }

        return renderTemplate('modules/dsa5-godsofaventuria2/templates/fate/chat-action-card.hbs', {
            headingKey,
            actorName,
            actionText,
            actionLabel,
            tooltip,
            schips,
            specialRollHtml,
            rollDetails,
        });
    }

    #attemptedActionLabel() {
        const tab = this.tabGroups.sheet;
        if (tab.startsWith('specialAction_')) {
            const key = tab.replace('specialAction_', '');
            return `${_loc('GodsMenu.FateTab.SpecialSchipAction')} [${DSA5GodsMenuConfig.schipName(key)}]`;
        }
        const labels = {
            reroll: 'GodsMenu.FateTab.Reroll',
            rerollDamage: 'GodsMenu.FateTab.RerollDamage',
            improve: 'GodsMenu.FateTab.Improve',
            addQS: 'GodsMenu.FateTab.AddQS',
            meisterschicksal: 'GodsMenu.FateTab.MasterFate',
            meisterRegen: 'GodsMenu.FateTab.MasterRegen',
            beistand: 'GodsMenu.FateTab.MasterDarkness',
            fieser: 'GodsMenu.FateTab.MasterNastyDamage',
            gescheitert: 'GodsMenu.FateTab.MasterFailedAttack',
        };
        return labels[tab] ? _loc(labels[tab]) : (this.element?.querySelector(`.sheet-tabs .item[data-tab="${tab}"]`)?.textContent?.trim() || tab);
    }

    #blockedFromGodSchips() {
        const key = this.selectedSpecialKey;
        if (!DSA5GodsMenuConfig.isGod(key) || key === 'Namenloser') return false;

        const hasDemonMark = this.dsaActor.items.some((i) => i.type === 'demonmark');
        const hasNamelessTradition = this.dsaActor.items.some((i) => i.name === _loc('LocalizedIDs.traditionNameless'));
        if (!hasDemonMark && !hasNamelessTradition) return false;

        const locKey = hasDemonMark ? 'DSAError.demonPactNoGodSchips' : 'DSAError.namelessCultistNoGodSchips';
        ui.notifications.error(_loc(locKey, { name: this.dsaActor.name }));
        return true;
    }

    #syncStandardOnlySchipGlow() {
        const isStandard = STANDARD_FATE_TABS.has(this.tabGroups?.sheet);
        const rollName = this.message?.flags?.data?.preData?.source?.name || '';

        for (const key of STANDARD_ONLY_SPECIAL_KEYS) {
            const isRelevant = isStandard && (
                DSA5GodsMenuConfig.isQsAndReroll(key, rollName)
                || DSA5GodsMenuConfig.isExtraReroll(key, rollName)
            );
            this.element?.querySelectorAll(`.special-schip[data-key="${key}"].fullSchip`).forEach((btn) => {
                btn.classList.toggle('special-schip-relevant', isRelevant);
            });
        }
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        this.#syncStandardOnlySchipGlow();
    }

    _onClickTab(event) {
        super._onClickTab(event);
        this.selectedForMasterRegen = -1;
        this.#syncStandardOnlySchipGlow();
    }

    async #resolveSpecialSymbolOutcome(d1, d2, isGod) {
        const godSymbol = d1 === 6;
        const khaSymbol = d2 === 6;
        switch (`${Number(godSymbol)}${Number(khaSymbol)}`) {
            case '11':
                return {
                    executeEffect: true,
                    schipToConsume: null,
                    resultColor: 'darkgreen',
                    resultTitle: _loc('GodsMenu.FateTab.SpecialRollSuccessTitle'),
                    resultDesc: _loc('GodsMenu.FateTab.SpecialRollSuccessDesc'),
                    resultTooltip: 'GodsMenu.SchipRules.Dice2',
                };
            case '10':
                if (this.selectedSpecialKey === 'Phex' && STANDARD_FATE_TABS.has(this.tabGroups?.sheet)) {
                    return {
                        executeEffect: true,
                        schipToConsume: null,
                        resultColor: 'darkgreen',
                        resultTitle: _loc('GodsMenu.FateTab.PhexRefundTitle'),
                        resultDesc: _loc('GodsMenu.FateTab.PhexRefundDesc'),
                        resultTooltip: 'GodsMenu.FateTab.PhexRefundDesc',
                    };
                }
                {
                    const schipToConsume = await promptSchipSwap(this.dsaActor, this.selectedSpecialKey, isGod);
                    if (schipToConsume === null) return null;
                    return {
                        executeEffect: true,
                        schipToConsume,
                        resultColor: 'darkblue',
                        resultTitle: _loc('GodsMenu.FateTab.SpecialRollFlexibleTitle'),
                        resultDesc: _loc('GodsMenu.FateTab.SpecialRollFlexibleDesc'),
                        resultTooltip: 'GodsMenu.SchipRules.Dice3',
                    };
                }
            case '01':
                return {
                    executeEffect: false,
                    schipToConsume: null,
                    resultColor: 'darkred',
                    resultTitle: _loc('GodsMenu.FateTab.SpecialRollBlockedTitle'),
                    resultDesc: _loc('GodsMenu.FateTab.SpecialRollBlockedDesc', {
                        blocker: _loc(isGod ? 'GodsMenu.KhaSymbol' : 'GodsMenu.StarWallSymbol'),
                        actorSymbol: _loc(isGod ? 'GodsMenu.GodSymbol' : 'GodsMenu.DemonSymbol'),
                    }),
                    resultTooltip: 'GodsMenu.SchipRules.Dice4',
                };
            default:
                return {
                    executeEffect: true,
                    schipToConsume: { pool: this.selectedPool, key: this.selectedSpecialKey },
                    resultColor: 'black',
                    resultTitle: _loc('GodsMenu.FateTab.SpecialRollNormalTitle'),
                    resultDesc: _loc('GodsMenu.FateTab.SpecialRollNormalDesc'),
                    resultTooltip: 'GodsMenu.SchipRules.Dice5',
                };
        }
    }

    async _executeGodsSheetAction({ data, newTestData, cardOptions, isCheat, avesDouble, schipToConsume }) {
        const sheet = this.tabGroups.sheet || '';
        if (sheet === 'noOption' || sheet === 'masterPlaceholder') return null;
        const tab = sheet.startsWith('specialAction_') ? 'specialAction' : sheet;
        const flagToUpdate = [];
        let chatActionLabel = '';
        let chatRollDetails = '';
        let specialRollsText = [];

        switch (tab) {
            case 'reroll':
            case 'meisterschicksal': {
                const isMasterReroll = tab === 'meisterschicksal';
                const result = await executeReroll(this, data, newTestData, isCheat, isMasterReroll);
                if (!result) return null;
                chatActionLabel = result.chatActionLabel;
                chatRollDetails = result.chatRollDetails;
                flagToUpdate.push(result.flagToUpdate);
                if (isMasterReroll) schipToConsume = { pool: 'master' };
                break;
            }
            case 'rerollDamage':
            case 'beistand': {
                const isMasterDamageReroll = tab === 'beistand';
                const result = await executeDamageReroll(this, data, newTestData, isCheat, isMasterDamageReroll);
                if (!result) return null;
                chatActionLabel = result.chatActionLabel;
                chatRollDetails = result.chatRollDetails;
                if (result.flagToUpdate) flagToUpdate.push(result.flagToUpdate);
                if (isMasterDamageReroll) schipToConsume = { pool: 'master' };
                break;
            }
            case 'addQS': {
                const result = await executeAddQS(this, newTestData, cardOptions, avesDouble);
                chatActionLabel = result.chatActionLabel;
                chatRollDetails = result.chatRollDetails;
                flagToUpdate.push(result.flagToUpdate);
                break;
            }
            case 'fieser': {
                const result = await executeFieserSchaden(this, data, newTestData, isCheat);
                if (!result) return null;
                chatActionLabel = result.chatActionLabel;
                chatRollDetails = result.chatRollDetails;
                flagToUpdate.push(result.flagToUpdate);
                schipToConsume = { pool: 'master' };
                break;
            }
            case 'gescheitert': {
                const result = await executeGescheitert(this, data, cardOptions);
                chatActionLabel = result.chatActionLabel;
                chatRollDetails = result.chatRollDetails;
                schipToConsume = { pool: 'master', amount: result.cost };
                break;
            }
            case 'meisterRegen': {
                const result = await executeMasterRegen(this, data, isCheat, cardOptions);
                if (!result) return null;
                chatActionLabel = result.chatActionLabel;
                chatRollDetails = result.chatRollDetails;
                flagToUpdate.push(result.flagToUpdate);
                schipToConsume = { pool: 'master' };
                break;
            }
            case 'improve':
            case 'specialAction': {
                const result = await executeImprove(this, data, newTestData, isCheat, cardOptions);
                if (!result) return null;
                chatActionLabel = result.chatActionLabel;
                flagToUpdate.push(...result.flagsToUpdate);
                specialRollsText = result.specialRollsText;
                break;
            }
            default: {
                const customRes = await this._executeSheetAction({ data, newTestData, cardOptions, isCheat });
                if (!customRes) return null;
                chatActionLabel = customRes.chatActionLabel || _loc(`CHATFATE.${customRes.chatType}`);
                chatRollDetails = customRes.chatRollDetails || '';
                if (customRes.flagToUpdate) flagToUpdate.push(...customRes.flagToUpdate);
                if (schipToConsume && customRes.cost > 1) schipToConsume.amount = customRes.cost;
                break;
            }
        }

        return { chatActionLabel, chatRollDetails, flagToUpdate, specialRollsText, schipToConsume };
    }

    async #onGodsConfirm(event, target, isCheat = false) {
        const data = this.message.flags.data;
        const newTestData = data.preData;

        if (!this._validateSelectedPool()) return;
        if (!this._validateDieSelection()) return;

        let executeEffect = true;
        let schipToConsume = { pool: this.selectedPool, key: this.selectedSpecialKey };
        let specialRollHtml = '';
        const conditionsToRemove = [];
        const manualRemovals = [];
        let manualReductions = {};

        const isSpecialAction = this.tabGroups.sheet.startsWith('specialAction_');
        const coinRoll = await FateRolls.throwCoin();

        if (this.selectedPool === 'special') {
            const isGod = DSA5GodsMenuConfig.isGod(this.selectedSpecialKey);
            const d1Icon = DSA5GodsMenuConfig.diceIcon(this.selectedSpecialKey);
            const d2Icon = DSA5GodsMenuConfig.diceIcon(null, isGod ? 'Kha.webp' : 'Sternenwall.webp');

            const roll = await new Roll('1d6 + 1d6').evaluate();
            let d1;
            let d2;

            if (isCheat) {
                const cheatResult = await promptSpecialRollCheat(
                    _loc('GodsMenu.FateTab.SpecialRollTitle'),
                    d1Icon,
                    _loc(isGod ? 'GodsMenu.FateTab.GodDie' : 'GodsMenu.FateTab.DemonDie'),
                    d2Icon,
                    _loc(isGod ? 'GodsMenu.FateTab.KhaDie' : 'GodsMenu.FateTab.StarwallDie'),
                );
                if (cheatResult === null) {
                    ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
                    return this.close();
                }
                d1 = cheatResult.d1;
                d2 = cheatResult.d2;
                roll.terms[0].results[0].result = d1;
                roll.terms[2].results[0].result = d2;
                roll._total = d1 + d2;
            } else {
                d1 = roll.terms[0].results[0].result;
                d2 = roll.terms[2].results[0].result;
            }

            await DiceDSA5.showDiceSoNice(roll, game.settings.get('core', 'messageMode'));

            if (!isGod) await applyDemonSchipRegen(this.dsaActor);

            const outcome = await this.#resolveSpecialSymbolOutcome(d1, d2, isGod);
            if (outcome === null) {
                ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
                return;
            }

            executeEffect = outcome.executeEffect;
            schipToConsume = outcome.schipToConsume;

            const die1Tooltip = _loc(isGod ? 'GodsMenu.GodSymbol' : 'GodsMenu.DemonSymbol');
            const die2Tooltip = _loc(isGod ? 'GodsMenu.KhaSymbol' : 'GodsMenu.StarWallSymbol');
            const causeIcons = [];
            if (d1 === 6) causeIcons.push({ img: d1Icon, tooltip: die1Tooltip });
            if (d2 === 6) causeIcons.push({ img: d2Icon, tooltip: die2Tooltip });

            specialRollHtml = await renderTemplate('modules/dsa5-godsofaventuria2/templates/fate/special-roll-result.hbs', {
                die1Img: d1 === 6 ? d1Icon : null,
                die2Img: d2 === 6 ? d2Icon : null,
                d1Val: d1,
                d2Val: d2,
                die1Tooltip,
                die2Tooltip,
                die1Label: _loc(isGod ? 'GodsMenu.FateTab.GodDie' : 'GodsMenu.FateTab.DemonDie'),
                die2Label: _loc(isGod ? 'GodsMenu.FateTab.KhaDie' : 'GodsMenu.FateTab.StarwallDie'),
                causeIcons,
                resultTitle: outcome.resultTitle,
                resultDesc: outcome.resultDesc,
                resultTooltip: outcome.resultTooltip,
                resultColor: outcome.resultColor,
            });

            if (executeEffect && this.selectedSpecialKey && isSpecialAction) {
                const removals = getDemonConditionRemovals(this.selectedSpecialKey);
                conditionsToRemove.push(...removals.autoConditions);
                manualRemovals.push(...removals.manualRemovals);
            }
        }

        let avesCoinHtml = '';
        let avesDouble = false;
        if (
            executeEffect
            && this.selectedPool === 'special'
            && this.selectedSpecialKey === 'Aves'
            && STANDARD_FATE_TABS.has(this.tabGroups?.sheet)
        ) {
            if (isCheat) {
                const cheatResult = await promptAvesCheat();
                if (cheatResult === null) {
                    ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
                    return;
                }
                coinRoll.terms[0].results[0].result = cheatResult;
                coinRoll._total = cheatResult;
            }

            avesDouble = coinRoll.total === 1;
            avesCoinHtml = await renderTemplate('modules/dsa5-godsofaventuria2/templates/fate/aves-coin-result.hbs', {
                actorName: this.dsaActor.name,
                avesImg: DSA5GodsMenuConfig.chipIcon('Aves'),
                isSuccess: avesDouble,
                resultTitle: _loc(avesDouble ? 'GodsMenu.FateTab.AvesHeadTitle' : 'GodsMenu.FateTab.AvesTailTitle'),
                resultDesc: _loc(avesDouble ? 'GodsMenu.FateTab.AvesHeadDesc' : 'GodsMenu.FateTab.AvesTailDesc'),
            });
        }

        if (executeEffect && isSpecialAction && manualRemovals.includes('3 beliebige Zustandsstufen')) {
            const availableConditions = [];
            for (const effect of this.dsaActor.effects) {
                const statusId = Array.from(effect.statuses)[0];
                if (statusId && !conditionsToRemove.includes(statusId)) {
                    const val = effect.system?.condition?.value || effect.getFlag('dsa5', 'value') || 1;
                    availableConditions.push({ id: statusId, name: effect.name, value: val, img: effect.img || effect.icon });
                }
            }

            if (availableConditions.length > 0) {
                const result = await promptManualConditions(this.dsaActor, availableConditions);
                if (result === null) {
                    ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
                    return;
                }
                manualReductions = result;
            }
        }

        if (!executeEffect) {
            const chatContent = await this.#buildChatContent(
                this.#attemptedActionLabel(),
                '',
                specialRollHtml,
                this.selectedPool,
                this.selectedSpecialKey,
                false,
                0,
                { blocked: true },
            );
            await ChatMessage.create(DSA5_Utility.chatDataSetup(chatContent));
            return this.close();
        }

        const cardOptions = {
            flags: { img: { src: this.message.flags.img?.src } },
            messageMode: data.messageMode,
            speaker: this.message.speaker,
            template: data.template,
            title: data.title,
            user: this.message.author,
            messageId: this.message.id,
        };

        const isDamageContext = ['rerollDamage', 'beistand', 'fieser'].includes(this.tabGroups.sheet);
        for (const prop of ['attackerMessage', 'defenderMessage', 'unopposedStartMessage', 'startMessagesList']) {
            if (data[prop]) cardOptions[prop] = data[prop];
        }

        if (isDamageContext) {
            DSA5_Utility.clearUserTargets();
        } else if (data.originalTargets?.size) {
            game.user.targets = data.originalTargets;
            game.user.targets.user = game.user;
        }

        const actionResult = await this._executeGodsSheetAction({ data, newTestData, cardOptions, isCheat, avesDouble, schipToConsume });
        if (!actionResult) return;

        let { chatActionLabel, chatRollDetails, flagToUpdate, specialRollsText } = actionResult;
        schipToConsume = actionResult.schipToConsume;

        if (!cardOptions.skipNativePostFunction) {
            await this.dsaActor[data.postData.postFunction]({ testData: newTestData, cardOptions }, { rerenderMessage: this.message });
        } else if (this.tabGroups.sheet === 'gescheitert') {
            const renderData = { testData: data.postData, preData: data.preData, hideData: data.hideData, hideDamage: data.hideDamage };
            const html = await renderTemplate(data.template, renderData);
            await this.message.update({ content: html, 'flags.data': data });
        }

        const updatedMessage = game.messages.get(this.message.id);
        const isSuccessful = updatedMessage?.flags?.data?.postData?.successLevel > 0;

        if (avesCoinHtml) chatRollDetails += avesCoinHtml;

        if (isSpecialAction) {
            if (specialRollsText.length > 0) {
                chatRollDetails += FateRolls.formatDieChangesHtml(specialRollsText);
            }
            if (isSuccessful && flagToUpdate.includes(FateRolls.FLAGS.FATE_ADD_QS)) {
                chatRollDetails += `<p><b>${_loc('GodsMenu.FateTab.AddQS')}</b>: +2 QS</p>`;
            }
        }

        const finalPool = schipToConsume ? schipToConsume.pool : this.selectedPool;
        const finalKey = schipToConsume ? schipToConsume.key : this.selectedSpecialKey;
        const isConsumed = schipToConsume !== null;
        const consumedAmount = schipToConsume?.amount || 1;
        const chatContent = await this.#buildChatContent(chatActionLabel, chatRollDetails, specialRollHtml, finalPool, finalKey, isConsumed, consumedAmount);
        await ChatMessage.create(DSA5_Utility.chatDataSetup(chatContent));

        const updates = {};
        flagToUpdate.forEach((flag) => { updates[`flags.data.${flag}`] = true; });

        if (executeEffect && isSpecialAction && this.selectedSpecialKey) {
            const currentSpecials = data.fateSpecialUsed || [];
            if (!currentSpecials.includes(this.selectedSpecialKey)) {
                currentSpecials.push(this.selectedSpecialKey);
                updates['flags.data.fateSpecialUsed'] = currentSpecials;
            }
        }

        if (Object.keys(updates).length > 0) await updatedMessage.update(updates);

        await consumeSchip(this.dsaActor, schipToConsume);

        if (executeEffect && this.selectedPool === 'special' && isSpecialAction) {
            await applyDemonConditionRemovals(this.dsaActor, conditionsToRemove, manualReductions);
        }

        if (avesDouble && this.tabGroups.sheet === 'reroll') {
            const html = await renderTemplate('systems/dsa5/templates/dialog/fateReroll-dialog.hbs', {
                testData: data.preData,
                postData: data.postData,
                singleDie: data.postData.characteristics?.length === 1,
            });

            class AvesRerollDialogV2 extends foundry.applications.api.DialogV2 {
                _onRender(context, options) {
                    super._onRender(context, options);
                    this.element.querySelectorAll('[data-index]').forEach((el) => {
                        el.style.cursor = 'pointer';
                        el.addEventListener('click', (ev) => ev.currentTarget.classList.toggle('dieSelected'));
                    });
                }
            }

            const diesToReroll = await AvesRerollDialogV2.wait({
                window: { title: `${_loc('GodsMenu.FateTab.AvesHeadTitle')} ${_loc('CHATFATE.selectDice')}` },
                content: html,
                rejectClose: false,
                buttons: [
                    { action: 'yes', icon: 'fa-solid fa-check', label: 'ok', callback: (ev, btn, app) => Array.from(app.element.querySelectorAll('.dieSelected')).map((el) => Number(el.dataset.index)) },
                    { action: 'cancel', icon: 'fa-solid fa-times', label: 'cancel', callback: () => null },
                ],
            });

            if (diesToReroll && diesToReroll.length > 0) {
                const isPhex = this.dsaActor.items.some((item) => item.type === 'specialability' && item.name === _loc('LocalizedIDs.traditionPhex'));
                const rerollData = await processReroll(diesToReroll, newTestData, data.postData, 'CHATCONTEXT.Reroll', false, this.dsaActor, isPhex, isCheat);

                if (!rerollData) {
                    ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
                    return this.close();
                }

                newTestData.fateUsed = true;
                await this.dsaActor[data.postData.postFunction]({ testData: newTestData, cardOptions }, { rerenderMessage: this.message });

                const avesRollDetails = FateRolls.formatDieChangesHtml(rerollData.changedRolls);
                const finalInfoMsg = `<h5 class="center"><b>${_loc('GodsMenu.FateTab.AvesHeadTitle')} (2. Wurf)</b></h5>${avesRollDetails}`;
                await ChatMessage.create(DSA5_Utility.chatDataSetup(finalInfoMsg));
            }
        }

        this.close();
    }
}
