import { RollDialogBurgerMenuRule } from '/systems/dsa5/modules/item/burgermenus/base-burger-menu-rule.js';
import DSA5_Utility from '/systems/dsa5/modules/system/helpers/utility-dsa5.js';

const TAKEOVER_BASE_ROUNDS = 7;
const SECONDS_PER_ROUND = 5;
const MAX_SERVICES = 500;
const CONJURATION_TYPE_ELEMENTAL = 2;

class ControlTakeoverBurgerMenu extends RollDialogBurgerMenuRule {
    constructor() {
        super({ abilityNameKey: 'dsa5-elementarium.control.takeover' });
    }

    matches(dialogState) {
        const isSkill = dialogState?.source?.type === 'skill';
        const isWillenskraft = dialogState?.source?.name === _loc("LocalizedIDs.willpower");

        if (!isSkill || !isWillenskraft) return false;

        const actor = dialogState?.actor;
        if (!actor) return false;

        const allowedTraits = [
            _loc("dsa5-elementarium.control.advantageMage"),
            _loc("dsa5-elementarium.control.traditions.ferkinaschamanen"),
            _loc("dsa5-elementarium.control.traditions.fjarningerschamanen"),
            _loc("dsa5-elementarium.control.traditions.gjalskerschamanen"),
            _loc("dsa5-elementarium.control.traditions.nivesenschamanen"),
            _loc("dsa5-elementarium.control.traditions.tahayaschamanen"),
            _loc("dsa5-elementarium.control.traditions.trollzackerschamanen"),
            _loc("dsa5-elementarium.control.traditions.achazschamanen"),
            _loc("dsa5-elementarium.control.traditions.tairachkult")
        ];

        let isAuthorized = false;
        for (const item of actor.items) {
            if (["advantage", "trait", "specialability"].includes(item.type)) {
                if (allowedTraits.includes(item.name)) {
                    isAuthorized = true;
                    break;
                }
            }
        }

        if (!isAuthorized) return false;

        const targets = Array.from(game.user.targets);
        if (targets.length !== 1) return false;

        const targetActor = targets[0].actor;
        if (!targetActor) return false;

        const creatureClass = targetActor.system?.creatureClass?.value || "";
        if (!creatureClass.includes(_loc("CONJURATION.elemental"))) return false;

        return true;
    }

    getBurgerMenuItems(dialogState) {
        return [{
            label: _loc("dsa5-elementarium.control.takeover"),
            icon: '<i class="fa-solid fa-hand-holding-droplet"></i>',
            onClick: async () => this.#onClick(dialogState)
        }];
    }

    async #onClick(dialogState) {
        const targets = Array.from(game.user.targets);
        if (targets.length !== 1) return;
        
        const elementalToken = targets[0];
        const elementalActor = elementalToken.actor;
        if (!elementalActor) return;

        const conjuringDiff = Number(elementalActor.system?.conjuringDifficulty?.value) || 0;
        const soulpower = Number(elementalActor.system?.status?.soulpower?.max ?? elementalActor.system?.status?.soulpower?.value) || 0;
        
        let typeModifier = 0;
        if (conjuringDiff === -1) typeModifier = -1;
        else if (conjuringDiff === -3) typeModifier = -3;
        else if (conjuringDiff <= -6) typeModifier = -5;

        const totalPenalty = -(Math.ceil(soulpower / 2)) + typeModifier;

        let defenderActor = elementalActor;
        let defenderTokenId = elementalToken.id;

        const ownerArray = elementalActor.system.companionData?.owners || [];
        if (ownerArray.length > 0) {
            const ownerId = ownerArray[0].split(".")[1] || ownerArray[0];
            const owner = game.actors.get(ownerId);
            if (owner) {
                defenderActor = owner;
                const activeTokens = owner.getActiveTokens();
                defenderTokenId = activeTokens.length > 0 ? activeTokens[0].id : "emptyActor";
            }
        }

        targets.forEach(t => t.setTarget(false, { releaseOthers: false }));

        const originalBasicTest = dialogState.actor.basicTest;
        dialogState.actor.basicTest = async function(setupData) {
            setupData.testData.opposed = true;
            setupData.testData.isOpposedTest = true;
            setupData.testData.isKontrolluebernahme = true;
            
            setupData.testData.situationalModifiers ??= [];
            setupData.testData.situationalModifiers.push({
                name: `${_loc("dsa5-elementarium.control.takeover")} (${elementalActor.name})`,
                value: totalPenalty,
                type: '',
                selected: true,
                source: _loc("TYPES.Item.specialability")
            });
            
            dialogState.actor.basicTest = originalBasicTest;
            return originalBasicTest.call(this, setupData);
        };

        const getAttackMessage = new Promise((resolve) => {
            const hookId = Hooks.on('createChatMessage', (msg) => {
                if (msg.speaker?.actor === dialogState.actor.id && msg.flags?.data?.postData) {
                    Hooks.off('createChatMessage', hookId);
                    resolve(msg);
                }
            });
        });

        this.clickRollButton(dialogState);
        const attackMessage = await getAttackMessage;

        const startMessage = await ChatMessage.create({
            user: game.user.id,
            content: game.i18n.format("dsa5-elementarium.control.attemptMessage", {
                attacker: dialogState.actor.name,
                defender: elementalActor.name
            }),
            speaker: attackMessage.speaker,
            flags: {
                unopposeData: {
                    attackMessageId: attackMessage.id,
                    targetSpeaker: {
                        scene: canvas.scene?.id,
                        token: defenderTokenId,
                        alias: defenderActor.name
                    }
                },
                "dsa5-elementarium": {
                    isTakeoverStartMessage: true,
                    defenderTokenId: defenderTokenId,
                    defenderActorId: defenderActor.id,
                    elementalTokenId: elementalToken.id
                }
            }
        });

        await attackMessage.update({
            'flags.dsa5-elementarium.isKontrolluebernahme': true,
            'flags.dsa5-elementarium.elementalTokenId': elementalToken.id,
            'flags.data.startMessagesList': [startMessage.id],
            'flags.data.isOpposedTest': true
        });
    }
}

export function registerControlTakeoverHooks() {
    const controlTakeoverMenu = new ControlTakeoverBurgerMenu();

    Hooks.on('dsa5.getRollDialogContextOptions', (dialogState, menuItems) => {
        if (!controlTakeoverMenu.matches(dialogState)) return;
        menuItems.push(...controlTakeoverMenu.getBurgerMenuItems(dialogState));
    });

    Hooks.on('createChatMessage', async (msg) => {
        const takeoverFlags = msg.flags?.["dsa5-elementarium"];
        if (!takeoverFlags?.isTakeoverStartMessage) return;

        const defenderActor = game.actors.get(takeoverFlags.defenderActorId);
        if (!defenderActor) return;

        const activeOwners = game.users.filter(u => u.active && !u.isGM && defenderActor.testUserPermission(u, "OWNER"));
        const shouldRoll = activeOwners.length > 0 ? activeOwners[0].id === game.user.id : game.users.activeGM?.isSelf;
        
        if (!shouldRoll) return;

        const unopposeData = msg.flags?.unopposeData;
        const willenskraftName = _loc("LocalizedIDs.willpower");
        const willenskraft = defenderActor.items.find(i => i.type === "skill" && i.name === willenskraftName);

        if (!willenskraft) {
            return ui.notifications.error(game.i18n.format("dsa5-elementarium.control.missingWillpower", {
                name: defenderActor.name
            }));
        }

        const defSetup = await defenderActor.setupSkill(willenskraft.toObject(), { skipDialog: true }, takeoverFlags.defenderTokenId);

        foundry.utils.setProperty(defSetup, "testData.extra.options.oppose", {
            attackMessageId: unopposeData.attackMessageId,
            startMessageId: msg.id
        });
        foundry.utils.setProperty(defSetup, "extra.options.oppose", {
            attackMessageId: unopposeData.attackMessageId,
            startMessageId: msg.id
        });
        
        defSetup.testData.skipDialog = true;
        defSetup.skipDialog = true;

        await defenderActor.basicTest(defSetup);
    });

    Hooks.on('finishOpposedTest', async (attacker, defender, opposedResult) => {
        const attackMsg = game.messages.get(attacker.messageId);
        const takeoverFlags = attackMsg?.flags?.["dsa5-elementarium"];
        
        if (!takeoverFlags?.isKontrolluebernahme) return;

        if (opposedResult.winner === 'attacker') {
            const elementalTokenId = takeoverFlags.elementalTokenId;
            const elementalToken = canvas.tokens.get(elementalTokenId);
            const elementalActor = elementalToken?.actor;

            if (!elementalActor) return;

            const isGMConnected = Array.from(game.users).some(u => u.isGM && u.active);
            const shouldApplyEffect = isGMConnected ? game.users.activeGM?.isSelf : true; 

            if (!shouldApplyEffect) return;

            const qsDiff = opposedResult.differenceSL || 1;
            const durationRounds = Math.max(1, TAKEOVER_BASE_ROUNDS - qsDiff);
            const summonerId = attacker.speaker.actor;

            const controlTakeoverOnRemoveMacro = `
                const summonerActor = game.actors.get("${summonerId}");
                let elementalActor = actor;
                if (!elementalActor || !summonerActor) return;

                const CompanionHandler = (await import('/systems/dsa5/modules/actor/companions/companion-handler-class.js')).default;
                const DSA5_Utility = (await import('/systems/dsa5/modules/system/helpers/utility-dsa5.js')).default;
                
                if (elementalActor.system?.companionData?.owners?.length > 0) {
                    await CompanionHandler.unlinkSummonedCompanion(elementalActor);
                }

                const summonedOwnership = foundry.utils.duplicate(summonerActor.ownership || {});

                if (elementalActor.isToken || !elementalActor.prototypeToken.actorLink) {
                    const folder = await DSA5_Utility.getFolderForType("Actor", null, _loc("PLAYER.conjuration"));
                    const actorData = elementalActor.toObject();
                    actorData.folder = folder.id;
                    actorData.prototypeToken.actorLink = true;
                    actorData.ownership = summonedOwnership;
                    const newWorldActor = await Actor.create(actorData);
                    if (elementalActor.token) {
                        await elementalActor.token.update({
                            actorId: newWorldActor.id,
                            actorLink: true
                        });
                    }
                    elementalActor = newWorldActor;
                } else {
                    await elementalActor.update({ ownership: summonedOwnership }, { diff: false, recursive: false });
                }

                await CompanionHandler.linkSummonedCompanion(summonerActor, elementalActor, {
                    controlMode: "services",
                    conjurationType: ${CONJURATION_TYPE_ELEMENTAL}
                });

                const serviceEffect = CompanionHandler.serviceCounterEffect(elementalActor);
                if (serviceEffect) {
                    const current = Number(serviceEffect.system.condition?.manual ?? serviceEffect.system.condition?.value ?? 0);
                    const next = Math.max(1, current - 1);
                    await CompanionHandler.setServiceCounter(elementalActor, next);
                } else {
                    const newServiceEffect = {
                        name: _loc("PLAYER.services") || _loc("dsa5-elementarium.control.servicesFallback"),
                        img: "icons/svg/aura.svg",
                        statuses: ["services"],
                        type: "base",
                        system: {
                            condition: {
                                value: 1,
                                manual: 1,
                                auto: 0,
                                max: ${MAX_SERVICES}
                            }
                        }
                    };
                    await elementalActor.createEmbeddedDocuments("ActiveEffect", [newServiceEffect]);
                }

                ui.notifications.info(game.i18n.format("dsa5-elementarium.control.takeoverFinal", {
                    elemental: elementalActor.name,
                    summoner: summonerActor.name
                }));
            `;

            const effectData = {
                name: _loc("dsa5-elementarium.control.takeoverResistance"),
                img: "icons/svg/aura.svg",
                type: "base",
                duration: {
                    rounds: durationRounds,
                    seconds: durationRounds * SECONDS_PER_ROUND 
                },
                system: {
                    macroArgs: {
                        onRemove: controlTakeoverOnRemoveMacro
                    }
                },
                flags: {
                    "dsa5-elementarium": {
                        isTakeoverTimer: true,
                        summonerId: summonerId
                    }
                }
            };

            try {
                await elementalActor.createEmbeddedDocuments("ActiveEffect", [effectData]);
                ui.notifications.info(game.i18n.format("dsa5-elementarium.control.takeoverSuccess", { rounds: durationRounds }));
            } catch (error) {
                ui.notifications.error(_loc("dsa5-elementarium.control.errorEffectCreation"));
            }
        }
    });
}
