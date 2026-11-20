import { DSA5GodsMenuConfig } from './config.js';
import { DiceDSA5, FateRolls } from './dsa5-api.js';

export const STANDARD_FATE_TABS = new Set(['reroll', 'addQS']);
export const STANDARD_ONLY_SPECIAL_KEYS = new Set(['Aves', 'Phex']);

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

export function getAvailableRegenBlessingKeys(actor, message) {
    if (!actor || !message) return [];
    const used = message.flags?.data?.fateSpecialUsed || [];
    const specialPoints = foundry.utils.getProperty(actor, 'flags.dsa5.specialPoints') || {};

    return Object.keys(REGEN_BLESSING_CONFIG).filter(
        (key) => !used.includes(key) && (Number(specialPoints[key]?.current) || 0) > 0,
    );
}

export function resolveRegenBlessingActor(message) {
    const req = message?.flags?.dsa5?.rollRequest;
    if (req?.category !== 'regeneration' || req.finalized) return null;

    const recipients = getRollRequestActors(message);
    if (!recipients.length) return null;

    const hasAvailable = (actor) => getAvailableRegenBlessingKeys(actor, message).length > 0;

    if (!game.user.isGM) {
        const userChar = game.user.character;
        if (userChar && recipients.some((a) => a.id === userChar.id) && hasAvailable(userChar)) {
            return userChar;
        }
        return recipients.find((a) => a.isOwner && hasAvailable(a)) || null;
    }

    const controlled = canvas?.tokens?.controlled?.[0]?.actor;
    if (controlled && recipients.some((a) => a.id === controlled.id) && hasAvailable(controlled)) {
        return controlled;
    }
    return recipients.find(hasAvailable) || null;
}

export function getEligibleCompanions(caster, message, key) {
    const cfg = REGEN_BLESSING_CONFIG[key];
    if (!cfg || !caster) return [];
    return getRollRequestActors(message).filter((actor) => actor.id !== caster.id && cfg.filterTarget(actor));
}

export function buildRollRequestFateContext(app) {
    const availableKeys = getAvailableRegenBlessingKeys(app.dsaActor, app.message);
    app.selectedPool = 'special';

    if (!availableKeys.includes(app.selectedSpecialKey)) {
        app.selectedSpecialKey = availableKeys[0] || null;
    }

    const tabsDef = {};
    const regenBlessingTabs = [];
    const specialSchips = [];
    const specialPointsObj = foundry.utils.getProperty(app.dsaActor, 'flags.dsa5.specialPoints') || {};

    for (const key of availableKeys) {
        const tabId = `regenBlessing_${key}`;
        const translatedName = DSA5GodsMenuConfig.schipName(key);
        const label = `${translatedName}-Schip`;
        const isActive = app.tabGroups.sheet === tabId;

        tabsDef[tabId] = { id: tabId, label, cssClass: isActive ? 'active' : '' };
        regenBlessingTabs.push({
            id: tabId,
            label,
            cssClass: isActive ? 'active' : '',
            description: DSA5GodsMenuConfig.schipDescription(key),
        });

        const sData = specialPointsObj[key];
        const iconPath = DSA5GodsMenuConfig.chipIcon(key);
        for (let i = 0; i < (sData?.value || 0); i++) {
            const isFull = i < (sData?.current || 0);
            let imgStyle = `background-image: url('${iconPath}');`;
            if (!isFull) imgStyle += ' filter: grayscale(100%) opacity(0.4);';

            specialSchips.push({
                key,
                tooltip: label,
                imgStyle,
                cssClass: isFull ? 'fullSchip' : 'emptySchip',
                isRelevant: isFull,
                isSelected: app.selectedSpecialKey === key,
                isGod: true,
            });
        }
    }

    if (availableKeys.length && !tabsDef[app.tabGroups.sheet]) {
        const activeId = `regenBlessing_${app.selectedSpecialKey}`;
        app.tabGroups.sheet = activeId;
        tabsDef[activeId].cssClass = 'active';
        const activeEntry = regenBlessingTabs.find((t) => t.id === activeId);
        if (activeEntry) activeEntry.cssClass = 'active';
    } else if (!availableKeys.length) {
        tabsDef.noOption = { id: 'noOption', label: _loc('GodsMenu.FateTab.NoOption'), cssClass: 'active' };
        app.tabGroups.sheet = 'noOption';
    }

    return {
        tabs: tabsDef,
        regenBlessingTabs,
        dice: [],
        damageDice: [],
        masterRegenDice: [],
        specialImg: DSA5GodsMenuConfig.chipIcon(null),
        activeTab: app.tabGroups.sheet,
        personalSchips: [],
        groupSchips: [],
        specialSchips,
        masterSchips: [],
        activeSpecialTab: null,
        isPersonalPool: false,
        isGroupPool: false,
        isSpecialPool: true,
        isMasterPool: false,
        specialSchipDescription: '',
        hasPersonal: false,
        hasGroup: false,
        hasSpecial: specialSchips.length > 0,
        hasMaster: false,
        hasMultiplePools: false,
        hasFateAction: availableKeys.length > 0,
        isGM: game.user.isGM,
    };
}

export async function buildUnifiedFateContext(app, baseContext) {
    const data = app.message.flags.data;
    const postData = data.postData;
    const preData = data.preData;

    const rollName = preData.source?.name || "";

    const usedReroll = !!data.fatePointRerollUsed;
    const usedDamageReroll = !!data.fatePointDamageRerollUsed;
    const usedImprove = !!data.fateImproved;
    const usedAddQS = !!data.fatePointAddQSUsed;
    const usedSpecialKeys = data.fateSpecialUsed || [];
    const usedFieser = !!data.fieserSchadenUsed;
    const usedMeisterSchicksal = !!data.meisterSchicksalUsed;
    const usedMeisterRegen = !!data.meisterRegenUsed;

    const damageRevealed = data.hideDamage === false ||
                           app.message.content.includes('data-hide-damage="false"') ||
                           app.message.content.includes('opposed-card');

    const successLevel = postData.successLevel || 0;
    const type = preData.source?.type;
    const mode = preData.mode;
    const isRegen = (postData.rollType || type) === 'regenerate';

    const isCombatRoll = ['meleeweapon', 'rangeweapon', 'dodge', 'trait'].includes(type) || ['attack', 'parry', 'range'].includes(mode);
    const isAttack = mode === 'attack' || postData.characteristics?.some(c => c.char === 'attack');
    const isParry = mode === 'parry' || postData.characteristics?.some(c => c.char === 'parry');
    const isRange = type === 'rangeweapon' || mode === 'range';
    const isDodge = type === 'dodge' || preData.source?.name === _loc("Dodge");

    const hasAbility = (key) => {
        const locName = _loc(key);
        return app.dsaActor.items.some(i => i.name === locName && i.system?.category?.value === "fatePoints");
    };

    let improveSkill = null;
    switch (true) {
        case isAttack:
            improveSkill = 'SCHIPSKILLS.meleeweaponattack';
            break;
        case isRange:
            improveSkill = 'SCHIPSKILLS.rangeweaponattack';
            break;
        case isDodge:
            improveSkill = 'SCHIPSKILLS.dodge';
            break;
        case isParry:
            improveSkill = 'SCHIPSKILLS.meleeweaponparry';
            break;
        case type === 'attribute':
        case FateRolls.MULTI_DIE_ROLL_TYPES.includes(type):
            improveSkill = 'SCHIPSKILLS.char';
            break;
    }
    const canImprove = improveSkill ? hasAbility(improveSkill) : false;

    const hasD20Roll = !isRegen && (!!postData.characteristics || !!preData.roll);
    const hasDamageRoll = !!postData.damageRoll;

    const canAddQS = successLevel > 0 && !usedAddQS && postData.qualityStep !== undefined && !isCombatRoll;

    const tabsDef = {};
    if (hasD20Roll && !usedReroll) tabsDef.reroll = { id: 'reroll', label: 'GodsMenu.FateTab.Reroll', cssClass: app.tabGroups.sheet === 'reroll' ? 'active' : '' };
    if (hasDamageRoll && !usedDamageReroll) tabsDef.rerollDamage = { id: 'rerollDamage', label: _loc('GodsMenu.FateTab.RerollDamage'), cssClass: app.tabGroups.sheet === 'rerollDamage' ? 'active' : '' };
    if (hasD20Roll && canImprove && !usedImprove) tabsDef.improve = { id: 'improve', label: 'GodsMenu.FateTab.Improve', cssClass: app.tabGroups.sheet === 'improve' ? 'active' : '' };
    if (canAddQS) tabsDef.addQS = { id: 'addQS', label: 'GodsMenu.FateTab.AddQS', cssClass: app.tabGroups.sheet === 'addQS' ? 'active' : '' };

    const masterTabIds = ['beistand', 'fieser', 'gescheitert', 'meisterschicksal', 'meisterRegen', 'masterPlaceholder'];

    const currentTab = app.tabGroups.sheet || '';
    if (!tabsDef[currentTab] && !currentTab.startsWith('specialAction_') && !masterTabIds.includes(currentTab)) {
        const firstTab = Object.keys(tabsDef)[0];
        if (firstTab) {
            app.tabGroups.sheet = firstTab;
            tabsDef[firstTab].cssClass = 'active';
        }
    }

    const sheetTab = app.tabGroups.sheet || '';
    const characteristics = Array.isArray(postData.characteristics) ? postData.characteristics : [];
    const dice = characteristics
        .filter(item => item.char !== 'damage')
        .map((item, i) => {
            let attr = item.char || 'd20';
            if (isCombatRoll) {
                attr = mode || type;
                if (type === 'dodge') attr = 'dodge';
            }
            return {
                index: i,
                currentValue: item.res,
                attr: attr,
                cssClass: item.suc ? 'suc' : 'fail',
                tooltip: item.tar ? `${_loc(item.char === 'attack' ? 'Attack' : item.char === 'parry' ? 'Parry' : `CHAR.${item.char.toUpperCase()}`)} vs ${item.tar}` : '',
                selected: (sheetTab === 'reroll' || sheetTab === 'meisterschicksal') ? app.selectedForReroll.has(i) : app.selectedForImprove === i,
                specialSelected: sheetTab.startsWith('specialAction') ? app.selectedForSpecialReroll === i : false
            };
        });

    let damageDice = [];
    if (hasDamageRoll) {
        const rollInstance = DiceDSA5.fromRollData(postData.damageRoll);
        if (rollInstance?.terms) {
            let dieIndex = 0;
            for (let term of rollInstance.terms) {
                if (term.results) {
                    for (let res of term.results) {
                        damageDice.push({
                            index: dieIndex,
                            currentValue: res.result,
                            faces: term.faces || 6,
                            tooltip: _loc('Trefferpunkte'),
                            selected: app.selectedForDamageReroll.has(dieIndex)
                        });
                        dieIndex++;
                    }
                }
            }
        }
    }

    const masterRegenDice = [];
    if (isRegen && game.user.isGM && !usedMeisterRegen) {
        const tpl = document.createElement('template');
        tpl.innerHTML = app.message.content || '';
        tpl.content.querySelectorAll('.roll-result span.d6').forEach((el, index) => {
            const rawClass = el.getAttribute('class') || '';
            const attr = rawClass.match(/die-(LeP|AsP|KaP)/)?.[1] || 'LeP';
            masterRegenDice.push({
                index,
                currentValue: parseInt(el.textContent, 10) || 0,
                tooltip: el.getAttribute('data-tooltip') || '',
                cssClass: rawClass.replace(/display-toggle|d6|die-(LeP|AsP|KaP)/g, '').trim(),
                attr,
                selected: app.selectedForMasterRegen === index
            });
        });
    }

    const fateMax = app.dsaActor.system.status.fatePoints.current || 0;
    const fateAvailable = app.dsaActor.system.status.fatePoints.value || 0;
    const personalTooltip = _loc("GodsMenu.FateTab.FatePoint");

    const personalSchips = Array.from({ length: fateMax }, (_, i) => ({
        val: i + 1,
        cssClass: i < fateAvailable ? 'fullSchip' : 'emptySchip',
        tooltip: personalTooltip
    }));

    const groupSchipsString = game.settings.get('dsa5', 'groupschips') || "0/0";
    const [grpCur, grpMax] = groupSchipsString.split('/').map(Number);
    const groupTooltip = _loc("FORMULA.groupFatePoints");

    const groupSchips = Array.from({ length: grpMax || grpCur || 0 }, (_, i) => ({
        val: i + 1,
        cssClass: i < grpCur ? 'fullSchip' : 'emptySchip',
        tooltip: groupTooltip
    }));

    let specialSchips = [];
    let activeSpecialTab = null;
    let hasGodChips = false;
    let hasDemonChips = false;

    const specialPointsObj = foundry.utils.getProperty(app.dsaActor, "flags.dsa5.specialPoints");
    if (specialPointsObj) {
        for (let [key, sData] of Object.entries(specialPointsObj)) {
            if ((sData?.value || 0) <= 0) continue;

            let isRelevant = false;
            let isQsAndReroll = false;

            if (DSA5GodsMenuConfig.isQsAndReroll(key, rollName)) {
                isRelevant = true;
                isQsAndReroll = true;
            } else if (DSA5GodsMenuConfig.isExtraReroll(key, rollName)) {
                isRelevant = true;
            }

            const isGod = DSA5GodsMenuConfig.isGod(key);
            if (isGod) hasGodChips = true;
            else hasDemonChips = true;

            const iconPath = DSA5GodsMenuConfig.chipIcon(key);
            const translatedName = DSA5GodsMenuConfig.schipName(key);

            for (let i = 0; i < sData.value; i++) {
                let isFull = i < sData.current;
                let imgStyle = `background-image: url('${iconPath}');`;
                if (!isFull) {
                    imgStyle += " filter: grayscale(100%) opacity(0.4);";
                }

                if (isRelevant && isFull && app.selectedPool === 'special' && app.selectedSpecialKey === key && !usedSpecialKeys.includes(key)) {
                    if (isQsAndReroll) {
                        activeSpecialTab = {
                            id: `specialAction_${key}`,
                            label: `${translatedName}-Schip`,
                            cssClass: app.tabGroups.sheet === `specialAction_${key}` ? 'active' : ''
                        };
                    }
                }

                specialSchips.push({
                    key: key,
                    tooltip: `${translatedName}-Schip`,
                    imgStyle: imgStyle,
                    cssClass: isFull ? 'fullSchip' : 'emptySchip',
                    isRelevant: (isRelevant && isFull),
                    isSelected: (app.selectedPool === 'special' && app.selectedSpecialKey === key),
                    isGod,
                });
            }
        }
    }

    let masterSchips = [];
    let hasMaster = false;

    if (game.user.isGM) {
        const masterRaw = game.settings.get('dsa5', 'masterschips') || "0/0";
        const [mCur, mMax] = masterRaw.split('/').map(Number);
        hasMaster = (mMax > 0);

        for (let i = 0; i < mMax; i++) {
            masterSchips.push({
                value: i + 1,
                cssClass: i < mCur ? 'fullSchip' : 'emptySchip',
                img: i < mCur ? 'systems/dsa5/icons/meisterschip.webp' : 'systems/dsa5/icons/gray_meisterschip.webp',
                tooltip: _loc('GodsMenu.masterFatePointsTooltip'),
            });
        }
    }

    const masterTabsDef = {};
    const isPC = app.dsaActor.hasPlayerOwner;
    const hasD6Damage = damageDice.some(d => d.faces === 6);

    if (isPC && hasDamageRoll && hasD6Damage && damageRevealed) {
        masterTabsDef.beistand = { id: 'beistand', label: _loc('GodsMenu.FateTab.MasterDarkness'), cssClass: app.tabGroups.sheet === 'beistand' ? 'active' : '' };
    }
    if (!isPC && (isAttack || isRange) && hasDamageRoll && !usedFieser && !damageRevealed) {
        masterTabsDef.fieser = { id: 'fieser', label: _loc('GodsMenu.FateTab.MasterNastyDamage'), cssClass: app.tabGroups.sheet === 'fieser' ? 'active' : '' };
    }

    const isSuccess = successLevel > 0 || postData.result?.success || postData.success;
    const magicTypes = ["spell", "liturgy", "ritual", "ceremony", "magicalsign"];
    const isMagic = magicTypes.includes(type);

    let isCrit = false;
    let failCost = 1;

    if (isPC && (isAttack || isRange) && isSuccess && !isMagic) {
        isCrit = (successLevel > 2) || postData.result?.critical;
        failCost = isCrit ? 3 : 2;

        if (game.user.isGM) {
            const masterRaw = game.settings.get('dsa5', 'masterschips') || "0/0";
            const mCur = Number(masterRaw.split('/')[0]);
            if (mCur >= failCost) {
                masterTabsDef.gescheitert = {
                    id: 'gescheitert',
                    label: "Gescheiterter Angriff",
                    cssClass: app.tabGroups.sheet === 'gescheitert' ? 'active' : ''
                };
            }
        }
    }

    if (hasD20Roll && !usedMeisterSchicksal) {
        masterTabsDef.meisterschicksal = { id: 'meisterschicksal', label: _loc('GodsMenu.FateTab.MasterFate'), cssClass: app.tabGroups.sheet === 'meisterschicksal' ? 'active' : '' };
    }
    if (isRegen && masterRegenDice.length && !usedMeisterRegen) {
        masterTabsDef.meisterRegen = { id: 'meisterRegen', label: _loc('GodsMenu.FateTab.MasterRegen'), cssClass: app.tabGroups.sheet === 'meisterRegen' ? 'active' : '' };
    }
    if (Object.keys(masterTabsDef).length === 0) {
        masterTabsDef.masterPlaceholder = { id: 'masterPlaceholder', label: _loc('GodsMenu.FateTab.MasterNoOption'), cssClass: app.tabGroups.sheet === 'masterPlaceholder' ? 'active' : '' };
    }

    let groupActor = null;
    const partyUuid = game.settings.get('dsa5', 'primaryParty');
    if (partyUuid) groupActor = fromUuidSync(partyUuid);
    if (!groupActor) groupActor = game.actors.find(a => a.type === "group");

    const members = groupActor?.system?.members ?? {};
    const isGroupMember = Object.values(members).some((member) => member.uuid === app.dsaActor.uuid);

    const hasPersonal = personalSchips.length > 0;
    const hasGroupSchips = groupSchips.length > 0 && isGroupMember;
    const hasSpecialSchips = specialSchips.length > 0;

    const poolAvailable = {
        personal: hasPersonal,
        group: hasGroupSchips,
        special: hasSpecialSchips,
        master: hasMaster,
    };
    if (!poolAvailable[app.selectedPool]) {
        app.selectedPool = ['personal', 'group', 'special', 'master'].find((pool) => poolAvailable[pool]) ?? app.selectedPool;
    }

    if (app.selectedPool === 'master') {
        for (let key in tabsDef) delete tabsDef[key];
        Object.assign(tabsDef, masterTabsDef);

        if (!tabsDef[app.tabGroups.sheet]) {
            const firstMasterKey = Object.keys(tabsDef)[0];
            if (firstMasterKey) {
                app.tabGroups.sheet = firstMasterKey;
                tabsDef[firstMasterKey].cssClass = 'active';
            }
        }
        activeSpecialTab = null;
    } else if (!activeSpecialTab && ((app.tabGroups.sheet || '').startsWith('specialAction_') || masterTabIds.includes(app.tabGroups.sheet))) {
        const firstTab = Object.keys(tabsDef)[0];
        if (firstTab) {
            app.tabGroups.sheet = firstTab;
            tabsDef[firstTab].cssClass = 'active';
        }
    }

    if (Object.keys(tabsDef).length === 0 && !activeSpecialTab) {
        tabsDef.noOption = {
            id: 'noOption',
            label: _loc('GodsMenu.FateTab.NoOption'),
            cssClass: 'active',
        };
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

    let availablePoolsCount = 0;
    if (hasPersonal) availablePoolsCount++;
    if (hasGroupSchips) availablePoolsCount++;
    if (hasSpecialSchips) availablePoolsCount++;
    if (hasMaster) availablePoolsCount++;

    let dynamicSpecialImg = DSA5GodsMenuConfig.chipIcon(null);
    if (hasDemonChips && !hasGodChips) {
        dynamicSpecialImg = DSA5GodsMenuConfig.chipIcon(null, 'Erzdaemonen.webp');
    }

    let specialSchipDescription = _loc("GodsMenu.FateTab.SpecialSchipHint");
    if (app.selectedPool === 'special' && app.selectedSpecialKey) {
        specialSchipDescription = DSA5GodsMenuConfig.schipDescription(app.selectedSpecialKey);
    }

    const addQSDesc = app.selectedPool === 'special' && DSA5GodsMenuConfig.isQsAndReroll(app.selectedSpecialKey, rollName)
        ? _loc("GodsMenu.FateTab.AddQSDescSpecial")
        : _loc("GodsMenu.FateTab.AddQSDesc");

    let masterDesc = "";
    let masterCost = "";
    if (app.selectedPool === 'master' && app.tabGroups.sheet === 'gescheitert') {
        masterDesc = _loc("GodsMenu.FateTab.MasterFailedDescFull");
        const attackType = isCrit ? _loc("GodsMenu.FateTab.CritAttack") : _loc("GodsMenu.FateTab.RegularAttack");
        masterCost = _loc("GodsMenu.FateTab.MasterFailedCostDetail", { type: attackType, cost: failCost });
    }

    return {
        ...baseContext,
        tabs: tabsDef,
        regenBlessingTabs: [],
        dice,
        damageDice,
        masterRegenDice,
        actorImg: app.dsaActor.img || "icons/svg/mystery-man-black.svg",
        groupImg: groupActor?.img || "icons/svg/mystery-man-black.svg",
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
        hasPersonal: hasPersonal,
        hasGroup: hasGroupSchips,
        hasSpecial: hasSpecialSchips,
        hasMaster: hasMaster,
        hasMultiplePools: availablePoolsCount > 1,
        hasFateAction,
        isGM: game.user.isGM
    };
}
