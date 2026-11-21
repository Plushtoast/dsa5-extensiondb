import { DSA5GodsMenuConfig } from './config.js';
import { promptSchipSwap, promptManualConditions, promptAvesCheat, promptAvesDamageReroll, promptSpecialRollCheat } from './fate-dialogs.js';
import { getDemonConditionRemovals, applyDemonConditionRemovals, applyDemonSchipRegen } from './fate-effects.js';
import { executeReroll, executeDamageReroll, executeAddQS, executeFieserSchaden, executeGescheitert, executeImprove, executeMasterRegen, prepareRegenBlessing, executeRegenBlessing, consumeSchip, processReroll, processDamageReroll } from './fate-actions.js';
import { DSA5_Utility, DiceDSA5, FateRolls, UnifiedFateDSA5 } from './dsa5-api.js';
import { buildUnifiedFateContext, buildRollRequestFateContext, extractDamageDice, getRegenBlessingActors, FATE_TAB_LABELS, STANDARD_FATE_TABS, STANDARD_ONLY_SPECIAL_KEYS } from './fate-context.js';
import './fate-chat-menu.js';

const { renderTemplate } = foundry.applications.handlebars;

export default class GodsFateDSA5 extends UnifiedFateDSA5 {
    #isConfirming = false;
    selectedForMasterRegen = -1;

    #onRollRequestSync = (doc) => {
        if (!this.rendered || !this.isRollRequest || this.#isConfirming) return;
        if (doc.id !== this.message?.id && doc.id !== this.dsaActor?.id) return;
        if (!getRegenBlessingActors(this.message).length) {
            this.close();
            return;
        }
        this.render();
    };

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
        foundry.utils.deepClone(UnifiedFateDSA5.DEFAULT_OPTIONS),
        {
            actions: {
                toggleMasterRegenDie: function (e, t) { this._onToggleMasterRegenDie(e, t); },
                openChar: function () { this.dsaActor?.sheet?.render(true); },
                quickSelectActor: function (e, t) { this._onQuickSelectRollRequestActor(e, t); },
                unselectActor: function () { this._onUnselectRollRequestActor(); },
            },
        },
    );

    static PARTS = {
        main: {
            template: DSA5GodsMenuConfig.templatePath('fate/unified-fate-dialog.hbs'),
            templates: [
                'systems/dsa5/templates/system/dsatabs.hbs',
                DSA5GodsMenuConfig.templatePath('fate/header.hbs'),
            ],
        },
    };

    static {
        Hooks.on('dsa5.getFateSpendApp', (registry) => {
            registry.AppClass = this;
        });
    }

    static openForRollRequest(message) {
        const eligibleActors = getRegenBlessingActors(message);
        if (!eligibleActors.length) return;

        let initialActor = null;
        if (eligibleActors.length === 1) {
            initialActor = eligibleActors[0];
        } else if (!game.user.isGM) {
            const userChar = game.user.character;
            if (userChar && eligibleActors.some((a) => a.id === userChar.id)) initialActor = userChar;
        } else {
            const controlled = canvas?.tokens?.controlled?.[0]?.actor;
            if (controlled && eligibleActors.some((a) => a.id === controlled.id)) initialActor = controlled;
        }

        const app = new this(message, initialActor || eligibleActors[0]);
        app.dsaActor = initialActor;
        app.selectedPool = 'special';
        return app.render(true);
    }

    get isRollRequest() {
        return !!this.message?.flags?.dsa5?.rollRequest && !this.message?.flags?.data?.preData;
    }

    async _prepareContext(options) {
        if (this.isRollRequest) return buildRollRequestFateContext(this);
        const context = await super._prepareContext(options);
        context.showFateBody = true;
        return context;
    }

    async _buildFateContext(baseContext) {
        return buildUnifiedFateContext(this, baseContext);
    }

    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);
        if (this.isRollRequest) {
            Hooks.on('updateChatMessage', this.#onRollRequestSync);
            Hooks.on('updateActor', this.#onRollRequestSync);
        }
    }

    async _onClose(options) {
        if (this.isRollRequest) {
            Hooks.off('updateChatMessage', this.#onRollRequestSync);
            Hooks.off('updateActor', this.#onRollRequestSync);
        }
        return super._onClose(options);
    }

    _onQuickSelectRollRequestActor(event, target) {
        if (this.#isConfirming) return;
        const actor = getRegenBlessingActors(this.message).find((a) => a.id === target.dataset.actorId);
        if (!actor) return;
        this.dsaActor = actor;
        this.selectedPool = 'special';
        this.selectedSpecialKey = null;
        this.tabGroups.sheet = '';
        this.render();
    }

    _onUnselectRollRequestActor() {
        if (this.#isConfirming) return;
        this.dsaActor = null;
        this.selectedSpecialKey = null;
        this.tabGroups.sheet = '';
        this.render();
    }

    _canSelectPool(pool, key) {
        if (pool === 'special') return !!key;
        if (this.isRollRequest) return false;
        return ['personal', 'group', 'master'].includes(pool);
    }

    _onSchipButtonClick(target) {
        if (target.dataset.pool === 'special' && target.classList.contains('emptySchip')) {
            return ui.notifications.warn(_loc('DSAError.schipEmpty'));
        }
        if (this.isRollRequest && target.dataset.pool === 'special' && target.dataset.key) {
            this.tabGroups.sheet = `regenBlessing_${target.dataset.key}`;
        }
        return super._onSchipButtonClick(target);
    }

    _onToggleSpecialDie(event, target) {
        const idx = parseInt(target.closest('[data-index]').dataset.index, 10);
        this.selectedForSpecialReroll = this.selectedForSpecialReroll === idx ? -1 : idx;
        this.render();
    }

    _onToggleMasterRegenDie(event, target) {
        const idx = parseInt(target.closest('[data-index]').dataset.index, 10);
        this.selectedForMasterRegen = this.selectedForMasterRegen === idx ? -1 : idx;
        this.render();
    }

    _validateDieSelection() {
        const tab = this.tabGroups.sheet;
        if (tab === 'noOption' || tab === 'masterPlaceholder') {
            ui.notifications.warn(_loc('GodsMenu.FateTab.NoOptionNotify'));
            return false;
        }
        if (tab.startsWith('specialAction_') || tab.startsWith('regenBlessing_')) return true;
        if (tab === 'meisterschicksal') return this.selectedForReroll.size > 0 || this._warnNoDieSelected();
        if (tab === 'beistand') return this.selectedForDamageReroll.size > 0 || this._warnNoDieSelected();
        if (tab === 'meisterRegen') return this.selectedForMasterRegen >= 0 || this._warnNoDieSelected();
        return super._validateDieSelection();
    }

    _validateSelectedPool() {
        if (!this.dsaActor) return false;
        if (this.selectedPool === 'master') return true;
        if (this.selectedPool === 'special') {
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
        return super._validateSelectedPool();
    }

    async _onConfirm(event, target, isCheat = false) {
        event?.preventDefault?.();
        if (this.#isConfirming) return;
        this.#isConfirming = true;

        const lockedButtons = Array.from(
            this.element.querySelectorAll('button[data-action="confirm"], button[data-action="cheat"]'),
        ).filter((btn) => !btn.disabled);
        lockedButtons.forEach((btn) => { btn.disabled = true; });

        try {
            if (this.tabGroups.sheet.startsWith('specialAction_') || this.tabGroups.sheet.startsWith('regenBlessing_')) {
                this.selectedPool = 'special';
                this.selectedSpecialKey = this.tabGroups.sheet.split('_')[1];
            }
            if (this.selectedPool === 'special' || this.selectedPool === 'master') {
                return await this.#onGodsConfirm(event, target, isCheat);
            }
            return await super._onConfirm(event, target, isCheat);
        } finally {
            this.#isConfirming = false;
            if (this.rendered) lockedButtons.forEach((btn) => { btn.disabled = false; });
        }
    }

    async #buildChatContent(actionLabel, rollDetails, specialRollHtml, displayPool, displayKey, isConsumed, consumedAmount, { blocked = false } = {}) {
        let max = 0;
        let available = 0;
        let tooltip = '';
        let iconPath = '';

        const consumedMod = isConsumed ? consumedAmount : 0;
        let actorName = this.dsaActor.name;
        let actionText = blocked ? _loc('GodsMenu.FateTab.usageBlocked') : _loc('GodsMenu.usesPointFor');
        const headingKey = blocked ? 'GodsMenu.FateTab.UsageBlockedTitle' : 'CHATFATE.fatepointUsed';

        switch (displayPool) {
            case 'personal':
                max = this.dsaActor.system.status.fatePoints.current || 0;
                available = Math.max(0, (this.dsaActor.system.status.fatePoints.value || 0) - consumedMod);
                tooltip = _loc('CHATFATE.PointsRemaining');
                break;
            case 'group': {
                const { current, max: grpMax } = DSA5GodsMenuConfig.getSchipSetting('groupschips');
                max = grpMax;
                available = Math.max(0, current - consumedMod);
                tooltip = _loc('CHATFATE.GroupPointsRemaining');
                break;
            }
            case 'special': {
                const sData = foundry.utils.getProperty(this.dsaActor, `flags.dsa5.specialPoints.${displayKey}`);
                max = sData?.value || 0;
                available = Math.max(0, (sData?.current || 0) - consumedMod);
                iconPath = DSA5GodsMenuConfig.chipIcon(displayKey);
                tooltip = _loc('GodsMenu.FateTab.SpecialPointsRemaining', { name: DSA5GodsMenuConfig.schipName(displayKey) });
                break;
            }
            case 'master': {
                const { current, max: mMax } = DSA5GodsMenuConfig.getSchipSetting('masterschips');
                max = mMax;
                available = Math.max(0, current - consumedMod);
                tooltip = _loc('GodsMenu.FateTab.MasterPointsRemaining');
                actorName = _loc('Gamemaster');
                if (!blocked) actionText = _loc('GodsMenu.FateTab.MasterUsesPointFor');
                break;
            }
        }

        const schips = DSA5GodsMenuConfig.buildSchipDots(max, available, (isFull, _i, css) => {
            if (displayPool === 'special') {
                return {
                    cssClass: `${css} gods-schip custom-special-schips`,
                    style: `background-image: url('${iconPath}');`,
                };
            }
            if (displayPool === 'master') {
                const mPath = isFull ? 'systems/dsa5/icons/meisterschip.webp' : 'systems/dsa5/icons/gray_meisterschip.webp';
                return {
                    cssClass: `${css} master-schip-bg`,
                    style: `background-image: url('${mPath}');`,
                };
            }
            return { cssClass: css, style: '' };
        });

        return renderTemplate(DSA5GodsMenuConfig.templatePath('fate/chat-action-card.hbs'), {
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
        if (tab.startsWith('specialAction_') || tab.startsWith('regenBlessing_')) {
            const key = tab.split('_')[1];
            return `${_loc('GodsMenu.FateTab.SpecialSchipAction')} [${DSA5GodsMenuConfig.schipName(key)}]`;
        }
        return FATE_TAB_LABELS[tab]
            ? _loc(FATE_TAB_LABELS[tab])
            : this.element.querySelector(`.sheet-tabs .item[data-tab="${tab}"]`).textContent.trim();
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
        if (this.isRollRequest) return;
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
        if (this.isRollRequest && this.tabGroups.sheet?.startsWith('regenBlessing_')) {
            const key = this.tabGroups.sheet.replace('regenBlessing_', '');
            this.selectedSpecialKey = key;
            this.element.querySelectorAll('.special-schip').forEach((btn) => {
                btn.classList.toggle('schip-selected', btn.dataset.key === key);
            });
        }
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
                    const chosen = await promptSchipSwap(this.dsaActor, this.selectedSpecialKey, isGod);
                    const schipToConsume = chosen ?? { pool: this.selectedPool, key: this.selectedSpecialKey };
                    return {
                        executeEffect: true,
                        schipToConsume,
                        resultColor: chosen ? 'darkblue' : 'black',
                        resultTitle: _loc(chosen ? 'GodsMenu.FateTab.SpecialRollFlexibleTitle' : 'GodsMenu.FateTab.SpecialRollNormalTitle'),
                        resultDesc: _loc(chosen ? 'GodsMenu.FateTab.SpecialRollFlexibleDesc' : 'GodsMenu.FateTab.SpecialRollNormalDesc'),
                        resultTooltip: chosen ? 'GodsMenu.SchipRules.Dice3' : 'GodsMenu.SchipRules.Dice5',
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

    async #preparePreRollInputs(isSpecialAction, isRegenBlessing) {
        let regenAllocations = null;
        const conditionsToRemove = [];
        let manualReductions = {};

        if (isRegenBlessing) {
            regenAllocations = await prepareRegenBlessing(this, this.selectedSpecialKey);
            if (!regenAllocations) return null;
        }

        if (this.selectedPool === 'special' && this.selectedSpecialKey && isSpecialAction) {
            const removals = getDemonConditionRemovals(this.selectedSpecialKey);
            conditionsToRemove.push(...removals.autoConditions);

            if (removals.manualLevels > 0) {
                const availableConditions = [];
                for (const effect of this.dsaActor.effects) {
                    const statusId = Array.from(effect.statuses)[0];
                    if (statusId && !conditionsToRemove.includes(statusId)) {
                        const val = effect.system?.condition?.value || effect.getFlag('dsa5', 'value') || 1;
                        availableConditions.push({ id: statusId, name: effect.name, value: val, img: effect.img || effect.icon });
                    }
                }

                if (availableConditions.length > 0) {
                    const result = await promptManualConditions(this.dsaActor, availableConditions, removals.manualLevels);
                    if (result === null) {
                        ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
                        return null;
                    }
                    manualReductions = result;
                }
            }
        }

        return { regenAllocations, conditionsToRemove, manualReductions };
    }

    async #rollSpecialSymbols(isCheat) {
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
                return null;
            }
            ({ d1, d2 } = cheatResult);
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

        const die1Tooltip = _loc(isGod ? 'GodsMenu.GodSymbol' : 'GodsMenu.DemonSymbol');
        const die2Tooltip = _loc(isGod ? 'GodsMenu.KhaSymbol' : 'GodsMenu.StarWallSymbol');
        const causeIcons = [];
        if (d1 === 6) causeIcons.push({ img: d1Icon, tooltip: die1Tooltip });
        if (d2 === 6) causeIcons.push({ img: d2Icon, tooltip: die2Tooltip });

        const specialRollHtml = await renderTemplate(DSA5GodsMenuConfig.templatePath('fate/special-roll-result.hbs'), {
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

        return {
            executeEffect: outcome.executeEffect,
            schipToConsume: outcome.schipToConsume,
            specialRollHtml,
        };
    }

    async #handleAvesCoin(coinRoll, isCheat) {
        if (
            this.selectedPool !== 'special'
            || this.selectedSpecialKey !== 'Aves'
            || !STANDARD_FATE_TABS.has(this.tabGroups?.sheet)
        ) {
            return { avesDouble: false, avesCoinHtml: '' };
        }

        if (isCheat) {
            const cheatResult = await promptAvesCheat();
            if (cheatResult === null) {
                ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
                return null;
            }
            coinRoll.terms[0].results[0].result = cheatResult;
            coinRoll._total = cheatResult;
        }

        const avesDouble = coinRoll.total === 1;
        const avesCoinHtml = await renderTemplate(DSA5GodsMenuConfig.templatePath('fate/aves-coin-result.hbs'), {
            actorName: this.dsaActor.name,
            avesImg: DSA5GodsMenuConfig.chipIcon('Aves'),
            isSuccess: avesDouble,
            resultTitle: _loc(avesDouble ? 'GodsMenu.FateTab.AvesHeadTitle' : 'GodsMenu.FateTab.AvesTailTitle'),
            resultDesc: _loc(avesDouble ? 'GodsMenu.FateTab.AvesHeadDesc' : 'GodsMenu.FateTab.AvesTailDesc'),
        });

        return { avesDouble, avesCoinHtml };
    }

    async #handleAvesSecondReroll(data, newTestData, cardOptions, isCheat) {
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

        if (!diesToReroll?.length) return;

        const isPhex = DSA5GodsMenuConfig.hasPhexTradition(this.dsaActor);
        const rerollData = await processReroll(diesToReroll, newTestData, data.postData, 'CHATCONTEXT.Reroll', false, this.dsaActor, isPhex, isCheat);
        if (!rerollData) {
            ui.notifications.warn(_loc('GodsMenu.FateTab.ActionCancelled'));
            return;
        }

        newTestData.fateUsed = true;
        await this.dsaActor[data.postData.postFunction]({ testData: newTestData, cardOptions }, { rerenderMessage: this.message });

        const avesRollDetails = FateRolls.formatDieChangesHtml(rerollData.changedRolls);
        const heading = `${_loc('GodsMenu.FateTab.AvesHeadTitle')} (${_loc('GodsMenu.FateTab.AvesSecondRoll')})`;
        await ChatMessage.create(DSA5_Utility.chatDataSetup(`<h5 class="center"><b>${heading}</b></h5>${avesRollDetails}`));
    }

    async #handleAvesSecondDamageReroll(data, newTestData, cardOptions, isCheat) {
        const damageDice = extractDamageDice(newTestData.damageRoll);
        if (!damageDice.length) return;

        const dieIndex = await promptAvesDamageReroll(damageDice);
        if (dieIndex === null) return;

        const rerollResult = await processDamageReroll([dieIndex], newTestData.damageRoll, data.messageMode, isCheat);
        if (!rerollResult) return;

        newTestData.damageRoll = rerollResult.damageRoll;
        DSA5_Utility.clearUserTargets();
        await this.dsaActor[data.postData.postFunction]({ testData: newTestData, cardOptions }, { rerenderMessage: this.message });

        const updatedMsg = game.messages.get(this.message.id);
        if (updatedMsg?.isOwner) {
            await updatedMsg.update({ [`flags.data.${FateRolls.FLAGS.FATE_DAMAGE_REROLL}`]: true });
        }

        const heading = `${_loc('GodsMenu.FateTab.AvesHeadTitle')} (${_loc('GodsMenu.FateTab.AvesSecondRoll')})`;
        await ChatMessage.create(DSA5_Utility.chatDataSetup(`<h5 class="center"><b>${heading}</b></h5>${rerollResult.chatRollDetails}`));
    }

    async _executeGodsSheetAction({ data, newTestData, cardOptions, isCheat, avesDouble, schipToConsume, regenAllocations }) {
        const sheet = this.tabGroups.sheet;
        const tab = sheet.startsWith('specialAction_')
            ? 'specialAction'
            : (sheet.startsWith('regenBlessing_') ? 'regenBlessing' : sheet);
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
            case 'regenBlessing': {
                const key = sheet.replace('regenBlessing_', '');
                const result = await executeRegenBlessing(this, key, regenAllocations, cardOptions);
                if (!result) return null;
                chatActionLabel = result.chatActionLabel;
                chatRollDetails = result.chatRollDetails;
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
        const data = this.message.flags.data || {};
        const newTestData = data.preData || {};

        if (!this._validateSelectedPool()) return;
        if (!this._validateDieSelection()) return;

        const isSpecialAction = this.tabGroups.sheet.startsWith('specialAction_');
        const isRegenBlessing = this.tabGroups.sheet.startsWith('regenBlessing_');

        const preRoll = await this.#preparePreRollInputs(isSpecialAction, isRegenBlessing);
        if (!preRoll) return;
        const { regenAllocations, conditionsToRemove, manualReductions } = preRoll;

        const coinRoll = await FateRolls.throwCoin();

        let executeEffect = true;
        let schipToConsume = { pool: this.selectedPool, key: this.selectedSpecialKey };
        let specialRollHtml = '';

        if (this.selectedPool === 'special') {
            const symbolResult = await this.#rollSpecialSymbols(isCheat);
            if (!symbolResult) return await this.close();
            ({ executeEffect, schipToConsume, specialRollHtml } = symbolResult);
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
            return await this.close();
        }

        const avesResult = await this.#handleAvesCoin(coinRoll, isCheat);
        if (!avesResult) return;
        const { avesDouble, avesCoinHtml } = avesResult;

        const cardOptions = {
            flags: { img: { src: this.message.flags.img?.src } },
            messageMode: data.messageMode || this.message.flags?.dsa5?.rollRequest?.messageMode,
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

        const actionResult = await this._executeGodsSheetAction({ data, newTestData, cardOptions, isCheat, avesDouble, schipToConsume, regenAllocations });
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
            if (specialRollsText.length > 0) chatRollDetails += FateRolls.formatDieChangesHtml(specialRollsText);
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

        if (isSpecialAction && this.selectedSpecialKey) {
            const currentSpecials = data.fateSpecialUsed || [];
            if (!currentSpecials.includes(this.selectedSpecialKey)) {
                currentSpecials.push(this.selectedSpecialKey);
                updates['flags.data.fateSpecialUsed'] = currentSpecials;
            }
        }

        if (Object.keys(updates).length > 0 && updatedMessage?.isOwner) await updatedMessage.update(updates);

        await consumeSchip(this.dsaActor, schipToConsume);

        if (this.selectedPool === 'special' && isSpecialAction) {
            await applyDemonConditionRemovals(this.dsaActor, conditionsToRemove, manualReductions);
        }

        if (avesDouble) {
            if (this.tabGroups.sheet === 'reroll') {
                await this.#handleAvesSecondReroll(data, newTestData, cardOptions, isCheat);
            } else if (this.tabGroups.sheet === 'rerollDamage') {
                await this.#handleAvesSecondDamageReroll(data, newTestData, cardOptions, isCheat);
            }
        }

        await this.close();
    }
}
