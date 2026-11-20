const abilityStep = (actor, key) => Number(actor.items.find(i => i.type === 'specialability' && i.name === _loc(key))?.system.step?.value) || 0;

export function getRegenFateStatus(actor, data) {
    const isRegen = (data?.postData?.rollType || data?.preData?.source?.type) === 'regenerate';
    if (!isRegen || !actor) return { isRegen: false };

    const heilkraftAvailable = Math.max(0, abilityStep(actor, 'LocalizedIDs.healingPower') - (data.fatePointHeilkraftUsedCount || 0));
    const hasRestfulRecovery = abilityStep(actor, 'LocalizedIDs.restfulRecovery') > 0;

    return {
        isRegen: true,
        heilkraftAvailable,
        hasRestfulRecovery,
        canReroll: hasRestfulRecovery && !data.fatePointRegenRerollUsed
    };
}

export function buildCompendium2FateContext(app, context) {
    const status = getRegenFateStatus(app.dsaActor, app.message.flags.data);
    if (!status.isRegen) return context;

    // Bei Meisterschips: "Meisterschicksal" entfernen und keine Regenerations-Tabs einfügen
    if (app.selectedPool === 'master') {
        delete context.tabs.meisterschicksal;
        if (!Object.keys(context.tabs).length) {
            context.tabs.masterPlaceholder = {
                id: 'masterPlaceholder',
                group: 'sheet',
                label: _loc('GodsMenu.FateTab.MasterNoOption'),
                cssClass: 'active'
            };
            app.tabGroups.sheet = 'masterPlaceholder';
        }
        context.hasFateAction = false;
        return context;
    }

    delete context.tabs.reroll;
    delete context.tabs.noOption;

    const sfNameLoc = _loc('LocalizedIDs.healingPower');
    const specialPoints = foundry.utils.getProperty(app.dsaActor, 'flags.dsa5.specialPoints') || {};
    const poolAvailableFate = app.selectedPool === 'personal'
        ? (app.dsaActor.system.status?.fatePoints?.value || 0)
        : app.selectedPool === 'special'
            ? (app.selectedSpecialKey ? (specialPoints[app.selectedSpecialKey]?.current || 0) : Math.max(0, ...Object.values(specialPoints).map(p => Number(p?.current) || 0)))
            : (Number((game.settings.get('dsa5', 'groupschips') || '0/0').split('/')[0]) || 0);

    const regenDice = [];
    if (status.hasRestfulRecovery) {
        $(`<div>${app.message.content}</div>`).find('.roll-result span.d6').each((index, el) => {
            const $el =$(el);
            const rawClass = $el.attr('class') || '';
            const attr = rawClass.match(/die-(LeP|AsP|KaP)/)?.[1] || 'd6';

            regenDice.push({
                index,
                currentValue: parseInt($el.text()) || 0,
                tooltip: $el.attr('data-tooltip'),
                cssClass: rawClass.replace(/display-toggle|d6|die-(LeP|AsP|KaP)/g, '').trim(),
                attr,
                die: 'd6',
                selected: app.selectedForRegenReroll.has(index)
            });
        });

        if (regenDice.length && status.canReroll) {
            context.tabs.rerollRegen = { id: 'rerollRegen', group: 'sheet', label: 'CHATFATE.tabRerollRegen', cssClass: app.tabGroups.sheet === 'rerollRegen' ? 'active' : '' };
        }
    }

    if (status.heilkraftAvailable > 0 && poolAvailableFate > 0) {
        context.tabs.addRegen = { id: 'addRegen', group: 'sheet', label: 'CHATFATE.tabAddRegen', cssClass: app.tabGroups.sheet === 'addRegen' ? 'active' : '' };
    }

    if (!context.tabs[app.tabGroups.sheet]) {
        app.tabGroups.sheet = Object.keys(context.tabs)[0];
        if (context.tabs[app.tabGroups.sheet]) context.tabs[app.tabGroups.sheet].cssClass = 'active';
    }

    context.heilkraftDice = Array.from({ length: Math.min(status.heilkraftAvailable, poolAvailableFate) }, (_, index) => ({
        index,
        selected: app.selectedForHeilkraft.has(index),
        tooltip: sfNameLoc,
        attr: 'LeP',
        die: 'd6',
        cssClass: 'fail'
    }));
    context.regenDice = regenDice;
    context.addRegenDesc = _loc('CHATFATE.AddRegenDesc');
    context.hasFateAction = Object.keys(context.tabs).some(id => id !== 'noOption' && id !== 'masterPlaceholder');

    return context;
}
