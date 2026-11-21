import { DSA5GodsMenuConfig } from './config.js';
import { DiceDSA5, FateRolls } from './dsa5-api.js';

export const STANDARD_FATE_TABS = new Set(['reroll', 'rerollDamage', 'addQS']);
export const STANDARD_ONLY_SPECIAL_KEYS = new Set(['Aves', 'Phex']);

export const FATE_TAB_LABELS = {
    reroll: 'GodsMenu.FateTab.Reroll',
    rerollDamage: 'GodsMenu.FateTab.RerollDamage',
    improve: 'GodsMenu.FateTab.Improve',
    addQS: 'GodsMenu.FateTab.AddQS',
    beistand: 'GodsMenu.FateTab.MasterDarkness',
    fieser: 'GodsMenu.FateTab.MasterNastyDamage',
    gescheitert: 'GodsMenu.FateTab.MasterFailedAttack',
    meisterschicksal: 'GodsMenu.FateTab.MasterFate',
    meisterRegen: 'GodsMenu.FateTab.MasterRegen',
    masterPlaceholder: 'GodsMenu.FateTab.MasterNoOption',
    noOption: 'GodsMenu.FateTab.NoOption',
};

const MASTER_TAB_IDS = new Set(['beistand', 'fieser', 'gescheitert', 'meisterschicksal', 'meisterRegen', 'masterPlaceholder']);
const MAGIC_TYPES = new Set(['spell', 'liturgy', 'ritual', 'ceremony', 'magicalsign']);

export const REGEN_BLESSING_CONFIG = {
    Mada: {
        resource: 'AsP',
        prop: 'system.status.regeneration.AsPTemp',
        maxTotal: 12,
        maxPerTarget: 3,
        filterTarget: (actor) => (actor.system?.status?.astralenergy?.max || 0) > 0,
    },
    Travia: {
        resource: 'LeP',
        prop: 'system.status.regeneration.LePTemp',
        maxTotal: 12,
        maxPerTarget: 3,
        filterTarget: () => true,
    },
};

const createTab = (id, activeTab, label = FATE_TAB_LABELS[id]) => ({
    id,
    label,
    cssClass: activeTab === id ? 'active' : '',
});

export function extractDamageDice(damageRollData, selectedIndices = new Set()) {
    const damageDice = [];
    const rollInstance = DiceDSA5.fromRollData(damageRollData);
    if (!rollInstance?.terms) return damageDice;

    let dieIndex = 0;
    for (const term of rollInstance.terms) {
        for (const res of (term.results || [])) {
            damageDice.push({
                index: dieIndex,
                currentValue: res.result,
                faces: term.faces,
                tooltip: _loc('Trefferpunkte'),
                selected: selectedIndices.has(dieIndex),
            });
            dieIndex++;
        }
    }
    return damageDice;
}

export function getRollRequestActors(message) {
    const req = message?.flags?.dsa5?.rollRequest;
    if (!req) return [];

    const ids = new Set();
    for (const r of (req.recipients || [])) {
        const id = typeof r === 'string' ? r : (r?.actorId || r?.id || r?.actor?.id);
        if (id) {
            ids.add(id);
        } else if (r?.uuid) {
            const doc = fromUuidSync(r.uuid);
            if (doc?.id) ids.add(doc.id);
        }
    }

    if (!ids.size && message.content) {
        const tpl = document.createElement('template');
        tpl.innerHTML = message.content;
        tpl.content.querySelectorAll('.roll-request-row[data-actor-id]').forEach((el) => {
            if (el.dataset.actorId) ids.add(el.dataset.actorId);
        });
    }

    return Array.from(ids).map((id) => game.actors.get(id)).filter(Boolean);
}

export function getEligibleCompanions(caster, message, key) {
    const cfg = REGEN_BLESSING_CONFIG[key];
    if (!cfg || !caster) return [];
    return getRollRequestActors(message).filter((actor) => actor.id !== caster.id && cfg.filterTarget(actor));
}

export function getAvailableRegenBlessingKeys(actor, message) {
    if (!actor || !message) return [];
    const used = message.flags?.data?.fateSpecialUsed || [];
    const specialPoints = foundry.utils.getProperty(actor, 'flags.dsa5.specialPoints') || {};

    return Object.keys(REGEN_BLESSING_CONFIG).filter(
        (key) => !used.includes(key)
            && (Number(specialPoints[key]?.current) || 0) > 0
            && getEligibleCompanions(actor, message, key).length > 0,
    );
}

export function getRegenBlessingActors(message) {
    const req = message?.flags?.dsa5?.rollRequest;
    if (req?.category !== 'regeneration' || req.finalized) return [];

    return getRollRequestActors(message).filter(
        (actor) => (game.user.isGM || actor.isOwner) && getAvailableRegenBlessingKeys(actor, message).length > 0,
    );
}

export function buildRollRequestFateContext(app) {
    const eligibleActors = getRegenBlessingActors(app.message);
    if (app.dsaActor && !eligibleActors.some((a) => a.id === app.dsaActor.id)) {
        app.dsaActor = eligibleActors.length === 1 ? eligibleActors[0] : null;
    }

    const availableKeys = app.dsaActor ? getAvailableRegenBlessingKeys(app.dsaActor, app.message) : [];
    app.selectedPool = 'special';

    if (!availableKeys.includes(app.selectedSpecialKey)) {
        app.selectedSpecialKey = availableKeys[0] || null;
    }

    const tabsDef = {};
    const regenBlessingTabs = [];
    const specialSchips = [];

    if (app.dsaActor) {
        const specialPointsObj = foundry.utils.getProperty(app.dsaActor, 'flags.dsa5.specialPoints') || {};

        for (const key of availableKeys) {
            const tabId = `regenBlessing_${key}`;
            const label = `${DSA5GodsMenuConfig.schipName(key)}-Schip`;
            const tab = createTab(tabId, app.tabGroups.sheet, label);

            tabsDef[tabId] = tab;
            regenBlessingTabs.push({ ...tab, description: DSA5GodsMenuConfig.schipDescription(key) });

            const sData = specialPointsObj[key];
            const imgStyle = `background-image: url('${DSA5GodsMenuConfig.chipIcon(key)}');`;
            specialSchips.push(...DSA5GodsMenuConfig.buildSchipDots(sData.value, sData.current, (isFull) => ({
                key,
                tooltip: label,
                imgStyle,
                isRelevant: isFull,
                isSelected: app.selectedSpecialKey === key,
                isGod: true,
            })));
        }

        if (!tabsDef[app.tabGroups.sheet]) {
            const activeId = `regenBlessing_${app.selectedSpecialKey}`;
            app.tabGroups.sheet = activeId;
            tabsDef[activeId].cssClass = 'active';
            regenBlessingTabs.find((t) => t.id === activeId).cssClass = 'active';
        }
    }

    const canSwitchActor = eligibleActors.length > 1;

    return {
        isRollRequest: true,
        showFateBody: !!app.dsaActor,
        actor: app.dsaActor,
        availableActors: eligibleActors.map((a) => ({ id: a.id, name: a.name, img: a.img })),
        canSwitchActor,
        showActorSwitcher: canSwitchActor,
        tabs: tabsDef,
        regenBlessingTabs,
        specialImg: DSA5GodsMenuConfig.chipIcon(null),
        activeTab: app.tabGroups.sheet,
        specialSchips,
        isSpecialPool: true,
        hasSpecial: specialSchips.length > 0,
        hasFateAction: !!app.dsaActor,
        isGM: game.user.isGM,
    };
}

export async function buildUnifiedFateContext(app, baseContext) {
    const data = app.message.flags.data;
    const postData = data.postData;
    const preData = data.preData;

    const rollName = preData.source?.name || '';
    const usedSpecialKeys = data.fateSpecialUsed || [];
    const damageRevealed = data.hideDamage === false
        || app.message.content.includes('data-hide-damage="false"')
        || app.message.content.includes('opposed-card');

    const successLevel = postData.successLevel || 0;
    const type = preData.source?.type;
    const mode = preData.mode;
    const isRegen = (postData.rollType || type) === 'regenerate';

    const isCombatRoll = ['meleeweapon', 'rangeweapon', 'dodge', 'trait'].includes(type) || ['attack', 'parry', 'range'].includes(mode);
    const isAttack = mode === 'attack' || postData.characteristics?.some((c) => c.char === 'attack');
    const isParry = mode === 'parry' || postData.characteristics?.some((c) => c.char === 'parry');
    const isRange = type === 'rangeweapon' || mode === 'range';
    const isDodge = type === 'dodge' || rollName === _loc('Dodge');

    let improveSkill = null;
    if (isAttack) improveSkill = 'SCHIPSKILLS.meleeweaponattack';
    else if (isRange) improveSkill = 'SCHIPSKILLS.rangeweaponattack';
    else if (isDodge) improveSkill = 'SCHIPSKILLS.dodge';
    else if (isParry) improveSkill = 'SCHIPSKILLS.meleeweaponparry';
    else if (type === 'attribute' || FateRolls.MULTI_DIE_ROLL_TYPES.includes(type)) improveSkill = 'SCHIPSKILLS.char';

    const canImprove = improveSkill
        ? app.dsaActor.items.some((i) => i.name === _loc(improveSkill) && i.system?.category?.value === 'fatePoints')
        : false;

    const hasD20Roll = !isRegen && (!!postData.characteristics || !!preData.roll);
    const hasDamageRoll = !!postData.damageRoll;
    const canAddQS = successLevel > 0 && !data.fatePointAddQSUsed && postData.qualityStep !== undefined && !isCombatRoll;

    const tabsDef = {};
    if (hasD20Roll && !data.fatePointRerollUsed) tabsDef.reroll = createTab('reroll', app.tabGroups.sheet);
    if (hasDamageRoll && !data.fatePointDamageRerollUsed) tabsDef.rerollDamage = createTab('rerollDamage', app.tabGroups.sheet);
    if (hasD20Roll && canImprove && !data.fateImproved) tabsDef.improve = createTab('improve', app.tabGroups.sheet);
    if (canAddQS) tabsDef.addQS = createTab('addQS', app.tabGroups.sheet);

    const currentTab = app.tabGroups.sheet || '';
    if (!tabsDef[currentTab] && !currentTab.startsWith('specialAction_') && !MASTER_TAB_IDS.has(currentTab)) {
        const firstTab = Object.keys(tabsDef)[0];
        if (firstTab) {
            app.tabGroups.sheet = firstTab;
            tabsDef[firstTab].cssClass = 'active';
        }
    }

    const sheetTab = app.tabGroups.sheet || '';
    const dice = (postData.characteristics || [])
        .filter((item) => item.char !== 'damage')
        .map((item, i) => {
            const attr = isCombatRoll ? (type === 'dodge' ? 'dodge' : (mode || type)) : (item.char || 'd20');
            return {
                index: i,
                currentValue: item.res,
                attr,
                cssClass: item.suc ? 'suc' : 'fail',
                tooltip: item.tar ? `${_loc(item.char === 'attack' ? 'Attack' : item.char === 'parry' ? 'Parry' : `CHAR.${item.char.toUpperCase()}`)} vs ${item.tar}` : '',
                selected: (sheetTab === 'reroll' || sheetTab === 'meisterschicksal') ? app.selectedForReroll.has(i) : app.selectedForImprove === i,
                specialSelected: sheetTab.startsWith('specialAction') ? app.selectedForSpecialReroll === i : false,
            };
        });

    const damageDice = hasDamageRoll
        ? extractDamageDice(postData.damageRoll, app.selectedForDamageReroll)
        : [];

    const masterRegenDice = [];
    if (isRegen && game.user.isGM && !data.meisterRegenUsed) {
        const tpl = document.createElement('template');
        tpl.innerHTML = app.message.content;
        tpl.content.querySelectorAll('.roll-result span.d6').forEach((el, index) => {
            const rawClass = el.getAttribute('class') || '';
            const attr = rawClass.match(/die-(LeP|AsP|KaP)/)?.[1];
            if (!attr) return;
            masterRegenDice.push({
                index,
                currentValue: parseInt(el.textContent, 10),
                tooltip: el.getAttribute('data-tooltip') || '',
                cssClass: rawClass.replace(/display-toggle|d6|die-(LeP|AsP|KaP)/g, '').trim(),
                attr,
                selected: app.selectedForMasterRegen === index,
            });
        });
    }

    const personalTooltip = _loc('GodsMenu.FateTab.FatePoint');
    const personalSchips = DSA5GodsMenuConfig.buildSchipDots(
        app.dsaActor.system.status.fatePoints.current || 0,
        app.dsaActor.system.status.fatePoints.value || 0,
        () => ({ tooltip: personalTooltip }),
    );

    const { current: grpCur, max: grpMax } = DSA5GodsMenuConfig.getSchipSetting('groupschips');
    const groupTooltip = _loc('FORMULA.groupFatePoints');
    const groupSchips = DSA5GodsMenuConfig.buildSchipDots(grpMax, grpCur, () => ({ tooltip: groupTooltip }));

    const specialSchips = [];
    let activeSpecialTab = null;
    let hasGodChips = false;
    let hasDemonChips = false;

    const specialPointsObj = foundry.utils.getProperty(app.dsaActor, 'flags.dsa5.specialPoints');
    if (specialPointsObj) {
        for (const [key, sData] of Object.entries(specialPointsObj)) {
            if ((sData?.value || 0) <= 0) continue;

            const isQsAndReroll = DSA5GodsMenuConfig.isQsAndReroll(key, rollName);
            const isRelevant = isQsAndReroll || DSA5GodsMenuConfig.isExtraReroll(key, rollName);
            const isGod = DSA5GodsMenuConfig.isGod(key);
            if (isGod) hasGodChips = true;
            else hasDemonChips = true;

            const imgStyle = `background-image: url('${DSA5GodsMenuConfig.chipIcon(key)}');`;
            const label = `${DSA5GodsMenuConfig.schipName(key)}-Schip`;

            if (isQsAndReroll && (sData.current || 0) > 0 && app.selectedPool === 'special' && app.selectedSpecialKey === key && !usedSpecialKeys.includes(key)) {
                activeSpecialTab = createTab(`specialAction_${key}`, app.tabGroups.sheet, label);
            }

            specialSchips.push(...DSA5GodsMenuConfig.buildSchipDots(sData.value, sData.current || 0, (isFull) => ({
                key,
                tooltip: label,
                imgStyle,
                isRelevant: isRelevant && isFull,
                isSelected: app.selectedPool === 'special' && app.selectedSpecialKey === key,
                isGod,
            })));
        }
    }

    const masterSetting = game.user.isGM ? DSA5GodsMenuConfig.getSchipSetting('masterschips') : { current: 0, max: 0 };
    const hasMaster = masterSetting.max > 0;
    const masterTooltip = _loc('GodsMenu.masterFatePointsTooltip');
    const masterSchips = DSA5GodsMenuConfig.buildSchipDots(masterSetting.max, masterSetting.current, (isFull, i) => ({
        value: i + 1,
        img: isFull ? 'systems/dsa5/icons/meisterschip.webp' : 'systems/dsa5/icons/gray_meisterschip.webp',
        tooltip: masterTooltip,
    }));

    const masterTabsDef = {};
    const isPC = app.dsaActor.hasPlayerOwner;
    const hasD6Damage = damageDice.some((d) => d.faces === 6);

    if (isPC && hasDamageRoll && hasD6Damage && damageRevealed) {
        masterTabsDef.beistand = createTab('beistand', app.tabGroups.sheet);
    }
    if (!isPC && (isAttack || isRange) && hasDamageRoll && !data.fieserSchadenUsed && !damageRevealed) {
        masterTabsDef.fieser = createTab('fieser', app.tabGroups.sheet);
    }

    const isSuccess = successLevel > 0 || postData.result?.success || postData.success;
    const isCrit = (successLevel > 2) || postData.result?.critical;
    const failCost = isCrit ? 3 : 2;
    if (game.user.isGM && isPC && (isAttack || isRange) && isSuccess && !MAGIC_TYPES.has(type) && masterSetting.current >= failCost) {
        masterTabsDef.gescheitert = createTab('gescheitert', app.tabGroups.sheet);
    }

    if (hasD20Roll && !data.meisterSchicksalUsed) {
        masterTabsDef.meisterschicksal = createTab('meisterschicksal', app.tabGroups.sheet);
    }
    if (isRegen && masterRegenDice.length && !data.meisterRegenUsed) {
        masterTabsDef.meisterRegen = createTab('meisterRegen', app.tabGroups.sheet);
    }
    if (Object.keys(masterTabsDef).length === 0) {
        masterTabsDef.masterPlaceholder = createTab('masterPlaceholder', app.tabGroups.sheet);
    }

    const partyUuid = game.settings.get('dsa5', 'primaryParty');
    const groupActor = (partyUuid ? fromUuidSync(partyUuid) : null) || game.actors.find((a) => a.type === 'group');
    const isGroupMember = Object.values(groupActor?.system?.members ?? {}).some((member) => member.uuid === app.dsaActor.uuid);

    const hasPersonal = personalSchips.length > 0;
    const hasGroupSchips = groupSchips.length > 0 && isGroupMember;
    const hasSpecialSchips = specialSchips.length > 0;

    const poolAvailable = { personal: hasPersonal, group: hasGroupSchips, special: hasSpecialSchips, master: hasMaster };
    if (!poolAvailable[app.selectedPool]) {
        app.selectedPool = ['personal', 'group', 'special', 'master'].find((pool) => poolAvailable[pool]) ?? app.selectedPool;
    }

    if (app.selectedPool === 'master') {
        for (const key in tabsDef) delete tabsDef[key];
        Object.assign(tabsDef, masterTabsDef);
        if (!tabsDef[app.tabGroups.sheet]) {
            const firstMasterKey = Object.keys(tabsDef)[0];
            app.tabGroups.sheet = firstMasterKey;
            tabsDef[firstMasterKey].cssClass = 'active';
        }
        activeSpecialTab = null;
    } else if (!activeSpecialTab && ((app.tabGroups.sheet || '').startsWith('specialAction_') || MASTER_TAB_IDS.has(app.tabGroups.sheet))) {
        const firstTab = Object.keys(tabsDef)[0];
        if (firstTab) {
            app.tabGroups.sheet = firstTab;
            tabsDef[firstTab].cssClass = 'active';
        }
    }

    if (Object.keys(tabsDef).length === 0 && !activeSpecialTab) {
        tabsDef.noOption = createTab('noOption', 'noOption');
        app.tabGroups.sheet = 'noOption';
    }

    const isStandardTab = STANDARD_FATE_TABS.has(app.tabGroups.sheet);
    for (const chip of specialSchips) {
        if (STANDARD_ONLY_SPECIAL_KEYS.has(chip.key)) {
            chip.isRelevant = chip.isRelevant && isStandardTab;
        }
    }

    const hasFateAction = !!activeSpecialTab
        || Object.keys(tabsDef).some((id) => id !== 'noOption' && id !== 'masterPlaceholder');

    const availablePoolsCount = [hasPersonal, hasGroupSchips, hasSpecialSchips, hasMaster].filter(Boolean).length;
    const dynamicSpecialImg = (hasDemonChips && !hasGodChips)
        ? DSA5GodsMenuConfig.chipIcon(null, 'Erzdaemonen.webp')
        : DSA5GodsMenuConfig.chipIcon(null);

    const specialSchipDescription = (app.selectedPool === 'special' && app.selectedSpecialKey)
        ? DSA5GodsMenuConfig.schipDescription(app.selectedSpecialKey)
        : _loc('GodsMenu.FateTab.SpecialSchipHint');

    const addQSDesc = app.selectedPool === 'special' && DSA5GodsMenuConfig.isQsAndReroll(app.selectedSpecialKey, rollName)
        ? _loc('GodsMenu.FateTab.AddQSDescSpecial')
        : _loc('GodsMenu.FateTab.AddQSDesc');

    let masterDesc = '';
    let masterCost = '';
    if (app.selectedPool === 'master' && app.tabGroups.sheet === 'gescheitert') {
        masterDesc = _loc('GodsMenu.FateTab.MasterFailedDescFull');
        const attackType = isCrit ? _loc('GodsMenu.FateTab.CritAttack') : _loc('GodsMenu.FateTab.RegularAttack');
        masterCost = _loc('GodsMenu.FateTab.MasterFailedCostDetail', { type: attackType, cost: failCost });
    }

    return {
        ...baseContext,
        isRollRequest: false,
        showFateBody: true,
        tabs: tabsDef,
        regenBlessingTabs: [],
        dice,
        damageDice,
        masterRegenDice,
        actorImg: app.dsaActor.img,
        groupImg: groupActor?.img,
        specialImg: dynamicSpecialImg,
        masterImg: DSA5GodsMenuConfig.chipIcon('Mask'),
        activeTab: app.tabGroups.sheet,
        personalSchips,
        groupSchips,
        specialSchips,
        masterSchips,
        activeSpecialTab,
        isPersonalPool: app.selectedPool === 'personal',
        isGroupPool: app.selectedPool === 'group',
        isSpecialPool: app.selectedPool === 'special',
        isMasterPool: app.selectedPool === 'master',
        specialSchipDescription,
        addQSDesc,
        masterDesc,
        masterCost,
        hasPersonal,
        hasGroup: hasGroupSchips,
        hasSpecial: hasSpecialSchips,
        hasMaster,
        hasMultiplePools: availablePoolsCount > 1,
        hasFateAction,
        isGM: game.user.isGM,
    };
}
